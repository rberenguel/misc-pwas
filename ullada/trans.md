# Ullada Translation Feature — Implementation Plan

## Overview

Two-phase architecture:
1. **Translator tool** (`translate.html`): runs in Chrome on desktop, parses an EPUB, translates it sentence-by-sentence using Chrome's built-in Translator API, exports a `.ullada` JSON file.
2. **Reader modifications** (`index.html` + `js/app.js`): accepts a `.ullada` file alongside the EPUB; shows the translated sentence in dim text below the flashing word.

The device used for reading (iOS/Safari) never needs to run any AI — it only reads the pre-translated file.

---

## Shared Module

### `lib/sentences.js` (new)

Single exported function used by **both** the translator tool and the reader. Both tools must use exactly the same splitter so sentence indices align.

```js
export function splitSentences(text) {
    return text
        .split(/(?<=[.!?…])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 2);
}
```

Accepts some false splits on abbreviations (Mr., Dr.) — acceptable for prose reading.

---

## File Format: `.ullada`

Plain JSON, extension `.ullada`. **Self-contained** — the reader requires no EPUB; everything needed to read and display translations is in this one file.

```json
{
  "version": 2,
  "title": "Book Title",
  "source": "en",
  "target": "de",
  "cover": "data:image/jpeg;base64,…",
  "words": ["First", "word", "of", "the", "book"],
  "sentences": [{"start": 0, "end": 12}, {"start": 13, "end": 27}],
  "chapters": [{"title": "Chapter 1", "startIndex": 0}],
  "translations": ["Erster Satz.", "Zweiter Satz."]
}
```

`sentences[i]` is the word-index range for sentence i; `translations[i]` is its translation.
A partial file (paused mid-translation) has `translations` shorter than `sentences` — the reader shows nothing for untranslated sentences.

---

## New File: `translate.html`

Standalone page, not part of the PWA manifest or service worker cache for the main app — it's a desktop-only tool.

### UI elements

- Header: "Ullada Translator" (reuses Inter font + Solarized palette)
- EPUB file input (drag or click)
- Source language `<select>` (default: `en`)
- Target language `<select>` (default: `de`)
- "Start translating" button
- Progress section (hidden until started):
  - `"Translating sentence N / M"`
  - Progress bar
  - Estimated time remaining (rolling average of last 20 sentence durations)
- "Pause / Resume" button
- "Download .ullada" button (enabled when ≥ 1 sentence translated; allows partial downloads)
- Error/status area

### Availability check

On page load:
```js
if (typeof self.Translator === 'undefined') {
    // show a banner: "Chrome's built-in Translator API not available.
    //  Requires Chrome 138+. Make sure you are on the correct channel."
    startButton.disabled = true;
}
```

### Logic (`js/translate.js`)

```
1. User picks .epub → parse with JSZip (reuse extractRawSentences, see below)
2. Show sentence count, enable Start button
3. On Start:
   a. create translator: await self.Translator.create({ sourceLanguage, targetLanguage })
      (monitor downloadprogress on first create — model may need downloading)
   b. loop i = resumeFrom .. sentences.length - 1:
        if paused: break
        translations[i] = await translator.translate(sentences[i])
        update progress UI
   c. on completion: enable Download button
4. Download: Blob([JSON.stringify(output, null, 0)], {type:'application/json'})
             → <a download="BookTitle.ullada">
```

#### `extractRawSentences(file)` in translate.js

Same JSZip + OPF spine walk as the reader, but instead of splitting into individual words it collects the raw text per chapter and runs `splitSentences` from `lib/sentences.js`. Returns `{ title, sentences: string[] }`.

#### Pause / Resume

`isTranslating` boolean. The `for` loop checks it at the top of each iteration. "Pause" sets it false; "Resume" sets it true and calls the loop again from `resumeFrom = translations.length`.

#### Error handling

Per-sentence try/catch. On error: `translations[i] = ''` (reader will show nothing for that sentence), log to console, continue. After 5 consecutive errors: pause and show a warning to the user.

#### Performance expectations

Chrome's built-in Translator typically does 2–5 sentences/second. A full novel (~5 000 sentences) takes 20–40 min. The page must stay open; a visibility change warning is shown if the tab is hidden.

---

## Reader Modifications

### A. `lib/sentences.js` integration in `js/app.js`

`extractTextFromEpub` currently returns `{ words, chapters, title, cover }`.

**Change**: also return `sentences: Array<{ start: number, end: number }>` where `start`/`end` are word indices.

Algorithm inside the spine loop, replacing the current word-split step:

```
rawText → splitSentences(rawText) → for each sentence:
    sentWords = sentence.split(/\s+/).filter(...)
    sentencesList.push({ start: allWords.length, end: allWords.length + sentWords.length - 1 })
    allWords.push(...sentWords)
```

**idb storage**: add `sentences` to the book object stored in `ullada/book-{slot}`. Include a migration shim: if loaded book has no `sentences`, rebuild from words by joining + re-splitting (approximate but consistent enough).

### B. New state in `js/app.js`

```js
let sentences          = [];   // [{ start, end }] parallel to words[]
let translation        = null; // parsed .ullada object or null
let currentSentenceIdx = -1;
```

### C. Translation file loading

**In the loader view** (`index.html`): add a second optional file input below the EPUB input:

```html
<label for="t-upload" class="upload-box upload-box-secondary">
  Load translation (.ullada) — optional
</label>
<input type="file" id="t-upload" accept=".ullada,.json" class="hidden" />
```

**In the library modal** slot cards: a small "T" badge if a translation is loaded for that slot. Clicking it (or a small button on the card) opens a file picker for a `.ullada` file for that slot.

**idb key**: `ullada/translation-{slot}` stores the full parsed `.ullada` object.

**On load**: after `loadSaved()` restores a book, also `get(translationKey(activeSlot))` and set `translation`.

### D. `updateDisplay()` changes

Add at the top:

```js
const translationLineEl = document.getElementById('translation-line');
```

At the end of `updateDisplay()`:

```js
if (translation && sentences.length) {
    const idx = findSentenceIdx(currentIndex);
    if (idx !== currentSentenceIdx) {
        currentSentenceIdx = idx;
        const t = idx >= 0 ? (translation.translations[idx] || '') : '';
        translationLineEl.textContent = t;
        translationLineEl.classList.toggle('visible', t.length > 0);
    }
}
```

`findSentenceIdx` binary-searches `sentences[]`:

```js
function findSentenceIdx(wordIdx) {
    let lo = 0, hi = sentences.length - 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if      (sentences[mid].end   < wordIdx) lo = mid + 1;
        else if (sentences[mid].start > wordIdx) hi = mid - 1;
        else return mid;
    }
    return -1;
}
```

### E. `index.html` changes

Inside `#reader-view`, below `.word-display-container` and above `#hint`:

```html
<div id="translation-line" aria-live="polite"></div>
```

### F. `css/style.css` changes

```css
#translation-line {
    opacity: 0;
    font-size: 0.72rem;
    color: #93a1a1;          /* Solarized base1 */
    text-align: center;
    padding: 0 1.5rem;
    max-height: 2.8em;
    overflow: hidden;
    transition: opacity 0.3s ease;
    pointer-events: none;
}
#translation-line.visible {
    opacity: 0.55;
}
```

---

## `sw.js` changes

Bump cache name to `ullada-v1.3.0`.

Add to `CACHE_FILES`:
- `./lib/sentences.js`

Do **not** add `translate.html` or `js/translate.js` to the service worker — they are desktop-only Chrome tools that should always load fresh.

---

## Implementation Checklist

- [x] `lib/sentences.js` — write and validate splitter manually
- [x] `translate.html` — HTML skeleton (font, Solarized colours, inputs, progress section)
- [x] `js/translate.js` — EPUB parse → sentence extract → translate loop → download
- [x] `js/app.js` — modify `extractTextFromEpub` to return `sentences[]`
- [x] `js/app.js` — idb migration shim for books without `sentences`
- [x] `js/app.js` — new state + `translationKey()` helper + load translation from idb
- [x] `index.html` — `#library-t-upload` file input in library modal
- [x] `index.html` — `#translation-line` div in reader view
- [x] `js/app.js` — `findSentenceIdx` + `updateDisplay()` translation update
- [x] `css/style.css` — `#translation-line` + `.translation-badge` styles
- [x] Library modal — "T" badge + load-translation handler per slot card
- [x] `sw.js` — add `lib/sentences.js`, bump version to v1.3.0

---

## Open Questions / Decisions to Revisit

- **Language pair selector**: which languages to list? Start with a small curated list (en, de, fr, es, it, pt, nl, pl, ja, zh) and allow free-text entry as fallback.
- **Partial download UX**: allow downloading mid-translation? Yes — useful if a chapter is done and you want to test. The reader handles missing tail translations gracefully.
- **Book slot count**: currently 2 slots. Translation is per-slot. If slots expand later, `translationKey(s)` already parameterised.
- **Sentence count mismatch**: if the user re-parses the same EPUB with a different version of `splitSentences`, indices will drift. Solution: embed the `sentences[]` array in the `.ullada` file (already there) and match by source text as a fallback, not just index.
- **Gemini Nano Prompt API**: not needed for en↔de. Would be an alternative backend if `self.Translator` is unavailable for a given language pair — wire as a fallback later.
