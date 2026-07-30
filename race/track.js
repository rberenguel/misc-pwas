// track.js — procedural track generation and surface checks

export const TRACK_WIDTH = 260;
export const TRACK_HALF = TRACK_WIDTH / 2;
const TRACK_SAMPLES = 1000;

// Seeded PRNG (Mulberry32) — deterministic for shared track IDs
function createRng(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function hashStringToSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = h << 15 | h >>> 17;
        h = Math.imul(h, 461845907);
    }
    h ^= h >>> 16;
    h = Math.imul(h, 2246822507);
    h ^= h >>> 13;
    h = Math.imul(h, 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
}

// Convert numeric seed to short alphanumeric track ID (e.g. "X7kP9m")
export function seedToTrackId(seed) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    let n = seed >>> 0;
    for (let i = 0; i < 6; i++) {
        id = chars[n % chars.length] + id; // prepend so MSB is first (matches trackIdToSeed)
        n = Math.floor(n / chars.length);
    }
    return id;
}

export function trackIdToSeed(id) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let seed = 0;
    for (let i = 0; i < id.length; i++) {
        const idx = chars.indexOf(id[i]);
        if (idx < 0) return null;
        seed = seed * chars.length + idx;
    }
    return seed;
}

function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return {
        x: 0.5 * ((2 * p1.x) +
                  (-p0.x + p2.x) * t +
                  (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
                  (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * ((2 * p1.y) +
                  (-p0.y + p2.y) * t +
                  (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
                  (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
    };
}

export function generateTrack(difficulty = 0.5, attempt = 0, seedOrId = null) {
    let seed;
    if (seedOrId === null) {
        seed = Math.floor(Math.random() * 4294967296);
    } else if (typeof seedOrId === 'string') {
        seed = trackIdToSeed(seedOrId);
        if (seed === null) seed = hashStringToSeed(seedOrId);
    } else {
        seed = seedOrId >>> 0;
    }

    const rng = createRng(seed);
    const cx = 2000, cy = 2000;

    // More points = more complex/wiggly shape; fewer = longer straights, sharper corners
    const nPoints = 4 + Math.floor(difficulty * 10); // 4 to 14 control points

    // Generate control points with extreme radius variation
    const rawPoints = [];
    for (let i = 0; i < nPoints; i++) {
        const baseAngle = (i / nPoints) * Math.PI * 2;
        const angle = baseAngle + (rng() - 0.5) * (Math.PI / nPoints) * 0.6;
        const minR = 250 + (1 - difficulty) * 350;   // 250 to 600
        const maxR = 1400 + difficulty * 600;        // 1400 to 2000
        const r = minR + rng() * (maxR - minR);
        rawPoints.push({
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle),
            angle
        });
    }
    // Sort by angle so the loop doesn't cross over itself
    rawPoints.sort((a, b) => a.angle - b.angle);
    const cp = rawPoints.map(p => ({ x: p.x, y: p.y }));

    // Sample along closed Catmull-Rom spline
    const points = [];
    const samplesPerSegment = Math.max(40, Math.floor(TRACK_SAMPLES / nPoints));

    for (let i = 0; i < nPoints; i++) {
        const p0 = cp[(i - 1 + nPoints) % nPoints];
        const p1 = cp[i];
        const p2 = cp[(i + 1) % nPoints];
        const p3 = cp[(i + 2) % nPoints];
        for (let s = 0; s < samplesPerSegment; s++) {
            const t = s / samplesPerSegment;
            const pt = catmullRom(p0, p1, p2, p3, t);
            points.push({ x: pt.x, y: pt.y });
        }
    }

    // Trim/pad to exactly TRACK_SAMPLES
    if (points.length > TRACK_SAMPLES) points.length = TRACK_SAMPLES;
    while (points.length < TRACK_SAMPLES) {
        const src = points[points.length % points.length];
        points.push({ x: src.x, y: src.y });
    }
    for (let i = 0; i < points.length; i++) points[i].t = i / points.length;

    // Spikiness = average turning angle per segment
    let spikiness = 0;
    for (let i = 0; i < points.length; i++) {
        const prev = points[(i - 1 + points.length) % points.length];
        const curr = points[i];
        const next = points[(i + 1) % points.length];
        let turn = Math.abs(Math.atan2(next.y - curr.y, next.x - curr.x) -
                            Math.atan2(curr.y - prev.y, curr.x - prev.x));
        while (turn > Math.PI) turn -= Math.PI * 2;
        spikiness += Math.abs(turn);
    }
    spikiness = spikiness / points.length;

    if (attempt < 20 && hasSelfOverlap(points)) {
        return generateTrack(Math.max(0.05, difficulty - 0.03), attempt + 1, seed);
    }
    return { points, spikiness, seed, trackId: seedToTrackId(seed) };
}

function hasSelfOverlap(points) {
    const minGap = TRACK_WIDTH * 0.8;
    const step = 25, skip = 50;
    for (let i = 0; i < points.length; i += step) {
        const a = points[i];
        for (let j = i + skip; j < points.length; j += step) {
            const b = points[j];
            if (Math.hypot(a.x - b.x, a.y - b.y) < minGap) return true;
        }
    }
    return false;
}

export function drawTrackPath(g, centerline, width, color, alpha = 1) {
    if (centerline.length === 0) return;
    g.moveTo(centerline[0].x, centerline[0].y);
    for (let i = 1; i < centerline.length; i++) g.lineTo(centerline[i].x, centerline[i].y);
    g.lineTo(centerline[0].x, centerline[0].y);
    g.stroke({ width, color, alpha });
}

export function isOnTrack(x, y, centerline) {
    let minDist = Infinity;
    for (const p of centerline) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < minDist) minDist = d;
    }
    return minDist <= TRACK_HALF;
}

// Brute-force closest sample. O(1000) per call — trivial for 6 cars @ 60fps.
export function getTrackProgress(x, y, centerline) {
    let bestDist = Infinity, bestIdx = 0;
    for (let i = 0; i < centerline.length; i++) {
        const d = Math.hypot(centerline[i].x - x, centerline[i].y - y);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    return bestIdx / centerline.length; // 0..1
}
