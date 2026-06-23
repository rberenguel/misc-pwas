import { PAO_PEGS, PHOSPHOR_ICONS, majorHintDigits } from './data.js';
import { recordSession } from './stats.js';
import { renderStats, initStatsWiring } from './ui-stats.js';
import { initHaptic, triggerHaptic, triggerHapticError } from '../libs/haptic.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function icon(name) {
    return `<i class="ph-light ph-${name}"></i>`;
}

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
    activeMode: 0,
    drillLength: 0,
    targetSequence: [],
    testSequence: [],
    testLength: 0,
    currentIndex: 0,
    mode1Score: 0,
    // Timing
    sessionStartTime: 0,
    stepStartTime: 0,
    phaseStartTime: 0,
    // Mode 1
    m1Cards: [],
    m1RevealTime: 0,
    m1CurrentQType: 'number',
    // Mode 2
    iconDurations: [],
    // Mode 3
    m3Encoded: [],
};

// ── Navigation ────────────────────────────────────────────────────────────────

// ── Result overlay ────────────────────────────────────────────────────────────

let _resultCb = null;
function showResult(msg, cb) {
    _resultCb = cb;
    document.getElementById('result-text').textContent = msg;
    document.getElementById('result-overlay').hidden = false;
}
document.getElementById('result-overlay').addEventListener('click', () => {
    document.getElementById('result-overlay').hidden = true;
    const cb = _resultCb;
    _resultCb = null;
    if (cb) cb();
});

// ── Navigation ────────────────────────────────────────────────────────────────

function navTo(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    document.getElementById('btn-global-x').classList.toggle('visible', screenId !== 'screen-menu');
}

// ── Mode 1 ────────────────────────────────────────────────────────────────────

function startMode1(length) {
    state.drillLength = length;
    state.currentIndex = 0;
    state.mode1Score = 0;
    state.m1Cards = [];
    state.sessionStartTime = Date.now();
    const nums = Array.from({ length: 100 }, (_, i) => i);
    state.targetSequence = shuffle(nums).slice(0, length);
    renderMode1Card();
    navTo('screen-mode1-drill');
}

const M1_QTYPES = ['number', 'person', 'action', 'object'];

function renderMode1Card() {
    const step = state.currentIndex;
    const num = state.targetSequence[step];
    document.getElementById('mode1-progress-fill').style.width = `${(step / state.drillLength) * 100}%`;
    document.getElementById('mode1-progress-label').textContent = `${step + 1} / ${state.drillLength}`;

    const pao = PAO_PEGS[num];
    const qtype = M1_QTYPES[Math.floor(Math.random() * 4)];
    state.m1CurrentQType = qtype;

    document.getElementById('flashcard-person').textContent = pao.person || '—';
    document.getElementById('flashcard-action').textContent = pao.action || '—';
    document.getElementById('flashcard-object').textContent = pao.object || '—';
    document.getElementById('flashcard-answer-num').textContent = num;
    document.getElementById('flashcard-hint').innerHTML = majorHintDigits(num)
        .map(c => `<span class="hint-badge">${c}</span>`)
        .join('');

    const show = el => { el.style.display = ''; };
    const hide = el => { el.style.display = 'none'; };

    const elNum    = document.getElementById('flashcard-number');
    const elPrompt = document.getElementById('flashcard-pao-prompt');
    const elRowNum = document.getElementById('flashcard-row-num');
    const elRowP   = document.getElementById('flashcard-row-p');
    const elRowA   = document.getElementById('flashcard-row-a');
    const elRowO   = document.getElementById('flashcard-row-o');
    const elHint   = document.getElementById('flashcard-hint');

    if (qtype === 'number') {
        elNum.textContent = num;
        show(elNum); hide(elPrompt); hide(elRowNum);
        show(elRowP); show(elRowA); show(elRowO);
        show(elHint);
    } else {
        hide(elNum); show(elPrompt); show(elRowNum);
        hide(elRowP); hide(elRowA); hide(elRowO);
        hide(elHint);
        const vals = { person: pao.person, action: pao.action, object: pao.object };
        document.getElementById('flashcard-prompt-value').textContent = vals[qtype] || '—';
    }

    document.getElementById('flashcard').classList.remove('revealed');
    document.getElementById('mode1-controls').classList.remove('active');
    state.stepStartTime = Date.now();
}

function revealMode1Card() {
    triggerHaptic();
    state.m1RevealTime = Date.now() - state.stepStartTime;
    document.getElementById('flashcard').classList.add('revealed');
    document.getElementById('mode1-controls').classList.add('active');
}

async function scoreMode1(correct) {
    triggerHaptic();
    const num = state.targetSequence[state.currentIndex];
    state.m1Cards.push({ num, revealMs: state.m1RevealTime, correct, questionType: state.m1CurrentQType });
    if (correct) state.mode1Score++;
    state.currentIndex++;

    if (state.currentIndex >= state.drillLength) {
        const totalMs = Date.now() - state.sessionStartTime;
        await recordSession({ mode: 1, drillLength: state.drillLength, totalMs, cards: state.m1Cards });
        showResult(`${state.mode1Score} / ${state.drillLength}`, () => navTo('screen-menu'));
    } else {
        renderMode1Card();
    }
}

// ── Mode 2 ────────────────────────────────────────────────────────────────────

function startMode2(length) {
    state.activeMode = 2;
    state.drillLength = length;
    state.currentIndex = 0;
    state.iconDurations = [];
    state.sessionStartTime = Date.now();
    state.targetSequence = shuffle([...PHOSPHOR_ICONS]).slice(0, length);
    document.getElementById('m3-extras').style.display = 'none';
    renderEncodingStep();
    navTo('screen-encoding');
}

// ── Mode 3 ────────────────────────────────────────────────────────────────────

function startMode3(length) {
    state.activeMode = 3;
    state.currentIndex = 0;
    state.m3Encoded = [];
    state.sessionStartTime = Date.now();

    const allPegs = shuffle(Array.from({ length: 100 }, (_, i) => i));
    const encodedPegs = allPegs.slice(0, length);
    const shuffledIcons = shuffle([...PHOSPHOR_ICONS]).slice(0, length);

    state.targetSequence = encodedPegs.map((pegNum, idx) => ({
        pegNum,
        pegPerson: PAO_PEGS[pegNum].person,
        icon: shuffledIcons[idx]
    }));

    const unencodedCount = Math.floor(length / 2);
    const unencodedPegs = allPegs.slice(length, length + unencodedCount);
    const unencodedItems = unencodedPegs.map(pegNum => ({
        pegNum,
        pegPerson: PAO_PEGS[pegNum].person,
        icon: 'EMPTY'
    }));

    state.testSequence = shuffle([...state.targetSequence, ...unencodedItems]);
    state.drillLength = length;

    document.getElementById('m3-extras').style.display = 'block';
    renderEncodingStep();
    navTo('screen-encoding');
}

// ── Shared encoding ───────────────────────────────────────────────────────────

function renderEncodingStep() {
    const step = state.currentIndex;
    document.getElementById('encoding-counter').textContent = `${step + 1} / ${state.drillLength}`;
    document.getElementById('encoding-progress-fill').style.width = `${(step / state.drillLength) * 100}%`;
    state.stepStartTime = Date.now();

    if (state.activeMode === 2) {
        document.getElementById('big-icon-view').innerHTML = icon(state.targetSequence[step]);
    } else {
        const cur = state.targetSequence[step];
        document.getElementById('m3-peg-text').textContent = `${cur.pegNum} — ${cur.pegPerson || '—'}`;
        document.getElementById('big-icon-view').innerHTML = icon(cur.icon);
    }
}

function nextEncodingIcon() {
    triggerHaptic();
    const elapsed = Date.now() - state.stepStartTime;

    if (state.activeMode === 2) {
        state.iconDurations.push(elapsed);
    } else {
        const cur = state.targetSequence[state.currentIndex];
        state.m3Encoded.push({ pegNum: cur.pegNum, icon: cur.icon, encodingMs: elapsed });
    }

    state.currentIndex++;
    if (state.currentIndex >= state.drillLength) {
        startDecodingPhase();
    } else {
        renderEncodingStep();
    }
}

// ── Shared decoding ───────────────────────────────────────────────────────────

function startDecodingPhase() {
    state.currentIndex = 0;
    state.testLength = state.activeMode === 3 ? state.testSequence.length : state.drillLength;
    state.phaseStartTime = Date.now();

    const emptyBtn = document.getElementById('btn-empty');
    emptyBtn.style.display = state.activeMode === 3 ? 'block' : 'none';

    updateDecodingPrompt();

    const grid = document.getElementById('decoding-grid');
    grid.innerHTML = '';
    shuffle([...PHOSPHOR_ICONS]).forEach(iconName => {
        const div = document.createElement('div');
        div.className = 'grid-item';
        div.innerHTML = icon(iconName);
        div.addEventListener('click', () => handleGridTap(iconName, div));
        grid.appendChild(div);
    });

    navTo('screen-decoding');
    state.stepStartTime = Date.now();
}

function updateDecodingPrompt() {
    const step = state.currentIndex;
    if (state.activeMode === 2) {
        document.getElementById('decoding-prompt').textContent = `Recall icon ${step + 1} of ${state.testLength}`;
    } else {
        const t = state.testSequence[step];
        document.getElementById('decoding-prompt').innerHTML =
            `What was at<br><span class="prompt-peg">${t.pegNum} — ${t.pegPerson || '—'}</span>?`;
    }
}

const m2TestResults = [];
const m3TestResults = [];

function handleGridTap(tappedIcon, element) {
    triggerHaptic();
    state.stepStartTime; // already set

    let expected;
    if (state.activeMode === 2) {
        expected = state.targetSequence[state.currentIndex];
    } else {
        expected = state.testSequence[state.currentIndex].icon;
    }

    const responseMs = Date.now() - state.stepStartTime;

    if (tappedIcon === expected) {
        if (element.id !== 'btn-empty') {
            element.classList.add('disabled');
            element.style.borderColor = 'var(--success)';
            element.style.color = 'var(--success)';
        }

        if (state.activeMode === 3) {
            const t = state.testSequence[state.currentIndex];
            m3TestResults.push({ pegNum: t.pegNum, expected: t.icon, tapped: tappedIcon, correct: true, responseMs, wasGhost: t.icon === 'EMPTY' });
        } else {
            m2TestResults.push({ correct: true, responseMs });
        }

        state.currentIndex++;
        state.stepStartTime = Date.now();

        if (state.currentIndex >= state.testLength) {
            finishDrill(true);
        } else {
            updateDecodingPrompt();
        }
    } else {
        triggerHapticError();

        if (state.activeMode === 3) {
            const t = state.testSequence[state.currentIndex];
            m3TestResults.push({ pegNum: t.pegNum, expected: t.icon, tapped: tappedIcon, correct: false, responseMs, wasGhost: t.icon === 'EMPTY' });
        }

        element.style.backgroundColor = 'var(--error)';
        setTimeout(() => {
            showResult('Wrong!', () => finishDrill(false));
        }, 150);
    }
}

function finishDrill(success) {
    const totalMs = Date.now() - state.sessionStartTime;

    if (state.activeMode === 2) {
        const encodingMs = state.iconDurations.reduce((a, b) => a + b, 0);
        const decodingMs = Date.now() - state.phaseStartTime;
        recordSession({
            mode: 2,
            sequenceLength: state.drillLength,
            success,
            wrongTaps: success ? 0 : 1,
            encodingMs,
            decodingMs,
            iconDurations: [...state.iconDurations],
            totalMs
        });
        m2TestResults.length = 0;
        if (success) { showResult('Perfect!', () => navTo('screen-menu')); return; }
    } else {
        recordSession({
            mode: 3,
            blockSize: state.drillLength,
            encoded: [...state.m3Encoded],
            tested: [...m3TestResults],
            totalMs
        });
        m3TestResults.length = 0;
        if (success) { showResult('Perfect!', () => navTo('screen-menu')); return; }
    }

    navTo('screen-menu');
}

// ── Stats screen ──────────────────────────────────────────────────────────────

async function openStats() {
    // Reset tabs to overview
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('.tab-btn[data-tab="overview"]').classList.add('active');
    document.getElementById('tab-overview').classList.add('active');
    navTo('screen-stats');
    await renderStats();
}

// ── Wiring ────────────────────────────────────────────────────────────────────

function wire(id, fn) {
    document.getElementById(id).addEventListener('click', fn);
}

function wireAll() {
    // Menu
    wire('btn-menu-mode1',  () => { triggerHaptic(); navTo('screen-mode1-setup'); });
    wire('btn-menu-mode2',  () => { triggerHaptic(); navTo('screen-mode2-setup'); });
    wire('btn-menu-mode3',  () => { triggerHaptic(); navTo('screen-mode3-setup'); });
    wire('btn-menu-stats',  () => { triggerHaptic(); openStats(); });

    // Global X — always goes back to menu
    wire('btn-global-x', () => { triggerHaptic(); navTo('screen-menu'); });

    // Mode 1 setup
    wire('btn-m1-20',  () => { triggerHaptic(); startMode1(20); });
    wire('btn-m1-50',  () => { triggerHaptic(); startMode1(50); });
    wire('btn-m1-100', () => { triggerHaptic(); startMode1(100); });

    // Mode 1 drill
    wire('flashcard',   revealMode1Card);
    wire('btn-m1-fail', () => scoreMode1(false));
    wire('btn-m1-pass', () => scoreMode1(true));

    // Mode 2 setup
    wire('btn-m2-20',  () => { triggerHaptic(); startMode2(20); });
    wire('btn-m2-50',  () => { triggerHaptic(); startMode2(50); });
    wire('btn-m2-100', () => { triggerHaptic(); startMode2(100); });

    // Mode 3 setup
    wire('btn-m3-10',  () => { triggerHaptic(); startMode3(10); });
    wire('btn-m3-20',  () => { triggerHaptic(); startMode3(20); });
    wire('btn-m3-50',  () => { triggerHaptic(); startMode3(50); });

    // Encoding
    wire('big-icon-view', nextEncodingIcon);

    // Decoding
    wire('btn-empty', () => handleGridTap('EMPTY', document.getElementById('btn-empty')));
}

// ── Init ──────────────────────────────────────────────────────────────────────

initHaptic();
wireAll();
initStatsWiring(() => renderStats());

fetch('manifest.json')
    .then(r => r.json())
    .then(m => {
        if (m.version) document.getElementById('app-version').textContent = 'v' + m.version;
    })
    .catch(() => {});
