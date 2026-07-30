// ai.js — opponents, collision detection

import { createCar, updateCarPhysics } from './car.js';

export function createWaypointAI(trackCenterline, color) {
    const pt = trackCenterline[0];
    const next = trackCenterline[1];
    const tangent = Math.atan2(next.y - pt.y, next.x - pt.x);
    const ai = createCar(pt.x, pt.y, tangent + Math.PI / 2, color);
    ai.aiType = 'waypoint';
    ai.maxSpeed = 9.5 + Math.random() * 1.0;   // 9.5–10.5: slight spread
    ai.acceleration = 0.45;
    ai.turnSpeed = 0.12;
    ai.grip = 0.03 + Math.random() * 0.02;     // 0.03–0.05: low grip = more slide/skids
    ai._steerInertia = 0;
    ai._lookAhead = 25 + Math.floor(Math.random() * 25); // 25–50 track points ahead
    return ai;
}

export function updateWaypointAI(ai, dt, trackCenterline) {
    const speed = Math.hypot(ai.vx, ai.vy);

    // Find nearest point on track to car's current position
    let nearestIdx = 0, nearestDist = Infinity;
    for (let i = 0; i < trackCenterline.length; i++) {
        const d = Math.hypot(trackCenterline[i].x - ai.x, trackCenterline[i].y - ai.y);
        if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }

    // Speed-dependent lookahead: faster cars look further ahead (min 25 pts)
    const dynamicLook = Math.max(ai._lookAhead, Math.floor(speed * 2.5));
    const targetIdx = (nearestIdx + dynamicLook) % trackCenterline.length;
    const target = trackCenterline[targetIdx];

    const dx = target.x - ai.x;
    const dy = target.y - ai.y;
    const dist = Math.hypot(dx, dy);

    const desiredAngle = Math.atan2(dy, dx);
    const forwardAngle = ai.rotation - Math.PI / 2;
    let angleDiff = desiredAngle - forwardAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const idealSteer = Math.abs(angleDiff) < 0.1 ? 0 : (angleDiff > 0 ? 1 : -1);
    ai._steerInertia += (idealSteer - ai._steerInertia) * 0.06;
    const steer = ai._steerInertia;

    // Stuck/backwards recovery: if nearly stopped and facing very wrong, floor it to spin around
    const backward = Math.abs(angleDiff) > Math.PI * 0.7;
    const stuck = speed < 1.5 && backward;
    const gas = (!backward && Math.abs(angleDiff) < Math.PI / 3 && dist > 50) || stuck;
    const brake = Math.abs(angleDiff) > Math.PI / 2 && !stuck;

    return { steer, gas, brake };
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
