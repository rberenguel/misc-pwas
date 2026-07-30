// track.js — procedural track generation and surface checks

export const TRACK_WIDTH = 220;
export const TRACK_HALF = TRACK_WIDTH / 2;
const TRACK_SAMPLES = 1000;

export function generateTrack(difficulty = 0.5, attempt = 0) {
    const cx = 2000, cy = 2000;
    const baseRadius = 1600;
    const harmonics = 10 + Math.floor(difficulty * 10);

    const xCoeffs = [], yCoeffs = [];
    const baseAmp = baseRadius * (0.06 + difficulty * 0.08);
    for (let k = 2; k <= harmonics; k++) {
        const falloff = 1 / (k * 0.7);
        const amp = baseAmp * falloff * (0.3 + Math.random() * 0.4);
        xCoeffs.push({ k, amp: amp * (Math.random() > 0.5 ? 1 : -1), phase: Math.random() * Math.PI * 2 });
        yCoeffs.push({ k, amp: amp * (Math.random() > 0.5 ? 1 : -1), phase: Math.random() * Math.PI * 2 });
    }

    const points = [];
    for (let i = 0; i < TRACK_SAMPLES; i++) {
        const t = (i / TRACK_SAMPLES) * Math.PI * 2;
        let x = cx + baseRadius * Math.cos(t);
        let y = cy + baseRadius * Math.sin(t);
        for (const c of xCoeffs) x += c.amp * Math.cos(c.k * t + c.phase);
        for (const c of yCoeffs) y += c.amp * Math.sin(c.k * t + c.phase);
        points.push({ x, y, t: i / TRACK_SAMPLES });
    }

    let spikiness = 0;
    for (let i = 0; i < xCoeffs.length; i++) {
        spikiness += (Math.abs(xCoeffs[i].amp) + Math.abs(yCoeffs[i].amp)) * xCoeffs[i].k * xCoeffs[i].k;
    }
    spikiness = spikiness / (baseRadius * baseRadius);

    if (attempt < 20 && hasSelfOverlap(points)) {
        return generateTrack(Math.max(0.05, difficulty - 0.03), attempt + 1);
    }
    return { points, spikiness };
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
