import { Application, Container, Graphics } from 'pixi.js';
import GUI from 'lil-gui';
import { TRACK_WIDTH, TRACK_HALF, generateTrack, drawTrackPath, isOnTrack, getTrackProgress, seedToTrackId, trackIdToSeed, computeSpeedProfile } from './track.js';
import { createCar, updateCarPhysics } from './car.js';
import { createCarSprite, updateCarSprite, initParticles, initSkids, updateCamera } from './renderer.js';
import { createWaypointAI, updateWaypointAI, createSplineAI, updateSplineAI, pretrainAI, recordOffTrackEpisode, resolveCollisions, computeDraftBoost } from './ai.js';

// --- 1. SETUP ---
const app = new Application();
await app.init({ resizeTo: window, backgroundColor: 0x050510, antialias: true });
document.body.appendChild(app.canvas);

const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
window.addEventListener('keydown', (e) => { if (keys[e.code] !== undefined) keys[e.code] = true; });
window.addEventListener('keyup', (e) => { if (keys[e.code] !== undefined) keys[e.code] = false; });

// Parse URL hash for shared track BEFORE first rebuild
const hashTrack = window.location.hash.match(/track=([A-Za-z0-9]+)/);

window.addEventListener('hashchange', () => {
    const m = window.location.hash.match(/track=([A-Za-z0-9]+)/);
    if (m) {
        rebuildTrack(player.trackDifficulty, m[1]);
        warmUpAI();
        positionAllCars();
    }
});

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

// --- MINIMAP ---
const MAP_W = 220, MAP_H = 220;
const MINIMAP_SCALE = MAP_W / 4000;
const minimap = new Container();
minimap.x = app.screen.width - MAP_W - 16;
minimap.y = app.screen.height - MAP_H - 16;
app.stage.addChild(minimap);

const minimapBg = new Graphics();
minimapBg.rect(0, 0, MAP_W, MAP_H);
minimapBg.fill({ color: 0x000000, alpha: 0.5 });
minimapBg.stroke({ color: 0x00FFFF, width: 1, alpha: 0.4 });
minimap.addChild(minimapBg);

const minimapTrack = new Graphics();
minimap.addChild(minimapTrack);

const minimapDots = new Graphics();
minimap.addChild(minimapDots);

function updateMinimap() {
    minimap.x = app.screen.width - MAP_W - 16;
    minimap.y = app.screen.height - MAP_H - 16;
    minimapDots.clear();
    for (const c of allCars) {
        const mx = c.x * MINIMAP_SCALE;
        const my = c.y * MINIMAP_SCALE;
        const color = c === player ? 0x00FFFF : c.color;
        minimapDots.circle(mx, my, c === player ? 3.5 : 2.5);
        minimapDots.fill({ color, alpha: 0.9 });
    }
}

let trackCenterline = [];
let trackSpeedProfile = null;
let trackSpikiness = 0;
let trackSeed = null;
let startPt, nextPt, tangent, perpAngle, perpX, perpY, backX, backY;
const trackIdDisplay = { current: '-' };
let trackIdController;

// Finish line declared here so rebuildTrack can reference it
const finishLine = new Graphics();

function rebuildTrack(difficulty, seedOrId = null) {
    const data = generateTrack(difficulty, 0, seedOrId);
    trackCenterline = data.points;
    trackSpeedProfile = computeSpeedProfile(trackCenterline);
    trackSpikiness = data.spikiness;
    trackSeed = data.seed;
    trackIdDisplay.current = data.trackId;
    if (trackIdController) trackIdController.updateDisplay();
    history.replaceState(null, '', '#track=' + data.trackId);
    trackSurf.clear();
    trackGlow.clear();
    trackLine.clear();
    drawTrackPath(trackSurf, trackCenterline, TRACK_WIDTH, 0x001122);
    drawTrackPath(trackGlow, trackCenterline, TRACK_WIDTH + 4, 0x00FFFF, 0.15);
    drawTrackPath(trackLine, trackCenterline, 2, 0x00FFFF, 0.6);
    skids.clear();

    // Draw minimap track
    minimapTrack.clear();
    if (trackCenterline.length > 0) {
        minimapTrack.moveTo(trackCenterline[0].x * MINIMAP_SCALE, trackCenterline[0].y * MINIMAP_SCALE);
        for (let i = 1; i < trackCenterline.length; i++) {
            minimapTrack.lineTo(trackCenterline[i].x * MINIMAP_SCALE, trackCenterline[i].y * MINIMAP_SCALE);
        }
        minimapTrack.lineTo(trackCenterline[0].x * MINIMAP_SCALE, trackCenterline[0].y * MINIMAP_SCALE);
        minimapTrack.stroke({ width: 1.5, color: 0x00FFFF, alpha: 0.5 });
    }

    // Recalculate start line & grid
    startPt = trackCenterline[0];
    nextPt = trackCenterline[1];
    tangent = Math.atan2(nextPt.y - startPt.y, nextPt.x - startPt.x);
    perpAngle = tangent + Math.PI / 2;
    perpX = Math.cos(perpAngle);
    perpY = Math.sin(perpAngle);
    backX = -Math.cos(tangent);
    backY = -Math.sin(tangent);

    // Redraw finish line
    finishLine.clear();
    finishLine.moveTo(startPt.x - perpX * TRACK_HALF, startPt.y - perpY * TRACK_HALF);
    finishLine.lineTo(startPt.x + perpX * TRACK_HALF, startPt.y + perpY * TRACK_HALF);
    finishLine.stroke({ width: 3, color: 0xFFFFFF, alpha: 0.7 });

}

function positionAllCars() {
    for (let i = 0; i < aiCars.length; i++) placeOnGrid(aiCars[i], i);
    placeOnGrid(player, 5);
}

rebuildTrack(0.6, hashTrack ? hashTrack[1] : null);

// --- 2. CARS ---
startPt = trackCenterline[0];
nextPt = trackCenterline[1];
tangent = Math.atan2(nextPt.y - startPt.y, nextPt.x - startPt.x);

const player = createCar(startPt.x, startPt.y, tangent + Math.PI / 2, 0x00FFFF);
player.invertControls = false;
player.trackDifficulty = 0.6;
player.isPlayer = true;
player.maxSpeed = 8.8;
player.acceleration = 0.14;

const playerSprite = createCarSprite(0x00FFFF, true);
world.addChild(playerSprite);
player.sprite = playerSprite;

// --- STARTING GRID ---
perpAngle = tangent + Math.PI / 2;
perpX = Math.cos(perpAngle);
perpY = Math.sin(perpAngle);
backX = -Math.cos(tangent);
backY = -Math.sin(tangent);

function placeOnGrid(car, index) {
    const row = Math.floor(index / 2);
    const side = (index % 2 === 0) ? -1 : 1;
    car.x = startPt.x + perpX * side * 35 + backX * row * 50;
    car.y = startPt.y + perpY * side * 35 + backY * row * 50;
    car.rotation = tangent + Math.PI / 2;
}

// AI opponents (5 cars). type 'waypoint' = curvature-reasoning learning AI; 'spline' =
// old-school line-follower with a baked-in per-corner speed profile, no live reasoning,
// can't slalom. Useful as a stable baseline/comparison and a reliable easier tier.
const aiDefs = [
    { color: 0xFF00FF, name: 'Magenta', type: 'waypoint' },
    { color: 0x00FF00, name: 'Green',   type: 'spline'   },
    { color: 0xFF8000, name: 'Orange',  type: 'waypoint' },
    { color: 0xFFFF00, name: 'Yellow',  type: 'spline'   },
    { color: 0x8000FF, name: 'Purple',  type: 'waypoint' },
];

const aiCars = [];
const aiSprites = [];
for (let i = 0; i < aiDefs.length; i++) {
    const def = aiDefs[i];
    const ai = def.type === 'spline'
        ? createSplineAI(trackCenterline, def.color, trackSpeedProfile)
        : createWaypointAI(trackCenterline, def.color);
    placeOnGrid(ai, i);          // AI occupy grid positions 0–4 (rows 0–2)
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

// Warm-start the waypoint AIs' caution memory against the current track before the
// race starts, and refresh the spline AIs' speed profile reference. Call again any
// time the track is rebuilt (new track ID, difficulty change, next-track advance).
function warmUpAI() {
    for (const ai of aiCars) {
        if (ai.aiType === 'spline') {
            ai._speedProfile = trackSpeedProfile;
        } else {
            ai._trackMemory = new Float32Array(1000); // old track's memory doesn't apply here
            pretrainAI(ai, trackCenterline, (x, y) => isOnTrack(x, y, trackCenterline), arena);
        }
    }
}
warmUpAI();

placeOnGrid(player, 5);          // player starts 6th (back of grid)

// Initial positioning done via rebuildTrack, but player/aiCars now exist
positionAllCars();

player.lap = 0;
player.prevPos = 0;
player._trackIdx = 0;
player._hasPassedMidtrack = true; // player starts at front of grid, already "past" start
for (const ai of aiCars) { ai.prevPos = 0; ai._trackIdx = 0; ai._hasPassedMidtrack = false; }

// Finish line already created & drawn by rebuildTrack; just ensure it's in the world
world.addChild(finishLine);

// --- CONTROLS OVERLAY ---
let controlsAcknowledged = false;
const controlsDiv = document.createElement('div');
controlsDiv.style.position = 'absolute';
controlsDiv.style.top = '50%';
controlsDiv.style.left = '50%';
controlsDiv.style.transform = 'translate(-50%, -50%)';
controlsDiv.style.background = 'rgba(0,0,0,0.85)';
controlsDiv.style.border = '2px solid #00FFFF';
controlsDiv.style.borderRadius = '8px';
controlsDiv.style.padding = '24px 32px';
controlsDiv.style.color = '#00FFFF';
controlsDiv.style.fontFamily = 'monospace';
controlsDiv.style.fontSize = '16px';
controlsDiv.style.textAlign = 'center';
controlsDiv.style.zIndex = '5000';
controlsDiv.style.lineHeight = '1.6';
controlsDiv.innerHTML = `
    <h2 style="margin:0 0 12px 0;color:#FFFFFF;">Controls</h2>
    <div>↑ / ↓ &nbsp;—&nbsp; Gas / Brake</div>
    <div>← / → &nbsp;—&nbsp; Steer</div>
    <div>Space / Esc &nbsp;—&nbsp; Pause</div>
    <div>D &nbsp;—&nbsp; Toggle Debug</div>
    <br>
    <button id="ctrl-ok" style="background:#00FFFF;color:#000;border:none;padding:8px 24px;font-family:monospace;font-size:16px;cursor:pointer;border-radius:4px;">OK — Press Gas to Start</button>
`;
document.body.appendChild(controlsDiv);
document.getElementById('ctrl-ok').addEventListener('click', () => {
    controlsDiv.style.display = 'none';
    controlsAcknowledged = true;
});

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

const speedHud = document.createElement('div');
speedHud.style.position = 'absolute';
speedHud.style.color = '#FF8000';
speedHud.style.fontFamily = 'monospace';
speedHud.style.fontSize = '11px';
speedHud.style.zIndex = '1000';
speedHud.style.pointerEvents = 'none';
speedHud.style.opacity = '0.7';
document.body.appendChild(speedHud);

// --- LAP ANNOUNCEMENT ---
const announceDiv = document.createElement('div');
announceDiv.style.position = 'absolute';
announceDiv.style.top = '50%';
announceDiv.style.left = '50%';
announceDiv.style.transform = 'translate(-50%, -50%)';
announceDiv.style.color = '#FFFFFF';
announceDiv.style.fontFamily = 'monospace';
announceDiv.style.fontSize = '36px';
announceDiv.style.fontWeight = 'bold';
announceDiv.style.textShadow = '0 0 10px #00FFFF';
announceDiv.style.zIndex = '2000';
announceDiv.style.pointerEvents = 'none';
announceDiv.style.opacity = '0';
announceDiv.style.transition = 'opacity 0.3s';
document.body.appendChild(announceDiv);

function showAnnounce(text) {
    announceDiv.textContent = text;
    announceDiv.style.opacity = '1';
    setTimeout(() => { announceDiv.style.opacity = '0'; }, 2000);
}

const allCars = [player, ...aiCars];
let raceStarted = false;
let raceFinished = false;
let raceFrame = 0;
let paused = false;
const raceConfig = { totalLaps: 5 };

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
debugDiv.style.display = 'none'; // off by default

// Debug toggle
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyD') {
        debugDiv.style.display = debugDiv.style.display === 'none' ? 'block' : 'none';
        e.preventDefault();
    }
});

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
    if (car.lap >= raceConfig.totalLaps) return raceConfig.totalLaps + 1.0; // finished cars rank above all
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
const gui = new GUI({ title: 'Parameter Tuning' });
gui.close();
gui.add(player, 'acceleration', 0.01, 2.0);
gui.add(player, 'maxSpeed', 1, 40);
gui.add(player, 'turnSpeed', 0.01, 0.5);
gui.add(player, 'friction', 0.9, 0.999);
gui.add(player, 'grip', 0.001, 1.0);
gui.add(player, 'invertControls').name('Invert Controls');
gui.add(player, 'trackDifficulty', 0.1, 1.0).name('Track Difficulty').onChange(v => { rebuildTrack(v); warmUpAI(); positionAllCars(); });
gui.add(raceConfig, 'totalLaps', 1, 10, 1).name('Total Laps');

const trackInput = { id: '' };
gui.add(trackInput, 'id').name('Track ID').onFinishChange(v => {
    if (v.trim()) {
        rebuildTrack(player.trackDifficulty, v.trim());
        warmUpAI();
        positionAllCars();
    }
});
trackIdController = gui.add(trackIdDisplay, 'current').name('Current Track').disable();

const debugToggle = { showDebug: false };
gui.add(debugToggle, 'showDebug').name('Show Debug').onChange(v => {
    debugDiv.style.display = v ? 'block' : 'none';
});

// --- 5. GAME LOOP ---
app.ticker.add((ticker) => {
    const dt = ticker.deltaTime;

    if (paused) return;

    // --- RACE START ---
    const gas = player.invertControls ? keys.ArrowDown : keys.ArrowUp;
    if (!raceStarted && gas && controlsAcknowledged) {
        raceStarted = true;
        raceFrame = 0;
        showLabels();
    }
    if (raceStarted) raceFrame++;

    if (!raceFinished) {
        // --- CAUTION MEMORY DECAY (slow fade so old mistakes are forgotten) ---
        for (const ai of aiCars) {
            if (ai._trackMemory) {
                for (let i = 0; i < 1000; i++) ai._trackMemory[i] *= 0.998;
            }
        }

        // --- DRAFTING / SLIPSTREAM ---
        // Only player ↔ AI draft. AI cars never draft each other (preserves personality spread).
        for (const c of allCars) {
            const candidates = c === player ? aiCars : (c.isPlayer ? allCars : [player]);
            const desired = computeDraftBoost(c, candidates);
            if (desired > 0) {
                // Ramp up slowly — takes ~1s of sustained drafting to hit full bonus
                c._draftBoost = Math.min(desired, (c._draftBoost || 0) + 0.02 * dt);
            } else {
                c._draftBoost = Math.max(0, (c._draftBoost || 0) - 0.05 * dt);
            }
        }

        // --- PLAYER ---
        const steer = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0);
        const brake = player.invertControls ? keys.ArrowUp : keys.ArrowDown;
        const pState = updateCarPhysics(player, dt, steer, gas, brake,
            (x, y) => isOnTrack(x, y, trackCenterline), arena);

        // --- AI ---
        const aiStates = [];
        for (const ai of aiCars) {
            let aiInput, aiState;
            if (raceStarted && ai.lap < raceConfig.totalLaps) {
                aiInput = ai.aiType === 'spline'
                    ? updateSplineAI(ai, dt, trackCenterline)
                    : updateWaypointAI(ai, dt, trackCenterline);
                aiState = updateCarPhysics(ai, dt, aiInput.steer, aiInput.gas, aiInput.brake,
                    (x, y) => isOnTrack(x, y, trackCenterline), arena);
                // Learn from mistakes: record episode when going off-track, apply on recovery.
                // Spline AI has no _trackMemory, so recordOffTrackEpisode is a no-op for it.
                if (!aiState.onTrack) {
                    if (!ai._offTrackSince) {
                        ai._offTrackSince = raceFrame;
                        ai._offTrackStartIdx = aiInput.nearestIdx || 0;
                    }
                } else if (ai._offTrackSince) {
                    recordOffTrackEpisode(ai, ai._offTrackStartIdx, raceFrame - ai._offTrackSince);
                    ai._offTrackSince = 0;
                }
            } else if (ai.lap >= raceConfig.totalLaps) {
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
                if (c._trackIdx !== undefined && c._trackIdx > 800 && idx < 200 && c.lap < raceConfig.totalLaps && c._hasPassedMidtrack) {
                    const prevLap = c.lap;
                    c.lap++;
                    c._hasPassedMidtrack = false;
                    if (c === player && c.lap < raceConfig.totalLaps) {
                        const remaining = raceConfig.totalLaps - c.lap;
                        showAnnounce(remaining === 1 ? 'Final lap!' : `${remaining} laps to go!`);
                    }
                }
                c._trackIdx = idx;
            }
            const leaderCar = getLeader();
            const leaderName = getColorName(leaderCar.color);
            if (!raceFinished && player.lap >= raceConfig.totalLaps) {
                raceFinished = true;
                const rank = allCars.filter(c => getRaceProgress(c) > getRaceProgress(player)).length + 1;
                lapDiv.innerHTML = `<b>RACE FINISHED — ${rank}${rank===1?'st':rank===2?'nd':rank===3?'rd':'th'} place</b><br>Press <b>ENTER</b> for next race or <b>ESC</b> to stay`;
                window.addEventListener('keydown', finishKeyHandler, { once: true });
            } else {
                const trackId = trackSeed !== null ? seedToTrackId(trackSeed) : '?';
                lapDiv.textContent = `Lap ${Math.min(player.lap + 1, raceConfig.totalLaps)}/${raceConfig.totalLaps}  |  Leader: ${leaderName}  |  Track: ${trackId}`;
            }
        } else {
            lapDiv.textContent = 'Press gas to start race';
        }

        // --- POSITION TRACKING ---
        if (raceStarted && raceFrame > 60) {
            const scores = allCars.map((c, i) => ({
                index: i,
                score: getRaceProgress(c)
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
        // Speed HUD floats near player sprite
        const pScreenX = (player.x + cam.x) * dpr;
        const pScreenY = (player.y + cam.y + 20) * dpr;
        speedHud.style.left = (pScreenX / dpr - 15) + 'px';
        speedHud.style.top = (pScreenY / dpr) + 'px';

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
    speedHud.textContent = `${pState.speed.toFixed(1)}`;
    updateMinimap();
    }
});

function finishKeyHandler(e) {
    if (e.code === 'Enter') {
        advanceToNextTrack();
    } else if (e.code === 'Escape') {
        lapDiv.innerHTML += '<br><i>Waiting — press ENTER when ready</i>';
        window.addEventListener('keydown', finishKeyHandler, { once: true });
    } else {
        // Wrong key — re-arm so ENTER still works
        window.addEventListener('keydown', finishKeyHandler, { once: true });
    }
}

function advanceToNextTrack() {
    player.trackDifficulty = Math.min(1.0, player.trackDifficulty + 0.1);
    rebuildTrack(player.trackDifficulty, null); // new random seed
    warmUpAI();
    // Reset cars to grid
    for (let i = 0; i < aiCars.length; i++) {
        placeOnGrid(aiCars[i], i);
        aiCars[i].lap = 0;
        aiCars[i].prevPos = 0;
        aiCars[i]._trackIdx = 0;
        aiCars[i].vx = 0; aiCars[i].vy = 0;
        aiCars[i]._steerInertia = 0;
    }
    placeOnGrid(player, 5);
    player.lap = 0;
    player.prevPos = 0;
    player._trackIdx = 0;
    player.vx = 0; player.vy = 0;
    for (const ai of aiCars) { ai.prevPos = 0; ai._trackIdx = 0; ai.lap = 0; ai._hasPassedMidtrack = false; ai._draftBoost = 0; ai._offTrackSince = 0; }
    player._hasPassedMidtrack = true;
    raceStarted = false;
    raceFinished = false;
    raceFrame = 0;
    showLabels();
}
