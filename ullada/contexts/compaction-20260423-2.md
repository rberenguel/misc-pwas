# Session Compaction Summary

## User Intent
- Add a language-learning translation overlay to the Ullada RSVP reader
- Pre-translate EPUBs on desktop Chrome, producing a self-contained `.ullada` file loadable on any device (e.g. iOS Safari) without needing the original EPUB
- Polish the translation display (font size, layout, opacity) until visually satisfying

## Contextual Work Summary

### Translation Architecture
- Two-tool design: `translate.html` (Chrome-only, desktop) produces `.ullada` files; the reader (`index.html`) consumes them
- `.ullada` format (v2): self-contained JSON with `words`, `sentences` (index ranges), `chapters`, `cover` (base64), `translations` — no EPUB required at read time
- Shared `lib/sentences.js` with `splitSentences()` ensures identical sentence boundaries in both tools

### Translator Tool (`translate.html` + `js/translate.js`)
- Full EPUB extraction: words, sentence ranges, sentence texts, chapters, cover art
- Translation loop using `self.Translator` (Chrome 138+ built-in AI), streaming mode, pause/resume, 5-error abort
- Rolling ETA display, partial downloads allowed mid-translation
- API availability banner; language pair availability check on change

### Reader Integration (`js/app.js`)
- `handleTranslationUpload()` is a full book load: populates all state from `.ullada`, saves to idb, calls `startReadingSession()`
- `routeFile()` dispatches by file extension: `.ullada` → translation load, anything else → EPUB load
- `findSentenceIdx()` binary-searches `sentences[]` to map current word index → sentence
- `updateDisplay()` updates `#translation-line` on sentence boundary changes and toggles `has-translation` class on reader view
- `rebuildSentences()` migration shim for books stored before this feature
- Library modal T badge: outline = no translation, filled = loaded; click triggers `.ullada` file picker for that slot

### Display / CSS
- `#translation-line`: 1.8rem, `padding: 0 2.5rem`, `opacity: 0.3` when visible
- `.has-translation .word-display-container`: `transform: translateY(-1.4rem)` shifts words up only when translation is present
- `#reader-view.has-translation` class toggled in `updateDisplay()` on every render

### Format Rename
- All references changed from `.ullada-t` to `.ullada` via sed across JS, HTML, and docs

### Version & Docs
- SW cache bumped to `ullada-v1.4.0`; `manifest.json` version added as `1.4.0`
- `README.md` updated: Language Learning Mode feature bullet, Translation Workflow section (4-step), File Formats section, screenshot (`ullada.png`) at top
- `trans.md` plan document updated to reflect v2 format and completed checklist

## Files Touched

### New Files
- **`lib/sentences.js`**: Shared `splitSentences()` function; used by both tools
- **`translate.html`**: Standalone translator UI (Solarized theme, progress, pause/resume, download)
- **`js/translate.js`**: Full translator logic — EPUB parse, translate loop, `.ullada` export

### Core App
- **`js/app.js`**: New state (`sentences`, `translation`, `currentSentenceIdx`), `translationKey()`, `rebuildSentences()`, `routeFile()`, `handleTranslationUpload()`, `findSentenceIdx()`, updated `updateDisplay()`, `switchToSlot()`, `loadSaved()`, `saveBook()`, `renderLibrary()` with T badges, `libraryTUpload` handler
- **`index.html`**: `#translation-line` div, `#library-t-upload` input, upload hint updated to mention `.ullada`
- **`css/style.css`**: `#translation-line` styles, `.has-translation` layout shift, `.translation-badge` styles

### PWA
- **`sw.js`**: Added `lib/sentences.js` to cache, bumped to `ullada-v1.4.0`
- **`manifest.json`**: Added `version: "1.4.0"`

### Docs
- **`README.md`**: Screenshot, Language Learning Mode, Translation Workflow, File Formats sections added
- **`trans.md`**: Format updated to v2, checklist marked complete
