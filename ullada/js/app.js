import { initHaptic, triggerHaptic } from '../lib/haptic.js';
import { get, set, del } from '../lib/idb-keyval.js';
import { splitSentences } from '../lib/sentences.js';

initHaptic();

// --- State ---
let words        = [];
let sentences    = [];   // [{ start, end }] word-index ranges per sentence
let chapters     = [];
let currentTitle = '';
let currentCover = null; // data-URL or null
let currentIndex = 0;
let wpm          = 300;
let activeSlot   = 0;
let isPlaying    = false;
let rsvpTimeout  = null;
let wakeLock     = null;

let translation        = null; // parsed .ullada object or null
let currentSentenceIdx = -1;

// Gesture state
let isDragging = false;
let startY = 0;
let startX = 0;
let startWpm = 0;

// DOM
const loaderView     = document.getElementById('loader-view');
const readerView     = document.getElementById('reader-view');
const epubUpload     = document.getElementById('epub-upload');
const loadingSpinner = document.getElementById('loading-spinner');
const prefixEl       = document.getElementById('word-prefix');
const pivotEl        = document.getElementById('word-pivot');
const suffixEl       = document.getElementById('word-suffix');
const contextLeftEl  = document.getElementById('context-left');
const contextRightEl = document.getElementById('context-right');
const progressBar    = document.getElementById('progress-bar');
const wpmIndicator   = document.getElementById('wpm-indicator');
const hintEl            = document.getElementById('hint');
const translationLineEl = document.getElementById('translation-line');
const libraryModal      = document.getElementById('library-modal');
const libraryTUpload    = document.getElementById('library-t-upload');

// --- Persistence ---

const KEY_SLOT       = 'ullada/slot';
const bookKey        = (s) => `ullada/book-${s}`;
const progressKey    = (s) => `ullada/progress-${s}`;
const translationKey = (s) => `ullada/translation-${s}`;

async function saveBook() {
    try {
        await set(bookKey(activeSlot), { words, sentences, chapters, title: currentTitle, cover: currentCover });
    } catch (e) {}
}

async function saveProgress() {
    try {
        await set(progressKey(activeSlot), { currentIndex, wpm });
    } catch (e) {}
}

async function loadSaved() {
    try {
        // Migrate old un-namespaced keys
        const oldBook = await get('book');
        if (oldBook) {
            await set(bookKey(0), { ...oldBook, title: oldBook.title || 'Book', cover: null });
            const oldProg = await get('progress');
            if (oldProg) await set(progressKey(0), oldProg);
            await set(KEY_SLOT, 0);
            await del('book');
            await del('progress');
        }
        // Migrate pre-namespace slot keys
        const oldSlot = await get('slot');
        if (oldSlot != null) {
            await set(KEY_SLOT, oldSlot);
            await del('slot');
            for (const s of [0, 1]) {
                const b = await get(`book-${s}`);
                if (b) { await set(bookKey(s), b); await del(`book-${s}`); }
                const p = await get(`progress-${s}`);
                if (p) { await set(progressKey(s), p); await del(`progress-${s}`); }
            }
        }

        activeSlot = (await get(KEY_SLOT)) ?? 0;

        const book = await get(bookKey(activeSlot));
        if (!book?.words?.length) return;

        words        = book.words;
        chapters     = book.chapters;
        currentTitle = book.title || '';
        currentCover = book.cover || null;
        sentences    = book.sentences?.length ? book.sentences : rebuildSentences(book.words);

        const progress = await get(progressKey(activeSlot));
        if (progress) {
            currentIndex = progress.currentIndex ?? 0;
            wpm          = progress.wpm          ?? 300;
        }

        const trans = await get(translationKey(activeSlot));
        translation = trans?.translations?.length ? trans : null;

        startReadingSession();
    } catch (e) {}
}

loadSaved();

function rebuildSentences(ws) {
    const text  = ws.join(' ');
    const parts = splitSentences(text);
    const result = [];
    let pos = 0;
    for (const part of parts) {
        const len = part.split(/\s+/).filter(w => w.length > 0).length;
        if (len > 0) {
            result.push({ start: pos, end: pos + len - 1 });
            pos += len;
        }
    }
    return result;
}

// --- Helpers ---

function escapeHtml(s) {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function blobToDataUrl(blob) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
    });
}

// --- File Loading ---

epubUpload.addEventListener('change', () => routeFile(epubUpload.files[0]));

window.addEventListener('dragover', (e) => e.preventDefault());
window.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) routeFile(file);
});

function routeFile(file) {
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.ullada')) handleTranslationUpload(file);
    else handleFileUpload(file);
}

async function handleTranslationUpload(file) {
    loadingSpinner.classList.remove('hidden');
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!Array.isArray(data.words) || !Array.isArray(data.sentences) || !Array.isArray(data.translations)) {
            throw new Error('Invalid .ullada file (missing words, sentences, or translations)');
        }
        words        = data.words;
        sentences    = data.sentences;
        chapters     = data.chapters || [];
        currentTitle = data.title    || file.name.replace(/\.ullada$/i, '');
        currentCover = data.cover    || null;
        translation        = data;
        currentSentenceIdx = -1;
        currentIndex = 0;
        wpm          = 300;

        await saveBook();
        await saveProgress();
        await set(translationKey(activeSlot), data);
        startReadingSession();
    } catch (err) {
        alert(`Failed to load .ullada file: ${err.message}`);
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

document.querySelector('.upload-box').addEventListener('click', () => {
    triggerHaptic();
});

async function handleFileUpload(file) {
    if (!file) return;

    loadingSpinner.classList.remove('hidden');
    loaderView.classList.remove('hidden');
    readerView.style.display = 'none';

    try {
        const result = await extractTextFromEpub(file);
        words        = result.words;
        sentences    = result.sentences;
        chapters     = result.chapters;
        currentTitle = result.title;
        currentCover = result.cover;
        translation        = null;
        currentSentenceIdx = -1;

        if (words.length > 0) {
            currentIndex = 0;
            wpm = 300;
            await saveBook();
            await saveProgress();
            startReadingSession();
        } else {
            alert("Could not extract readable text from this file.");
        }
    } catch (err) {
        console.error("Error parsing EPUB:", err);
        alert("Failed to parse EPUB file. Ensure it is a valid format.");
    } finally {
        loadingSpinner.classList.add('hidden');
    }
}

async function extractTextFromEpub(file) {
    const zip = await JSZip.loadAsync(file);

    let containerData;
    try {
        containerData = await zip.file("META-INF/container.xml").async("string");
    } catch (e) {
        throw new Error("Invalid EPUB: META-INF/container.xml not found");
    }

    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerData, "text/xml");

    const rootfiles = containerDoc.getElementsByTagName("rootfile");
    if (rootfiles.length === 0) throw new Error("No rootfile found in container");

    const opfPath   = rootfiles[0].getAttribute("full-path");
    const opfFolder = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : "";

    const opfData = await zip.file(opfPath).async("string");
    const opfDoc  = parser.parseFromString(opfData, "text/xml");

    // Book title from dc:title
    const dcTitleEl = opfDoc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'title')[0]
                   || opfDoc.getElementsByTagName('dc:title')[0];
    const bookTitle = dcTitleEl?.textContent?.trim() || file.name.replace(/\.epub$/i, '');

    // Cover image
    const cover = await extractCover(zip, opfDoc, opfFolder);

    // Build manifest
    const manifest = {};
    const manifestItems = opfDoc.getElementsByTagName("item");
    for (let i = 0; i < manifestItems.length; i++) {
        manifest[manifestItems[i].getAttribute("id")] = {
            href:      manifestItems[i].getAttribute("href"),
            mediaType: manifestItems[i].getAttribute("media-type") || '',
        };
    }

    const spineItems = opfDoc.getElementsByTagName("itemref");
    const spine = [];
    for (let i = 0; i < spineItems.length; i++) spine.push(spineItems[i].getAttribute("idref"));

    let allWords     = [];
    let allSentences = [];
    let chaptersList = [];

    for (const idref of spine) {
        const item = manifest[idref];
        if (!item) continue;

        const filePath  = opfFolder + decodeURIComponent(item.href);
        const fileEntry = zip.file(filePath);

        if (fileEntry) {
            const htmlData = await fileEntry.async("string");
            const htmlDoc  = parser.parseFromString(htmlData, "text/html");

            const rawText = (htmlDoc.body.innerText || htmlDoc.body.textContent || '').trim();
            if (!rawText) continue;

            const rawSentences  = splitSentences(rawText);
            const sectionStart  = allWords.length;
            let   sectionWords  = 0;

            for (const sent of rawSentences) {
                const sentWords = sent.split(/\s+/).filter(w => w.length > 0);
                if (sentWords.length === 0) continue;
                allSentences.push({ start: allWords.length, end: allWords.length + sentWords.length - 1 });
                allWords = allWords.concat(sentWords);
                sectionWords += sentWords.length;
            }

            if (sectionWords > 0) {
                let title = htmlDoc.querySelector('title')?.textContent ||
                            htmlDoc.querySelector('h1')?.textContent ||
                            htmlDoc.querySelector('h2')?.textContent ||
                            `Section ${chaptersList.length + 1}`;

                title = title.trim().replace(/\s+/g, ' ');
                if (title.length > 35) title = title.substring(0, 35) + '...';

                chaptersList.push({ title, startIndex: sectionStart });
            }
        }
    }

    return { words: allWords, sentences: allSentences, chapters: chaptersList, title: bookTitle, cover };
}

async function extractCover(zip, opfDoc, opfFolder) {
    const items = opfDoc.getElementsByTagName('item');
    let coverHref = null;

    // Method 1: properties="cover-image"
    for (let i = 0; i < items.length; i++) {
        const props = items[i].getAttribute('properties') || '';
        if (props.includes('cover-image')) {
            coverHref = items[i].getAttribute('href');
            break;
        }
    }

    // Method 2: <meta name="cover" content="id">
    if (!coverHref) {
        const metas = opfDoc.getElementsByTagName('meta');
        let coverId = null;
        for (let i = 0; i < metas.length; i++) {
            if (metas[i].getAttribute('name') === 'cover') {
                coverId = metas[i].getAttribute('content');
                break;
            }
        }
        if (coverId) {
            for (let i = 0; i < items.length; i++) {
                if (items[i].getAttribute('id') === coverId) {
                    coverHref = items[i].getAttribute('href');
                    break;
                }
            }
        }
    }

    // Method 3: id contains "cover" and it's an image
    if (!coverHref) {
        for (let i = 0; i < items.length; i++) {
            const id        = (items[i].getAttribute('id') || '').toLowerCase();
            const mediaType = items[i].getAttribute('media-type') || '';
            if (id.includes('cover') && mediaType.startsWith('image/')) {
                coverHref = items[i].getAttribute('href');
                break;
            }
        }
    }

    if (!coverHref) return null;

    try {
        const filePath  = opfFolder + decodeURIComponent(coverHref);
        const fileEntry = zip.file(filePath);
        if (!fileEntry) return null;
        const blob = await fileEntry.async('blob');
        return await blobToDataUrl(blob);
    } catch (e) {
        return null;
    }
}

// --- RSVP Engine ---

async function startReadingSession() {
    loaderView.style.display = 'none';
    readerView.style.display = 'flex';
    updateDisplay();

    try { await document.documentElement.requestFullscreen(); } catch (e) {}
    try { if (screen.orientation) await screen.orientation.lock('landscape'); } catch (e) {}
    try { if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
}

function calculateORP(word) {
    const cleanWord = word.replace(/[.,!?;:'"()[\]{}]/g, '');
    const length    = cleanWord.length;

    let pivotIndex = 0;
    if      (length <= 1)  pivotIndex = 0;
    else if (length <= 5)  pivotIndex = 1;
    else if (length <= 9)  pivotIndex = 2;
    else if (length <= 13) pivotIndex = 3;
    else                   pivotIndex = 4;

    let actualPivot = 0;
    let lettersFound = 0;
    for (let i = 0; i < word.length; i++) {
        if (!/[.,!?;:'"()[\]{}]/.test(word[i])) {
            if (lettersFound === pivotIndex) { actualPivot = i; break; }
            lettersFound++;
        }
    }
    if (actualPivot === 0 && length > 1) actualPivot = Math.floor(word.length / 2);

    return actualPivot;
}

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

function updateDisplay() {
    if (currentIndex >= words.length) {
        pauseRsvp();
        prefixEl.textContent     = "";
        pivotEl.textContent      = "End";
        suffixEl.textContent     = "";
        contextLeftEl.innerHTML  = "";
        contextRightEl.innerHTML = "";
        return;
    }

    const word  = words[currentIndex];
    const pivot = calculateORP(word);

    prefixEl.textContent = word.substring(0, pivot);
    pivotEl.textContent  = word.charAt(pivot);
    suffixEl.textContent = word.substring(pivot + 1);

    const ctx = 6;
    let leftHtml = "";
    for (let i = ctx; i > 0; i--) {
        const idx = currentIndex - i;
        if (idx >= 0) leftHtml += `<span class="shrink-0">${escapeHtml(words[idx])}</span>`;
    }
    let rightHtml = "";
    for (let i = 1; i <= ctx; i++) {
        const idx = currentIndex + i;
        if (idx < words.length) rightHtml += `<span class="shrink-0">${escapeHtml(words[idx])}</span>`;
    }

    contextLeftEl.innerHTML  = leftHtml;
    contextRightEl.innerHTML = rightHtml;

    progressBar.style.width = `${(currentIndex / words.length) * 100}%`;

    const hasTranslation = !!(translation && sentences.length);
    readerView.classList.toggle('has-translation', hasTranslation);

    if (hasTranslation) {
        const idx = findSentenceIdx(currentIndex);
        if (idx !== currentSentenceIdx) {
            currentSentenceIdx = idx;
            const t = idx >= 0 ? (translation.translations[idx] || '') : '';
            translationLineEl.textContent = t;
            translationLineEl.classList.toggle('visible', t.length > 0);
        }
    }
}

function advanceWord() {
    if (!isPlaying) return;

    updateDisplay();
    const word = words[currentIndex];

    let delay = 60000 / wpm;
    if      (word.endsWith('.') || word.endsWith('!') || word.endsWith('?')) delay *= 2.5;
    else if (word.endsWith(',') || word.endsWith(';') || word.endsWith(':')) delay *= 1.5;
    else if (word.length > 10)                                                delay *= 1.2;

    currentIndex++;
    if (currentIndex % 50 === 0) saveProgress();
    rsvpTimeout = setTimeout(advanceWord, delay);
}

function playRsvp() {
    if (currentIndex >= words.length) currentIndex = 0;
    isPlaying = true;
    hintEl.style.opacity = '0';
    advanceWord();
}

function pauseRsvp() {
    isPlaying = false;
    clearTimeout(rsvpTimeout);
    hintEl.style.opacity = '1';
    saveProgress();
}

function togglePlay() {
    if (isPlaying) pauseRsvp();
    else playRsvp();
}

function jumpToNextChapter() {
    const idx = chapters.findIndex(c => c.startIndex > currentIndex);
    if (idx !== -1) {
        currentIndex = chapters[idx].startIndex;
        updateDisplay();
        showWPM(chapters[idx].title);
    } else {
        showWPM("End of Book");
    }
}

function jumpToPrevChapter() {
    const nextIdx = chapters.findIndex(c => c.startIndex > currentIndex);
    let   chapIdx = nextIdx === -1 ? chapters.length - 1 : nextIdx - 1;

    if (chapIdx > 0 && currentIndex - chapters[chapIdx].startIndex < 20) chapIdx--;

    currentIndex = chapters[chapIdx].startIndex;
    updateDisplay();
    showWPM(chapters[chapIdx].title);
}

// --- Gestures ---

let wpmTimeout;
function showWPM(value) {
    wpmIndicator.textContent = `${value} WPM`;
    wpmIndicator.classList.remove('fade-out');
    wpmIndicator.classList.add('fade-in');
    clearTimeout(wpmTimeout);
    wpmTimeout = setTimeout(() => {
        wpmIndicator.classList.remove('fade-in');
        wpmIndicator.classList.add('fade-out');
    }, 1000);
}

readerView.addEventListener('pointerdown', (e) => {
    startY     = e.clientY;
    startX     = e.clientX;
    startWpm   = wpm;
    isDragging = false;
});

readerView.addEventListener('pointermove', (e) => {
    if (e.buttons === 0 && e.pointerType === 'mouse') return;

    const dy = e.clientY - startY;
    const dx = e.clientX - startX;

    if (Math.abs(dy) > 15 || Math.abs(dx) > 15) isDragging = true;

    if (isDragging && Math.abs(dy) > Math.abs(dx)) {
        wpm = Math.max(100, Math.min(1000, Math.floor(startWpm - (dy / 2))));
        showWPM(wpm);
    }
});

let lastTapTime = 0;

readerView.addEventListener('pointerup', (e) => {
    // Let hint's own click handler deal with it
    if (hintEl.contains(e.target)) {
        isDragging = false;
        return;
    }

    if (!isDragging) {
        const now    = Date.now();
        const tapX   = e.clientX;
        const screenW = window.innerWidth;

        if (now - lastTapTime < 300) {
            if (tapX < screenW * 0.2) {
                pauseRsvp();
                jumpToPrevChapter();
                lastTapTime = 0;
                isDragging  = false;
                return;
            } else if (tapX > screenW * 0.8) {
                pauseRsvp();
                jumpToNextChapter();
                lastTapTime = 0;
                isDragging  = false;
                return;
            }
        }

        lastTapTime = now;
        togglePlay();
    } else {
        const dx = e.clientX - startX;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - startY)) {
            pauseRsvp();
            currentIndex = dx > 0
                ? Math.min(words.length - 1, currentIndex + 50)
                : Math.max(0, currentIndex - 50);
            updateDisplay();
            showWPM("Scrubbed");
        }
    }
    isDragging = false;
});

// iOS haptic: click fires after real taps, not drags
readerView.addEventListener('click', () => {
    triggerHaptic();
});

// Hint tap opens library (stopPropagation prevents the reader's click haptic)
hintEl.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerHaptic();
    openLibrary();
});

// --- Keyboard ---

document.addEventListener('keydown', (e) => {
    if (readerView.style.display !== 'flex') return;

    if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
    } else if (e.code === 'ArrowUp') {
        wpm = Math.min(1000, wpm + 25);
        showWPM(wpm);
    } else if (e.code === 'ArrowDown') {
        wpm = Math.max(100, wpm - 25);
        showWPM(wpm);
    } else if (e.code === 'ArrowLeft') {
        pauseRsvp();
        currentIndex = Math.max(0, currentIndex - 20);
        updateDisplay();
    } else if (e.code === 'ArrowRight') {
        pauseRsvp();
        currentIndex = Math.min(words.length - 1, currentIndex + 20);
        updateDisplay();
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        pauseRsvp();
        saveProgress();
        if (wakeLock !== null) wakeLock.release().then(() => { wakeLock = null; });
    }
});

// --- Library Modal ---

async function openLibrary() {
    pauseRsvp();
    // Always open on the library grid, not the info view
    document.getElementById('library-grid').classList.remove('hidden');
    document.getElementById('library-info').classList.add('hidden');
    const infoBtn = document.getElementById('library-info-btn');
    infoBtn.innerHTML = '<i>i</i>';
    infoBtn.setAttribute('aria-label', 'Info');
    await renderLibrary();
    libraryModal.classList.remove('hidden');
}

function closeLibrary() {
    libraryModal.classList.add('hidden');
}

async function switchToSlot(slot) {
    await saveProgress();
    activeSlot = slot;
    await set(KEY_SLOT, activeSlot);

    const book = await get(bookKey(activeSlot));
    words        = book.words;
    sentences    = book.sentences?.length ? book.sentences : rebuildSentences(book.words);
    chapters     = book.chapters;
    currentTitle = book.title || '';
    currentCover = book.cover || null;

    const progress = await get(progressKey(activeSlot));
    currentIndex = progress?.currentIndex ?? 0;
    wpm          = progress?.wpm          ?? 300;

    const trans = await get(translationKey(activeSlot));
    translation        = trans?.translations?.length ? trans : null;
    currentSentenceIdx = -1;
    translationLineEl.textContent = '';
    translationLineEl.classList.remove('visible');

    updateDisplay();
}

async function renderLibrary() {
    for (const slot of [0, 1]) {
        const card = document.getElementById(`slot-card-${slot}`);
        const book = await get(bookKey(slot));

        card.className = 'book-card';
        if (slot === activeSlot) card.classList.add('active');
        card.innerHTML = '';

        if (book?.words?.length) {
            const coverDiv = document.createElement('div');
            coverDiv.className = 'book-card-cover';

            if (book.cover) {
                const img = document.createElement('img');
                img.src = book.cover;
                img.alt = '';
                coverDiv.appendChild(img);
            } else {
                coverDiv.innerHTML = bookPlaceholderSVG();
            }

            const titleDiv = document.createElement('div');
            titleDiv.className = 'book-card-title';
            titleDiv.textContent = book.title || 'Untitled';

            card.appendChild(coverDiv);
            card.appendChild(titleDiv);

            // T badge — filled if translation exists, outline if not
            const hasTrans = !!(await get(translationKey(slot)));
            const badge = document.createElement('div');
            badge.textContent = 'T';
            badge.className   = hasTrans ? 'translation-badge' : 'translation-badge translation-badge-empty';
            badge.title       = hasTrans ? 'Translation loaded — click to replace' : 'Load translation (.ullada)';
            badge.addEventListener('click', e => {
                e.stopPropagation();
                loadTranslationForSlot(slot);
            });
            card.appendChild(badge);
        } else {
            card.classList.add('empty');
            card.innerHTML = `<div class="book-card-empty"><span>empty</span></div>`;
        }
    }
}

function loadTranslationForSlot(slot) {
    libraryTUpload.dataset.slot = slot;
    libraryTUpload.value = '';
    libraryTUpload.click();
}

libraryTUpload.addEventListener('change', async () => {
    const file = libraryTUpload.files[0];
    if (!file) return;
    closeLibrary();
    await handleTranslationUpload(file);
});

function bookPlaceholderSVG() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>`;
}

// Slot card clicks
document.querySelectorAll('.book-card[data-slot]').forEach((card) => {
    card.addEventListener('click', async () => {
        triggerHaptic();
        const slot = parseInt(card.dataset.slot);
        const book = await get(bookKey(slot));

        if (book?.words?.length) {
            if (slot !== activeSlot) await switchToSlot(slot);
            closeLibrary();
            // Re-show reader if we switched
            if (readerView.style.display !== 'flex') startReadingSession();
        } else {
            // Empty slot: load new book into this slot
            activeSlot = slot;
            await set(KEY_SLOT, activeSlot);
            closeLibrary();
            loaderView.style.display = 'flex';
            readerView.style.display = 'none';
            epubUpload.value = '';
            epubUpload.click();
        }
    });
});

// New book card
document.getElementById('new-book-card').addEventListener('click', () => {
    triggerHaptic();
    closeLibrary();
    loaderView.style.display = 'flex';
    readerView.style.display = 'none';
    epubUpload.value = '';
    epubUpload.click();
});

// Info toggle
document.getElementById('library-info-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    triggerHaptic();
    const grid    = document.getElementById('library-grid');
    const info    = document.getElementById('library-info');
    const btn     = e.currentTarget;
    const showing = !info.classList.contains('hidden');
    info.classList.toggle('hidden', showing);
    grid.classList.toggle('hidden', !showing);
    btn.innerHTML = showing ? '<i>i</i>' : '&#x2039;';
    btn.setAttribute('aria-label', showing ? 'Info' : 'Back to library');
});

// Close button and backdrop
document.getElementById('library-close').addEventListener('click', (e) => {
    e.stopPropagation();
    triggerHaptic();
    closeLibrary();
});

document.getElementById('library-backdrop').addEventListener('click', () => {
    closeLibrary();
});
