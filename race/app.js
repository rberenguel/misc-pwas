import { Application, Container, Graphics } from 'pixi.js';
import GUI from 'lil-gui';

/**
 * PLAN & ARCHITECTURE
 * 
 * 1. GAME LOOP & STATE
 *    - Setup PixiJS Application.
 *    - Maintain an active keys state object for input (Up, Down, Left, Right).
 *    - Bind a main update loop using PixiJS Ticker.
 * 
 * 2. THE KINEMATIC CAR ENTITY
 *    - Position: {x, y}
 *    - Velocity: {x, y} (The actual direction the car is moving)
 *    - Rotation: Float (The direction the car's nose is pointing)
 *    - Z-Axis: Float (Fake height for jumps)
 *    - Z-Velocity: Float (Upward momentum)
 * 
 * 3. PHYSICS PIPELINE (Executed per frame)
 *    - a. Input to Rotation: If Left/Right pressed, modify rotation (center-of-mass steering).
 *    - b. Input to Acceleration: If Up pressed, add thrust vector based on current rotation.
 *    - c. Slide Assist (The Drift Math): Interpolate the actual Velocity vector towards the 
 *         Car's Forward vector based on a "grip" coefficient. 
 *    - d. Friction/Drag: Multiply Velocity by a decay factor (e.g., 0.98) so it stops when coasting.
 *    - e. Update Position: Add Velocity to Position.
 *    - f. Fake 3D Suspension: Apply gravity to Z-Velocity. Add Z-Velocity to Z. Stop at Z=0.
 * 
 * 4. RENDERING & NEON VIBES
 *    - Use PixiJS 8 Graphics API.
 *    - Chain moveTo/lineTo, followed by stroke() at the end.
 *    - Apply glow filters (optional, for later).
 *    - Scale sprite based on Z height to fake jumps.
 */

// --- 1. SETUP ---

const app = new Application();
await app.init({ 
    resizeTo: window,
    backgroundColor: 0x050510, // Dark background for neon vibes
    antialias: true 
});
document.body.appendChild(app.canvas);

// Input state
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', (e) => { if(keys[e.code] !== undefined) keys[e.code] = true; });
window.addEventListener('keyup', (e) => { if(keys[e.code] !== undefined) keys[e.code] = false; });

// --- ARENA ---
const arena = { x: 0, y: 0, width: 4000, height: 4000 };

const arenaBorder = new Graphics()
    .rect(arena.x, arena.y, arena.width, arena.height)
    .stroke({ color: 0xFF00FF, width: 2, alpha: 0.15 });

const arenaGrid = new Graphics();
for (let gx = arena.x + 100; gx < arena.x + arena.width; gx += 200) {
    for (let gy = arena.y + 100; gy < arena.y + arena.height; gy += 200) {
        arenaGrid.circle(gx, gy, 3.5);
        arenaGrid.fill({ color: 0x7777AA, alpha: 0.6 });
    }
}

const world = new Container();
app.stage.addChild(world);
world.addChild(arenaBorder);
world.addChild(arenaGrid);

// --- TRACK ---
function traceTrack(g) {
    const cx = 2000, cy = 2000;
    const w = 1400, h = 1000;
    const r = 300;

    g.moveTo(cx - w + r, cy - h);
    g.lineTo(cx + w - r, cy - h);
    g.arc(cx + w - r, cy - h + r, r, -Math.PI/2, 0);
    g.lineTo(cx + w, cy + h - r);
    g.arc(cx + w - r, cy + h - r, r, 0, Math.PI/2);
    g.lineTo(cx - w + r, cy + h);
    g.arc(cx - w + r, cy + h - r, r, Math.PI/2, Math.PI);
    g.lineTo(cx - w, cy - h + r);
    g.arc(cx - w + r, cy - h + r, r, Math.PI, -Math.PI/2, true);
}

const trackSurf = new Graphics();
traceTrack(trackSurf);
trackSurf.stroke({ width: 150, color: 0x001122 });
world.addChild(trackSurf);

const trackGlow = new Graphics();
traceTrack(trackGlow);
trackGlow.stroke({ width: 154, color: 0x00FFFF, alpha: 0.15 });
world.addChild(trackGlow);

const trackLine = new Graphics();
traceTrack(trackLine);
trackLine.stroke({ width: 2, color: 0x00FFFF, alpha: 0.6 });
world.addChild(trackLine);

// --- TRACK SURFACE CHECK ---
function isOnTrack(x, y) {
    const px = Math.abs(x - 2000);
    const py = Math.abs(y - 2000);
    const dx = Math.max(px - 1100, 0);   // core rect half-width
    const dy = Math.max(py - 700, 0);    // core rect half-height
    const dist = Math.sqrt(dx * dx + dy * dy);
    // track is a 150px-wide band around the rounded-rect centerline
    return dist <= 375 && dist >= 225;
}

// --- DRIFT PARTICLES (inspired by destrier fireworks overlay) ---
const particleCanvas = document.createElement('canvas');
particleCanvas.style.position = 'absolute';
particleCanvas.style.top = '0';
particleCanvas.style.left = '0';
particleCanvas.style.pointerEvents = 'none';
particleCanvas.style.zIndex = '10';
document.body.appendChild(particleCanvas);
const pCtx = particleCanvas.getContext('2d');

function resizeParticles() {
    const dpr = window.devicePixelRatio;
    particleCanvas.width = window.innerWidth * dpr;
    particleCanvas.height = window.innerHeight * dpr;
    particleCanvas.style.width = window.innerWidth + 'px';
    particleCanvas.style.height = window.innerHeight + 'px';
}
resizeParticles();
window.addEventListener('resize', resizeParticles);

let driftParticles = [];

function emitDriftParticle(wx, wy, carVx, carVy) {
    const angle = Math.atan2(carVy, carVx) + Math.PI + (Math.random() - 0.5) * 1.5;
    const spd = 1 + Math.random() * 3;
    const colors = [
        '255,255,255,',   // white spark
        '0,255,255,',     // cyan
        '255,0,255,',     // magenta
        '255,120,0,',     // orange fire
    ];
    driftParticles.push({
        wx, wy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        alpha: 0.6 + Math.random() * 0.4,
        decay: 0.02 + Math.random() * 0.03,
        radius: 1 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
    });
}

function drawDriftParticles(ctx, canvas, camX, camY) {
    const dpr = window.devicePixelRatio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = driftParticles.length - 1; i >= 0; i--) {
        const p = driftParticles[i];
        p.wx += p.vx;
        p.wy += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
            driftParticles.splice(i, 1);
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

// --- 2. THE CAR ENTITY ---

const car = {
    x: 1500,
    y: 1000,
    vx: 0,
    vy: 0,
    rotation: Math.PI / 2, // Radians — facing right, aligned with the top straight
    z: 0,
    vz: 0,
    
    // Tuning parameters — Gene Rally style: savage, weight-shifting drift
    acceleration: 0.45,
    maxSpeed: 10,
    turnSpeed: 0.10,
    friction: 0.995,  // Momentum preserved — speed bleeds very slowly
    grip: 0.06,       // Base lateral grip; drops with speed & off-track
    invertControls: true  // true = Down accelerates, Up brakes (weird mode)
};

// Create the visual representation (Neon Triangle)
const carSprite = new Graphics()
    .moveTo(0, -15)  // Nose
    .lineTo(10, 10)  // Right rear
    .lineTo(-10, 10) // Left rear
    .lineTo(0, -15)  // Close path
    // PixiJS 8 requirement: stroke comes AFTER drawing primitives
    .stroke({ color: 0x00FFFF, width: 2 });

// Center pivot for center-of-mass rotation
carSprite.pivot.set(0, 0);
carSprite.position.set(car.x, car.y);
world.addChild(carSprite);

// --- LIVE TWEAKING UI ---
const gui = new GUI({ title: 'Physics Tuning' });
gui.add(car, 'acceleration', 0.01, 2.0);
gui.add(car, 'maxSpeed', 1, 40);
gui.add(car, 'turnSpeed', 0.01, 0.5);
gui.add(car, 'friction', 0.9, 0.999);
gui.add(car, 'grip', 0.001, 1.0);
gui.add(car, 'invertControls').name('Invert Controls');

// --- 3. PHYSICS & GAME LOOP ---

app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;

    // Pre-compute speed & surface
    const speed = Math.sqrt(car.vx * car.vx + car.vy * car.vy);
    const speedFactor = Math.min(speed / car.maxSpeed, 1);
    const onTrack = isOnTrack(car.x, car.y);

    // A. Steering — speed-dependent (front wheels bite less at speed)
    const effectiveTurnSpeed = car.turnSpeed * (1 - speedFactor * 0.5);
    if (keys.ArrowLeft)  car.rotation -= effectiveTurnSpeed * dt;
    if (keys.ArrowRight) car.rotation += effectiveTurnSpeed * dt;

    // Forward vector
    const forwardX = Math.cos(car.rotation - Math.PI / 2);
    const forwardY = Math.sin(car.rotation - Math.PI / 2);

    // B. Acceleration — full power always available (Gene Rally arcade style)
    const gasKey  = car.invertControls ? keys.ArrowDown  : keys.ArrowUp;
    const brakeKey = car.invertControls ? keys.ArrowUp    : keys.ArrowDown;
    if (gasKey) {
        car.vx += forwardX * car.acceleration * dt;
        car.vy += forwardY * car.acceleration * dt;
    }
    if (brakeKey) { // Braking / Reverse
        car.vx -= forwardX * (car.acceleration * 0.5) * dt;
        car.vy -= forwardY * (car.acceleration * 0.5) * dt;
    }

    // C. Slide Assist (Momentum Redirection) — Gene Rally style
    // The velocity vector is slowly pulled toward the car's heading.
    // This preserves total kinetic energy (no speed scrubbing), only changes direction.
    // At high speed or off-track the redirection is very weak, so momentum carries sideways.
    if (speed > 0.1) {
        const idealVx = forwardX * speed;
        const idealVy = forwardY * speed;

        // Grip drops off as speed builds: at maxSpeed effective grip is ~15% of base
        let surfaceGrip = car.grip * Math.max(0.15, 1 - speedFactor * 0.85);
        if (!onTrack) surfaceGrip *= 0.2; // Grass: even harder to redirect momentum

        car.vx += (idealVx - car.vx) * surfaceGrip * dt;
        car.vy += (idealVy - car.vy) * surfaceGrip * dt;
    }

    // D. Friction — track vs off-track
    const surfaceFriction = onTrack ? car.friction : 0.98;
    car.vx *= Math.pow(surfaceFriction, dt);
    car.vy *= Math.pow(surfaceFriction, dt);

    // Hard speed cap
    if (speed > car.maxSpeed) {
        const ratio = car.maxSpeed / speed;
        car.vx *= ratio;
        car.vy *= ratio;
    }

    // E. Update Position (clamped to arena)
    car.x += car.vx * dt;
    car.y += car.vy * dt;

    const margin = 12;
    if (car.x < arena.x + margin) { car.x = arena.x + margin; car.vx = Math.abs(car.vx) * 0.3; }
    if (car.x > arena.x + arena.width - margin) { car.x = arena.x + arena.width - margin; car.vx = -Math.abs(car.vx) * 0.3; }
    if (car.y < arena.y + margin) { car.y = arena.y + margin; car.vy = Math.abs(car.vy) * 0.3; }
    if (car.y > arena.y + arena.height - margin) { car.y = arena.y + arena.height - margin; car.vy = -Math.abs(car.vy) * 0.3; }

    // F. Fake 3D Z-Axis (For future ramps)
    car.vz -= 0.5 * dt;
    car.z += car.vz * dt;
    if (car.z < 0) {
        car.z = 0;
        car.vz = 0;
    }

    // --- 4. RENDER UPDATES ---
    carSprite.position.set(car.x, car.y);
    carSprite.rotation = car.rotation;
    
    const scale = 1 + (car.z * 0.01);
    carSprite.scale.set(scale);

    // G. Drift particles — emit from rear tires when sliding sideways
    const dot = car.vx * forwardX + car.vy * forwardY;
    const cross = car.vx * forwardY - car.vy * forwardX;
    const slip = Math.abs(Math.atan2(cross, dot));
    if (speed > 3 && slip > 0.5 && slip < Math.PI - 0.5) {
        const rearX = -forwardX;
        const rearY = -forwardY;
        const rightX = Math.cos(car.rotation);
        const rightY = Math.sin(car.rotation);
        const leftRearX = car.x + rearX * 10 - rightX * 8;
        const leftRearY = car.y + rearY * 10 - rightY * 8;
        const rightRearX = car.x + rearX * 10 + rightX * 8;
        const rightRearY = car.y + rearY * 10 + rightY * 8;
        const intensity = Math.min(Math.floor((slip - 0.5) * 4), 4);
        for (let i = 0; i < intensity; i++) {
            emitDriftParticle(leftRearX, leftRearY, car.vx, car.vy);
            emitDriftParticle(rightRearX, rightRearY, car.vx, car.vy);
        }
    }
    // Camera — compute first so particles and PixiJS use the same offset
    world.x = app.screen.width / 2 - car.x;
    world.y = app.screen.height / 2 - car.y;

    drawDriftParticles(pCtx, particleCanvas, world.x, world.y);
});