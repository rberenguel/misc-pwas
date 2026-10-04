/**
 * =========================================================================================
 * DESIGN PREAMBLE & ARCHITECTURAL MANIFESTO
 * =========================================================================================
 * PROJECTION SYSTEM:
 * Dimetric Cabinet projection (2.4:1 ratio; tileW = 64, tileH = 26.66).
 * Horizontal coordinates follow skewed axis:
 *    isoX = (x - y) * (tileW / 2) + originX
 *    isoY = (x + y) * (tileH / 2) - z * zElevation + originY
 * This preserves clean vertical elevation (towers, flying entities, mortar arcs) going strictly -Y.
 *
 * FACTIONS:
 * 1. LAWFUL ARCHITECTURE (Towers, Sanity, Geometric Order):
 *    - Obelisk (Kinetic Pillar): Slender 4-sided monolith, high attack rate, rapid kinetic pulses.
 *    - Bastion (Citadel Mortar): Squat octagonal ziggurat, lobbed arcing plasma AoE shockwaves.
 *    - Prism (Refraction Pylon): Suspended inverted tetrahedron, continuous laser tether with slow.
 *    - Sanctuary (Resonator Dome): Concentric orbiting brass rings, passive fire-rate aura buff to allies.
 *
 * 2. EVIL GEOMETRIC FORMS (Chaotic Incursions, Asymmetrical, Glitched):
 *    - Sliver: Needle-thin arrowhead bisectors, high speed, frail swarm.
 *    - Hex-Spike: Pulsing stellated icosahedron, balanced health/speed vanguard.
 *    - Null-Cube: Skewed dense black hypercube with magenta fissure veins, slow, armored.
 *    - Tessera: Higher-dimensional tesseract wireframe, blinks periodically forward along path.
 *
 * ESCALATION MATRIX:
 * - Wave 1-3: Slivers swarm to test single vs multi-target coverage.
 * - Wave 4-7: Hex-Spikes + Slivers introduce balanced wave density.
 * - Wave 8-11: Null-Cubes screen for faster units, demanding Bastion AoE + Prism slows.
 * - Wave 12+: Tessera hypercubes blink through killzones, requiring layered defense depths.
 * =========================================================================================
 */

class RetroSynthAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playLaser() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  playExplosion() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const t = this.ctx.currentTime;
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  playPlace() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    [440, 554.37, 659.25].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.03);
      gain.gain.setValueAtTime(0.05, t + i * 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.25 + i * 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.03);
      osc.stop(t + 0.26 + i * 0.03);
    });
  }

  playWaveSpawn() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.4);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.4);
  }
}

const AudioSys = new RetroSynthAudio();
window.addEventListener('pointerdown', () => AudioSys.init(), { once: true });

const GRID_COLS = 13;
const GRID_ROWS = 13;
const TILE_WIDTH = 96;
const TILE_HEIGHT = 40;

let app;
let gridOrigin = { x: 0, y: 0 };

let worldContainer;
let groundContainer;
let gridLinesContainer;
let ySortedEntitiesContainer;
let overlayEffectsContainer;
let activeBeamsContainer;

const State = {
  flux: 300,
  sanity: 20,
  maxSanity: 20,
  wave: 1,
  maxWaves: 20,
  speed: 1.0,
  autoWave: false,
  selectedTowerType: 'OBELISK',
  waveInProgress: false,
  enemiesRemainingToSpawn: 0,
  spawnTimer: 0,
  spawnInterval: 60,
  currentWaveQueue: [],
  totalPower: 1,
  usedPower: 0
};

const TOWER_SPECS = {
  OBELISK: {
    name: 'Obelisk Pillar',
    cost: 100,
    range: 2.5,
    damage: 24,
    fireRate: 24,
    powerCost: 1,
    type: 'kinetic',
    color: 0x00f0ff,
    accent: 0xe0f7ff,
    description: 'Slender dual-pylon kinetic turret. Rapid concentrated fire.'
  },
  BASTION: {
    name: 'Bastion Mortar',
    cost: 160,
    range: 4.5,
    damage: 85,
    aoeRadius: 1.5,
    fireRate: 80,
    powerCost: 2,
    type: 'explosive',
    color: 0xf59e0b,
    accent: 0xfef3c7,
    description: 'Squat ziggurat launcher. Lobs heavy plasma shells with AoE.'
  },
  PRISM: {
    name: 'Refraction Prism',
    cost: 220,
    range: 2.5,
    damage: 0.5,
    slowFactor: 0.55,
    fireRate: 1,
    powerCost: 2,
    type: 'beam',
    color: 0x14b8a6,
    accent: 0xa7f3d0,
    description: 'Inverted hovering pylon. Locks continuous refracting slowing beam.'
  },
  SANCTUARY: {
    name: 'Sanctuary Buffer',
    cost: 200,
    range: 3,
    damage: 0,
    buffRate: 0.35,
    powerCost: 1,
    type: 'aura',
    color: 0xa855f7,
    accent: 0xf3e8ff,
    description: 'Boosts fire rate of all towers in range by 35%.'
  },
  PYLON: {
    name: 'Power Pylon',
    cost: 120,
    range: 2.5,
    damage: 0,
    powerOutput: 2,
    powerCost: 0,
    type: 'power',
    color: 0xfbbf24,
    accent: 0xfef9c3,
    description: 'Energy lattice node. Delivers 2 power units to towers in range.'
  }
};

const ENEMY_SPECS = {
  SLIVER: {
    name: 'Sliver',
    hp: 45,
    speed: 2.1,
    bounty: 12,
    color: 0xff007f,
    type: 'swarm',
    scale: 0.8,
    groundZ: 0
  },
  HEX_SPIKE: {
    name: 'Hex-Spike',
    hp: 130,
    speed: 1.45,
    bounty: 20,
    color: 0xa21caf,
    type: 'vanguard',
    scale: 1.0
  },
  NULL_CUBE: {
    name: 'Null-Cube',
    hp: 450,
    speed: 0.8,
    bounty: 55,
    color: 0xef4444,
    type: 'armored',
    scale: 1.3
  },
  TESSERA: {
    name: 'Tessera',
    hp: 200,
    speed: 1.65,
    bounty: 35,
    color: 0x8b5cf6,
    type: 'phase',
    scale: 1.1,
    blinkCooldown: 90
  }
};

let PATH_WAYPOINTS = [];

function generateRandomPath() {
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pts = [];
  const startY = ri(1, 2);
  pts.push({ x: 0, y: startY });

  let cy = startY;
  let goingRight = true;

  while (cy < GRID_ROWS - 2) {
    const drop = ri(2, 3);
    const nextY = cy + drop;

    if (nextY >= GRID_ROWS - 2) {
      const exitX = ri(3, GRID_COLS - 4);
      pts.push({ x: exitX, y: cy });
      pts.push({ x: exitX, y: GRID_ROWS - 1 });
      break;
    }

    const sweepX = goingRight ? ri(8, GRID_COLS - 2) : ri(1, 3);
    pts.push({ x: sweepX, y: cy });
    pts.push({ x: sweepX, y: nextY });
    cy = nextY;
    goingRight = !goingRight;
  }

  return pts;
}

let gridMatrix = [];
let pathSegments = [];

function worldToIso(gx, gy, z = 0) {
  const isoX = (gx - gy) * (TILE_WIDTH / 2) + gridOrigin.x;
  const isoY = (gx + gy) * (TILE_HEIGHT / 2) - z + gridOrigin.y;
  return { x: isoX, y: isoY };
}

function isoToWorld(screenX, screenY) {
  const adjX = screenX - gridOrigin.x;
  const adjY = screenY - gridOrigin.y;
  const gx = (adjX / (TILE_WIDTH / 2) + adjY / (TILE_HEIGHT / 2)) / 2;
  const gy = (adjY / (TILE_HEIGHT / 2) - adjX / (TILE_WIDTH / 2)) / 2;
  return { gx: Math.floor(gx), gy: Math.floor(gy), rawX: gx, rawY: gy };
}

function initGridMatrix() {
  gridMatrix = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(0));
  pathSegments = [];

  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
    const p1 = PATH_WAYPOINTS[i];
    const p2 = PATH_WAYPOINTS[i + 1];
    pathSegments.push({ p1, p2 });

    const dx = Math.sign(p2.x - p1.x);
    const dy = Math.sign(p2.y - p1.y);
    let cx = p1.x;
    let cy = p1.y;

    while (cx !== p2.x || cy !== p2.y) {
      gridMatrix[cy][cx] = 1;
      cx += dx;
      cy += dy;
    }
    gridMatrix[p2.y][p2.x] = 1;
  }

  const startP = PATH_WAYPOINTS[0];
  const endP = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];
  gridMatrix[startP.y][startP.x] = 3;
  gridMatrix[endP.y][endP.x] = 3;
}

const liveEnemies = [];
const liveTowers = [];
const liveProjectiles = [];
const liveParticles = [];

function drawIsometricGrid() {
  groundContainer.removeChildren();
  gridLinesContainer.removeChildren();

  const floorGfx = new PIXI.Graphics();

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const pTop = worldToIso(c, r);
      const pRight = worldToIso(c + 1, r);
      const pBottom = worldToIso(c + 1, r + 1);
      const pLeft = worldToIso(c, r + 1);

      const cellType = gridMatrix[r][c];

      if (cellType === 1 || cellType === 3) {
        floorGfx.poly([pTop.x, pTop.y, pRight.x, pRight.y, pBottom.x, pBottom.y, pLeft.x, pLeft.y]);
        floorGfx.fill({ color: 0x160f2d, alpha: 0.95 });
        floorGfx.stroke({ width: 1.2, color: 0xff00aa, alpha: 0.55 });
      } else {
        floorGfx.poly([pTop.x, pTop.y, pRight.x, pRight.y, pBottom.x, pBottom.y, pLeft.x, pLeft.y]);
        floorGfx.fill({ color: 0x0c0919, alpha: 0.9 });
        floorGfx.stroke({ width: 1, color: 0x00f0ff, alpha: 0.18 });
      }
    }
  }

  groundContainer.addChild(floorGfx);
  drawPortals();
}

function drawPortals() {
  const start = PATH_WAYPOINTS[0];
  const end = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];
  const startPos = worldToIso(start.x + 0.5, start.y + 0.5);
  const endPos = worldToIso(end.x + 0.5, end.y + 0.5);

  const portalGfx = new PIXI.Graphics();

  portalGfx.circle(startPos.x, startPos.y, 16);
  portalGfx.fill({ color: 0xff007f, alpha: 0.25 });
  portalGfx.stroke({ width: 2, color: 0xff00aa, alpha: 0.8 });
  portalGfx.circle(startPos.x, startPos.y, 8);
  portalGfx.fill({ color: 0xffffff, alpha: 0.8 });

  portalGfx.circle(endPos.x, endPos.y, 20);
  portalGfx.fill({ color: 0x00f0ff, alpha: 0.2 });
  portalGfx.stroke({ width: 2, color: 0x00f0ff, alpha: 0.9 });
  portalGfx.circle(endPos.x, endPos.y, 10);
  portalGfx.fill({ color: 0x38bdf8, alpha: 0.85 });

  groundContainer.addChild(portalGfx);
}

class Tower {
  constructor(gx, gy, typeKey) {
    this.gx = gx;
    this.gy = gy;
    this.typeKey = typeKey;
    this.spec = TOWER_SPECS[typeKey];
    this.cooldown = 0;
    this.target = null;
    this.animAngle = Math.random() * Math.PI * 2;
    this.buffMult = 1.0;
    this.shutoff = false;
    this.powered = false;
    this.remainingPower = 0;

    const iso = worldToIso(gx + 0.5, gy + 0.5);
    this.x = iso.x;
    this.y = iso.y;

    this.container = new PIXI.Container();
    this.container.x = this.x;
    this.container.y = this.y;

    this.baseGfx = new PIXI.Graphics();
    this.headGfx = new PIXI.Graphics();
    this.container.addChild(this.baseGfx);
    this.container.addChild(this.headGfx);

    this.renderBase();
    ySortedEntitiesContainer.addChild(this.container);
  }

  renderBase() {
    this.baseGfx.clear();
    const halfW = 20;
    const halfH = 9;

    this.baseGfx.poly([0, -halfH, halfW, 0, 0, halfH, -halfW, 0]);
    this.baseGfx.fill({ color: 0x111827, alpha: 0.95 });
    this.baseGfx.stroke({ width: 1.5, color: this.spec.color, alpha: 0.8 });

    this.baseGfx.ellipse(0, 0, halfW * 0.7, halfH * 0.7);
    this.baseGfx.stroke({ width: 1, color: this.spec.color, alpha: 0.4 });
  }

  update(delta) {
    this.animAngle += 0.035 * delta * State.speed;
    this.cooldown = Math.max(0, this.cooldown - delta * State.speed * this.buffMult);

    const floatZ = Math.sin(this.animAngle) * 4;
    this.headGfx.clear();

    const active = this.powered && !this.shutoff;
    const targetAlpha = (this.typeKey === 'PYLON' || active) ? 1.0 : 0.28;
    this.container.alpha += (targetAlpha - this.container.alpha) * 0.1 * delta;

    switch (this.typeKey) {
      case 'OBELISK':
        this.renderObelisk(floatZ);
        if (active) this.targetAndFireSingle();
        break;
      case 'BASTION':
        this.renderBastion(floatZ);
        if (active) this.targetAndFireMortar();
        break;
      case 'PRISM':
        this.renderPrism(floatZ);
        if (active) this.targetAndFireBeam();
        break;
      case 'SANCTUARY':
        this.renderSanctuary(floatZ);
        if (active) this.pulseBufferAura();
        break;
      case 'PYLON':
        this.renderPylon(floatZ);
        break;
    }
  }

  renderObelisk(floatZ) {
    const tipY = -48 + floatZ;
    const midY = -24 + floatZ;

    this.headGfx.poly([-3, midY, -9, midY + 8, -6, -6, -1, -6]);
    this.headGfx.fill({ color: 0x0f172a, alpha: 0.95 });
    this.headGfx.stroke({ width: 1.2, color: 0x00f0ff, alpha: 0.9 });

    this.headGfx.poly([3, midY, 9, midY + 8, 6, -6, 1, -6]);
    this.headGfx.fill({ color: 0x1e293b, alpha: 0.95 });
    this.headGfx.stroke({ width: 1.2, color: 0x38bdf8, alpha: 0.9 });

    this.headGfx.poly([0, tipY, 5, midY + 4, 0, midY + 12, -5, midY + 4]);
    this.headGfx.fill({ color: 0xffffff, alpha: 0.9 });
    this.headGfx.stroke({ width: 1.5, color: 0x00f0ff, alpha: 1.0 });
  }

  renderBastion(floatZ) {
    const headY = -20 + floatZ * 0.4;
    this.headGfx.poly([
      -14, headY, -8, headY - 12, 8, headY - 12,
      14, headY, 8, headY + 10, -8, headY + 10
    ]);
    this.headGfx.fill({ color: 0x27272a, alpha: 0.95 });
    this.headGfx.stroke({ width: 1.5, color: 0xf59e0b, alpha: 0.85 });

    const angle = this.target ? Math.atan2(this.target.y - this.y, this.target.x - this.x) : this.animAngle;
    const barrelX = Math.cos(angle) * 10;
    const barrelY = headY + Math.sin(angle) * 5;

    this.headGfx.circle(barrelX, barrelY, 5);
    this.headGfx.fill({ color: 0xfef08a, alpha: 0.95 });
    this.headGfx.stroke({ width: 1.5, color: 0xf59e0b, alpha: 1 });
  }

  renderPrism(floatZ) {
    const tipY = -38 + floatZ;
    const baseW = 12;

    this.headGfx.poly([-baseW, tipY - 14, baseW, tipY - 14, 0, tipY + 8]);
    this.headGfx.fill({ color: 0x042f2e, alpha: 0.85 });
    this.headGfx.stroke({ width: 1.5, color: 0x2dd4bf, alpha: 0.9 });

    this.headGfx.circle(0, tipY - 5, 4);
    this.headGfx.fill({ color: 0x99f6e4, alpha: 0.95 });
  }

  renderSanctuary(floatZ) {
    const ringY = -22 + floatZ * 0.5;
    const radX = 18;
    const radY = 8;

    this.headGfx.ellipse(0, ringY, radX, radY);
    this.headGfx.stroke({ width: 1.5, color: 0xc084fc, alpha: 0.75 });

    this.headGfx.ellipse(0, ringY, radX * 0.6, radY * 1.4);
    this.headGfx.stroke({ width: 1.2, color: 0xa855f7, alpha: 0.5 });

    this.headGfx.circle(0, ringY, 5);
    this.headGfx.fill({ color: 0xf3e8ff, alpha: 0.95 });
  }

  renderPylon(floatZ) {
    const coreY = -32 + floatZ;
    const pulse = 1 + Math.sin(this.animAngle * 2.5) * 0.18;

    // Vertical shaft
    this.headGfx.rect(-2, coreY + 8, 4, 20);
    this.headGfx.fill({ color: 0x451a03, alpha: 0.9 });
    this.headGfx.stroke({ width: 1, color: 0xfbbf24, alpha: 0.5 });

    // Outer crackling ring
    this.headGfx.ellipse(0, coreY + 6, 15, 6);
    this.headGfx.stroke({ width: 1.5, color: 0xfbbf24, alpha: 0.55 + Math.sin(this.animAngle * 3) * 0.2 });

    // Energy core orb
    this.headGfx.circle(0, coreY, 6 * pulse);
    this.headGfx.fill({ color: 0xfef9c3, alpha: 0.95 });
    this.headGfx.stroke({ width: 2, color: 0xfbbf24, alpha: 1.0 });

    // Spark filaments
    const a = this.animAngle;
    for (let i = 0; i < 3; i++) {
      const ang = a + (i * Math.PI * 2 / 3);
      const ex = Math.cos(ang) * 10;
      const ey = coreY + Math.sin(ang) * 4;
      this.headGfx.moveTo(0, coreY);
      this.headGfx.lineTo(ex, ey);
      this.headGfx.stroke({ width: 1, color: 0xfde68a, alpha: 0.7 });
    }
  }

  findTarget() {
    let best = null;
    let maxDistAlongPath = -1;
    const tx = this.gx + 0.5;
    const ty = this.gy + 0.5;

    for (let enemy of liveEnemies) {
      if (enemy.isDead) continue;
      const { gx, gy } = enemy.getGridPos();
      const d = Math.hypot(gx - tx, gy - ty);
      if (d <= this.spec.range) {
        if (enemy.distanceTraveled > maxDistAlongPath) {
          maxDistAlongPath = enemy.distanceTraveled;
          best = enemy;
        }
      }
    }
    return best;
  }

  findClusterTarget() {
    const tx = this.gx + 0.5;
    const ty = this.gy + 0.5;
    const inRange = [];

    for (const enemy of liveEnemies) {
      if (enemy.isDead) continue;
      const pos = enemy.getGridPos();
      if (Math.hypot(pos.gx - tx, pos.gy - ty) <= this.spec.range) {
        inRange.push({ enemy, gx: pos.gx, gy: pos.gy });
      }
    }

    if (inRange.length === 0) return null;

    let best = null;
    let bestCount = -1;

    for (const candidate of inRange) {
      let count = 0;
      for (const other of inRange) {
        if (Math.hypot(other.gx - candidate.gx, other.gy - candidate.gy) <= this.spec.aoeRadius) count++;
      }
      if (count > bestCount || (count === bestCount && candidate.enemy.distanceTraveled > best.distanceTraveled)) {
        bestCount = count;
        best = candidate.enemy;
      }
    }

    return best;
  }

  targetAndFireSingle() {
    this.target = this.findTarget();
    if (this.target && this.cooldown <= 0) {
      this.cooldown = this.spec.fireRate;
      AudioSys.playLaser();
      liveProjectiles.push(new ObeliskPulse(this.x, this.y - 30, this.target, this.spec.damage));
    }
  }

  targetAndFireMortar() {
    this.target = this.findClusterTarget();
    if (this.target && this.cooldown <= 0) {
      this.cooldown = this.spec.fireRate;
      const { gx: tgx, gy: tgy } = this.target.getGridPos();
      liveProjectiles.push(new MortarShell(this.x, this.y - 20, this.target.x, this.target.y, tgx, tgy, this.spec.damage, this.spec.aoeRadius));
    }
  }

  targetAndFireBeam() {
    this.target = this.findTarget();
    if (this.target) {
      this.target.takeDamage(this.spec.damage * State.speed);
      this.target.applySlow(this.spec.slowFactor, 10);

      const beamGfx = new PIXI.Graphics();
      beamGfx.moveTo(this.x, this.y - 32);
      beamGfx.lineTo(this.target.x, this.target.y - 12);
      beamGfx.stroke({ width: 2.2, color: 0x2dd4bf, alpha: 0.85 });

      beamGfx.circle(this.target.x, this.target.y - 12, 3);
      beamGfx.fill({ color: 0x99f6e4, alpha: 0.9 });

      activeBeamsContainer.addChild(beamGfx);
    }
  }

  pulseBufferAura() {
    for (let other of liveTowers) {
      if (other === this) continue;
      const d = Math.hypot((other.gx + 0.5) - (this.gx + 0.5), (other.gy + 0.5) - (this.gy + 0.5));
      if (d <= this.spec.range) {
        other.buffMult = 1.0 + this.spec.buffRate;
      }
    }
    if (Math.random() < 0.05) {
      createShockwave(this.x, this.y - 10, 0xa855f7, this.spec.range, 35);
    }
  }

  destroy() {
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}

class Enemy {
  constructor(specKey) {
    this.specKey = specKey;
    this.spec = ENEMY_SPECS[specKey];
    this.hp = this.spec.hp * (1 + (State.wave - 1) * 0.22);
    this.maxHp = this.hp;
    this.speed = this.spec.speed * (1 + (State.wave - 1) * 0.04);
    this.baseSpeed = this.speed;
    this.slowTimer = 0;
    this.distanceTraveled = 0;
    this.isDead = false;

    this.currentSegmentIdx = 0;
    this.segmentProgress = 0;

    this.x = 0;
    this.y = 0;
    this.z = this.spec.groundZ ?? 12;

    this.rotX = Math.random() * Math.PI;
    this.rotY = Math.random() * Math.PI;
    this.rotSpeedX = (Math.random() - 0.5) * 0.08;
    this.rotSpeedY = (Math.random() - 0.5) * 0.08;

    this.blinkTimer = this.spec.blinkCooldown || 0;

    this.container = new PIXI.Container();
    this.gfx = new PIXI.Graphics();
    this.hpBarGfx = new PIXI.Graphics();
    this.container.addChild(this.gfx);
    this.container.addChild(this.hpBarGfx);

    this.updatePositionFromProgress();
    ySortedEntitiesContainer.addChild(this.container);
  }

  getGridPos() {
    if (this.currentSegmentIdx >= pathSegments.length) return { gx: -999, gy: -999 };
    const seg = pathSegments[this.currentSegmentIdx];
    return {
      gx: seg.p1.x + (seg.p2.x - seg.p1.x) * this.segmentProgress + 0.5,
      gy: seg.p1.y + (seg.p2.y - seg.p1.y) * this.segmentProgress + 0.5
    };
  }

  updatePositionFromProgress() {
    if (this.currentSegmentIdx >= pathSegments.length) {
      this.reachSanctuary();
      return;
    }

    const seg = pathSegments[this.currentSegmentIdx];
    const curGx = seg.p1.x + (seg.p2.x - seg.p1.x) * this.segmentProgress;
    const curGy = seg.p1.y + (seg.p2.y - seg.p1.y) * this.segmentProgress;

    const iso = worldToIso(curGx + 0.5, curGy + 0.5, this.z);
    this.x = iso.x;
    this.y = iso.y;
    this.container.x = this.x;
    this.container.y = this.y;
  }

  update(delta) {
    if (this.isDead) return;

    if (this.slowTimer > 0) {
      this.slowTimer -= delta * State.speed;
      if (this.slowTimer <= 0) this.speed = this.baseSpeed;
    }

    this.rotX += this.rotSpeedX * delta * State.speed;
    this.rotY += this.rotSpeedY * delta * State.speed;

    const seg = pathSegments[this.currentSegmentIdx];
    if (!seg) {
      this.reachSanctuary();
      return;
    }

    const segLength = Math.hypot(seg.p2.x - seg.p1.x, seg.p2.y - seg.p1.y);
    const step = (this.speed * delta * State.speed * 0.02) / (segLength || 1);
    this.segmentProgress += step;
    this.distanceTraveled += step * segLength;

    if (this.spec.type === 'phase') {
      this.blinkTimer -= delta * State.speed;
      if (this.blinkTimer <= 0) {
        this.blinkTimer = this.spec.blinkCooldown;
        this.segmentProgress += 0.18;
        createShockwave(this.x, this.y, 0x8b5cf6, 25, 15);
      }
    }

    if (this.segmentProgress >= 1.0) {
      this.segmentProgress = 0;
      this.currentSegmentIdx++;
    }

    this.updatePositionFromProgress();
    this.render();
  }

  render() {
    this.gfx.clear();
    const scale = this.spec.scale;

    switch (this.specKey) {
      case 'SLIVER': {
        const seg = pathSegments[this.currentSegmentIdx];
        let fdx = 1, fdy = 0;
        if (seg) {
          const len = Math.hypot(seg.p2.x - seg.p1.x, seg.p2.y - seg.p1.y);
          if (len > 0) { fdx = (seg.p2.x - seg.p1.x) / len; fdy = (seg.p2.y - seg.p1.y) / len; }
        }
        const front = 0.36 * scale, back = 0.20 * scale, side = 0.26 * scale;
        const spx = -fdy, spy = fdx;
        const isoFlat = (dgx, dgy) => [(dgx - dgy) * (TILE_WIDTH / 2), (dgx + dgy) * (TILE_HEIGHT / 2)];
        const pts = [
          ...isoFlat(fdx * front, fdy * front),
          ...isoFlat(-fdx * back + spx * side, -fdy * back + spy * side),
          ...isoFlat(-fdx * back - spx * side, -fdy * back - spy * side)
        ];
        this.gfx.poly(pts);
        this.gfx.fill({ color: 0xff0055, alpha: 0.9 });
        this.gfx.stroke({ width: 1.5, color: 0xff77aa, alpha: 1.0 });
        break;
      }
      case 'HEX_SPIKE': {
        const pulse = 1 + Math.sin(this.rotX * 2) * 0.15;
        const hSize = 12 * scale * pulse;
        this.gfx.poly([
          0, -hSize,
          hSize * 0.9, -hSize * 0.4,
          hSize * 0.9, hSize * 0.4,
          0, hSize,
          -hSize * 0.9, hSize * 0.4,
          -hSize * 0.9, -hSize * 0.4
        ]);
        this.gfx.fill({ color: 0x4a044e, alpha: 0.9 });
        this.gfx.stroke({ width: 1.6, color: 0xf43f5e, alpha: 1.0 });
        this.gfx.circle(0, 0, 4);
        this.gfx.fill({ color: 0xffffff, alpha: 0.9 });
        break;
      }
      case 'NULL_CUBE': {
        const cW = 16 * scale;
        const cH = 16 * scale;
        this.gfx.poly([
          -cW, -cH * 0.5, 0, -cH, cW, -cH * 0.5,
          cW, cH * 0.5, 0, cH, -cW, cH * 0.5
        ]);
        this.gfx.fill({ color: 0x050308, alpha: 0.95 });
        this.gfx.stroke({ width: 2, color: 0xef4444, alpha: 1.0 });
        this.gfx.moveTo(-cW * 0.5, 0);
        this.gfx.lineTo(0, -cH * 0.3);
        this.gfx.lineTo(cW * 0.4, cH * 0.2);
        this.gfx.stroke({ width: 1.5, color: 0xff007f, alpha: 0.9 });
        break;
      }
      case 'TESSERA': {
        const tW = 15 * scale;
        this.gfx.poly([0, -tW, tW, 0, 0, tW, -tW, 0]);
        this.gfx.stroke({ width: 1.5, color: 0x8b5cf6, alpha: 0.85 });
        const off = Math.sin(this.rotY) * 6;
        this.gfx.poly([off, -tW * 0.6, tW * 0.6 + off, 0, off, tW * 0.6, -tW * 0.6 + off, 0]);
        this.gfx.stroke({ width: 1.2, color: 0xd8b4fe, alpha: 0.95 });
        break;
      }
    }

    this.hpBarGfx.clear();
    const barW = 28;
    const barH = 3;
    const barY = -24 * scale;

    this.hpBarGfx.rect(-barW / 2, barY, barW, barH);
    this.hpBarGfx.fill({ color: 0x1f2937, alpha: 0.7 });

    const pct = Math.max(0, this.hp / this.maxHp);
    this.hpBarGfx.rect(-barW / 2, barY, barW * pct, barH);
    this.hpBarGfx.fill({ color: pct > 0.4 ? 0x22c55e : 0xf43f5e, alpha: 0.95 });
  }

  takeDamage(amount) {
    this.hp -= amount;
    if (this.hp <= 0 && !this.isDead) {
      this.die();
    }
  }

  applySlow(factor, durationFrames) {
    this.speed = this.baseSpeed * factor;
    this.slowTimer = durationFrames;
  }

  die() {
    this.isDead = true;
    State.flux += this.spec.bounty;
    updateHUD();

    for (let i = 0; i < 8; i++) {
      liveParticles.push(new SparkParticle(this.x, this.y, this.spec.color));
    }

    this.cleanUp();
  }

  reachSanctuary() {
    this.isDead = true;
    State.sanity = Math.max(0, State.sanity - 1);
    updateHUD();
    AudioSys.playExplosion();

    createShockwave(this.x, this.y, 0xf43f5e, 50, 20);

    if (State.sanity <= 0) {
      showToast('SANITY COMPROMISED // SECTOR COLLAPSE');
    }
    this.cleanUp();
  }

  cleanUp() {
    const idx = liveEnemies.indexOf(this);
    if (idx !== -1) liveEnemies.splice(idx, 1);
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
  }
}

class ObeliskPulse {
  constructor(x, y, target, damage) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = 14;
    this.isDead = false;

    this.gfx = new PIXI.Graphics();
    overlayEffectsContainer.addChild(this.gfx);
  }

  update(delta) {
    if (this.isDead) return;

    if (!this.target || this.target.isDead) {
      this.destroy();
      return;
    }

    const tx = this.target.x;
    const ty = this.target.y - 12;
    const dist = Math.hypot(tx - this.x, ty - this.y);

    if (dist < this.speed * delta * State.speed) {
      this.target.takeDamage(this.damage);
      for (let i = 0; i < 4; i++) {
        liveParticles.push(new SparkParticle(tx, ty, 0x00f0ff));
      }
      this.destroy();
      return;
    }

    const angle = Math.atan2(ty - this.y, tx - this.x);
    this.x += Math.cos(angle) * this.speed * delta * State.speed;
    this.y += Math.sin(angle) * this.speed * delta * State.speed;

    this.gfx.clear();
    this.gfx.circle(this.x, this.y, 3.5);
    this.gfx.fill({ color: 0xffffff, alpha: 0.95 });
    this.gfx.stroke({ width: 1.5, color: 0x00f0ff, alpha: 0.9 });
  }

  destroy() {
    this.isDead = true;
    if (this.gfx.parent) this.gfx.parent.removeChild(this.gfx);
    const idx = liveProjectiles.indexOf(this);
    if (idx !== -1) liveProjectiles.splice(idx, 1);
  }
}

class MortarShell {
  constructor(startX, startY, targetX, targetY, targetGX, targetGY, damage, aoeRadius) {
    this.startX = startX;
    this.startY = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.targetGX = targetGX;
    this.targetGY = targetGY;
    this.damage = damage;
    this.aoeRadius = aoeRadius;
    this.progress = 0;
    this.duration = 45;
    this.peakElevation = 80;
    this.isDead = false;

    this.gfx = new PIXI.Graphics();
    overlayEffectsContainer.addChild(this.gfx);
  }

  update(delta) {
    if (this.isDead) return;

    this.progress += (1 / this.duration) * delta * State.speed;
    if (this.progress >= 1.0) {
      this.detonate();
      return;
    }

    const currentGroundX = this.startX + (this.targetX - this.startX) * this.progress;
    const currentGroundY = this.startY + (this.targetY - this.startY) * this.progress;
    const arcHeight = Math.sin(this.progress * Math.PI) * this.peakElevation;
    const curY = currentGroundY - arcHeight;

    this.gfx.clear();
    this.gfx.ellipse(currentGroundX, currentGroundY, 5, 2.5);
    this.gfx.fill({ color: 0x000000, alpha: 0.4 });

    this.gfx.circle(currentGroundX, curY, 4.5);
    this.gfx.fill({ color: 0xfef08a, alpha: 0.95 });
    this.gfx.stroke({ width: 1.5, color: 0xf59e0b, alpha: 1.0 });
  }

  detonate() {
    this.isDead = true;
    AudioSys.playExplosion();

    createBlastWave(this.targetX, this.targetY, 0xf59e0b, this.aoeRadius, 35);

    for (let enemy of liveEnemies) {
      if (enemy.isDead) continue;
      const { gx, gy } = enemy.getGridPos();
      const d = Math.hypot(gx - this.targetGX, gy - this.targetGY);
      if (d <= this.aoeRadius) {
        const falloff = 1 - (d / this.aoeRadius) * 0.5;
        enemy.takeDamage(this.damage * falloff);
      }
    }

    if (this.gfx.parent) this.gfx.parent.removeChild(this.gfx);
    const idx = liveProjectiles.indexOf(this);
    if (idx !== -1) liveProjectiles.splice(idx, 1);
  }
}

function createShockwave(x, y, color, maxRadius, lifetime) {
  const wave = {
    x, y, color, maxRadius, lifetime, age: 0,
    gfx: new PIXI.Graphics()
  };
  overlayEffectsContainer.addChild(wave.gfx);
  liveParticles.push(wave);
}

function createBlastWave(x, y, color, aoeRadiusTiles, lifetime) {
  const wave = {
    x, y, color,
    maxRadius:  aoeRadiusTiles * TILE_WIDTH  * Math.SQRT2 / 2,
    maxRadiusY: aoeRadiusTiles * TILE_HEIGHT * Math.SQRT2 / 2,
    lifetime, age: 0,
    gfx: new PIXI.Graphics()
  };
  overlayEffectsContainer.addChild(wave.gfx);
  liveParticles.push(wave);
}

class SparkParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 3.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.age = 0;
    this.lifetime = 20 + Math.random() * 15;
    this.gfx = new PIXI.Graphics();
    overlayEffectsContainer.addChild(this.gfx);
  }

  update(delta) {
    this.age += delta * State.speed;
    this.x += this.vx * delta * State.speed;
    this.y += this.vy * delta * State.speed;

    const alpha = Math.max(0, 1 - this.age / this.lifetime);
    this.gfx.clear();
    this.gfx.circle(this.x, this.y, 2);
    this.gfx.fill({ color: this.color, alpha: alpha });

    return this.age < this.lifetime;
  }

  destroy() {
    if (this.gfx.parent) this.gfx.parent.removeChild(this.gfx);
  }
}

function allocatePower() {
  const pylons = liveTowers.filter(t => t.typeKey === 'PYLON');
  pylons.forEach(p => { p.remainingPower = p.spec.powerOutput; });

  // Consumers: non-pylon towers that haven't been shut off
  const consumers = liveTowers.filter(t => t.typeKey !== 'PYLON' && !t.shutoff);

  // Least-covered towers get priority so they aren't starved
  consumers.sort((a, b) => {
    const covers = t => pylons.filter(p =>
      Math.hypot(p.gx - t.gx, p.gy - t.gy) <= p.spec.range).length;
    return covers(a) - covers(b);
  });

  let ambient = 1; // baseline pool, global

  for (const tower of consumers) {
    let needed = tower.spec.powerCost;

    // Draw from pylons in range; prefer most-loaded pylon first (fair share)
    const available = pylons
      .filter(p => Math.hypot(p.gx - tower.gx, p.gy - tower.gy) <= p.spec.range && p.remainingPower > 0)
      .sort((a, b) => a.remainingPower - b.remainingPower);

    for (const pylon of available) {
      if (needed <= 0) break;
      const draw = Math.min(needed, pylon.remainingPower);
      pylon.remainingPower -= draw;
      needed -= draw;
    }

    // Fall back to ambient pool
    if (needed > 0 && ambient >= needed) {
      ambient -= needed;
      needed = 0;
    }

    tower.powered = (needed <= 0);
  }

  // Pylons are always self-powered; shut-off towers explicitly not powered
  liveTowers.forEach(t => {
    if (t.typeKey === 'PYLON') t.powered = true;
    if (t.shutoff) t.powered = false;
  });

  State.totalPower = 1 + pylons.reduce((s, p) => s + p.spec.powerOutput, 0);
  State.usedPower  = consumers.filter(t => t.powered).reduce((s, t) => s + t.spec.powerCost, 0);
  updateHUD();
}

function startNextWave() {
  if (State.waveInProgress) return;
  AudioSys.playWaveSpawn();
  State.waveInProgress = true;
  State.currentWaveQueue = generateWaveRoster(State.wave);
  State.spawnTimer = 0;
  showToast(`INCURSION VECTOR #${State.wave} INCOMING`);
  updateHUD();
}

function generateWaveRoster(waveNum) {
  const queue = [];
  const baseCount = 8 + waveNum * 4;

  for (let i = 0; i < baseCount; i++) {
    if (waveNum <= 1) {
      queue.push('SLIVER');
    } else if (waveNum <= 4) {
      queue.push(Math.random() < 0.35 ? 'SLIVER' : 'HEX_SPIKE');
    } else if (waveNum <= 7) {
      const roll = Math.random();
      if (roll < 0.25) queue.push('SLIVER');
      else if (roll < 0.65) queue.push('HEX_SPIKE');
      else queue.push('NULL_CUBE');
    } else {
      const roll = Math.random();
      if (roll < 0.15) queue.push('SLIVER');
      else if (roll < 0.40) queue.push('HEX_SPIKE');
      else if (roll < 0.70) queue.push('NULL_CUBE');
      else queue.push('TESSERA');
    }
  }
  return queue;
}

function processWaveSpawning(delta) {
  if (!State.waveInProgress) return;

  if (State.currentWaveQueue.length > 0) {
    State.spawnTimer -= delta * State.speed;
    if (State.spawnTimer <= 0) {
      const enemyType = State.currentWaveQueue.shift();
      liveEnemies.push(new Enemy(enemyType));
      State.spawnTimer = Math.max(16, 52 - State.wave * 2);
    }
  } else if (liveEnemies.length === 0) {
    State.waveInProgress = false;
    State.flux += 60 + State.wave * 20;
    State.wave++;
    showToast(`WAVE SECURED // FLUX BONUS ACQUIRED`);
    updateHUD();

    if (State.autoWave && State.wave <= State.maxWaves) {
      setTimeout(() => startNextWave(), 1200);
    }
  }
}

let hoverGfx;
let holdState = null;
const HOLD_THRESHOLD_MS = 450;

function specEffectLabel(specKey, spec) {
  if (specKey === 'SANCTUARY') return { label: 'EFFECT', value: '+35% fire rate' };
  if (specKey === 'PYLON')     return { label: 'EFFECT', value: `+${spec.powerOutput} power` };
  const val = spec.damage * 60 / spec.fireRate;
  let s = Number.isInteger(val) ? String(val) : val.toFixed(1);
  if (specKey === 'BASTION') s += ' (AoE)';
  if (specKey === 'PRISM')   s += ' (beam)';
  return { label: 'DPS', value: s };
}

function populateTooltip(specKey, spec) {
  const { label, value } = specEffectLabel(specKey, spec);
  const power = spec.powerCost > 0 ? `${spec.powerCost} unit${spec.powerCost > 1 ? 's' : ''}` : 'generator';
  document.getElementById('tt-name').textContent      = spec.name.toUpperCase();
  document.getElementById('tt-dps-label').textContent = label;
  document.getElementById('tt-dps').textContent       = value;
  document.getElementById('tt-power').textContent     = power;
  document.getElementById('tt-range').textContent     = spec.range > 0 ? `${spec.range} tiles` : '—';
}

function showTowerTooltip(tower) {
  populateTooltip(tower.typeKey, tower.spec);

  const status    = tower.shutoff ? 'OFFLINE' : tower.powered ? 'ACTIVE' : 'NO POWER';
  const statusCls = tower.shutoff ? 'text-slate-500' : tower.powered ? 'text-green-400' : 'text-red-400';
  const el = document.getElementById('tt-status');
  el.textContent = status;
  el.className   = statusCls + ' font-bold';

  document.getElementById('tt-cost-row').classList.add('hidden');
  document.getElementById('tt-status-row').classList.remove('hidden');
  document.getElementById('tower-tooltip').classList.remove('hidden');
}

function showSpecTooltip(specKey, buttonEl) {
  const spec = TOWER_SPECS[specKey];
  populateTooltip(specKey, spec);

  document.getElementById('tt-cost').textContent = `${spec.cost} ⚡`;
  document.getElementById('tt-cost-row').classList.remove('hidden');
  document.getElementById('tt-status-row').classList.add('hidden');

  const tooltip = document.getElementById('tower-tooltip');
  tooltip.classList.remove('hidden');

  // Position above the button, centred, clamped to viewport
  requestAnimationFrame(() => {
    const bRect = buttonEl.getBoundingClientRect();
    const tw    = tooltip.offsetWidth  || 150;
    const th    = tooltip.offsetHeight || 110;
    let x = bRect.left + bRect.width / 2 - tw / 2;
    let y = bRect.top  - th - 8;
    if (x + tw > window.innerWidth  - 8) x = window.innerWidth  - tw - 8;
    if (x < 8)                           x = 8;
    if (y < 8)                           y = bRect.bottom + 8;
    tooltip.style.left = `${x}px`;
    tooltip.style.top  = `${y}px`;
  });
}

function positionTooltip(canvasIsoX, canvasIsoY) {
  const tooltip = document.getElementById('tower-tooltip');
  const rect    = app.canvas.getBoundingClientRect();
  const px = rect.left + canvasIsoX;
  const py = rect.top  + canvasIsoY;
  const tw = tooltip.offsetWidth  || 150;
  const th = tooltip.offsetHeight || 110;
  let x = px + 18;
  let y = py - th - 10;
  if (x + tw > window.innerWidth  - 8) x = px - tw - 18;
  if (y < 8)                           y = py + 22;
  tooltip.style.left = `${x}px`;
  tooltip.style.top  = `${y}px`;
}

function hideTowerTooltip() {
  document.getElementById('tower-tooltip').classList.add('hidden');
}

function handleGridInteraction(e) {
  const rect = app.canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const { gx, gy } = isoToWorld(mouseX, mouseY);

  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) {
    hoverGfx.clear();
    hideTowerTooltip();
    return;
  }

  const pTop    = worldToIso(gx,     gy);
  const pRight  = worldToIso(gx + 1, gy);
  const pBottom = worldToIso(gx + 1, gy + 1);
  const pLeft   = worldToIso(gx,     gy + 1);

  const cellType = gridMatrix[gy][gx];
  hoverGfx.clear();

  if (cellType === 2) {
    const tower = liveTowers.find(t => t.gx === gx && t.gy === gy);
    if (tower) {
      showTowerTooltip(tower);
      const center = worldToIso(gx + 0.5, gy + 0.5);
      positionTooltip(center.x, center.y);

      const hc = tower.typeKey === 'PYLON' ? 0x00f0ff
               : tower.shutoff ? 0x22c55e : 0xf87171;
      hoverGfx.poly([pTop.x, pTop.y, pRight.x, pRight.y, pBottom.x, pBottom.y, pLeft.x, pLeft.y]);
      hoverGfx.fill({ color: hc, alpha: 0.22 });
      hoverGfx.stroke({ width: 2, color: hc, alpha: 0.85 });

      const spec = TOWER_SPECS[tower.typeKey];
      const rangeX = spec.range * TILE_WIDTH  * Math.SQRT2 / 2;
      const rangeY = spec.range * TILE_HEIGHT * Math.SQRT2 / 2;
      hoverGfx.ellipse(center.x, center.y, rangeX, rangeY);
      hoverGfx.fill({ color: spec.color, alpha: 0.06 });
      hoverGfx.stroke({ width: 1, color: spec.color, alpha: 0.45 });
    }
    return;
  }

  hideTowerTooltip();

  const canBuild = cellType === 0;
  hoverGfx.poly([pTop.x, pTop.y, pRight.x, pRight.y, pBottom.x, pBottom.y, pLeft.x, pLeft.y]);
  hoverGfx.fill({ color: canBuild ? 0x00f0ff : 0xef4444, alpha: 0.25 });
  hoverGfx.stroke({ width: 2, color: canBuild ? 0x00f0ff : 0xef4444, alpha: 0.9 });

  if (canBuild) {
    const spec = TOWER_SPECS[State.selectedTowerType];
    const center = worldToIso(gx + 0.5, gy + 0.5);
    const rangeX = spec.range * TILE_WIDTH  * Math.SQRT2 / 2;
    const rangeY = spec.range * TILE_HEIGHT * Math.SQRT2 / 2;
    hoverGfx.ellipse(center.x, center.y, rangeX, rangeY);
    hoverGfx.fill({ color: spec.color, alpha: 0.06 });
    hoverGfx.stroke({ width: 1, color: spec.color, alpha: 0.45 });
  }
}

function gridCoordsFromEvent(e) {
  const rect  = app.canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;
  return isoToWorld(mouseX, mouseY);
}

function handlePointerDown(e) {
  if (!app || !app.canvas) return;
  const { gx, gy } = gridCoordsFromEvent(e);
  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return;

  if (gridMatrix[gy][gx] === 2) {
    // Start hold timer — action fires on pointerup
    holdState = { gx, gy, startTime: Date.now() };
  } else if (gridMatrix[gy][gx] === 0) {
    // Place tower immediately on press
    const spec = TOWER_SPECS[State.selectedTowerType];
    if (State.flux >= spec.cost) {
      State.flux -= spec.cost;
      gridMatrix[gy][gx] = 2;
      const newTower = new Tower(gx, gy, State.selectedTowerType);
      liveTowers.push(newTower);
      AudioSys.playPlace();
      updateHUD();
      createShockwave(newTower.x, newTower.y, spec.color, 45, 20);
    } else {
      showToast('INSUFFICIENT FLUX RESERVE');
    }
  }
}

function handlePointerUp(e) {
  if (!holdState) return;
  const { gx, gy, startTime } = holdState;
  holdState = null;

  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return;
  if (gridMatrix[gy][gx] !== 2) return;

  const tower = liveTowers.find(t => t.gx === gx && t.gy === gy);
  if (!tower) return;

  if (Date.now() - startTime < HOLD_THRESHOLD_MS) {
    // Short tap — toggle shutoff (not pylons)
    if (tower.typeKey !== 'PYLON') {
      tower.shutoff = !tower.shutoff;
      AudioSys.playPlace();
      showToast(tower.shutoff ? 'TOWER OFFLINE' : 'TOWER ONLINE');
    }
  } else {
    // Long hold — upgrade panel (future)
    showToast('UPGRADE SYSTEM: COMING SOON');
  }
}

function updateHUD() {
  document.getElementById('ui-flux').innerText = Math.floor(State.flux);
  document.getElementById('ui-sanity').innerText = `${State.sanity} / ${State.maxSanity}`;
  document.getElementById('ui-wave').innerText = `${State.wave} / ${State.maxWaves}`;
  document.getElementById('ui-power').innerText = `${State.usedPower} / ${State.totalPower}`;

  ['obelisk', 'bastion', 'prism', 'sanctuary', 'pylon'].forEach(type => {
    const btn = document.getElementById(`btn-tower-${type}`);
    if (type.toUpperCase() === State.selectedTowerType) {
      btn.classList.add('neon-border-cyan', 'bg-cyan-950/60');
    } else {
      btn.classList.remove('neon-border-cyan', 'bg-cyan-950/60');
    }
  });

  const launchBtn = document.getElementById('btn-launch-wave');
  if (State.waveInProgress) {
    launchBtn.setAttribute('disabled', 'true');
    launchBtn.classList.add('opacity-50', 'cursor-not-allowed');
  } else {
    launchBtn.removeAttribute('disabled');
    launchBtn.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

function showToast(msg) {
  const toast = document.getElementById('toast-message');
  const toastText = document.getElementById('toast-text');
  toastText.innerText = msg;
  toast.classList.remove('opacity-0', '-translate-y-2');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', '-translate-y-2');
  }, 2200);
}

function setupUIEventListeners() {
  const towers = ['OBELISK', 'BASTION', 'PRISM', 'SANCTUARY', 'PYLON'];
  towers.forEach(t => {
    const btn = document.getElementById(`btn-tower-${t.toLowerCase()}`);
    btn.addEventListener('click', () => {
      State.selectedTowerType = t;
      AudioSys.playPlace();
      updateHUD();
    });
    btn.addEventListener('mouseenter', () => showSpecTooltip(t, btn));
    btn.addEventListener('mouseleave', hideTowerTooltip);
  });

  document.getElementById('btn-launch-wave').addEventListener('click', () => {
    startNextWave();
  });

  const speedBtn = document.getElementById('btn-speed');
  speedBtn.addEventListener('click', () => {
    State.speed = State.speed === 1.0 ? 2.0 : 1.0;
    speedBtn.innerText = `${State.speed.toFixed(1)}x`;
  });

  const autoBtn = document.getElementById('btn-autowave');
  autoBtn.addEventListener('click', () => {
    State.autoWave = !State.autoWave;
    autoBtn.innerText = `AUTO: ${State.autoWave ? 'ON' : 'OFF'}`;
    autoBtn.classList.toggle('text-cyan-300', State.autoWave);
    autoBtn.classList.toggle('border-cyan-500', State.autoWave);
  });
}

async function initializeGame() {
  const container = document.getElementById('game-container');

  app = new PIXI.Application();
  await app.init({
    resizeTo: container,
    backgroundColor: 0x05030b,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  });
  container.appendChild(app.canvas);

  worldContainer = new PIXI.Container();
  groundContainer = new PIXI.Container();
  gridLinesContainer = new PIXI.Container();
  hoverGfx = new PIXI.Graphics();
  ySortedEntitiesContainer = new PIXI.Container();
  activeBeamsContainer = new PIXI.Container();
  overlayEffectsContainer = new PIXI.Container();

  worldContainer.addChild(groundContainer);
  worldContainer.addChild(gridLinesContainer);
  worldContainer.addChild(hoverGfx);
  worldContainer.addChild(ySortedEntitiesContainer);
  worldContainer.addChild(activeBeamsContainer);
  worldContainer.addChild(overlayEffectsContainer);
  app.stage.addChild(worldContainer);

  function updateGridOrigin() {
    gridOrigin = {
      x: app.renderer.width / 2,
      y: Math.max(100, app.renderer.height * 0.24)
    };
  }
  updateGridOrigin();
  window.addEventListener('resize', () => {
    updateGridOrigin();
    drawIsometricGrid();
  });

  PATH_WAYPOINTS = generateRandomPath();
  initGridMatrix();
  drawIsometricGrid();

  setupUIEventListeners();
  updateHUD();

  app.canvas.addEventListener('pointermove', handleGridInteraction);
  app.canvas.addEventListener('pointerdown', handlePointerDown);
  app.canvas.addEventListener('pointerup',   handlePointerUp);
  app.canvas.addEventListener('pointerleave', () => {
    hoverGfx.clear();
    hideTowerTooltip();
    holdState = null;
  });
  app.canvas.addEventListener('pointercancel', () => { holdState = null; });

  app.ticker.add((ticker) => {
    const delta = ticker.deltaTime;

    if (activeBeamsContainer) {
      activeBeamsContainer.removeChildren();
    }

    allocatePower();
    liveTowers.forEach(t => t.buffMult = 1.0);
    liveTowers.forEach(tower => tower.update(delta));
    liveEnemies.forEach(enemy => enemy.update(delta));

    for (let i = liveProjectiles.length - 1; i >= 0; i--) {
      liveProjectiles[i].update(delta);
    }

    for (let i = liveParticles.length - 1; i >= 0; i--) {
      const p = liveParticles[i];
      if (p.update) {
        if (!p.update(delta)) {
          p.destroy();
          liveParticles.splice(i, 1);
        }
      } else {
        p.age += delta * State.speed;
        const progress = p.age / p.lifetime;
        p.gfx.clear();
        const rX = p.maxRadius  * progress;
        const rY = (p.maxRadiusY ?? p.maxRadius * 0.42) * progress;
        p.gfx.ellipse(p.x, p.y, rX, rY);
        if (p.maxRadiusY) {
          p.gfx.fill({ color: p.color, alpha: 0.12 * (1 - progress) });
        }
        p.gfx.stroke({ width: 3.0 * (1 - progress), color: p.color, alpha: 1 - progress });

        if (p.age >= p.lifetime) {
          if (p.gfx && p.gfx.parent) p.gfx.parent.removeChild(p.gfx);
          liveParticles.splice(i, 1);
        }
      }
    }

    processWaveSpawning(delta);

    if (ySortedEntitiesContainer && ySortedEntitiesContainer.children) {
      ySortedEntitiesContainer.children.sort((a, b) => a.y - b.y);
    }
  });
}

window.addEventListener('load', initializeGame);
