// renderer.js — particles, skid marks, camera, car visuals

import { Graphics } from 'pixi.js';

export function createCarSprite(color = 0x00FFFF, isPlayer = false) {
    const g = new Graphics()
        .moveTo(0, -15)
        .lineTo(10, 10)
        .lineTo(-10, 10)
        .lineTo(0, -15);
    if (isPlayer) {
        g.fill({ color, alpha: 0.5 });
    }
    g.stroke({ color, width: 2 });
    g.pivot.set(0, -10);
    return g;
}

export function updateCarSprite(sprite, car, slip, turnSign, movingForward) {
    sprite.position.set(
        car.x + 10 * Math.sin(car.rotation),
        car.y - 10 * Math.cos(car.rotation)
    );
    sprite.rotation = car.rotation;
    const scale = 1 + (car.z * 0.01);
    sprite.scale.set(scale);
    // Body roll only when moving forward (fix reverse skew bug)
    sprite.skew.x = movingForward ? slip * 0.12 * turnSign : 0;
}

export function initParticles() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '10';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    function resize() {
        const dpr = window.devicePixelRatio;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
    }
    resize();
    window.addEventListener('resize', resize);

    let particles = [];

    function emit(wx, wy, carVx, carVy) {
        const angle = Math.atan2(carVy, carVx) + Math.PI + (Math.random() - 0.5) * 1.5;
        const spd = 1 + Math.random() * 3;
        const colors = ['255,255,255,', '0,255,255,', '255,0,255,', '255,120,0,'];
        particles.push({
            wx, wy,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            alpha: 0.6 + Math.random() * 0.4,
            decay: 0.02 + Math.random() * 0.03,
            radius: 1 + Math.random() * 3,
            color: colors[Math.floor(Math.random() * colors.length)],
        });
    }

    function draw(camX, camY) {
        const dpr = window.devicePixelRatio;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.wx += p.vx;
            p.wy += p.vy;
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                particles.splice(i, 1);
                continue;
            }
            const sx = (p.wx + camX) * dpr;
            const sy = (p.wy + camY) * dpr;
            ctx.beginPath();
            ctx.arc(sx, sy, p.radius * dpr, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${p.color} ${p.alpha})`;
            ctx.fill();
        }
    }

    return { canvas, emit, draw };
}

export function initSkids() {
    const graphics = new Graphics();
    let segments = [];

    function emitSeg(x1, y1, x2, y2) {
        segments.push({ x1, y1, x2, y2, age: 0 });
    }

    function clear() {
        graphics.clear();
        segments = [];
    }

    function draw(isOnTrackFn) {
        segments.forEach(s => s.age++);
        segments = segments.filter(s => s.age < 600);
        graphics.clear();
        for (const s of segments) {
            const alpha = Math.max(0, 1 - s.age / 2400);
            const onSeg = isOnTrackFn((s.x1 + s.x2) * 0.5, (s.y1 + s.y2) * 0.5);
            const color = onSeg ? 0x00FFFF : 0xFF00FF;
            const segAlpha = onSeg ? alpha * 0.25 : alpha * 0.15;
            graphics.moveTo(s.x1, s.y1);
            graphics.lineTo(s.x2, s.y2);
            graphics.stroke({ width: 2, color, alpha: segAlpha });
        }
    }

    return { graphics, emitSeg, clear, draw };
}

export function updateCamera(world, targetX, targetY, screenW, screenH) {
    world.x = screenW / 2 - targetX;
    world.y = screenH / 2 - targetY;
    return { x: world.x, y: world.y };
}
