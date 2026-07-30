import { Application, Container, Graphics } from 'pixi.js';
import GUI from 'lil-gui';
import { TRACK_WIDTH, TRACK_HALF, generateTrack, drawTrackPath, isOnTrack, getTrackProgress } from './track.js';
import { createCar, updateCarPhysics } from './car.js';
import { createCarSprite, updateCarSprite, initParticles, initSkids, updateCamera } from './renderer.js';
import { createWaypointAI, updateWaypointAI, resolveCollisions } from './ai.js';

// --- 1. SETUP ---
const app = new Application();
await app.init({ resizeTo: window, backgroundColor: 0x050510, antialias: true });
document.body.appendChild(app.canvas);

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', (e) => { if (keys[e.code] !== undefined) keys[e.code] = true; });
window.addEventListener('keyup', (e) => { if (keys[e.code] !== undefined) keys[e.code] = false; });

const arena = { x: 0, y: 0, width: 4000, height: 4000 };

const world = new Container();
app.stage.addChild(world);

// Arena visuals
const arenaBorder = new Graphics()
    .rect(arena.x, arena.y, arena.width, arena.height)
    .stroke({ color: 0xFF00FF, width: 2, alpha: 0.15 });
world.addChild(arenaBorder);

const arenaGrid = new Graphics();
for (let gx = arena.x + 100; gx < arena.x + arena.width; gx += 200) {
    for (let gy = arena.y + 100; gy < arena.y + arena.height; gy += 200) {
        arenaGrid.circle(gx, gy, 3.5);
        arenaGrid.fill({ color: 0x7777AA, alpha: 0.6 });
    }
}
world.addChild(arenaGrid);

// Skids layer
const skids = initSkids();

// Track layers
const trackSurf = new Graphics();
const trackGlow = new Graphics();
const trackLine = new Graphics();
world.addChild(trackSurf);
world.addChild(trackGlow);
world.addChild(trackLine);
world.addChild(skids.graphics);

let trackCenterline = [];
let trackSpikiness = 0;

function rebuildTrack(difficulty) {
    const data = generateTrack(difficulty);
    trackCenterline = data.points;
    trackSpikiness = data.spikiness;
    trackSurf.clear();
    trackGlow.clear();
    trackLine.clear();
    drawTrackPath(trackSurf, trackCenterline, TRACK_WIDTH, 0x001122);
    drawTrackPath(trackGlow, trackCenterline, TRACK_WIDTH + 4, 0x00FFFF, 0.15);
    drawTrackPath(trackLine, trackCenterline, 2, 0x00FFFF, 0.6);
    skids.clear();
}

rebuildTrack(0.6);

// --- 2. CARS ---
const startPt = trackCenterline[0];
const nextPt = trackCenterline[1];
const tangent = Math.atan2(nextPt.y - startPt.y, nextPt.x - startPt.x);

const player = createCar(startPt.x, startPt.y, tangent + Math.PI / 2, 0x00FFFF);
player.invertControls = true;
player.trackDifficulty = 0.6;
player.isPlayer = true;

const playerSprite = createCarSprite(0x00FFFF, true);
world.addChild(playerSprite);
player.sprite = playerSprite;

// --- STARTING GRID ---
const perpAngle = tangent + Math.PI / 2;
const perpX = Math.cos(perpAngle);
const perpY = Math.sin(perpAngle);
const backX = -Math.cos(tangent);
const backY = -Math.sin(tangent);

function placeOnGrid(car, index) {
    const row = Math.floor(index / 2);
    const side = (index % 2 === 0) ? -1 : 1;
    car.x = startPt.x + perpX * side * 35 + backX * row * 50;
    car.y = startPt.y + perpY * side * 35 + backY * row * 50;
    car.rotation = tangent + Math.PI / 2;
}

placeOnGrid(player, 0);

// AI opponents
const aiDefs = [
    { color: 0xFF00FF, name: 'Magenta' },
    { color: 0x00FF00, name: 'Green'   },
    { color: 0xFF8000, name: 'Orange'  },
    { color: 0xFFFF00, name: 'Yellow'  },
    { color: 0x8000FF, name: 'Purple'  },
];

const aiCars = [];
const aiSprites = [];
for (let i = 0; i < aiDefs.length; i++) {
    const def = aiDefs[i];
    const ai = createWaypointAI(trackCenterline, def.color);
    placeOnGrid(ai, i + 1);
    const sprite = createCarSprite(def.color, false);
    world.addChild(sprite);
    ai.sprite = sprite;
    ai.def = def;
    ai.lap = 0;
    ai.prevPos = 0;
    ai._trackIdx = 0;
    aiCars.push(ai);
    aiSprites.push(sprite);
}

player.lap = 0;
player.prevPos = 0;
player._trackIdx = 0;
player._hasPassedMidtrack = true; // player starts at front of grid, already "past" start
for (const ai of aiCars) { ai.prevPos = 0; ai._trackIdx = 0; ai._hasPassedMidtrack = false; }

// --- START-FINISH LINE ---
const finishLine = new Graphics();
finishLine.moveTo(startPt.x - perpX * TRACK_HALF, startPt.y - perpY * TRACK_HALF);
finishLine.lineTo(startPt.x + perpX * TRACK_HALF, startPt.y + perpY * TRACK_HALF);
finishLine.stroke({ width: 3, color: 0xFFFFFF, alpha: 0.7 });
world.addChild(finishLine);

// --- LAP UI ---
const lapDiv = document.createElement('div');
lapDiv.style.position = 'absolute';
lapDiv.style.top = '10px';
lapDiv.style.left = '10px';
lapDiv.style.color = '#00FFFF';
lapDiv.style.fontFamily = 'monospace';
lapDiv.style.fontSize = '18px';
lapDiv.style.zIndex = '1000';
lapDiv.style.pointerEvents = 'none';
document.body.appendChild(lapDiv);

const allCars = [player, ...aiCars];
let raceStarted = false;
let raceFinished = false;
let raceFrame = 0;
let paused = false;
const TOTAL_LAPS = 3;

window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' || e.code === 'Space') {
        paused = !paused;
        e.preventDefault();
    }
});

// --- DEBUG PANEL ---
const debugDiv = document.createElement('div');
debugDiv.style.position = 'absolute';
debugDiv.style.bottom = '10px';
debugDiv.style.left = '10px';
debugDiv.style.color = '#00FF00';
debugDiv.style.background = 'rgba(0,0,0,0.9)';
debugDiv.style.fontFamily = 'monospace';
debugDiv.style.fontSize = '12px';
debugDiv.style.zIndex = '99999';
debugDiv.style.pointerEvents = 'none';
debugDiv.style.padding = '8px';
debugDiv.style.lineHeight = '1.4';
document.body.appendChild(debugDiv);

// --- POSITION LABELS ---
const labelDivs = [];
for (let i = 0; i < allCars.length; i++) {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.color = '#FFFFFF';
    div.style.fontFamily = 'monospace';
    div.style.fontSize = '14px';
    div.style.fontWeight = 'bold';
    div.style.textAlign = 'center';
    div.style.width = '30px';
    div.style.pointerEvents = 'none';
    div.style.transition = 'opacity 1s';
    div.style.opacity = '0';
    div.textContent = String(i + 1);
    document.body.appendChild(div);
    labelDivs.push(div);
}

function showLabels() {
    labelDivs.forEach(d => { d.style.opacity = '1'; });
    setTimeout(() => {
        labelDivs.forEach(d => { d.style.opacity = '0'; });
    }, 4000);
}
showLabels();

function getRaceProgress(car) {
    return car.lap + car._trackIdx / 1000;
}

function getLeader() {
    let best = -1, leader = player;
    for (const c of allCars) {
        const prog = getRaceProgress(c);
        if (prog > best) { best = prog; leader = c; }
    }
    return leader;
}

function getColorName(hex) {
    if (hex === 0x00FFFF) return 'Cyan';
    if (hex === 0xFF00FF) return 'Magenta';
    if (hex === 0x00FF00) return 'Green';
    if (hex === 0xFF8000) return 'Orange';
    if (hex === 0xFFFF00) return 'Yellow';
    if (hex === 0x8000FF) return 'Purple';
    return 'Unknown';
}

// --- 3. OVERLAYS ---
const particles = initParticles();

// --- 4. GUI ---
const gui = new GUI({ title: 'Physics Tuning' });
gui.add(player, 'acceleration', 0.01, 2.0);
gui.add(player, 'maxSpeed', 1, 40);
gui.add(player, 'turnSpeed', 0.01, 0.5);
gui.add(player, 'friction', 0.9, 0.999);
gui.add(player, 'grip', 0.001, 1.0);
gui.add(player, 'invertControls').name('Invert Controls');
gui.add(player, 'trackDifficulty', 0.1, 1.0).name('Track Difficulty').onChange(v => rebuildTrack(v));

// --- 5. GAME LOOP ---
app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;

    if (paused) return;

    // --- RACE START ---
    const gas = player.invertControls ? keys.ArrowDown : keys.ArrowUp;
    if (!raceStarted && gas) {
        raceStarted = true;
        raceFrame = 0;
        showLabels();
    }
    if (raceStarted) raceFrame++;

    // --- PLAYER ---
    const steer = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0);
    const brake = player.invertControls ? keys.ArrowUp : keys.ArrowDown;
    const pState = updateCarPhysics(player, dt, steer, gas, brake,
        (x, y) => isOnTrack(x, y, trackCenterline), arena);

    // --- AI ---
    const aiStates = [];
    for (const ai of aiCars) {
        let aiInput, aiState;
        if (raceStarted && ai.lap < TOTAL_LAPS) {
            aiInput = updateWaypointAI(ai, dt, trackCenterline);
            aiState = updateCarPhysics(ai, dt, aiInput.steer, aiInput.gas, aiInput.brake,
                (x, y) => isOnTrack(x, y, trackCenterline), arena);
        } else if (ai.lap >= TOTAL_LAPS) {
            // Finished: hard brake to stop
            aiState = updateCarPhysics(ai, dt, 0, false, true,
                (x, y) => isOnTrack(x, y, trackCenterline), arena);
        } else {
            // Race not started: frozen, zero velocity
            aiState = { speed: 0, speedFactor: 0, onTrack: true, forwardX: 0, forwardY: 1, dot: 0, cross: 0, slip: 0, turnSign: 0, movingForward: true };
        }
        aiStates.push(aiState);
        updateCarSprite(ai.sprite, ai, aiState.slip, aiState.turnSign, aiState.movingForward);
    }

    // --- LAPS ---
    // Gate lap counting for 2 seconds so cars clear the start zone and establish correct indices
    if (raceStarted && raceFrame > 120) {
        for (const c of allCars) {
            const idx = Math.floor(getTrackProgress(c.x, c.y, trackCenterline) * 1000);
            if (idx > 500) c._hasPassedMidtrack = true;
            if (c._trackIdx !== undefined && c._trackIdx > 800 && idx < 200 && c.lap < TOTAL_LAPS && c._hasPassedMidtrack) {
                c.lap++;
                c._hasPassedMidtrack = false;
            }
            c._trackIdx = idx;
        }
        const leaderCar = getLeader();
        const leaderName = getColorName(leaderCar.color);
        // leader name already set above
        if (!raceFinished && player.lap >= TOTAL_LAPS) {
            raceFinished = true;
            const rank = allCars.filter(c => getRaceProgress(c) > getRaceProgress(player)).length + 1;
            lapDiv.innerHTML = `<b>RACE FINISHED — ${rank}${rank===1?'st':rank===2?'nd':rank===3?'rd':'th'} place</b><br>Press any key for next track`;
            window.addEventListener('keydown', advanceToNextTrack, { once: true });
        } else {
            lapDiv.textContent = `Lap ${Math.min(player.lap + 1, TOTAL_LAPS)}/${TOTAL_LAPS}  |  Leader: ${leaderName}`;
        }
    } else {
        lapDiv.textContent = 'Press gas to start race';
    }

    // --- POSITION TRACKING ---
    if (raceStarted && raceFrame > 60) {
        const scores = allCars.map((c, i) => ({
            index: i,
            score: c.lap + c._trackIdx / 1000
        }));
        scores.sort((a, b) => b.score - a.score);
        for (let rank = 0; rank < scores.length; rank++) {
            const carIdx = scores[rank].index;
            const car = allCars[carIdx];
            const newPos = rank + 1;
            const div = labelDivs[carIdx];
            if (car.prevPos !== 0 && car.prevPos !== newPos) {
                div.style.opacity = '1';
                div.textContent = String(newPos);
                div.style.fontSize = car.isPlayer ? '22px' : '16px';
                div.style.color = car.isPlayer ? '#00FFFF' : '#FFFFFF';
                div._flashTimer = 120;
            }
            car.prevPos = newPos;
        }
    }

    // --- COLLISIONS ---
    resolveCollisions(allCars);

    // --- CAMERA ---
    const cam = updateCamera(world, player.x, player.y, app.screen.width, app.screen.height);

    // Update floating labels
    const dpr = window.devicePixelRatio;
    for (let i = 0; i < allCars.length; i++) {
        const c = allCars[i];
        const screenX = (c.x + cam.x) * dpr;
        const screenY = (c.y + cam.y - 25) * dpr;
        const div = labelDivs[i];
        div.style.left = (screenX / dpr - 15) + 'px';
        div.style.top = (screenY / dpr) + 'px';
        if (div._flashTimer > 0) {
            div._flashTimer--;
            if (div._flashTimer <= 0) {
                div.style.opacity = '0';
                div.style.fontSize = '14px';
            }
        }
    }

    // --- SPRITES ---
    updateCarSprite(playerSprite, player, pState.slip, pState.turnSign, pState.movingForward);

    // --- SKID MARKS & PARTICLES (all cars) ---
    function emitCarEffects(car, state, slipThreshold = 0.4) {
        const rearX = -state.forwardX;
        const rearY = -state.forwardY;
        const rightX = Math.cos(car.rotation);
        const rightY = Math.sin(car.rotation);
        const lrx = car.x + rearX * 10 - rightX * 8;
        const lry = car.y + rearY * 10 - rightY * 8;
        const rrx = car.x + rearX * 10 + rightX * 8;
        const rry = car.y + rearY * 10 + rightY * 8;

        if (state.speed > 2 && state.slip > slipThreshold && car._prevLrx !== undefined) {
            skids.emitSeg(car._prevLrx, car._prevLry, lrx, lry);
            skids.emitSeg(car._prevRrx, car._prevRry, rrx, rry);
        }
        car._prevLrx = lrx; car._prevLry = lry;
        car._prevRrx = rrx; car._prevRry = rry;

        if (state.speed > 3 && state.slip > 0.5 && state.slip < Math.PI - 0.5) {
            const intensity = Math.min(Math.floor((state.slip - 0.5) * 4), 4);
            for (let i = 0; i < intensity; i++) {
                particles.emit(lrx, lry, car.vx, car.vy);
                particles.emit(rrx, rry, car.vx, car.vy);
            }
        }
    }
    emitCarEffects(player, pState, 0.5);    // only real drifts leave marks
    for (let i = 0; i < aiCars.length; i++) {
        emitCarEffects(aiCars[i], aiStates[i], 0.5); // AI marks when they oversteer
    }
    skids.draw((x, y) => isOnTrack(x, y, trackCenterline));
    particles.draw(cam.x, cam.y);

    // --- DEBUG LOG ---
    let dbg = '<b>RACE DEBUG</b><br>';
    for (const c of allCars) {
        const name = c === player ? 'PLAYER' : getColorName(c.color);
        const on = isOnTrack(c.x, c.y, trackCenterline) ? 'ON' : 'OFF';
        const idx = c._trackIdx !== undefined ? c._trackIdx : '?';
        const prog = (c.lap + (c._trackIdx || 0) / 1000).toFixed(3);
        dbg += `${name}: lap=${c.lap} idx=${idx} prog=${prog} ${on}<br>`;
    }
    debugDiv.innerHTML = dbg;
});

function advanceToNextTrack() {
    player.trackDifficulty = Math.min(1.0, player.trackDifficulty + 0.1);
    rebuildTrack(player.trackDifficulty);
    // Reset cars to grid
    placeOnGrid(player, 0);
    for (let i = 0; i < aiCars.length; i++) {
        placeOnGrid(aiCars[i], i + 1);
        aiCars[i].lap = 0;
        aiCars[i].prevPos = 0;
        aiCars[i]._trackIdx = 0;
        aiCars[i].vx = 0; aiCars[i].vy = 0;
        aiCars[i]._steerInertia = 0;
    }
    player.lap = 0;
    player.prevPos = 0;
    player._trackIdx = 0;
    player.vx = 0; player.vy = 0;
    for (const ai of aiCars) { ai.prevPos = 0; ai._trackIdx = 0; ai.lap = 0; ai._hasPassedMidtrack = false; }
    player._hasPassedMidtrack = true;
    raceStarted = false;
    raceFinished = false;
    raceFrame = 0;
    showLabels();
}
