// Data Store for LSDJ Instrument Presets from Source Report
const PRESETS = [
    {
        id: 'synthwave-snare',
        name: 'Synthwave Snare',
        channel: 'noise',
        tags: ['synthwave', 'percussion'],
        envelope: 'D1',
        shape: 'EC',
        dutyWave: 'N/A',
        table: 'None',
        synthSignal: 'N/A',
        desc: 'A sharp burst of noise. High volume, fast decay.',
        tip: 'Shape EC adds the crisp high hiss that defines a synthwave snare.',
        instParams: { TYPE: 'NOISE', ENVELOPE: 'D1', SHAPE: 'EC', TABLE: 'OFF' },
        synthParams: null,
        tableSteps: [{ step: '00', cmd1: '---', cmd2: '---', fx: 'Static hardware decay' }]
    },
    {
        id: 'synthwave-kick',
        name: 'Synthwave Kick',
        channel: 'noise',
        tags: ['synthwave', 'percussion'],
        envelope: 'C1',
        shape: 'FC',
        dutyWave: 'N/A',
        table: '00 (Pitch Sweep)',
        synthSignal: 'N/A',
        desc: 'Noise drops in pitch fast. The sweep gives it kick-drum weight.',
        tip: 'S F0 drops the pitch fast. That gives the kick its low-end punch.',
        instParams: { TYPE: 'NOISE', ENVELOPE: 'C1', SHAPE: 'FC', TABLE: '00' },
        synthParams: null,
        tableSteps: [
            { step: '00', cmd1: 'S F0', cmd2: '---', fx: 'Fast Downward Sweep' },
            { step: '01', cmd1: 'S F0', cmd2: '---', fx: 'Fast Downward Sweep' },
            { step: '02', cmd1: 'S E0', cmd2: '---', fx: 'Medium Downward Sweep' },
            { step: '03', cmd1: 'H 05', cmd2: '---', fx: 'Hop / Stop' }
        ]
    },
    {
        id: 'hi-hat',
        name: 'Hi-Hat',
        channel: 'noise',
        tags: ['jazz', 'synthwave', 'percussion'],
        envelope: '81',
        shape: '55',
        dutyWave: 'N/A',
        table: 'None',
        synthSignal: 'N/A',
        desc: 'Short noise burst. Mid-to-high frequency. Metallic and crisp.',
        tip: 'Shape 55 sits in the mid range. It will not mask your bass.',
        instParams: { TYPE: 'NOISE', ENVELOPE: '81', SHAPE: '55', TABLE: 'OFF' },
        synthParams: null,
        tableSteps: [{ step: '00', cmd1: '---', cmd2: '---', fx: 'Instant Decay Burst' }]
    },
    {
        id: 'jazz-brush',
        name: 'Jazz Brush',
        channel: 'noise',
        tags: ['jazz', 'percussion'],
        envelope: '83',
        shape: 'F5',
        dutyWave: 'N/A',
        table: 'None',
        synthSignal: 'N/A',
        desc: 'Soft attack, slow decay. A brushed cymbal for jazz backing.',
        tip: 'Sweep 3 fades out slowly. Three frames of smooth decay.',
        instParams: { TYPE: 'NOISE', ENVELOPE: '83', SHAPE: 'F5', TABLE: 'OFF' },
        synthParams: null,
        tableSteps: [{ step: '00', cmd1: '---', cmd2: '---', fx: 'Smooth Fade Out' }]
    },
    {
        id: 'subbass-kick',
        name: 'Sub-Bass Kick (Wave)',
        channel: 'wave',
        tags: ['synthwave', 'percussion', 'bass'],
        envelope: 'N/A (Wave)',
        shape: 'N/A',
        dutyWave: 'Sine',
        table: '01 (Anchor Slide)',
        synthSignal: 'Sine (Synth 0)',
        desc: 'Deep kick from the Wave channel. DRUM mode slides the pitch down. L 80 anchors the slide.',
        tip: 'DRUM mode slides the pitch on a curve, not a straight line. That is how old trackers did it.',
        instParams: { TYPE: 'WAVE', 'P/L/V': 'DRUM', TRANSPOSE: 'OFF', SYNTH: '0', TABLE: '01' },
        synthParams: { SIGNAL: 'Sine', WAVETABLE: '0', LENGTH: '16' },
        tableSteps: [
            { step: '00', cmd1: 'P C0', cmd2: '---', fx: 'Pitch Offset Kick' },
            { step: '01', cmd1: 'L 80', cmd2: '---', fx: 'Anchor Pitch Slide to Sub' }
        ]
    },
    {
        id: 'piano',
        name: 'Chiptune Piano',
        channel: 'pulse',
        tags: ['tonal', 'jazz'],
        envelope: 'A7',
        shape: 'N/A',
        dutyWave: '50%',
        table: 'None',
        synthSignal: 'Square',
        desc: 'Loud attack, slow release. A 50% square wave sounds like a clean electric piano.',
        tip: '50% duty gives the cleanest square wave. It sounds like a simple piano.',
        instParams: { TYPE: 'PULSE', WAVE: '50%', ENVELOPE: 'A7', TABLE: 'OFF' },
        synthParams: null,
        tableSteps: [{ step: '00', cmd1: '---', cmd2: '---', fx: 'Natural Acoustic Decay' }]
    },
    {
        id: 'plucked-guitar',
        name: 'Plucked Guitar',
        channel: 'pulse',
        tags: ['tonal', 'synthwave'],
        envelope: 'C2',
        shape: 'N/A',
        dutyWave: '25%',
        table: '02 (Pitch Drop)',
        synthSignal: 'Asymmetric Square',
        desc: 'Sharp attack with a pitch wobble on the first tick. Like a pick hitting a string.',
        tip: '25% duty sounds thinner and sharper. Like a guitar string.',
        instParams: { TYPE: 'PULSE', WAVE: '25%', ENVELOPE: 'C2', TABLE: '02' },
        synthParams: null,
        tableSteps: [{ step: '00', cmd1: 'P 02', cmd2: '---', fx: 'Pick Strike Transient' }]
    },
    {
        id: 'saxophone',
        name: 'Saxophone Wind',
        channel: 'pulse',
        tags: ['tonal', 'jazz'],
        envelope: '08',
        shape: 'N/A',
        dutyWave: '50%',
        table: '03 (Volume Swell)',
        synthSignal: 'Hollow Square',
        desc: 'Volume starts low and swells up, then settles into vibrato. Like a saxophone breath.',
        tip: 'Start with envelope 08. The table then raises the volume tick by tick.',
        instParams: { TYPE: 'PULSE', WAVE: '50%', ENVELOPE: '08', TABLE: '03' },
        synthParams: null,
        tableSteps: [
            { step: '00', cmd1: '---', cmd2: '---', fx: 'Env = 48 (Initial Breath)' },
            { step: '01', cmd1: '---', cmd2: '---', fx: 'Env = 88 (Swell Volume)' },
            { step: '02', cmd1: '---', cmd2: '---', fx: 'Env = C8 (Full Breath)' },
            { step: '03', cmd1: 'V 42', cmd2: '---', fx: 'Delayed Vibrato' }
        ]
    },
    {
        id: 'thick-square-bass',
        name: 'Thick Square Bass',
        channel: 'wave',
        tags: ['synthwave', 'darkwave', 'bass'],
        envelope: 'N/A',
        shape: 'N/A',
        dutyWave: 'Square Wave',
        table: 'None',
        synthSignal: 'Square (Synth 1)',
        desc: 'Deep bass from a custom square wave. Filtered for weight.',
        tip: 'The Wave channel reaches lower than Pulse. That is why it works for sub-bass.',
        instParams: { TYPE: 'WAVE', SYNTH: '1', PLAY: 'LOOP', TABLE: 'OFF' },
        synthParams: { SIGNAL: 'Square', 'FILTER CUTOFF': '80' },
        tableSteps: [{ step: '00', cmd1: '---', cmd2: '---', fx: 'Sustained Sub Bass Loop' }]
    },
    {
        id: 'reese-bass',
        name: 'Reese Bass (Detuned)',
        channel: 'pulse',
        tags: ['synthwave', 'darkwave', 'bass'],
        envelope: 'E8',
        shape: 'N/A',
        dutyWave: '12.5%',
        table: '04 (Phase Mod)',
        synthSignal: 'Thin Square',
        desc: 'Two pitches flicker back and forth every frame. The clash creates a thick, moving texture.',
        tip: 'P 01 and P FF switch the pitch every tick. The clash creates a moving, beating texture.',
        instParams: { TYPE: 'PULSE', WAVE: '12.5%', ENVELOPE: 'E8', TABLE: '04' },
        synthParams: null,
        tableSteps: [
            { step: '00', cmd1: 'P 01', cmd2: '---', fx: 'Detune Micro-Up' },
            { step: '01', cmd1: 'P FF', cmd2: '---', fx: 'Detune Micro-Down' },
            { step: '02', cmd1: 'H 00', cmd2: '---', fx: 'Loop Phase Modulation' }
        ]
    },
    {
        id: 'arpeggio-lead',
        name: 'Arpeggio Lead',
        channel: 'pulse',
        tags: ['synthwave', 'darkwave', 'tonal'],
        envelope: '92',
        shape: 'N/A',
        dutyWave: '50%',
        table: '05 (Major Triad)',
        synthSignal: 'Hollow Square',
        desc: 'Cycles root, third, and fifth so fast they blur into one chord. A monophonic trick for polyphonic sound.',
        tip: 'C 04 and C 07 jump so fast that the ear hears one chord, not three notes.',
        instParams: { TYPE: 'PULSE', WAVE: '50%', ENVELOPE: '92', TABLE: '05' },
        synthParams: null,
        tableSteps: [
            { step: '00', cmd1: 'C 04', cmd2: '---', fx: '+4 Semitones (Major 3rd)' },
            { step: '01', cmd1: 'C 07', cmd2: '---', fx: '+7 Semitones (5th)' },
            { step: '02', cmd1: 'C 00', cmd2: '---', fx: 'Root Note' },
            { step: '03', cmd1: 'H 00', cmd2: '---', fx: 'Loop Arpeggio' }
        ]
    }
];

// Global Application State Variables
let audioCtx = null;
let currentFilter = 'all';
let activeModalPreset = null;
let envChartInstance = null;
let hwChartInstance = null;
let envDirection = 'decay';

// Web Audio API Sound Generation Core
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const btn = document.getElementById('global-audio-btn');
    if (btn) {
        btn.textContent = 'Audio Engine Active';
        btn.classList.replace('bg-amber-500', 'bg-emerald-500');
    }
}

document.getElementById('global-audio-btn').addEventListener('click', initAudio);

// ---------------------------------------------------------------------------
// Game Boy DMG-01 Noise Channel LFSR Synthesis
// ---------------------------------------------------------------------------
// The DMG noise channel uses a 15-bit linear-feedback shift register.
// Feedback = bit0 XOR bit1. Output = bit0 (inverted on the real hardware,
// but -1/+1 is symmetric so we ignore polarity).
// In "short" mode (NR43 bit 3 = 1) the LFSR behaves like a 7-bit register:
// after shifting, bit 6 is forced to 1, yielding a 127-step period.
// The LFSR clock frequency is set by the NR43 "shape" register:
//   freq = 524288 / divisors[r] / 2^(s+1)
// where r = bits [2:0] (divisor code) and s = bits [6:4] (shift amount).
// ---------------------------------------------------------------------------

const NOISE_DIVISORS = [8, 16, 32, 48, 64, 80, 96, 112];

function createNoiseBuffer(audioCtx, nr43Hex, durationSec) {
    const sampleRate = audioCtx.sampleRate;
    const samples = Math.ceil(sampleRate * durationSec);
    const buffer = audioCtx.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);

    const nr43 = parseInt(nr43Hex, 16) || 0x80;
    const divisorCode = nr43 & 0x07;
    const shiftAmount = (nr43 >> 4) & 0x0F;
    const shortMode = (nr43 >> 3) & 0x01;

    const divisor = NOISE_DIVISORS[divisorCode];
    const lfsrRate = 524288 / divisor / Math.pow(2, shiftAmount + 1);

    let lfsr = 0x7FFF;
    let phase = 0;
    const phaseInc = lfsrRate / sampleRate;

    for (let i = 0; i < samples; i++) {
        phase += phaseInc;
        const steps = Math.floor(phase);
        phase -= steps;

        for (let s = 0; s < steps; s++) {
            const bit0 = lfsr & 1;
            const bit1 = (lfsr >> 1) & 1;
            const feedback = bit0 ^ bit1;
            lfsr >>= 1;
            lfsr |= (feedback << 14);
            if (shortMode) {
                lfsr |= 0x40; // force bit 6 high -> 7-bit cycle
            }
        }
        // Output is bit0: Game Boy hardware inverts it, but audio is symmetric.
        data[i] = (lfsr & 1) ? 1.0 : -1.0;
    }
    return buffer;
}

// Sound Preview Synthesizer Engine
function playPresetSound(presetId) {
    initAudio();
    if (!audioCtx) return;

    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const now = audioCtx.currentTime;

    if (preset.channel === 'noise') {
        const envVol = (parseInt(preset.envelope.charAt(0), 16) || 12) / 15;
        const sweepSpeed = (parseInt(preset.envelope.charAt(1), 16) || 2);
        const duration = Math.max(0.05, 0.4 - (sweepSpeed * 0.04));

        const buffer = createNoiseBuffer(audioCtx, preset.shape, duration);
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(envVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(gain);
        gain.connect(audioCtx.destination);

        noise.start(now);
        noise.stop(now + duration);

    } else if (preset.channel === 'pulse' || preset.channel === 'wave') {
        // Synthesize Tone / Bass / Arp
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        let baseFreq = 220; // Default A3
        if (preset.tags.includes('bass') || preset.id === 'subbass-kick') baseFreq = 65; // C2 / Low Sub

        osc.type = preset.dutyWave.includes('25%') ? 'sawtooth' : (preset.dutyWave.includes('Sine') ? 'sine' : 'square');

        // Envelope processing
        const envHex = preset.envelope !== 'N/A' ? preset.envelope : 'D1';
        const envVol = (parseInt(envHex.charAt(0), 16) || 10) / 15;

        if (preset.id === 'saxophone') {
            // Swell envelope simulation
            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(envVol, now + 0.25);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        } else {
            gain.gain.setValueAtTime(envVol, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + (preset.id.includes('kick') ? 0.2 : 0.5));
        }

        // Table Special Effects Simulation
        if (preset.id === 'arpeggio-lead') {
            // Fast Triad Arpeggio (Root, +4, +7)
            const tick = 0.04;
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.setValueAtTime(baseFreq * Math.pow(2, 4/12), now + tick);
            osc.frequency.setValueAtTime(baseFreq * Math.pow(2, 7/12), now + tick * 2);
            osc.frequency.setValueAtTime(baseFreq, now + tick * 3);
            osc.frequency.setValueAtTime(baseFreq * Math.pow(2, 4/12), now + tick * 4);
        } else if (preset.id === 'reese-bass') {
            // Phase detune pitch fluctuation
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.linearRampToValueAtTime(baseFreq + 3, now + 0.1);
            osc.frequency.linearRampToValueAtTime(baseFreq - 3, now + 0.2);
            osc.frequency.linearRampToValueAtTime(baseFreq, now + 0.3);
        } else if (preset.id === 'subbass-kick') {
            // DRUM mode exponential drop
            osc.frequency.setValueAtTime(180, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 0.18);
        } else {
            osc.frequency.setValueAtTime(baseFreq, now);
        }

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + (preset.id.includes('kick') ? 0.25 : 0.6));
    }
}

// Render Preset Cards Grid
function renderPresets() {
    const container = document.getElementById('preset-grid');
    const searchVal = document.getElementById('preset-search').value.toLowerCase();
    container.innerHTML = '';

    const filtered = PRESETS.filter(p => {
        const matchesFilter = (currentFilter === 'all') ||
            (currentFilter === 'noise' && p.channel === 'noise') ||
            (currentFilter === 'wave' && p.channel === 'wave') ||
            (currentFilter === 'pulse' && p.channel === 'pulse') ||
            (currentFilter === 'synthwave' && p.tags.includes('synthwave'));

        const matchesSearch = p.name.toLowerCase().includes(searchVal) ||
            p.desc.toLowerCase().includes(searchVal) ||
            p.tags.some(t => t.toLowerCase().includes(searchVal));

        return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12 text-slate-500 font-mono text-sm">
                No instruments match the selected filter query.
            </div>
        `;
        return;
    }

    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between space-y-4';

        card.innerHTML = `
            <div>
                <div class="mb-2 text-right">
                    <span class="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                        p.channel === 'noise' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        p.channel === 'wave' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }">${p.channel} CH</span>
                </div>
                <h3 class="text-base font-bold text-slate-100 mb-1">${p.name}</h3>
                <p class="text-xs text-slate-400 leading-relaxed mb-3">${p.desc}</p>

                <div class="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <div><span class="text-slate-500">ENV:</span> <span class="text-slate-200 font-bold">${p.envelope}</span></div>
                    <div><span class="text-slate-500">DUTY/SHAPE:</span> <span class="text-slate-200 font-bold">${p.channel === 'noise' ? p.shape : p.dutyWave}</span></div>
                    <div class="col-span-2"><span class="text-slate-500">TABLE:</span> <span class="text-amber-400 font-bold">${p.table}</span></div>
                </div>
            </div>

            <div class="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                <button onclick="playPresetSound('${p.id}')" class="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition">
                    Play Preview
                </button>
                <button onclick="openModal('${p.id}')" class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700">
                    Inspect Setup
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function filterPresets(category) {
    currentFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-amber-500', 'text-slate-950', 'active-filter');
        btn.classList.add('bg-slate-800', 'text-slate-300');
    });
    event.target.classList.remove('bg-slate-800', 'text-slate-300');
    event.target.classList.add('bg-amber-500', 'text-slate-950', 'active-filter');
    renderPresets();
}

function searchPresets() {
    renderPresets();
}

// Modal Inspector Functions
function openModal(presetId) {
    const p = PRESETS.find(item => item.id === presetId);
    if (!p) return;
    activeModalPreset = p;

    // Modal icon removed for cleaner UI
    document.getElementById('modal-title').textContent = p.name;
    document.getElementById('modal-subtitle').textContent = `${p.channel.toUpperCase()} Channel • Envelope: ${p.envelope} • Table: ${p.table}`;
    document.getElementById('modal-tip').textContent = p.tip;

    // Instrument Parameters
    const instBox = document.getElementById('modal-inst-params');
    instBox.innerHTML = '';
    for (const [key, val] of Object.entries(p.instParams)) {
        instBox.innerHTML += `<div><span class="text-slate-500">${key}:</span> <span class="text-amber-400 font-bold">${val}</span></div>`;
    }

    // Synth Screen Parameters (if Wave Channel)
    const synthBox = document.getElementById('modal-synth-container');
    if (p.synthParams) {
        synthBox.classList.remove('hidden');
        const synthGrid = document.getElementById('modal-synth-params');
        synthGrid.innerHTML = '';
        for (const [key, val] of Object.entries(p.synthParams)) {
            synthGrid.innerHTML += `<div><span class="text-slate-500">${key}:</span> <span class="text-indigo-400 font-bold">${val}</span></div>`;
        }
    } else {
        synthBox.classList.add('hidden');
    }

    // Table Steps
    const tableBody = document.getElementById('modal-table-steps');
    tableBody.innerHTML = '';
    p.tableSteps.forEach(s => {
        tableBody.innerHTML += `
            <tr>
                <td class="py-1.5 font-bold text-amber-400">${s.step}</td>
                <td class="py-1.5 text-slate-200">${s.cmd1}</td>
                <td class="py-1.5 text-slate-200">${s.cmd2}</td>
                <td class="py-1.5 text-slate-400 text-[11px]">${s.fx}</td>
            </tr>
        `;
    });

    document.getElementById('inspector-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('inspector-modal').classList.add('hidden');
}

function playModalSound() {
    if (activeModalPreset) {
        playPresetSound(activeModalPreset.id);
    }
}

// Section Tab Switcher
function switchTab(tabKey) {
    document.querySelectorAll('main > section').forEach(sec => sec.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active-tab'));

    document.getElementById(`sec-${tabKey}`).classList.remove('hidden');
    document.getElementById(`tab-${tabKey}`).classList.add('active-tab');

    if (tabKey === 'envelope') {
        initEnvelopeChart();
    } else if (tabKey === 'hardware') {
        initHardwareChart();
    }
}

// Dynamic Envelope Chart Initialization & Updating
function setEnvDirection(dir) {
    envDirection = dir;
    document.getElementById('btn-env-decay').className = dir === 'decay' ?
        'px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 border border-amber-400' :
        'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700';
    document.getElementById('btn-env-swell').className = dir === 'swell' ?
        'px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-slate-950 border border-amber-400' :
        'px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700';
    updateSimulatedChart();
}

function updateSimulatedChart() {
    const volVal = parseInt(document.getElementById('sim-vol').value);
    const sweepVal = parseInt(document.getElementById('sim-sweep').value);

    document.getElementById('sim-vol-val').textContent = `${volVal.toString(16).toUpperCase()} (${volVal})`;
    document.getElementById('sim-sweep-val').textContent = `${sweepVal} (${sweepVal === 0 ? 'Sustain' : sweepVal === 1 ? 'Fast' : 'Slow'})`;

    if (!envChartInstance) return;

    const ticks = Array.from({length: 16}, (_, i) => `Tick ${i}`);
    const amplitudeData = [];
    let currentVol = envDirection === 'decay' ? volVal : 0;

    for (let t = 0; t < 16; t++) {
        amplitudeData.push((currentVol / 15) * 100);
        if (envDirection === 'decay') {
            if (sweepVal > 0 && t % sweepVal === 0) {
                currentVol = Math.max(0, currentVol - 1);
            }
        } else {
            if (sweepVal > 0 && t % sweepVal === 0) {
                currentVol = Math.min(volVal, currentVol + 1);
            }
        }
    }

    envChartInstance.data.labels = ticks;
    envChartInstance.data.datasets[0].data = amplitudeData;
    envChartInstance.update();
}

function initEnvelopeChart() {
    const ctx = document.getElementById('envelopeChart');
    if (!ctx) return;

    if (envChartInstance) {
        envChartInstance.destroy();
    }

    envChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array.from({length: 16}, (_, i) => `Tick ${i}`),
            datasets: [{
                label: 'Volume Amplitude (%)',
                data: [86, 80, 73, 66, 60, 53, 46, 40, 33, 26, 20, 13, 6, 0, 0, 0],
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                borderWidth: 3,
                fill: true,
                tension: 0.2,
                pointBackgroundColor: '#f59e0b',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    title: { display: true, text: 'Amplitude Level (%)', color: '#a3a3a3', font: { size: 11 } },
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#a3a3a3' }
                },
                x: {
                    title: { display: true, text: 'Frame Ticks (60Hz / ~16.6ms per tick)', color: '#a3a3a3', font: { size: 11 } },
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#a3a3a3' }
                }
            },
            plugins: {
                legend: { labels: { color: '#e5e5e5', font: { family: 'monospace' } } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` Volume: ${context.raw.toFixed(0)}% (${Math.round(context.raw * 15 / 100).toString(16).toUpperCase()} hex)`;
                        }
                    }
                }
            }
        }
    });

    updateSimulatedChart();
}

function playCustomSimulation() {
    initAudio();
    if (!audioCtx) return;

    const ch = document.getElementById('sim-channel').value;
    const volVal = parseInt(document.getElementById('sim-vol').value) / 15;
    const sweepVal = parseInt(document.getElementById('sim-sweep').value);
    const cmd = document.getElementById('sim-cmd').value;
    const now = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (ch === 'noise') {
        // Default shapes for simulator: kick-ish for pitch sweep, hi-hat-ish otherwise
        const shapeHex = cmd === 'pitch_drop' ? 'FC' : '55';
        const duration = sweepVal === 0 ? 0.5 : 0.05 + (sweepVal * 0.05);
        const buffer = createNoiseBuffer(audioCtx, shapeHex, duration);
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;

        gain.gain.setValueAtTime(volVal, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(gain);
        gain.connect(audioCtx.destination);
        noise.start(now);
        return;
    }

    osc.type = ch === 'wave' ? 'sine' : 'square';

    let baseFreq = ch === 'wave' ? 80 : 220;
    osc.frequency.setValueAtTime(baseFreq, now);

    if (cmd === 'arpeggio') {
        const tick = 0.035;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.setValueAtTime(baseFreq * Math.pow(2, 4/12), now + tick);
        osc.frequency.setValueAtTime(baseFreq * Math.pow(2, 7/12), now + tick * 2);
        osc.frequency.setValueAtTime(baseFreq, now + tick * 3);
    } else if (cmd === 'pitch_drop') {
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    }

    gain.gain.setValueAtTime(envDirection === 'decay' ? volVal : 0.01, now);
    if (envDirection === 'decay') {
        gain.gain.exponentialRampToValueAtTime(0.001, now + (sweepVal === 0 ? 0.6 : 0.05 + (sweepVal * 0.06)));
    } else {
        gain.gain.linearRampToValueAtTime(volVal, now + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    }

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
}

// Hardware Chart Initialization
function initHardwareChart() {
    const ctx = document.getElementById('hardwareChart');
    if (!ctx) return;

    if (hwChartInstance) {
        hwChartInstance.destroy();
    }

    hwChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Pulse 1 Channel', 'Pulse 2 Channel', 'Wave Channel', 'Noise Channel'],
            datasets: [
                {
                    label: 'Harmonic Polyphony & Duty',
                    data: [85, 85, 40, 10],
                    backgroundColor: '#f59e0b'
                },
                {
                    label: 'Low Octave Sub Reach',
                    data: [40, 40, 95, 15],
                    backgroundColor: '#6366f1'
                },
                {
                    label: 'Percussive Transient Punch',
                    data: [60, 60, 80, 95],
                    backgroundColor: '#10b981'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    title: { display: true, text: 'Relative Hardware Fitness Score (%)', color: '#a3a3a3', font: { size: 11 } },
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#a3a3a3' }
                },
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.03)' },
                    ticks: { color: '#a3a3a3' }
                }
            },
            plugins: {
                legend: { labels: { color: '#e5e5e5', font: { family: 'sans-serif' } } }
            }
        }
    });
}

// Initialize App on DOM Load
window.addEventListener('DOMContentLoaded', () => {
    renderPresets();
});
