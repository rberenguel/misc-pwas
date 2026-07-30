// car.js — shared car physics for player and AI

export function createCar(x, y, rotation, color = 0x00FFFF) {
    return {
        x, y, vx: 0, vy: 0, rotation, z: 0, vz: 0,
        acceleration: 0.45,
        maxSpeed: 10,
        turnSpeed: 0.12,
        friction: 0.995,
        grip: 0.06,
        color,
        sprite: null,
    };
}

export function updateCarPhysics(car, dt, steer, gas, brake, isOnTrackFn, arena) {
    const speed = Math.hypot(car.vx, car.vy);
    const speedFactor = Math.min(speed / car.maxSpeed, 1);
    const onTrack = isOnTrackFn(car.x, car.y);

    // Steering
    if (steer !== 0) {
        car.rotation += steer * car.turnSpeed * dt;
    }

    // Forward vector
    const forwardX = Math.cos(car.rotation - Math.PI / 2);
    const forwardY = Math.sin(car.rotation - Math.PI / 2);

    // Acceleration
    if (gas) {
        car.vx += forwardX * car.acceleration * dt;
        car.vy += forwardY * car.acceleration * dt;
    }
    if (brake) {
        car.vx -= forwardX * (car.acceleration * 0.5) * dt;
        car.vy -= forwardY * (car.acceleration * 0.5) * dt;
    }

    // Slide Assist (momentum redirection)
    if (speed > 0.1) {
        const idealVx = forwardX * speed;
        const idealVy = forwardY * speed;
        let surfaceGrip = car.grip * Math.max(0.15, 1 - speedFactor * 0.85);
        if (!onTrack) surfaceGrip *= 0.2;
        car.vx += (idealVx - car.vx) * surfaceGrip * dt;
        car.vy += (idealVy - car.vy) * surfaceGrip * dt;
    }

    // Friction — track vs off-track
    const surfaceFriction = onTrack ? car.friction : 0.96;
    car.vx *= Math.pow(surfaceFriction, dt);
    car.vy *= Math.pow(surfaceFriction, dt);
    if (!onTrack) {
        car.vx *= 0.97;
        car.vy *= 0.97;
    }

    // Speed cap
    if (speed > car.maxSpeed) {
        const ratio = car.maxSpeed / speed;
        car.vx *= ratio;
        car.vy *= ratio;
    }

    // Position update
    car.x += car.vx * dt;
    car.y += car.vy * dt;

    // Arena clamp
    const margin = 12;
    if (car.x < arena.x + margin) { car.x = arena.x + margin; car.vx = Math.abs(car.vx) * 0.3; }
    if (car.x > arena.x + arena.width - margin) { car.x = arena.x + arena.width - margin; car.vx = -Math.abs(car.vx) * 0.3; }
    if (car.y < arena.y + margin) { car.y = arena.y + margin; car.vy = Math.abs(car.vy) * 0.3; }
    if (car.y > arena.y + arena.height - margin) { car.y = arena.y + arena.height - margin; car.vy = -Math.abs(car.vy) * 0.3; }

    // Z physics
    car.vz -= 0.5 * dt;
    car.z += car.vz * dt;
    if (car.z < 0) { car.z = 0; car.vz = 0; }

    // Slip metrics for renderer
    const dot = car.vx * forwardX + car.vy * forwardY;
    const cross = car.vx * forwardY - car.vy * forwardX;
    const slip = Math.abs(Math.atan2(cross, dot));
    const turnSign = Math.sign(cross);
    const movingForward = dot > 0;

    return { speed, speedFactor, onTrack, forwardX, forwardY, dot, cross, slip, turnSign, movingForward };
}
