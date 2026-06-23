import { getSessions, computePegStatsM1, computePegStatsM3, exportStats, importStats, clearStats } from './stats.js';
import { buildRadar } from './radar.js';
import { PAO_PEGS } from './data.js';
import { triggerHaptic, triggerHapticError } from '../libs/haptic.js';

function fmt(ms) {
    if (ms == null) return '—';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function fmtDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function hslForAccuracy(acc) {
    // 0 = red, 1 = green
    return `hsl(${Math.round(acc * 120)}, 65%, 35%)`;
}

function hslForSpeed(ms, minMs, maxMs) {
    if (minMs === maxMs) return hslForAccuracy(0.5);
    // lower ms = greener
    const norm = 1 - (ms - minMs) / (maxMs - minMs);
    return `hsl(${Math.round(norm * 120)}, 65%, 35%)`;
}

// ── Heatmap ────────────────────────────────────────────────────────────────────

function renderHeatmap(container, pegStats, mode) {
    // mode: 'accuracy' | 'speed'
    const speedVals = Object.values(pegStats)
        .filter(p => p.revealMsSum != null && p.attempts > 0)
        .map(p => p.revealMsSum / p.attempts);
    const minMs = Math.min(...speedVals);
    const maxMs = Math.max(...speedVals);

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';

    for (let i = 0; i < 100; i++) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        const s = pegStats[i];
        const personName = PAO_PEGS[i]?.person || '—';

        if (!s || s.attempts === 0) {
            cell.style.background = '#1e1e1e';
            cell.title = `${i} — untested`;
        } else if (mode === 'accuracy') {
            const acc = s.correct / s.attempts;
            cell.style.background = hslForAccuracy(acc);
            cell.title = `${i} (${personName}) — ${Math.round(acc*100)}% (${s.attempts} tries)`;
        } else {
            const avgMs = s.revealMsSum / s.attempts;
            cell.style.background = hslForSpeed(avgMs, minMs, maxMs);
            cell.title = `${i} (${personName}) — avg ${Math.round(avgMs)}ms (${s.attempts} tries)`;
        }

        const label = document.createElement('span');
        label.textContent = i;
        cell.appendChild(label);
        grid.appendChild(cell);
    }
    container.appendChild(grid);
}

function renderM3Heatmap(container, pegStats) {
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'heatmap-grid';

    for (let i = 0; i < 100; i++) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';
        const s = pegStats[i];
        const personName = PAO_PEGS[i]?.person || '—';

        if (!s || s.tested === 0) {
            cell.style.background = '#1e1e1e';
            cell.title = `${i} — untested`;
        } else {
            const acc = s.correct / s.tested;
            cell.style.background = hslForAccuracy(acc);
            cell.title = `${i} (${personName}) — ${Math.round(acc*100)}% (${s.tested} tested)`;
        }

        const label = document.createElement('span');
        label.textContent = i;
        cell.appendChild(label);
        grid.appendChild(cell);
    }
    container.appendChild(grid);
}

// ── Tab renderers ──────────────────────────────────────────────────────────────

function renderOverview(el, sessions) {
    const m1 = sessions.filter(s => s.mode === 1);
    const m2 = sessions.filter(s => s.mode === 2);
    const m3 = sessions.filter(s => s.mode === 3);
    const last = sessions.length ? sessions[sessions.length - 1] : null;

    el.innerHTML = `
        <div id="radar-container" class="radar-container"></div>
        <div class="stat-row">
            <div class="stat-card"><div class="stat-num">${m1.length}</div><div class="stat-label">Index sessions</div></div>
            <div class="stat-card"><div class="stat-num">${m2.length}</div><div class="stat-label">Sequence sessions</div></div>
            <div class="stat-card"><div class="stat-num">${m3.length}</div><div class="stat-label">Recall sessions</div></div>
        </div>
        ${last ? `<p class="last-played">Last session: ${fmtDate(last.timestamp)}</p>` : '<p class="last-played">No sessions yet.</p>'}
    `;

    buildRadar(el.querySelector('#radar-container'), sessions);
}

function renderMode1Tab(el, sessions) {
    const { pegStats, byType } = computePegStatsM1(sessions);
    const totalCards = sessions.reduce((n, s) => n + s.cards.length, 0);
    const totalCorrect = sessions.reduce((n, s) => n + s.cards.filter(c => c.correct).length, 0);

    // Weakest pegs: sort by accuracy ascending, min 3 attempts
    const weak = Object.entries(pegStats)
        .filter(([, s]) => s.attempts >= 3)
        .map(([num, s]) => ({ num: +num, acc: s.correct / s.attempts, attempts: s.attempts }))
        .sort((a, b) => a.acc - b.acc)
        .slice(0, 5);

    const qtLabels = { number: '# → PAO', person: 'P → #', action: 'A → #', object: 'O → #' };

    el.innerHTML = `
        <div class="stat-row" style="margin-bottom:12px">
            <div class="stat-card"><div class="stat-num">${sessions.length}</div><div class="stat-label">Sessions</div></div>
            <div class="stat-card"><div class="stat-num">${totalCards > 0 ? Math.round(totalCorrect/totalCards*100) : '—'}%</div><div class="stat-label">Overall accuracy</div></div>
        </div>
        <h3 class="section-title">By question type</h3>
        <div class="qtype-grid">
            ${['number', 'person', 'action', 'object'].map(qt => {
                const s = byType[qt];
                const acc = s.attempts > 0 ? Math.round(s.correct / s.attempts * 100) + '%' : '—';
                return `<div class="stat-card"><div class="stat-num">${acc}</div><div class="stat-label">${qtLabels[qt]}</div><div class="ml-def">${s.attempts} tries</div></div>`;
            }).join('')}
        </div>
        <div class="heatmap-toggle">
            <button id="btn-acc-toggle" class="toggle-btn active">Accuracy</button>
            <button id="btn-spd-toggle" class="toggle-btn">Speed</button>
        </div>
        <div id="heatmap-m1" class="heatmap-wrap"></div>
        ${weak.length ? `
        <h3 class="section-title">Weakest pegs</h3>
        <ul class="weak-list">
            ${weak.map(w => `<li><span class="peg-num">${w.num}</span> <span class="peg-word">${PAO_PEGS[w.num]?.person || '—'}</span> <span class="peg-acc">${Math.round(w.acc*100)}%</span> <span class="peg-tries">(${w.attempts}×)</span></li>`).join('')}
        </ul>` : ''}
        <h3 class="section-title">Recent sessions</h3>
        <ul class="session-list">
            ${sessions.slice(-10).reverse().map(s => {
                const acc = Math.round(s.cards.filter(c => c.correct).length / s.cards.length * 100);
                return `<li>${fmtDate(s.timestamp)} · ${s.cards.length} cards · ${acc}% · ${fmt(s.totalMs)}</li>`;
            }).join('') || '<li>None yet.</li>'}
        </ul>
    `;

    const heatmapEl = el.querySelector('#heatmap-m1');
    let heatMode = 'accuracy';
    renderHeatmap(heatmapEl, pegStats, heatMode);

    el.querySelector('#btn-acc-toggle').addEventListener('click', () => {
        triggerHaptic();
        heatMode = 'accuracy';
        el.querySelector('#btn-acc-toggle').classList.add('active');
        el.querySelector('#btn-spd-toggle').classList.remove('active');
        renderHeatmap(heatmapEl, pegStats, heatMode);
    });

    el.querySelector('#btn-spd-toggle').addEventListener('click', () => {
        triggerHaptic();
        heatMode = 'speed';
        el.querySelector('#btn-spd-toggle').classList.add('active');
        el.querySelector('#btn-acc-toggle').classList.remove('active');
        renderHeatmap(heatmapEl, pegStats, heatMode);
    });
}

function renderMode2Tab(el, sessions) {
    // Best times per length
    const bests = {};
    for (const s of sessions) {
        if (!s.success) continue;
        const len = s.sequenceLength;
        if (!bests[len] || s.totalMs < bests[len]) bests[len] = s.totalMs;
    }

    const successRate = sessions.length
        ? Math.round(sessions.filter(s => s.success).length / sessions.length * 100)
        : null;

    el.innerHTML = `
        <div class="stat-row" style="margin-bottom:12px">
            <div class="stat-card"><div class="stat-num">${sessions.length}</div><div class="stat-label">Sessions</div></div>
            <div class="stat-card"><div class="stat-num">${successRate != null ? successRate + '%' : '—'}</div><div class="stat-label">Success rate</div></div>
        </div>
        <h3 class="section-title">Best times (perfect runs)</h3>
        <ul class="best-list">
            ${[20, 50, 100].map(len => `
                <li><span class="run-len">${len} icons</span> <span class="run-time">${bests[len] ? fmt(bests[len]) : '—'}</span></li>
            `).join('')}
        </ul>
        <h3 class="section-title">Recent sessions</h3>
        <ul class="session-list">
            ${sessions.slice(-10).reverse().map(s => `
                <li>${fmtDate(s.timestamp)} · ${s.sequenceLength} icons · ${s.success ? '✓' : `✗ (${s.wrongTaps} err)`} · ${fmt(s.totalMs)}</li>
            `).join('') || '<li>None yet.</li>'}
        </ul>
    `;
}

function mlMetrics(tested) {
    // TP: encoded slot, correct icon recalled
    // FN: encoded slot, wrong answer (said empty or wrong icon)
    // FP: ghost slot, gave a non-empty answer
    // TN: ghost slot, correctly said empty
    let tp = 0, fn = 0, fp = 0, tn = 0;
    for (const t of tested) {
        if (!t.wasGhost) {
            t.correct ? tp++ : fn++;
        } else {
            t.correct ? tn++ : fp++;
        }
    }
    const recall    = (tp + fn) > 0 ? tp / (tp + fn) : null;
    const precision = (tp + fp) > 0 ? tp / (tp + fp) : null;
    const specificity = (tn + fp) > 0 ? tn / (tn + fp) : null; // ghost accuracy
    return { recall, precision, specificity, tp, fn, fp, tn };
}

function pct(v) { return v != null ? Math.round(v * 100) + '%' : '—'; }

function renderMode3Tab(el, sessions) {
    const pegStats = computePegStatsM3(sessions);
    const allTested = sessions.flatMap(s => s.tested || []);
    const { recall, precision, specificity } = mlMetrics(allTested);

    const avgEncMs = sessions.length
        ? sessions.reduce((sum, s) => {
            const ms = (s.encoded || []).map(e => e.encodingMs).filter(Boolean);
            return sum + (ms.length ? ms.reduce((a,b) => a+b,0)/ms.length : 0);
          }, 0) / sessions.length
        : null;

    el.innerHTML = `
        <div class="stat-row" style="margin-bottom:8px">
            <div class="stat-card"><div class="stat-num">${sessions.length}</div><div class="stat-label">Sessions</div></div>
            <div class="stat-card">
                <div class="stat-num">${pct(recall)}</div>
                <div class="stat-label">Recall</div>
                <div class="ml-def">encoded → found</div>
            </div>
            <div class="stat-card">
                <div class="stat-num">${pct(precision)}</div>
                <div class="stat-label">Precision</div>
                <div class="ml-def">guesses → correct</div>
            </div>
        </div>
        <div class="stat-row" style="margin-bottom:12px">
            <div class="stat-card">
                <div class="stat-num">${pct(specificity)}</div>
                <div class="stat-label">Specificity</div>
                <div class="ml-def">ghosts → caught</div>
            </div>
            ${avgEncMs ? `<div class="stat-card"><div class="stat-num">${Math.round(avgEncMs)}ms</div><div class="stat-label">Avg encode/item</div></div>` : ''}
        </div>
        <h3 class="section-title">Peg recall heatmap</h3>
        <div id="heatmap-m3" class="heatmap-wrap"></div>
        <h3 class="section-title">Recent sessions</h3>
        <ul class="session-list">
            ${sessions.slice(-10).reverse().map(s => {
                const m = mlMetrics(s.tested || []);
                return `<li>${fmtDate(s.timestamp)} · block ${s.blockSize} · R ${pct(m.recall)} P ${pct(m.precision)} · ${fmt(s.totalMs)}</li>`;
            }).join('') || '<li>None yet.</li>'}
        </ul>
    `;

    renderM3Heatmap(el.querySelector('#heatmap-m3'), pegStats);
}

// ── Main entry point ──────────────────────────────────────────────────────────

// Called once at startup to wire static stats UI elements
export function initStatsWiring(onRerender) {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            triggerHaptic();
            const target = btn.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${target}`).classList.add('active');
        });
    });

    document.getElementById('btn-export').addEventListener('click', () => {
        triggerHaptic();
        exportStats();
    });

    document.getElementById('btn-import').addEventListener('click', () => {
        triggerHaptic();
        document.getElementById('import-file-input').click();
    });

    document.getElementById('import-file-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const count = await importStats(file);
            alert(`Imported ${count} total sessions.`);
            onRerender();
        } catch {
            triggerHapticError();
            alert('Import failed: invalid file.');
        }
        e.target.value = '';
    });

    document.getElementById('btn-clear').addEventListener('click', async () => {
        triggerHaptic();
        const typed = prompt('Type DELETE to permanently erase all session history:');
        if (typed !== 'DELETE') return;
        await clearStats();
        alert('All history cleared.');
        onRerender();
    });

}

// Called every time the stats screen is opened
export async function renderStats() {
    const sessions = await getSessions();

    renderOverview(document.getElementById('tab-overview'), sessions);
    renderMode1Tab(document.getElementById('tab-mode1'), sessions.filter(s => s.mode === 1));
    renderMode2Tab(document.getElementById('tab-mode2'), sessions.filter(s => s.mode === 2));
    renderMode3Tab(document.getElementById('tab-mode3'), sessions.filter(s => s.mode === 3));
}
