const totalPhrases = 8; // 8 phrases = 128 steps
const totalSteps = totalPhrases * 16;
const totalRows = 36; // 3 octaves (C3 to B5)

const grid = document.getElementById('grid');
const keys = document.getElementById('piano-keys');
const scrollWrapper = document.getElementById('scroll-wrapper');

let audioCtx;
let playInterval;
let currentStep = 0;
let isPlaying = false;
const tempo = 120;
const stepTimeMs = (60 / tempo) / 4 * 1000;

// Sustained audio state variables
let activeVoice = null;
let activeRow = null;

// Builds a small two-oscillator, filtered "voice". Two slightly
// detuned square waves through a lowpass filter round off the
// harshness of a bare square wave and give it a bit of body,
// while a filter-cutoff envelope adds a soft pluck on attack.
function createVoice(freq) {
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  osc1.type = 'square';
  osc2.type = 'square';
  osc1.frequency.value = freq;
  osc2.frequency.value = freq;
  osc2.detune.value = 9; // gentle detune for warmth, not chorus-y

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = 1.2;

  const gain = audioCtx.createGain();

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);

  return { osc1, osc2, filter, gain };
}

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function getNoteName(row) {
  const midiNote = 48 + (35 - row);
  const names = ['C-', 'C#', 'D-', 'D#', 'E-', 'F-', 'F#', 'G-', 'G#', 'A-', 'A#', 'B-'];
  const note = names[midiNote % 12];
  const octave = Math.floor(midiNote / 12) - 1;
  return note + octave;
}

function rowToFreq(row) {
  const midiNote = 48 + (35 - row);
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// 1. Build the Y-Axis Piano Keys
for (let r = 0; r < totalRows; r++) {
  const div = document.createElement('div');
  const midiNote = 48 + (35 - r);
  const isBlackKey = [1, 3, 6, 8, 10].includes(midiNote % 12);

  div.className = 'key ' + (isBlackKey ? 'black' : 'white');
  div.innerText = isBlackKey ? '' : getNoteName(r);
  keys.appendChild(div);
}

// 2. Build the DOM Grid
grid.style.gridTemplateColumns = `repeat(${totalSteps}, 40px)`;

for (let r = 0; r < totalRows; r++) {
  for (let c = 0; c < totalSteps; c++) {
    const cell = document.createElement('div');

    cell.className = 'cell' + ((c + 1) % 16 === 0 ? ' boundary' : '');
    cell.dataset.col = c;
    cell.dataset.row = r;

    cell.addEventListener('click', function(e) {
      e.preventDefault();
      initAudio();

      const isCurrentlyActive = this.classList.contains('active');

      // Enforce monophony
      document.querySelectorAll(`.cell[data-col="${c}"]`).forEach(el => {
        el.classList.remove('active');
        el.innerText = '';
      });

      if (!isCurrentlyActive) {
        this.classList.add('active');
        this.innerText = getNoteName(r);
        playPreviewTone(r);
      }

      saveCurrentSong();
    });

    grid.appendChild(cell);
  }
}

// 3. Audio System (Separated for previews vs sequencer)

// Quick tone for tapping/drawing
function playPreviewTone(row) {
  if (isPlaying) return; // Don't interrupt sequencer playback
  const freq = rowToFreq(row);
  const now = audioCtx.currentTime;
  const { osc1, osc2, filter, gain } = createVoice(freq);

  // Filter opens bright on attack then closes down - a soft "pluck"
  const brightCutoff = Math.min(freq * 10, 9000);
  const dullCutoff = Math.max(freq * 2.5, 500);
  filter.frequency.setValueAtTime(brightCutoff, now);
  filter.frequency.exponentialRampToValueAtTime(dullCutoff, now + 0.16);

  gain.gain.setValueAtTime(0.14, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

  osc1.start();
  osc2.start();
  osc1.stop(now + 0.22);
  osc2.stop(now + 0.22);
}

// Sustained tone for the sequencer
function startSequencerTone(row) {
  if (activeVoice) stopSequencerTone();

  activeRow = row;
  const freq = rowToFreq(row);
  const now = audioCtx.currentTime;
  activeVoice = createVoice(freq);
  const { osc1, osc2, filter, gain } = activeVoice;

  // Filter opens on attack then settles to a rounder sustain tone
  const brightCutoff = Math.min(freq * 8, 7000);
  const sustainCutoff = Math.max(freq * 3.5, 600);
  filter.frequency.setValueAtTime(brightCutoff, now);
  filter.frequency.exponentialRampToValueAtTime(sustainCutoff, now + 0.08);

  // Fast attack, hold sustain
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.01);

  osc1.start();
  osc2.start();
}

function stopSequencerTone() {
  if (!activeVoice) return;
  const { osc1, osc2, gain } = activeVoice;
  const now = audioCtx.currentTime;

  // Quick release to avoid popping
  gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
  osc1.stop(now + 0.06);
  osc2.stop(now + 0.06);

  activeVoice = null;
  activeRow = null;
}

// 4. Sequencer Playback
function playStep() {
  document.querySelectorAll('.cell.playing').forEach(el => el.classList.remove('playing'));

  const currentCells = document.querySelectorAll(`.cell[data-col="${currentStep}"]`);
  currentCells.forEach(el => el.classList.add('playing'));

  const activeCell = document.querySelector(`.cell.active[data-col="${currentStep}"]`);

  if (activeCell) {
    const row = parseInt(activeCell.dataset.row);
    // If the row changed, restart the tone. If it's the same, let it keep ringing!
    if (row !== activeRow) {
      startSequencerTone(row);
    }
  } else {
    // Empty step, silence output
    stopSequencerTone();
  }

  // Auto-scroll logic
  if (currentCells.length > 0) {
    const colElement = currentCells[0];
    const colLeft = colElement.offsetLeft;
    if (colLeft > scrollWrapper.scrollLeft + scrollWrapper.clientWidth - 100 || colLeft < scrollWrapper.scrollLeft) {
      scrollWrapper.scrollTo({ left: colLeft - 40, behavior: 'smooth' });
    }
  }

  currentStep = (currentStep + 1) % totalSteps;

  // If we reach the end of the grid, stop
  if (currentStep === 0) {
    document.getElementById('btnStop').click();
  }
}

// 5. Toolbar Buttons
document.getElementById('btnPlay').addEventListener('click', () => {
  initAudio();
  if (!isPlaying) {
    isPlaying = true;
    currentStep = Math.floor(scrollWrapper.scrollLeft / 40);
    playStep();
    playInterval = setInterval(playStep, stepTimeMs);
  }
});

document.getElementById('btnStop').addEventListener('click', () => {
  isPlaying = false;
  clearInterval(playInterval);
  document.querySelectorAll('.cell.playing').forEach(el => el.classList.remove('playing'));
  stopSequencerTone();
});

document.getElementById('btnClear').addEventListener('click', () => {
  document.querySelectorAll('.cell.active').forEach(el => {
    el.classList.remove('active');
    el.innerText = '';
  });
  if (!isPlaying) stopSequencerTone();
  saveCurrentSong();
});

// 6. Export to LSDJ-style note table
// Straight reflection of what's on the grid: a note where you placed
// one, empty where you didn't. No inference about ties or cuts.
function computeExportEvents() {
  const events = []; // { type: 'note'|'empty', label }

  for (let c = 0; c < totalSteps; c++) {
    const activeCell = document.querySelector(`.cell.active[data-col="${c}"]`);
    if (activeCell) {
      const row = parseInt(activeCell.dataset.row);
      events.push({ type: 'note', label: getNoteName(row) });
    } else {
      events.push({ type: 'empty', label: '' });
    }
  }
  return events;
}

function renderExportTable(events) {
  const table = document.getElementById('exportTable');
  table.innerHTML = '';

  for (let c = 0; c < totalSteps; c++) {
    const tr = document.createElement('tr');
    if ((c + 1) % 16 === 0) tr.className = 'boundary';

    const stepCell = document.createElement('td');
    stepCell.className = 'step';
    stepCell.innerText = String(c).padStart(3, '0');
    tr.appendChild(stepCell);

    const ev = events[c];
    const noteCell = document.createElement('td');
    noteCell.className = ev.type;
    noteCell.innerText = ev.label;
    tr.appendChild(noteCell);

    table.appendChild(tr);
  }
}

document.getElementById('btnExport').addEventListener('click', () => {
  const events = computeExportEvents();
  renderExportTable(events);
  document.getElementById('exportModal').classList.add('open');
});

document.getElementById('btnCloseExport').addEventListener('click', () => {
  document.getElementById('exportModal').classList.remove('open');
});

// 7. Song slots (0-9), persisted to localStorage
const SONG_KEY_PREFIX = 'lsdjJotterSong_';
const CURRENT_SLOT_KEY = 'lsdjJotterCurrentSlot';
let currentSlot = 0;

function songKey(slot) {
  return SONG_KEY_PREFIX + slot;
}

// Captures just what's needed to rebuild the grid: the active row
// (or null) for every column, in order.
function serializeGrid() {
  const notes = [];
  for (let c = 0; c < totalSteps; c++) {
    const activeCell = document.querySelector(`.cell.active[data-col="${c}"]`);
    notes.push(activeCell ? parseInt(activeCell.dataset.row) : null);
  }
  return notes;
}

function applyGridState(notes) {
  document.querySelectorAll('.cell.active').forEach(el => {
    el.classList.remove('active');
    el.innerText = '';
  });
  if (!notes) return;
  notes.forEach((row, c) => {
    if (row === null || row === undefined) return;
    const cell = document.querySelector(`.cell[data-col="${c}"][data-row="${row}"]`);
    if (cell) {
      cell.classList.add('active');
      cell.innerText = getNoteName(row);
    }
  });
}

function saveCurrentSong() {
  try {
    localStorage.setItem(songKey(currentSlot), JSON.stringify(serializeGrid()));
  } catch (e) {
    // Storage unavailable (private browsing, quota, etc) - fail silently
  }
  updateSlotLabels();
}

function loadSong(slot) {
  let notes = null;
  try {
    const raw = localStorage.getItem(songKey(slot));
    if (raw) notes = JSON.parse(raw);
  } catch (e) {
    notes = null;
  }
  applyGridState(notes);
}

// Populate the slot dropdown
const slotSelect = document.getElementById('slotSelect');
for (let s = 0; s < 10; s++) {
  const opt = document.createElement('option');
  opt.value = s;
  slotSelect.appendChild(opt);
}

function isSongNonEmpty(slot) {
  try {
    const raw = localStorage.getItem(songKey(slot));
    if (!raw) return false;
    const notes = JSON.parse(raw);
    return Array.isArray(notes) && notes.some(n => n !== null && n !== undefined);
  } catch (e) {
    return false;
  }
}

function updateSlotLabels() {
  Array.from(slotSelect.options).forEach(opt => {
    const s = parseInt(opt.value);
    opt.innerText = (isSongNonEmpty(s) ? '\u00B7 ' : '') + 'Song ' + s;
  });
}

slotSelect.addEventListener('change', () => {
  if (isPlaying) document.getElementById('btnStop').click();
  currentSlot = parseInt(slotSelect.value);
  try {
    localStorage.setItem(CURRENT_SLOT_KEY, currentSlot);
  } catch (e) {}
  loadSong(currentSlot);
});

// Restore last-used slot (default 0) and its saved song, if any
try {
  const savedSlot = localStorage.getItem(CURRENT_SLOT_KEY);
  if (savedSlot !== null) currentSlot = parseInt(savedSlot);
} catch (e) {}
slotSelect.value = currentSlot;
loadSong(currentSlot);
updateSlotLabels();

// Default scroll: center viewport around octave 4 (row 18 ≈ F4)
// so octave 4 is in the middle, octave 5 is reachable above,
// and a bit of octave 3 remains visible below.
(function centerViewport() {
  const targetRow = 18;
  const rowHeight = 24;
  const viewportHeight = scrollWrapper.clientHeight;
  scrollWrapper.scrollTop = (targetRow * rowHeight) - (viewportHeight / 2) + (rowHeight / 2);
})();
