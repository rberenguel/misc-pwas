// ai.js — opponents, collision detection

import { createCar, updateCarPhysics } from './car.js';

export function createWaypointAI(trackCenterline, startIndex, color) {
    const pt = trackCenterline[startIndex];
    const next = trackCenterline[(startIndex + 1) % trackCenterline.length];
    const tangent = Math.atan2(next.y - pt.y, next.x - pt.x);
    const ai = createCar(pt.x, pt.y, tangent + Math.PI / 2, color);
    ai.waypointIndex = (startIndex + 20) % trackCenterline.length;
    ai.aiType = 'waypoint';
    ai.maxSpeed = 10;
    ai.acceleration = 0.45;
    ai.turnSpeed = 0.12;
    ai.grip = 0.04;
    ai._steerInertia = 0;
    return ai;
}

export function updateWaypointAI(ai, dt, trackCenterline) {
    const speed = Math.hypot(ai.vx, ai.vy);
    const target = trackCenterline[ai.waypointIndex];
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
    const gas = Math.abs(angleDiff) < Math.PI / 3 && dist > 50;
    const brake = Math.abs(angleDiff) > Math.PI / 2 || (dist < 30 && speed > 3);

    if (dist < 60) {
        ai.waypointIndex = (ai.waypointIndex + 8) % trackCenterline.length;
    }

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
