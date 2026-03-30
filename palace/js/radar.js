// Adapted from bt/radar.js — palace edition
// score = 1 means "needs attention", 0 means "doing well"
// Spike height = how much attention this domain needs

const RECENT_MS  = 7  * 24 * 60 * 60 * 1000;
const WINDOW_MS  = 21 * 24 * 60 * 60 * 1000;
const STALE_MS   = 7  * 24 * 60 * 60 * 1000;

const DOMAINS = [
    {
        label: 'Index',
        filter: s => s.mode === 1,
        metric: s => s.cards.filter(c => c.correct).length / s.cards.length,
        invert: false
    },
    {
        label: 'Speed',
        filter: s => s.mode === 1 && s.cards.length > 0,
        metric: s => {
            const ms = s.cards.map(c => c.revealMs);
            return ms.reduce((a, b) => a + b, 0) / ms.length;
        },
        invert: true  // lower ms = better
    },
    {
        label: 'Span',
        filter: s => s.mode === 2,
        metric: s => s.success ? s.sequenceLength : s.sequenceLength * 0.25,
        invert: false
    },
    {
        label: 'Recall',
        filter: s => s.mode === 3,
        metric: s => {
            const nonGhost = s.tested.filter(t => !t.wasGhost);
            if (!nonGhost.length) return null;
            return nonGhost.filter(t => t.correct).length / nonGhost.length;
        },
        invert: false
    },
    {
        label: 'Vigilance',
        filter: s => s.mode === 3 && s.tested.some(t => t.wasGhost),
        metric: s => {
            const ghosts = s.tested.filter(t => t.wasGhost);
            if (!ghosts.length) return null;
            return ghosts.filter(t => t.correct).length / ghosts.length;
        },
        invert: false
    }
];

function computeDomainScore(sessions, domain) {
    const filtered = sessions.filter(domain.filter);
    if (!filtered.length) return { score: null, lastTs: null };

    const pairs = filtered.flatMap(s => {
        try {
            const v = domain.metric(s);
            return v != null && isFinite(v) ? [{ v, ts: s.timestamp }] : [];
        } catch { return []; }
    });

    if (!pairs.length) return { score: null, lastTs: null };

    const now = Date.now();
    const lastTs = pairs[pairs.length - 1].ts;

    const windowPairs = pairs.filter(p => p.ts >= now - WINDOW_MS);
    const baselinePairs = windowPairs.length > 0 ? windowPairs : pairs;
    const windowMean = baselinePairs.reduce((s, p) => s + p.v, 0) / baselinePairs.length;

    const recentValues = pairs.filter(p => p.ts >= now - RECENT_MS).map(p => p.v);

    let perf;
    if (!recentValues.length) {
        perf = 0.5;
    } else {
        const recentMean = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
        const ratio = domain.invert
            ? (recentMean > 0 ? windowMean / recentMean : 1)
            : (windowMean > 0 ? recentMean / windowMean : 1);
        perf = Math.min(1, ratio / 2);
    }

    const daysSinceLast = (now - lastTs) / (24 * 60 * 60 * 1000);
    const recency = Math.pow(0.5, daysSinceLast / 7);

    return { score: 1 - perf * recency, lastTs };
}

// --- SVG ---

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

    // Top worst domains (highest score = most needs attention)
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
    desc.textContent = 'Larger spike = needs more attention. Green ring = midpoint baseline. Highlighted labels = top 2 areas to focus on.';
    container.appendChild(desc);
}
