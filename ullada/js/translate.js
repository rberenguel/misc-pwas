import { splitSentences } from '../lib/sentences.js';

// --- State ---
let bookTitle    = '';
let bookCover    = null;   // base64 data-URL or null
let words        = [];
let sentenceRanges = [];   // [{start,end}] — stored in output, used by reader
let sentenceTexts  = [];   // parallel string array — used for translation
let chapters     = [];
let translations = [];

let isTranslating     = false;
let isPaused          = false;
let translator        = null;
let consecutiveErrors = 0;

// --- DOM ---
const uploadZone    = document.getElementById('upload-zone');
const epubInput     = document.getElementById('epub-input');
const filenameDisplay = document.getElementById('filename-display');
const sentenceInfo  = document.getElementById('sentence-info');
const sentenceCount = document.getElementById('sentence-count');
const srcLang       = document.getElementById('src-lang');
const tgtLang       = document.getElementById('tgt-lang');
const btnStart      = document.getElementById('btn-start');
const btnPause      = document.getElementById('btn-pause');
const btnDownload   = document.getElementById('btn-download');
const progressSection = document.getElementById('progress-section');
const progressLabel   = document.getElementById('progress-label');
const progressFill    = document.getElementById('progress-fill');
const currentSentenceDisplay = document.getElementById('current-sentence-display');
const modelProgress = document.getElementById('model-progress');
const statusMsg     = document.getElementById('status-msg');
const apiWarning    = document.getElementById('api-warning');

// --- API availability ---

if (typeof self.Translator === 'undefined') {
    apiWarning.style.display = 'block';
} else {
    checkPairAvailability();
}

async function checkPairAvailability() {
    try {
        const avail = await self.Translator.availability({
            sourceLanguage: srcLang.value,
            targetLanguage: tgtLang.value,
        });
        if (avail === 'unavailable') {
            statusMsg.textContent = 'This language pair is not supported by the built-in model.';
        }
    } catch (_) {}
}

srcLang.addEventListener('change', () => { translator = null; checkPairAvailability(); });
tgtLang.addEventListener('change', () => { translator = null; checkPairAvailability(); });

// --- EPUB loading ---

uploadZone.addEventListener('click', () => epubInput.click());

epubInput.addEventListener('change', handleEpubLoad);

window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file?.name.toLowerCase().endsWith('.epub')) {
        epubInput.files = e.dataTransfer.files;
        handleEpubLoad();
    }
});

async function handleEpubLoad() {
    const file = epubInput.files[0];
    if (!file) return;

    filenameDisplay.textContent = file.name;
    uploadZone.classList.add('loaded');
    statusMsg.textContent = 'Parsing EPUB…';
    btnStart.disabled = true;
    sentenceInfo.style.display = 'none';

    try {
        const result  = await extractBookData(file);
        bookTitle     = result.title;
        bookCover     = result.cover;
        words         = result.words;
        sentenceRanges = result.sentences;
        sentenceTexts  = result.sentenceTexts;
        chapters      = result.chapters;
        translations  = [];
        progressFill.style.width = '0%';

        sentenceCount.textContent =
            `"${bookTitle}" — ${words.length.toLocaleString()} words, ${sentenceTexts.length.toLocaleString()} sentences`;
        sentenceInfo.style.display = 'block';
        statusMsg.textContent = '';
        btnStart.disabled = typeof self.Translator === 'undefined';
        btnDownload.disabled = true;
    } catch (err) {
        statusMsg.textContent = `Failed to parse EPUB: ${err.message}`;
    }
}

// --- Translation ---

btnStart.addEventListener('click', startTranslation);

btnPause.addEventListener('click', () => {
    if (isTranslating) {
        isPaused      = true;
        isTranslating = false;
        btnPause.textContent = 'Resume';
        statusMsg.textContent = `Paused at sentence ${translations.length} / ${sentenceTexts.length}.`;
    } else {
        isPaused = false;
        btnPause.textContent = 'Pause';
        statusMsg.textContent = '';
        startTranslation();
    }
});

btnDownload.addEventListener('click', downloadResult);

async function startTranslation() {
    if (!sentenceTexts.length) return;

    isTranslating     = true;
    isPaused          = false;
    consecutiveErrors = 0;

    btnStart.style.display = 'none';
    btnPause.style.display = 'inline-block';
    btnPause.textContent   = 'Pause';
    progressSection.style.display = 'flex';
    statusMsg.textContent = '';

    if (!translator) {
        modelProgress.textContent = 'Loading translation model…';
        try {
            translator = await self.Translator.create({
                sourceLanguage: srcLang.value,
                targetLanguage: tgtLang.value,
                monitor(m) {
                    m.addEventListener('downloadprogress', e => {
                        modelProgress.textContent = `Downloading model: ${Math.floor(e.loaded * 100)}%`;
                    });
                },
            });
            modelProgress.textContent = '';
        } catch (err) {
            modelProgress.textContent = '';
            statusMsg.textContent = `Could not load model: ${err.message}`;
            isTranslating = false;
            btnStart.style.display = 'inline-block';
            btnPause.style.display = 'none';
            return;
        }
    }

    const durations  = [];
    const resumeFrom = translations.length;

    for (let i = resumeFrom; i < sentenceTexts.length; i++) {
        if (!isTranslating) break;

        currentSentenceDisplay.textContent = sentenceTexts[i];
        const t0 = Date.now();

        try {
            translations[i] = await translateSentence(sentenceTexts[i]);
            consecutiveErrors = 0;
        } catch (err) {
            translations[i] = '';
            consecutiveErrors++;
            if (consecutiveErrors >= 5) {
                isTranslating = false;
                statusMsg.textContent = `Stopped after 5 consecutive errors. Last: ${err.message}`;
                break;
            }
        }

        durations.push(Date.now() - t0);
        if (durations.length > 20) durations.shift();

        const pct       = ((i + 1) / sentenceTexts.length) * 100;
        const avgMs     = durations.reduce((a, b) => a + b, 0) / durations.length;
        const remaining = Math.round(avgMs * (sentenceTexts.length - i - 1) / 1000);

        progressFill.style.width  = `${pct.toFixed(1)}%`;
        progressLabel.textContent =
            `Sentence ${(i + 1).toLocaleString()} / ${sentenceTexts.length.toLocaleString()} — ${formatTime(remaining)} remaining`;

        btnDownload.disabled = false;
    }

    const complete = isTranslating && translations.length >= sentenceTexts.length;
    isTranslating = false;

    if (complete) {
        btnPause.style.display  = 'none';
        btnStart.style.display  = 'inline-block';
        btnStart.textContent    = 'Done';
        btnStart.disabled       = true;
        progressLabel.textContent = `Complete — ${sentenceTexts.length.toLocaleString()} sentences translated`;
        currentSentenceDisplay.textContent = '';
    } else if (!isPaused) {
        btnPause.style.display = 'none';
        btnStart.style.display = 'inline-block';
    }
}

async function translateSentence(text) {
    const stream = translator.translateStreaming(text);
    let result = '';
    for await (const chunk of stream) result = chunk;
    return result;
}

function formatTime(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60), s = seconds % 60;
    return `${m}m ${s}s`;
}

function downloadResult() {
    const output = {
        version:      2,
        title:        bookTitle,
        source:       srcLang.value,
        target:       tgtLang.value,
        cover:        bookCover,
        words,
        sentences:    sentenceRanges,
        chapters,
        translations,
    };
    const blob = new Blob([JSON.stringify(output)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), {
        href:     url,
        download: `${bookTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_')}.ullada`,
    });
    a.click();
    URL.revokeObjectURL(url);
}

// --- EPUB extraction ---

async function blobToDataUrl(blob) {
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
    });
}

async function extractBookData(file) {
    const zip = await JSZip.loadAsync(file);

    const containerData = await zip.file('META-INF/container.xml').async('string');
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerData, 'text/xml');

    const opfPath   = containerDoc.getElementsByTagName('rootfile')[0].getAttribute('full-path');
    const opfFolder = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

    const opfData = await zip.file(opfPath).async('string');
    const opfDoc  = parser.parseFromString(opfData, 'text/xml');

    const dcTitleEl = opfDoc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', 'title')[0]
                   || opfDoc.getElementsByTagName('dc:title')[0];
    const title = dcTitleEl?.textContent?.trim() || file.name.replace(/\.epub$/i, '');

    const cover = await extractCover(zip, opfDoc, opfFolder);

    const manifest = {};
    const items    = opfDoc.getElementsByTagName('item');
    for (let i = 0; i < items.length; i++) {
        manifest[items[i].getAttribute('id')] = {
            href:      items[i].getAttribute('href'),
            mediaType: items[i].getAttribute('media-type') || '',
        };
    }

    const spineItems = opfDoc.getElementsByTagName('itemref');
    const spine = [];
    for (let i = 0; i < spineItems.length; i++) spine.push(spineItems[i].getAttribute('idref'));

    const allWords        = [];
    const allSentences    = [];   // {start, end}[]
    const allSentTexts    = [];   // string[]
    const allChapters     = [];

    for (const idref of spine) {
        const item = manifest[idref];
        if (!item) continue;

        const filePath  = opfFolder + decodeURIComponent(item.href);
        const fileEntry = zip.file(filePath);
        if (!fileEntry) continue;

        const htmlData = await fileEntry.async('string');
        const htmlDoc  = parser.parseFromString(htmlData, 'text/html');
        const rawText  = (htmlDoc.body.innerText || htmlDoc.body.textContent || '').trim();
        if (!rawText) continue;

        const sectionStart = allWords.length;
        const rawSents     = splitSentences(rawText);

        for (const sent of rawSents) {
            const sentWords = sent.split(/\s+/).filter(w => w.length > 0);
            if (sentWords.length === 0) continue;
            allSentences.push({ start: allWords.length, end: allWords.length + sentWords.length - 1 });
            allSentTexts.push(sent);
            allWords.push(...sentWords);
        }

        if (allWords.length > sectionStart) {
            let chapTitle = htmlDoc.querySelector('title')?.textContent ||
                            htmlDoc.querySelector('h1')?.textContent ||
                            htmlDoc.querySelector('h2')?.textContent ||
                            `Section ${allChapters.length + 1}`;
            chapTitle = chapTitle.trim().replace(/\s+/g, ' ');
            if (chapTitle.length > 35) chapTitle = chapTitle.substring(0, 35) + '...';
            allChapters.push({ title: chapTitle, startIndex: sectionStart });
        }
    }

    return { title, cover, words: allWords, sentences: allSentences, sentenceTexts: allSentTexts, chapters: allChapters };
}

async function extractCover(zip, opfDoc, opfFolder) {
    const items = opfDoc.getElementsByTagName('item');
    let coverHref = null;

    for (let i = 0; i < items.length; i++) {
        if ((items[i].getAttribute('properties') || '').includes('cover-image')) {
            coverHref = items[i].getAttribute('href');
            break;
        }
    }

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
        const fileEntry = zip.file(opfFolder + decodeURIComponent(coverHref));
        if (!fileEntry) return null;
        return await blobToDataUrl(await fileEntry.async('blob'));
    } catch { return null; }
}
