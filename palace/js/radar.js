// palace/js/radar.js
// Spike height = how much attention this domain needs (0 = fine, 1 = needs work).
//
// Same formula as bt/radar.js: score = 1 − perf × recency
//   perf    = min(1, ratio/2). Anchors at 0.5 when recent == baseline.
//             At 2× baseline → perf = 1 → score ≈ 0 (no attention needed).
//             At 0.5× baseline → perf = 0.25 → score ≈ 0.75 (needs attention).
//             No sessions in recent window → perf = 0.5, recency drives score up.
//   recency = halves every 7 days. Played today ≈ 1. Two weeks ago ≈ 0.25.
//
// Unlike bt (7-day recent vs 21-day baseline), we split by session count —
// last ⅓ of sessions = "recent", all sessions = baseline. Same 1:3 ratio but
// reacts immediately without needing weeks of history first.

const RECENT_FRAC = 3; // recent = last floor(N / RECENT_FRAC) sessions
const STALE_MS    = 7 * 24 * 60 * 60 * 1000;

// ── Domain definitions ────────────────────────────────────────────────────────
// Each domain lists one or more { filter, metric, invert } sources.
// Domain score = mean of per-source scores (null sources are skipped).
// This lets related modes feed the same spoke, e.g. M1 accuracy and M3 recall
// both reflect how well you know your pegs.

const DOMAINS = [
    {
        label: 'Index',
        sources: [
            // M1: forward retrieval accuracy (number → word)
            {
                filter: s => s.mode === 1,
                metric: s => s.cards.filter(c => c.correct).length / s.cards.length,
                invert: false
            },
            // M3: associative recall accuracy (peg → icon)
            {
                filter: s => s.mode === 3,
                metric: s => {
                    const ng = (s.tested || []).filter(t => !t.wasGhost);
                    return ng.length ? ng.filter(t => t.correct).length / ng.length : null;
                },
                invert: false
            }
        ]
    },
    {
        label: 'Speed',
        sources: [
            // M1: average reveal latency (lower ms = faster retrieval)
            {
                filter: s => s.mode === 1 && s.cards.length > 0,
                metric: s => {
                    const ms = s.cards.map(c => c.revealMs);
                    return ms.reduce((a, b) => a + b, 0) / ms.length;
                },
                invert: true
            }
        ]
    },
    {
        label: 'Span',
        sources: [
            // M2: sequence span (success × length; failure penalised ×0.25)
            {
                filter: s => s.mode === 2,
                metric: s => s.success ? s.sequenceLength : s.sequenceLength * 0.25,
                invert: false
            }
        ]
    },
    {
        label: 'Vigilance',
        sources: [
            // M3: ghost-slot rejection rate (correctly identifying un-encoded pegs)
            {
                filter: s => s.mode === 3,
                metric: s => {
                    const gh = (s.tested || []).filter(t => t.wasGhost);
                    return gh.length ? gh.filter(t => t.correct).length / gh.length : null;
                },
                invert: false
            }
        ]
    },
    {
        label: 'Encoding',
        sources: [
            // M3: average ms per icon during encoding (lower = more fluent)
            {
                filter: s => s.mode === 3 && (s.encoded || []).length > 0,
                metric: s => {
                    const ms = s.encoded.map(e => e.encodingMs).filter(v => v > 0);
                    return ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null;
                },
                invert: true
            },
            // M2: average ms per icon during encoding phase
            {
                filter: s => s.mode === 2 && (s.iconDurations || []).length > 0,
                metric: s => s.iconDurations.reduce((a, b) => a + b, 0) / s.iconDurations.length,
                invert: true
            }
        ]
    }
];

// ── Scoring ───────────────────────────────────────────────────────────────────

function computeSourceScore(sessions, { filter, metric, invert }) {
    const relevant = sessions.filter(filter);
    if (!relevant.length) return { score: null, lastTs: null };

    const pairs = relevant.flatMap(s => {
        try {
            const v = metric(s);
            return v != null && isFinite(v) ? [{ v, ts: s.timestamp }] : [];
        } catch { return []; }
    });

    if (!pairs.length) return { score: null, lastTs: null };

    const now = Date.now();
    const lastTs = pairs[pairs.length - 1].ts;

    // Baseline: all-time mean (bt uses 21-day window; we use all history so
    // older sessions are never discarded from a still-young session store).
    const allMean = pairs.reduce((s, p) => s + p.v, 0) / pairs.length;

    // Recent: last 1/RECENT_FRAC of sessions by count (mirrors bt's 7/21 ratio).
    // Falls back to all data when there are too few sessions for a split.
    const recentN = Math.max(1, Math.floor(pairs.length / RECENT_FRAC));
    const recentSlice = pairs.slice(-recentN);
    const recentMean = recentSlice.length
        ? recentSlice.reduce((s, p) => s + p.v, 0) / recentSlice.length
        : allMean;

    const ratio = invert
        ? (recentMean > 0 ? allMean / recentMean : 1)
        : (allMean > 0 ? recentMean / allMean : 1);

    const perf = Math.min(1, ratio / 2);
    const daysSinceLast = (now - lastTs) / (24 * 60 * 60 * 1000);
    const recency = Math.pow(0.5, daysSinceLast / 7);

    return { score: 1 - perf * recency, lastTs };
}

function computeDomainScore(sessions, domain) {
    const results = domain.sources.map(src => computeSourceScore(sessions, src));
    const valid = results.filter(r => r.score !== null);
    if (!valid.length) return { score: null, lastTs: null };

    const score = valid.reduce((s, r) => s + r.score, 0) / valid.length;
    const lastTs = valid.reduce(
        (best, r) => r.lastTs !== null && (best === null || r.lastTs > best) ? r.lastTs : best,
        null
    );
    return { score, lastTs };
}

// ── SVG ───────────────────────────────────────────────────────────────────────

const NS  = 'http://www.w3.org/2000/svg';
const N   = 5;
const CX  = 160, CY = 155, R = 100, LABEL_R = 130;

function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
}

function spokePoints(r) {
    return Array.from({ length: N }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
        return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
    });
}

function pts(points) {
    return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
}

function buildSVG(domainResults) {
    const svg = el('svg', { viewBox: '-30 -10 380 340', width: '100%', style: 'display:block;margin:0 auto' });

    // Grid rings
    for (const frac of [0.25, 0.5, 0.75, 1.0]) {
        svg.appendChild(el('polygon', {
            points: pts(spokePoints(R * frac)),
            fill: 'none',
            stroke: frac === 0.5 ? '#166534' : frac === 1.0 ? '#555' : '#404040',
            'stroke-width': frac === 0.5 ? '1.5' : frac === 1.0 ? '1' : '0.5'
        }));
    }

    // Spokes
    for (const [x, y] of spokePoints(R)) {
        svg.appendChild(el('line', { x1: CX, y1: CY, x2: x.toFixed(2), y2: y.toFixed(2), stroke: '#404040', 'stroke-width': '0.5' }));
    }

    // Top 2 worst domains (highest score = most needs attention)
    const sorted = [...domainResults].sort((a, b) => b.score - a.score);
    const top2 = new Set(sorted.slice(0, 2).map(d => d.label));

    // Data polygon
    const dataPts = domainResults.map(({ score }, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / N;
        const r = score * R;
        return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
    });

    svg.appendChild(el('polygon', {
        points: pts(dataPts),
        fill: 'rgba(129,140,248,0.18)',
        stroke: '#818cf8',
        'stroke-width': '1.5',
        'stroke-linejoin': 'round'
    }));

    for (const [i, [x, y]] of dataPts.entries()) {
        const bad = top2.has(domainResults[i].label);
        svg.appendChild(el('circle', {
            cx: x.toFixed(2), cy: y.toFixed(2),
            r: bad ? '5' : '3',
            fill: bad ? '#c4b5fd' : '#818cf8'
        }));
    }

    // Labels
    for (const [i, [x, y]] of spokePoints(LABEL_R).entries()) {
        const { label, score, stale } = domainResults[i];
        const anchor = x < CX - 4 ? 'end' : x > CX + 4 ? 'start' : 'middle';
        const bad = top2.has(label);
        const fill = stale ? '#555' : bad ? '#c4b5fd' : '#999';

        svg.appendChild(el('text', {
            x: x.toFixed(2), y: y.toFixed(2),
            'text-anchor': anchor,
            'dominant-baseline': 'middle',
            'font-size': '13',
            'font-family': 'system-ui, sans-serif',
            fill
        })).textContent = label;

        if (score !== null) {
            svg.appendChild(el('text', {
                x: x.toFixed(2), y: (parseFloat(y) + 16).toFixed(2),
                'text-anchor': anchor,
                'dominant-baseline': 'middle',
                'font-size': '10',
                'font-family': 'system-ui, sans-serif',
                fill: '#555'
            })).textContent = stale ? 'no data' : `${Math.round(score * 100)}%`;
        }
    }

    return svg;
}

export function buildRadar(container, sessions) {
    const domainResults = DOMAINS.map(d => {
        const { score, lastTs } = computeDomainScore(sessions, d);
        return {
            label: d.label,
            score: score ?? 1,
            stale: lastTs === null || Date.now() - lastTs > STALE_MS
        };
    });

    container.innerHTML = '';
    container.appendChild(buildSVG(domainResults));

    const desc = document.createElement('p');
    desc.className = 'radar-desc';
    desc.textContent = 'Larger spike = needs more attention. Compares your most recent sessions to your all-time mean. Green ring = at your baseline. Highlighted labels = top 2 areas to focus on.';
    container.appendChild(desc);
}
