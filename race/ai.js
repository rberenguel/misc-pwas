// ai.js — opponents, collision detection

import { createCar, updateCarPhysics } from './car.js';

export function createWaypointAI(trackCenterline, color) {
    const pt = trackCenterline[0];
    const next = trackCenterline[1];
    const tangent = Math.atan2(next.y - pt.y, next.x - pt.x);
    const ai = createCar(pt.x, pt.y, tangent + Math.PI / 2, color);
    ai.aiType = 'waypoint';
    ai.maxSpeed = 9.5 + Math.random() * 1.0;   // 9.5–10.5: slight spread
    ai.acceleration = 0.14;
    ai.turnSpeed = 0.07;
    ai.offTrackGrip = 2.0;    // 2x better steering on grass than player
    ai.offTrackDecay = 0.99;  // barely loses speed on grass
    ai.grip = 0.03 + Math.random() * 0.02;     // 0.03–0.05: low grip = more slide/skids
    ai._steerInertia = 0;
    ai._lookAhead = 25 + Math.floor(Math.random() * 25); // 25–50 track points ahead
    ai._lineOffset = (Math.random() - 0.5) * 50;        // -25 to +25: inside ↔ outside line
    ai._brakeAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.35; // 80°–100° brake threshold
    ai._riskFactor = 0.2 + Math.random() * 0.8;         // 0.2 = cautious, 1.0 = aggressive
    ai._trackMemory = new Float32Array(1000);           // per-point caution: 0 = fearless, 1 = terrified
    ai._lastTrackIdx = 0;
    ai._smoothLook = ai._lookAhead;                    // smoothed lookahead, prevents jitter
    return ai;
}

export function updateWaypointAI(ai, dt, trackCenterline) {
    const speed = Math.hypot(ai.vx, ai.vy);

    // Find nearest point on track (pure distance — the old correct way)
    let start = ai._lastTrackIdx || 0;
    let nearestIdx = start, nearestDist = Infinity;
    const win = 60;
    for (let i = -win; i <= win; i++) {
        const idx = (start + i + trackCenterline.length) % trackCenterline.length;
        const d = Math.hypot(trackCenterline[idx].x - ai.x, trackCenterline[idx].y - ai.y);
        if (d < nearestDist) { nearestDist = d; nearestIdx = idx; }
    }
    ai._lastTrackIdx = nearestIdx;

    // Off-track: don't use nearest point as base — pick a rejoin point ahead on the track
    const offTrack = nearestDist > 120; // generous threshold
    if (offTrack) {
        const forwardX = Math.cos(ai.rotation - Math.PI / 2);
        const forwardY = Math.sin(ai.rotation - Math.PI / 2);
        // Scan ahead from nearest point for a shallow rejoin angle
        let bestIdx = nearestIdx, bestDot = -Infinity;
        for (let i = 8; i <= 70; i++) {
            const idx = (nearestIdx + i) % trackCenterline.length;
            const dx = trackCenterline[idx].x - ai.x;
            const dy = trackCenterline[idx].y - ai.y;
            const dot = dx * forwardX + dy * forwardY;
            if (dot > bestDot) { bestDot = dot; bestIdx = idx; }
        }
        nearestIdx = bestIdx;
    }

    // Speed-dependent base lookahead
    const baseLook = Math.max(ai._lookAhead, Math.floor(speed * 2.5));

    // Measure curvature of upcoming path
    let curvature = 0;
    const sampleWindow = Math.min(baseLook, 35);
    for (let i = 0; i < sampleWindow; i++) {
        const i1 = (nearestIdx + i) % trackCenterline.length;
        const i2 = (nearestIdx + i + 1) % trackCenterline.length;
        const i3 = (nearestIdx + i + 2) % trackCenterline.length;
        const a1 = Math.atan2(trackCenterline[i2].y - trackCenterline[i1].y, trackCenterline[i2].x - trackCenterline[i1].x);
        const a2 = Math.atan2(trackCenterline[i3].y - trackCenterline[i2].y, trackCenterline[i3].x - trackCenterline[i2].x);
        let diff = a2 - a1;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        curvature += Math.abs(diff);
    }

    // Shrink lookahead on sharp curves
    const curveFactor = 1 / (1 + curvature * 1.2);
    const physicsLook = Math.max(8, Math.floor(baseLook * curveFactor));

    // Read learned caution over upcoming path
    let upcomingCaution = 0;
    for (let i = 0; i < Math.min(physicsLook, 50); i++) {
        upcomingCaution = Math.max(upcomingCaution, ai._trackMemory[(nearestIdx + i) % 1000]);
    }

    // Caution = shorter lookahead + earlier braking; risk = later braking + longer look
    const cautionClamp = Math.min(upcomingCaution, 1.0);
    const rawLook = Math.max(8, Math.floor(physicsLook * (1 - cautionClamp * 0.25) * (0.7 + ai._riskFactor * 0.3)));
    ai._smoothLook += (rawLook - ai._smoothLook) * 0.15; // smooth over ~7 frames
    const effectiveLook = Math.floor(ai._smoothLook);
    const cautiousBrake = ai._brakeAngle * (1 - cautionClamp * 0.3 * ai._riskFactor);
    if (cautionClamp > 0.05 && Math.random() < 0.02) {
        console.log(`[USE] ${ai.def?.name || 'AI'} caution=${cautionClamp.toFixed(2)} look=${effectiveLook} brake=${cautiousBrake.toFixed(2)}`);
    }

    // Single target point on the track ahead
    const targetIdx = (nearestIdx + effectiveLook) % trackCenterline.length;
    const target = trackCenterline[targetIdx];

    // Perpendicular offset for racing line — only on straights/mild curves
    const isMild = curvature < Math.PI / 4;
    const lineOffset = isMild ? ai._lineOffset : 0;
    const prevIdx = (targetIdx - 1 + trackCenterline.length) % trackCenterline.length;
    const nextIdx = (targetIdx + 1) % trackCenterline.length;
    const tdx = trackCenterline[nextIdx].x - trackCenterline[prevIdx].x;
    const tdy = trackCenterline[nextIdx].y - trackCenterline[prevIdx].y;
    const tlen = Math.hypot(tdx, tdy) || 1;
    const nx = -tdy / tlen;
    const ny =  tdx / tlen;
    const ox = target.x + nx * lineOffset;
    const oy = target.y + ny * lineOffset;

    const dx = ox - ai.x;
    const dy = oy - ai.y;
    const dist = Math.hypot(dx, dy);

    const desiredAngle = Math.atan2(dy, dx);
    const forwardAngle = ai.rotation - Math.PI / 2;
    let angleDiff = desiredAngle - forwardAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const idealSteer = Math.abs(angleDiff) < 0.08 ? 0 : (angleDiff > 0 ? 1 : -1);
    ai._steerInertia += (idealSteer - ai._steerInertia) * 0.10;
    const steer = ai._steerInertia;

    // Stuck/backwards recovery
    const backward = Math.abs(angleDiff) > Math.PI * 0.7;
    const stuck = speed < 1.5 && backward;

    // Curvature-based speed limit — riskier cars carry more speed into corners
    const safeSpeed = ai.maxSpeed / (1 + curvature * 0.6 * (1.4 - ai._riskFactor));
    const tooFast = speed > safeSpeed + 1.0 && curvature > 0.3;

    // Pre-braking only when moving fast enough to need it
    const sharpCurve = curvature > Math.PI / 3 && speed > 3;
    const gas = (!backward && Math.abs(angleDiff) < Math.PI / 3 && dist > 25 && !sharpCurve && !tooFast) || stuck;
    const brake = (Math.abs(angleDiff) > cautiousBrake || (sharpCurve && speed > 4) || tooFast) && !stuck;

    return { steer, gas, brake, nearestIdx };
}

const DRAFT_RANGE = 140;
const DRAFT_MIN = 10;
const DRAFT_BONUS = 1.5;

export function computeDraftBoost(car, allCars) {
    const forwardX = Math.cos(car.rotation - Math.PI / 2);
    const forwardY = Math.sin(car.rotation - Math.PI / 2);

    for (const other of allCars) {
        if (other === car) continue;
        const dx = other.x - car.x;
        const dy = other.y - car.y;
        const dist = Math.hypot(dx, dy);
        if (dist < DRAFT_MIN || dist > DRAFT_RANGE) continue;

        // Other must be in front of car
        const dot = dx * forwardX + dy * forwardY;
        if (dot <= 0) continue;

        // Must be roughly straight ahead, not far to the side
        const cross = dx * forwardY - dy * forwardX;
        if (Math.abs(cross) > 60) continue;

        // Both heading roughly same direction
        let hDiff = other.rotation - car.rotation;
        while (hDiff > Math.PI) hDiff -= Math.PI * 2;
        while (hDiff < -Math.PI) hDiff += Math.PI * 2;
        if (Math.abs(hDiff) > Math.PI / 3) continue;

        // Slipstream only generated by a fast lead car
        const otherSpeed = Math.hypot(other.vx, other.vy);
        if (otherSpeed < 8) continue;

        return DRAFT_BONUS;
    }
    return 0;
}

export function resolveCollisions(cars) {
    const radius = 8;
    for (let i = 0; i < cars.length; i++) {
        for (let j = i + 1; j < cars.length; j++) {
            const a = cars[i], b = cars[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const dist = Math.hypot(dx, dy);
            if (dist < radius * 2 && dist > 0.001) {
                const nx = dx / dist;
                const ny = dy / dist;
                const dvx = a.vx - b.vx;
                const dvy = a.vy - b.vy;
                const dot = dvx * nx + dvy * ny;
                if (dot > 0) {
                    a.vx -= dot * nx;
                    a.vy -= dot * ny;
                    b.vx += dot * nx;
                    b.vy += dot * ny;
                }
                const overlap = (radius * 2 - dist) * 0.5;
                a.x -= nx * overlap;
                a.y -= ny * overlap;
                b.x += nx * overlap;
                b.y += ny * overlap;
            }
        }
    }
}
