import { get, set } from '../libs/idb-keyval.js';

const KEY = 'palace-sessions';

// --- Storage ---

async function loadSessions() {
    return (await get(KEY)) || [];
}

async function saveSessions(sessions) {
    await set(KEY, sessions);
}

export async function recordSession(session) {
    const sessions = await loadSessions();
    sessions.push({ ...session, timestamp: session.timestamp || Date.now() });
    await saveSessions(sessions);
}

export async function getSessions(mode = null) {
    const sessions = await loadSessions();
    return mode == null ? sessions : sessions.filter(s => s.mode === mode);
}

// --- Per-peg aggregates (computed on demand) ---

export function computePegStatsM1(sessions) {
    // Returns { [pegNum]: { attempts, correct, revealMsSum } }
    const stats = {};
    for (const s of sessions) {
        if (s.mode !== 1) continue;
        for (const c of s.cards) {
            if (!stats[c.num]) stats[c.num] = { attempts: 0, correct: 0, revealMsSum: 0 };
            stats[c.num].attempts++;
            if (c.correct) stats[c.num].correct++;
            stats[c.num].revealMsSum += c.revealMs;
        }
    }
    return stats;
}

export function computePegStatsM3(sessions) {
    // Returns { [pegNum]: { tested, correct } }
    const stats = {};
    for (const s of sessions) {
        if (s.mode !== 3) continue;
        for (const t of s.tested) {
            if (t.wasGhost) continue;
            if (!stats[t.pegNum]) stats[t.pegNum] = { tested: 0, correct: 0 };
            stats[t.pegNum].tested++;
            if (t.correct) stats[t.pegNum].correct++;
        }
    }
    return stats;
}

// --- Export / Import ---

export async function exportStats() {
    const sessions = await loadSessions();
    const blob = new Blob([JSON.stringify({ version: 1, sessions }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `palace-stats-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

export async function importStats(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                const incoming = data.sessions || data; // support bare array too
                if (!Array.isArray(incoming)) throw new Error('Invalid format');
                const existing = await loadSessions();
                // Merge by timestamp, deduplicate
                const map = new Map(existing.map(s => [s.timestamp, s]));
                for (const s of incoming) map.set(s.timestamp, s);
                const merged = [...map.values()].sort((a, b) => a.timestamp - b.timestamp);
                await saveSessions(merged);
                resolve(merged.length);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsText(file);
    });
}

export async function clearStats() {
    await saveSessions([]);
}
