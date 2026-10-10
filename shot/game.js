if (THREE.ColorManagement) {
  THREE.ColorManagement.enabled = false;
}

const LOW_RES_W = 360;
const LOW_RES_H = 202;
const ANIM_FPS = 12.0;

let gameStarted = false;
let isPaused = false;
let hitStopTimer = 0;
let playerHealth = 100;
let gameWon = false;
let propsShatteredCount = 0;

let shieldActive = false;
let shieldTimer = 0;
let shieldCooldown = 0;
const SHIELD_DURATION = 1.0;
const SHIELD_COOLDOWN = 8.0;

// Procedural Audio Engine
class ProceduralAudioEngine {
  constructor() {
    this.ctx = null;
    this.distortionCurve = this.makeDistortionCurve(65);
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  makeDistortionCurve(amount = 65) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      let x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  playShotgunBlast() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t0);
    osc.frequency.exponentialRampToValueAtTime(32, t0 + 0.38);

    oscGain.gain.setValueAtTime(2.2, t0);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.4);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;

    const bandpass = this.ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(3400, t0);
    bandpass.frequency.exponentialRampToValueAtTime(240, t0 + 0.35);
    bandpass.Q.setValueAtTime(2.0, t0);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(2.4, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);

    const waveshaper = this.ctx.createWaveShaper();
    waveshaper.curve = this.distortionCurve;

    osc.connect(waveshaper);
    noiseNode.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(waveshaper);
    waveshaper.connect(this.ctx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.42);
    noiseNode.start(t0);
    noiseNode.stop(t0 + 0.42);
  }

  playDryFire() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, t0);
    osc.frequency.exponentialRampToValueAtTime(300, t0 + 0.04);
    gain.gain.setValueAtTime(0.7, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.05);
  }

  playBreechOpen() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, t0);
    osc.frequency.exponentialRampToValueAtTime(220, t0 + 0.08);
    gain.gain.setValueAtTime(0.9, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.09);
  }

  playShellPing() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400 + Math.random() * 600, t0);
    osc.frequency.exponentialRampToValueAtTime(1100, t0 + 0.12);
    gain.gain.setValueAtTime(0.5, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.14);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.14);
  }

  playShellInsert() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, t0);
    osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.07);
    gain.gain.setValueAtTime(1.1, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.08);
  }

  playBreechClose() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t0);
    osc.frequency.exponentialRampToValueAtTime(55, t0 + 0.14);
    gain.gain.setValueAtTime(1.4, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.15);
  }

  playShatter(pitch = 1.0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1300 * pitch, t0);
    osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.28);
    gain.gain.setValueAtTime(1.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800 * pitch, t0);
    filter.frequency.exponentialRampToValueAtTime(320, t0 + 0.24);
    filter.Q.value = 3.0;

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(1.5, t0);
    nGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.ctx.destination);

    osc.start(t0);
    osc.stop(t0 + 0.3);
    noise.start(t0);
    noise.stop(t0 + 0.28);
  }

  playGateOpen() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t0);
    osc.frequency.exponentialRampToValueAtTime(420, t0 + 0.5);
    gain.gain.setValueAtTime(0.6, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.55);
  }

  playEnemyTelegraph() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t0);
    osc.frequency.linearRampToValueAtTime(1900, t0 + 0.42);
    gain.gain.setValueAtTime(0.4, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.45);
  }

  playEnemyLaserFire() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2200, t0);
    osc.frequency.exponentialRampToValueAtTime(150, t0 + 0.2);
    gain.gain.setValueAtTime(0.7, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.22);
  }

  playHurt() {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t0);
    osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.25);
    gain.gain.setValueAtTime(1.0, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.28);
  }
}

const sound = new ProceduralAudioEngine();

const canvas = document.getElementById('game-canvas');
const viewportContainer = document.getElementById('viewport-container');
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.autoClear = false;

const scene = new THREE.Scene();

// Player Camera Rig Hierarchy
const playerRig = new THREE.Group();
playerRig.position.set(0, 1.6, 2);
scene.add(playerRig);

const pitchRig = new THREE.Group();
playerRig.add(pitchRig);

const shakeRig = new THREE.Group();
pitchRig.add(shakeRig);

const camera = new THREE.PerspectiveCamera(76, LOW_RES_W / LOW_RES_H, 0.05, 140.0);
shakeRig.add(camera);

let cameraTrauma = 0;
function addCameraTrauma(amount) {
  cameraTrauma = Math.min(1.0, cameraTrauma + amount);
}

function updateCameraShake(dt) {
  if (cameraTrauma > 0) {
    cameraTrauma = Math.max(0, cameraTrauma - dt * 3.2);
    const shake = cameraTrauma * cameraTrauma;
    shakeRig.position.x = (Math.random() - 0.5) * 0.20 * shake;
    shakeRig.position.y = (Math.random() - 0.5) * 0.20 * shake;
    shakeRig.rotation.z = (Math.random() - 0.5) * 0.12 * shake;
    shakeRig.rotation.x = (Math.random() - 0.5) * 0.10 * shake;
  } else {
    shakeRig.position.set(0, 0, 0);
    shakeRig.rotation.set(0, 0, 0);
  }
}

// 360x202 Render Target with Depth
const renderTarget = new THREE.WebGLRenderTarget(LOW_RES_W, LOW_RES_H, {
  minFilter: THREE.NearestFilter,
  magFilter: THREE.NearestFilter,
  format: THREE.RGBAFormat,
  depthBuffer: true
});
renderTarget.depthTexture = new THREE.DepthTexture();
renderTarget.depthTexture.type = THREE.UnsignedShortType;

const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postScene = new THREE.Scene();

const PostShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    #include <packing>
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 uResolution;
    uniform float cameraNear;
    uniform float cameraFar;
    varying vec2 vUv;

    float bayer4x4(vec2 p) {
      int x = int(mod(p.x, 4.0));
      int y = int(mod(p.y, 4.0));
      int idx = x + y * 4;
      if (idx == 0) return 0.0 / 16.0;
      if (idx == 1) return 8.0 / 16.0;
      if (idx == 2) return 2.0 / 16.0;
      if (idx == 3) return 10.0 / 16.0;
      if (idx == 4) return 12.0 / 16.0;
      if (idx == 5) return 4.0 / 16.0;
      if (idx == 6) return 14.0 / 16.0;
      if (idx == 7) return 6.0 / 16.0;
      if (idx == 8) return 3.0 / 16.0;
      if (idx == 9) return 11.0 / 16.0;
      if (idx == 10) return 1.0 / 16.0;
      if (idx == 11) return 9.0 / 16.0;
      if (idx == 12) return 15.0 / 16.0;
      if (idx == 13) return 7.0 / 16.0;
      if (idx == 14) return 13.0 / 16.0;
      return 5.0 / 16.0;
    }

    float readLinearDepth(vec2 coord) {
      float fragCoordZ = texture2D(tDepth, coord).x;
      float viewZ = perspectiveDepthToViewZ(fragCoordZ, cameraNear, cameraFar);
      return -viewZ;
    }

    vec3 quantizePalette(vec3 c, float bayer) {
      vec3 dithered = c + (bayer - 0.5) * 0.12;
      return floor(dithered * 12.0 + 0.5) / 12.0;
    }

    void main() {
      vec2 texel = 1.0 / uResolution;
      vec4 baseColor = texture2D(tDiffuse, vUv);

      float dCenter = readLinearDepth(vUv);
      float dR = readLinearDepth(vUv + vec2(texel.x, 0.0));
      float dL = readLinearDepth(vUv - vec2(texel.x, 0.0));
      float dU = readLinearDepth(vUv + vec2(0.0, texel.y));
      float dD = readLinearDepth(vUv - vec2(0.0, texel.y));

      // Upward delta compensation to stop floor banding: subtract 0.0085 * d * d
      float compU = abs((dU - dCenter) - (0.0085 * dCenter * dCenter));
      float maxDelta = max(max(abs(dR - dCenter), abs(dL - dCenter)), max(compU, abs(dD - dCenter)));

      // Dual threshold: 0.085 for viewmodel (d < 0.49), max(0.45, d * 0.075) for world
      float threshold = (dCenter < 0.49) ? 0.085 : max(0.45, dCenter * 0.075);
      bool isEdge = (maxDelta > threshold);

      vec2 screenCoord = vUv * uResolution;
      float bayer = bayer4x4(screenCoord);

      // Dithered distance fog
      float fogFactor = clamp((dCenter - 22.0) / 38.0, 0.0, 0.65) + bayer * 0.45;
      vec3 fogColor = vec3(0.015, 0.012, 0.024);

      vec3 finalColor = baseColor.rgb;
      if (fogFactor > 0.52) {
        finalColor = fogColor;
      } else {
        finalColor = quantizePalette(finalColor, bayer);
      }

      if (isEdge) {
        finalColor *= 0.04;
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

const postMaterial = new THREE.ShaderMaterial({
  uniforms: {
    tDiffuse: { value: renderTarget.texture },
    tDepth: { value: renderTarget.depthTexture },
    uResolution: { value: new THREE.Vector2(LOW_RES_W, LOW_RES_H) },
    cameraNear: { value: camera.near },
    cameraFar: { value: camera.far }
  },
  vertexShader: PostShader.vertexShader,
  fragmentShader: PostShader.fragmentShader,
  depthTest: false,
  depthWrite: false
});

const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial);
postScene.add(postQuad);

const weaponRig = new THREE.Group();
pitchRig.add(weaponRig);

const shotgunRoot = new THREE.Group();
shotgunRoot.position.set(0.18, -0.22, -0.32);
weaponRig.add(shotgunRoot);

const darkSteelMat = new THREE.MeshBasicMaterial({ color: 0x16181e });
const silverSteelMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
const brassMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
const walnutWoodMat = new THREE.MeshBasicMaterial({ color: 0x3e1f0e });
const shellCasingRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });

// Stock & Receiver
const stockGeo = new THREE.BoxGeometry(0.05, 0.08, 0.22);
const stock = new THREE.Mesh(stockGeo, walnutWoodMat);
stock.position.set(0, -0.04, 0.12);
shotgunRoot.add(stock);

const receiverMesh = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.09, 0.12), darkSteelMat);
receiverMesh.position.set(0, 0, 0.01);
shotgunRoot.add(receiverMesh);

const lever = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.025, 0.05), brassMat);
lever.position.set(0, 0.05, 0.02);
shotgunRoot.add(lever);

// Barrel Hinge Pivot
const barrelHinge = new THREE.Group();
barrelHinge.position.set(0, -0.025, -0.05);
shotgunRoot.add(barrelHinge);

// Twin Over-Under Barrels
const topBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.52, 8), silverSteelMat);
topBarrel.rotation.x = Math.PI / 2;
topBarrel.position.set(0, 0.035, -0.26);
barrelHinge.add(topBarrel);

const btmBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.52, 8), silverSteelMat);
btmBarrel.rotation.x = Math.PI / 2;
btmBarrel.position.set(0, -0.005, -0.26);
barrelHinge.add(btmBarrel);

const sightRib = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.5), brassMat);
sightRib.position.set(0, 0.06, -0.26);
barrelHinge.add(sightRib);

// Chamber Bores
const chamberRimTop = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.02, 8), brassMat);
chamberRimTop.rotation.x = Math.PI / 2;
chamberRimTop.position.set(0, 0.035, -0.005);
barrelHinge.add(chamberRimTop);

const chamberRimBtm = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.02, 8), brassMat);
chamberRimBtm.rotation.x = Math.PI / 2;
chamberRimBtm.position.set(0, -0.005, -0.005);
barrelHinge.add(chamberRimBtm);

// Muzzle Starburst Flash
const muzzleFlashGroup = new THREE.Group();
const flashMat = new THREE.MeshBasicMaterial({ color: 0xffea00, fog: false });
for (let i = 0; i < 4; i++) {
  const spike = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.32, 4), flashMat);
  spike.rotation.z = (i * Math.PI) / 2;
  muzzleFlashGroup.add(spike);
}
const flashCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
muzzleFlashGroup.add(flashCore);
muzzleFlashGroup.position.set(0, 0.02, -0.54);
muzzleFlashGroup.visible = false;
barrelHinge.add(muzzleFlashGroup);

const wallColliders = [];
let rooms = [];
let currentRoomId = 0;

// Floor texture
const gridCanvas = document.createElement('canvas');
gridCanvas.width = 128;
gridCanvas.height = 128;
const gctx = gridCanvas.getContext('2d');
gctx.fillStyle = '#08080c';
gctx.fillRect(0, 0, 128, 128);
gctx.strokeStyle = '#181b24';
gctx.lineWidth = 3;
gctx.strokeRect(0, 0, 128, 128);
gctx.strokeStyle = '#282e42';
gctx.lineWidth = 1;
gctx.strokeRect(16, 16, 96, 96);

const dungeonFloorTex = new THREE.CanvasTexture(gridCanvas);
dungeonFloorTex.wrapS = THREE.RepeatWrapping;
dungeonFloorTex.wrapT = THREE.RepeatWrapping;
dungeonFloorTex.repeat.set(16, 64);
dungeonFloorTex.magFilter = THREE.NearestFilter;
dungeonFloorTex.minFilter = THREE.NearestFilter;

// Wall Material
const wallMat = new THREE.MeshBasicMaterial({ color: 0x12141c });
const wallAccentMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, wireframe: true, fog: false });

function addDungeonWall(x, y, z, w, h, d, isLowLedge = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  mesh.position.set(x, y, z);
  scene.add(mesh);

  const wire = new THREE.Mesh(new THREE.BoxGeometry(w * 1.005, h * 1.005, d * 1.005), wallAccentMat);
  wire.position.set(x, y, z);
  scene.add(wire);

  const col = {
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    isLowLedge: isLowLedge,
    height: h
  };
  wallColliders.push(col);
  return col;
}

// Blastable Reinforced Breach Doors (Shoot with shotgun to blow open!)
const blastDoors = [];
function createBlastDoor(zPos, targetRoomId, doorName) {
  const doorGroup = new THREE.Group();

  // Heavy Steel Outer Plate
  const doorPlate = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 5.2, 0.35),
    new THREE.MeshBasicMaterial({ color: 0x27272a })
  );
  doorPlate.position.y = 2.6;
  doorGroup.add(doorPlate);

  // Warning Stripes / Hazard Border
  const hazardBorder = new THREE.Mesh(
    new THREE.BoxGeometry(4.9, 5.3, 0.38),
    new THREE.MeshBasicMaterial({ color: 0xea580c, wireframe: true, fog: false })
  );
  hazardBorder.position.y = 2.6;
  doorGroup.add(hazardBorder);

  // Locking Hydraulic Core (Glows red, flashes on hit)
  const lockCore = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.42),
    new THREE.MeshBasicMaterial({ color: 0xef4444, fog: false })
  );
  lockCore.position.set(0, 2.6, 0.22);
  doorGroup.add(lockCore);

  doorGroup.position.set(0, 0, zPos);
  scene.add(doorGroup);

  const collider = {
    minX: -2.6,
    maxX: 2.6,
    minZ: zPos - 0.5,
    maxZ: zPos + 0.5,
    isDoor: true,
    disabled: false
  };
  wallColliders.push(collider);

  const doorObj = {
    group: doorGroup,
    plate: doorPlate,
    hazard: hazardBorder,
    lockCore: lockCore,
    zPos: zPos,
    roomId: targetRoomId,
    name: doorName,
    hp: 2,
    maxHp: 2,
    isBreached: false,
    collider: collider
  };
  blastDoors.push(doorObj);
  return doorObj;
}

function mulberry32(seed) {
  return function() {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMap(seed) {
  const rng = mulberry32(seed);
  const COLS = 3, ROWS = 4;
  const CW = 34, CD = 26;
  const CORR_HW = 1.3;
  const OX = -(COLS * CW) / 2;
  const OZ = -(ROWS * CD) / 2;

  const namePool = [
    'storage', 'guard post', 'barracks', 'vault', 'workshop',
    'mess hall', 'lab', 'archive', 'armoury', 'library', 'hall', 'anteroom'
  ];
  for (let i = namePool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [namePool[i], namePool[j]] = [namePool[j], namePool[i]];
  }
  let nameIdx = 0;

  const grid = [];
  const mapRooms = [];

  for (let col = 0; col < COLS; col++) {
    grid[col] = [];
    for (let row = 0; row < ROWS; row++) {
      const cellCx = OX + col * CW + CW / 2;
      const cellCz = OZ + row * CD + CD / 2;
      const hw = 8 + Math.floor(rng() * 5);
      const hd = 6 + Math.floor(rng() * 5);
      const maxJx = Math.max(0, CW / 2 - hw - 3);
      const maxJz = Math.max(0, CD / 2 - hd - 3);
      const cx = cellCx + (rng() * 2 - 1) * maxJx;
      const cz = cellCz + (rng() * 2 - 1) * maxJz;
      const isStart = (col === 1 && row === ROWS - 1);
      const id = mapRooms.length;
      const room = {
        id,
        name: isStart ? 'entrance' : namePool[nameIdx++ % namePool.length],
        cx, cz, hw, hd,
        minX: cx - hw, maxX: cx + hw,
        minZ: cz - hd, maxZ: cz + hd,
        gridCol: col, gridRow: row,
        cleared: isStart,
        isStart,
        connE: null, connW: null, connN: null, connS: null
      };
      grid[col][row] = room;
      mapRooms.push(room);
    }
  }

  const corridors = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const rA = grid[col][row];
      if (col + 1 < COLS) {
        const rB = grid[col + 1][row];
        const zLo = Math.max(rA.minZ, rB.minZ) + CORR_HW;
        const zHi = Math.min(rA.maxZ, rB.maxZ) - CORR_HW;
        if (zHi > zLo) {
          const cz = zLo + rng() * (zHi - zLo);
          const corr = { fromId: rA.id, toId: rB.id, axis: 'EW', cz, x1: rA.maxX, x2: rB.minX, hw: CORR_HW };
          corridors.push(corr);
          rA.connE = corr;
          rB.connW = corr;
        }
      }
      if (row + 1 < ROWS) {
        const rB = grid[col][row + 1];
        const xLo = Math.max(rA.minX, rB.minX) + CORR_HW;
        const xHi = Math.min(rA.maxX, rB.maxX) - CORR_HW;
        if (xHi > xLo) {
          const cx = xLo + rng() * (xHi - xLo);
          const corr = { fromId: rA.id, toId: rB.id, axis: 'NS', cx, z1: rA.maxZ, z2: rB.minZ, hw: CORR_HW };
          corridors.push(corr);
          rA.connS = corr;
          rB.connN = corr;
        }
      }
    }
  }

  return { mapRooms, corridors, startRoomId: grid[1][ROWS - 1].id, rng, seed };
}

function buildScene(mapData) {
  const { mapRooms, corridors } = mapData;

  rooms.length = 0;
  wallColliders.length = 0;
  blastDoors.length = 0;

  const WH = 5.5, WT = 0.8;

  for (const r of mapRooms) {
    rooms.push({ id: r.id, name: r.name, minX: r.minX, maxX: r.maxX, minZ: r.minZ, maxZ: r.maxZ, cleared: r.cleared });
  }

  const allX = mapRooms.flatMap(r => [r.minX, r.maxX]);
  const allZ = mapRooms.flatMap(r => [r.minZ, r.maxZ]);
  const fMinX = Math.min(...allX) - 5, fMaxX = Math.max(...allX) + 5;
  const fMinZ = Math.min(...allZ) - 5, fMaxZ = Math.max(...allZ) + 5;
  dungeonFloorTex.repeat.set(Math.ceil((fMaxX - fMinX) / 2), Math.ceil((fMaxZ - fMinZ) / 2));
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(fMaxX - fMinX, fMaxZ - fMinZ),
    new THREE.MeshBasicMaterial({ map: dungeonFloorTex })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set((fMinX + fMaxX) / 2, 0, (fMinZ + fMaxZ) / 2);
  scene.add(floor);

  // Build wall segments with archway gaps where corridors connect
  function wallSegs(fixed, runAxis, rangeMin, rangeMax, gaps) {
    const sorted = gaps.slice().sort((a, b) => a.c - b.c);
    let cur = rangeMin;
    for (const g of sorted) {
      const gs = g.c - g.hw, ge = g.c + g.hw;
      if (gs > cur + 0.1) {
        const len = gs - cur, mid = (cur + gs) / 2;
        if (runAxis === 'x') addDungeonWall(mid, WH / 2, fixed, len, WH, WT);
        else addDungeonWall(fixed, WH / 2, mid, WT, WH, len);
      }
      cur = ge;
    }
    if (cur < rangeMax - 0.1) {
      const len = rangeMax - cur, mid = (cur + rangeMax) / 2;
      if (runAxis === 'x') addDungeonWall(mid, WH / 2, fixed, len, WH, WT);
      else addDungeonWall(fixed, WH / 2, mid, WT, WH, len);
    }
  }

  for (const r of mapRooms) {
    const gN = [], gS = [], gE = [], gW = [];
    for (const c of corridors) {
      if (c.axis === 'NS') {
        if (c.fromId === r.id) gS.push({ c: c.cx, hw: c.hw });
        if (c.toId === r.id) gN.push({ c: c.cx, hw: c.hw });
      } else {
        if (c.fromId === r.id) gE.push({ c: c.cz, hw: c.hw });
        if (c.toId === r.id) gW.push({ c: c.cz, hw: c.hw });
      }
    }
    wallSegs(r.minZ, 'x', r.minX, r.maxX, gN);
    wallSegs(r.maxZ, 'x', r.minX, r.maxX, gS);
    wallSegs(r.minX, 'z', r.minZ, r.maxZ, gW);
    wallSegs(r.maxX, 'z', r.minZ, r.maxZ, gE);
  }

  // Corridor walls
  for (const c of corridors) {
    if (c.axis === 'EW') {
      const len = c.x2 - c.x1;
      if (len > 0.5) {
        const cx = (c.x1 + c.x2) / 2;
        addDungeonWall(cx, WH / 2, c.cz - c.hw, len, WH, WT);
        addDungeonWall(cx, WH / 2, c.cz + c.hw, len, WH, WT);
      }
    } else {
      const len = c.z2 - c.z1;
      if (len > 0.5) {
        const cz = (c.z1 + c.z2) / 2;
        addDungeonWall(c.cx - c.hw, WH / 2, cz, WT, WH, len);
        addDungeonWall(c.cx + c.hw, WH / 2, cz, WT, WH, len);
      }
    }
  }
}

// Floating 3D Waypoint Diamond Beacon (points to active locked gate or sanctum core)
const waypointGroup = new THREE.Group();
const wpDiamondMat = new THREE.MeshBasicMaterial({ color: 0x2dd4bf, wireframe: true, fog: false });
const wpCoreMat = new THREE.MeshBasicMaterial({ color: 0x0d9488, fog: false });
const wpOuter = new THREE.Mesh(new THREE.OctahedronGeometry(0.7), wpDiamondMat);
const wpInner = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), wpCoreMat);
waypointGroup.add(wpOuter);
waypointGroup.add(wpInner);

// Pillar beacon light ring
const wpRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 8), new THREE.MeshBasicMaterial({ color: 0x2dd4bf, side: THREE.DoubleSide, fog: false }));
wpRing.rotation.x = Math.PI / 2;
wpRing.position.y = -1.2;
waypointGroup.add(wpRing);

waypointGroup.position.set(0, 2.8, -10); // Starts at Gate 1
scene.add(waypointGroup);

const breakables = [];

function spawnBreakableProp(type, x, y, z) {
  const grp = new THREE.Group();
  let hp = 1;
  let size = 1.0;
  let pal = [];

  if (type === 'crate') {
    size = 1.1;
    const crateMat = new THREE.MeshBasicMaterial({ color: 0x5c3a21 });
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x92400e, wireframe: true, fog: false });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), crateMat);
    box.position.y = 0.55;
    grp.add(box);
    const wBox = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.12, 1.12), wireMat);
    wBox.position.y = 0.55;
    grp.add(wBox);
    pal = [0x78350f, 0x92400e, 0x451a03, 0xf59e0b];
  } else if (type === 'vase') {
    size = 0.85;
    const vaseMat = new THREE.MeshBasicMaterial({ color: 0x1e3a8a });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.9, 8), vaseMat);
    top.position.y = 0.45;
    grp.add(top);
    const goldBand = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.12, 8), new THREE.MeshBasicMaterial({ color: 0xf59e0b, fog: false }));
    goldBand.position.y = 0.45;
    grp.add(goldBand);
    pal = [0x1e40af, 0x3b82f6, 0xf59e0b, 0xffffff];
  } else if (type === 'conduit') {
    size = 1.4;
    hp = 2;
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.4, 0.7), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    col.position.y = 1.2;
    grp.add(col);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshBasicMaterial({ color: 0x06b6d4, fog: false }));
    core.position.y = 2.0;
    grp.add(core);
    pal = [0x0891b2, 0x06b6d4, 0x22d3ee, 0xffffff];
  }

  grp.position.set(x, y, z);
  scene.add(grp);

  const propObj = {
    group: grp,
    type: type,
    hp: hp,
    size: size,
    pos: new THREE.Vector3(x, y + size / 2, z),
    palette: pal
  };
  breakables.push(propObj);
  return propObj;
}

const enemies = [];
const enemyProjectiles = [];

const flashWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
const telegraphMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, wireframe: true, fog: false });

function createTacticalEnemy(type, x, z, roomId, patrolRoute = null) {
  const group = new THREE.Group();
  let hp = 1;
  let size = 1.1;
  let meshCore, meshWire;

  // Telegraph attack octahedron
  const telegraphOct = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), telegraphMat);
  telegraphOct.position.y = 1.35;
  telegraphOct.visible = false;
  group.add(telegraphOct);

  let frontShieldGroup = null;

  if (type === 'sentry') {
    // Stationary turret on plinth
    hp = 2;
    size = 1.1;
    meshCore = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0x3f1212 }));
    meshWire = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.84, 0.84), new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true, fog: false }));
    group.add(meshCore);
    group.add(meshWire);

    const eye = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 4), new THREE.MeshBasicMaterial({ color: 0xff0055, fog: false }));
    eye.rotation.x = -Math.PI / 2;
    eye.position.z = 0.45;
    group.add(eye);

    // Plinth
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.2, 6), new THREE.MeshBasicMaterial({ color: 0x11131a }));
    plinth.position.y = -0.6;
    group.add(plinth);
  } else if (type === 'patrol') {
    // Pacing guardian
    hp = 2;
    size = 1.2;
    meshCore = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0x064e3b }));
    meshWire = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.94, 0.94), new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true, fog: false }));
    group.add(meshCore);
    group.add(meshWire);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.22, 0.3), new THREE.MeshBasicMaterial({ color: 0x34d399, fog: false }));
    visor.position.set(0, 0.1, 0.48);
    group.add(visor);
  } else if (type === 'shielded') {
    // Ward with frontal shield plate
    hp = 3;
    size = 1.35;
    meshCore = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), new THREE.MeshBasicMaterial({ color: 0x3b0764 }));
    meshWire = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.04, 1.04), new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true, fog: false }));
    group.add(meshCore);
    group.add(meshWire);

    // Rotating Shield Plate
    frontShieldGroup = new THREE.Group();
    const shieldPlate = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.2, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x7e22ce, wireframe: false, fog: false })
    );
    shieldPlate.position.set(0, 0, 0.75);
    frontShieldGroup.add(shieldPlate);

    const shieldBorder = new THREE.Mesh(
      new THREE.BoxGeometry(1.44, 1.24, 0.2),
      new THREE.MeshBasicMaterial({ color: 0xd8b4fe, wireframe: true, fog: false })
    );
    shieldBorder.position.set(0, 0, 0.75);
    frontShieldGroup.add(shieldBorder);

    group.add(frontShieldGroup);
  }

  group.position.set(x, 1.2, z);
  scene.add(group);

  const origMaterials = [];
  group.traverse(c => {
    if (c.isMesh && c !== telegraphOct) origMaterials.push({ mesh: c, mat: c.material });
  });

  const enemyObj = {
    group: group,
    type: type,
    hp: hp,
    maxHp: hp,
    size: size,
    roomId: roomId,
    pos: group.position,
    origMaterials: origMaterials,
    telegraphOct: telegraphOct,
    frontShieldGroup: frontShieldGroup,
    isTelegraphing: false,
    telegraphTimer: 0,
    telegraphDuration: 0.45,
    attackCooldown: 0.8 + Math.random() * 0.7,
    isStaggered: false,
    staggerTimer: 0,
    hitFlashTimer: 0,
    patrolRoute: patrolRoute,
    patrolIdx: 0,
    investigating: false,
    trueYaw: 0
  };

  enemies.push(enemyObj);
  return enemyObj;
}

function basicPopulate(mapData) {
  const { mapRooms, rng } = mapData;
  const maxRow = Math.max(...mapRooms.map(r => r.gridRow));

  for (const r of mapRooms) {
    if (r.isStart) {
      spawnBreakableProp('crate', r.cx - 2, 0, r.maxZ - 3);
      spawnBreakableProp('crate', r.cx + 2, 0, r.maxZ - 3);
      spawnBreakableProp('vase', r.cx, 0, r.minZ + 3);
      continue;
    }

    const difficulty = (maxRow - r.gridRow) / maxRow;

    // Cover boxes: 2–4 low ledges placed off-centre
    const coverCount = 2 + Math.floor(rng() * 3);
    for (let ci = 0; ci < coverCount; ci++) {
      const side = rng() < 0.5 ? -1 : 1;
      const off = 2.5 + rng() * Math.max(0, r.hw - 5.5);
      const bx = r.cx + side * off;
      const bz = r.minZ + 2 + rng() * (r.hd * 2 - 4);
      addDungeonWall(bx, 1.1, bz, 3.0, 2.2, 0.8, true);
    }

    // Enemies
    let budget = 1 + Math.floor(difficulty * 2.5);
    if (r.gridRow === 0 && budget >= 2) {
      createTacticalEnemy('shielded', r.cx, r.minZ + 5, r.id);
      budget -= 2;
    }
    if (budget >= 2 && difficulty > 0.3) {
      const pw = Math.max(2, r.hw - 3);
      const pz1 = r.maxZ - 4, pz2 = r.minZ + 4;
      createTacticalEnemy('patrol', r.cx, r.cz, r.id, [
        new THREE.Vector3(r.cx - pw, 1.2, pz1),
        new THREE.Vector3(r.cx + pw, 1.2, pz1),
        new THREE.Vector3(r.cx + pw, 1.2, pz2),
        new THREE.Vector3(r.cx - pw, 1.2, pz2)
      ]);
      budget--;
    }
    while (budget > 0) {
      const ex = r.cx + (rng() * 2 - 1) * (r.hw - 2.5);
      const ez = r.minZ + 2 + rng() * (r.hd * 2 - 4);
      createTacticalEnemy('sentry', ex, ez, r.id);
      budget--;
    }

    // Props: 3–5 per room, skewing toward conduits in deep rooms
    const propCount = 3 + Math.floor(rng() * 3);
    const propTypes = difficulty > 0.6
      ? ['conduit', 'vase', 'conduit', 'crate', 'vase']
      : ['crate', 'vase', 'crate', 'vase', 'crate'];
    for (let pi = 0; pi < propCount; pi++) {
      const px = r.minX + 2 + rng() * (r.hw * 2 - 4);
      const pz = r.minZ + 2 + rng() * (r.hd * 2 - 4);
      spawnBreakableProp(propTypes[pi % propTypes.length], px, 0, pz);
    }
  }
}

const spentShells = [];
const debrisList = [];
const tracers = [];
const persistentDebris = [];
const floorSplatters = [];
const MAX_PERSISTENT_DEBRIS = 60;
const MAX_FLOOR_SPLATTERS = 20;

const waferGeo = new THREE.PlaneGeometry(0.32, 0.32);
const voxelGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);
const sparkGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
const splatterGeo = new THREE.PlaneGeometry(1, 1);
const restingChunkGeo = new THREE.BoxGeometry(0.15, 0.06, 0.15);
const splatterMat = new THREE.MeshBasicMaterial({ color: 0x1a0505, side: THREE.DoubleSide });

function spawnSpentCartridge(side = 0) {
  sound.playShellPing();

  const shellGrp = new THREE.Group();
  const redCasing = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.08, 7), shellCasingRed);
  redCasing.rotation.z = Math.PI / 2;
  shellGrp.add(redCasing);

  const brassHead = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.016, 7), brassMat);
  brassHead.rotation.z = Math.PI / 2;
  brassHead.position.x = -0.04;
  shellGrp.add(brassHead);

  const spawnPos = new THREE.Vector3();
  barrelHinge.getWorldPosition(spawnPos);
  const camQuat = new THREE.Quaternion();
  camera.getWorldQuaternion(camQuat);

  shellGrp.position.copy(spawnPos);
  shellGrp.position.add(new THREE.Vector3((side === 0 ? -0.02 : 0.02), 0.02, 0.05).applyQuaternion(camQuat));

  // Pops UP and BACK over left shoulder
  const ejectVel = new THREE.Vector3(
    -1.4 + (Math.random() - 0.5) * 0.4 + (side * 0.3),
    3.8 + Math.random() * 1.2,
    2.4 + Math.random() * 0.8
  );
  ejectVel.applyQuaternion(camQuat);

  scene.add(shellGrp);
  spentShells.push({
    mesh: shellGrp,
    vel: ejectVel,
    rotVel: new THREE.Vector3((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40),
    life: 2.6
  });
}

function triggerPillowSplosion(pos, palette, isEnemy = false) {
  sound.playShatter(isEnemy ? 1.0 : 1.35);
  addCameraTrauma(isEnemy ? 0.65 : 0.35);
  if (isEnemy) hitStopTimer = 0.065; // 65ms hitstop on enemy kill

  // Layer 1: Flat Fluttering Drag Wafers (32-45)
  const waferCount = isEnemy ? 42 : 28;
  for (let i = 0; i < waferCount; i++) {
    const col = palette[Math.floor(Math.random() * palette.length)];
    const mesh = new THREE.Mesh(waferGeo, new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
    mesh.position.copy(pos);
    mesh.position.add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4));

    const angle = Math.random() * Math.PI * 2;
    const spd = 3.5 + Math.random() * 7.5;
    const vel = new THREE.Vector3(
      Math.cos(angle) * spd,
      3.5 + Math.random() * 5.5,
      Math.sin(angle) * spd
    );

    scene.add(mesh);
    debrisList.push({
      mesh: mesh,
      vel: vel,
      type: 'wafer',
      rotVel: new THREE.Vector3((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16),
      life: 2.6 + Math.random() * 0.8
    });
  }

  // Layer 2: Heavy 3D Bouncing Micro-Voxels (28-40)
  const voxelCount = isEnemy ? 38 : 22;
  for (let i = 0; i < voxelCount; i++) {
    const col = palette[Math.floor(Math.random() * palette.length)];
    const mesh = new THREE.Mesh(voxelGeo, new THREE.MeshBasicMaterial({ color: col }));
    mesh.position.copy(pos);

    const angle = Math.random() * Math.PI * 2;
    const spd = 4.0 + Math.random() * 8.0;
    const vel = new THREE.Vector3(
      Math.cos(angle) * spd,
      4.0 + Math.random() * 7.0,
      Math.sin(angle) * spd
    );

    scene.add(mesh);
    debrisList.push({
      mesh: mesh,
      vel: vel,
      type: 'voxel',
      rotVel: new THREE.Vector3((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 35, (Math.random() - 0.5) * 35),
      life: 2.2 + Math.random() * 1.0
    });
  }

  // Layer 3: Blazing Sparks (20)
  for (let i = 0; i < 20; i++) {
    const mesh = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xffea00, fog: false }));
    mesh.position.copy(pos);
    const angle = Math.random() * Math.PI * 2;
    const spd = 8.0 + Math.random() * 12.0;
    const vel = new THREE.Vector3(
      Math.cos(angle) * spd,
      2.0 + Math.random() * 8.0,
      Math.sin(angle) * spd
    );

    scene.add(mesh);
    debrisList.push({
      mesh: mesh,
      vel: vel,
      type: 'spark',
      rotVel: new THREE.Vector3((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50),
      life: 0.7 + Math.random() * 0.3
    });
  }
}

function spawnKillMark(pos, palette) {
  // Floor splatter: overlapping flat quads sharing one material
  const sg = new THREE.Group();
  sg.position.set(pos.x + (Math.random() - 0.5) * 0.2, 0.012, pos.z + (Math.random() - 0.5) * 0.2);
  sg.rotation.y = Math.random() * Math.PI * 2;
  const layers = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < layers; i++) {
    const m = new THREE.Mesh(splatterGeo, splatterMat);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(0.4 + Math.random() * 1.0, 1, 0.25 + Math.random() * 0.55);
    m.position.set((Math.random() - 0.5) * 0.35, 0, (Math.random() - 0.5) * 0.35);
    sg.add(m);
  }
  scene.add(sg);
  if (floorSplatters.length >= MAX_FLOOR_SPLATTERS) scene.remove(floorSplatters.shift());
  floorSplatters.push(sg);

  // Scattered resting chunks in enemy palette colours
  const n = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < n; i++) {
    const col = palette[Math.floor(Math.random() * palette.length)];
    const m = new THREE.Mesh(restingChunkGeo, new THREE.MeshBasicMaterial({ color: col }));
    const angle = Math.random() * Math.PI * 2;
    const r = 0.2 + Math.random() * 1.1;
    m.position.set(pos.x + Math.cos(angle) * r, 0.04, pos.z + Math.sin(angle) * r);
    m.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
    scene.add(m);
    if (persistentDebris.length >= MAX_PERSISTENT_DEBRIS) scene.remove(persistentDebris.shift());
    persistentDebris.push(m);
  }
}

function createPelletTracer(startPos, endPos) {
  const geom = new THREE.BufferGeometry().setFromPoints([startPos, endPos]);
  const mat = new THREE.LineBasicMaterial({ color: 0xffea00, transparent: true, opacity: 0.95 });
  const line = new THREE.Line(geom, mat);
  scene.add(line);
  tracers.push({ line: line, life: 0.08 });
}

function spawnEnemyLaserProjectile(origin, targetDir) {
  sound.playEnemyLaserFire();
  const geom = new THREE.BoxGeometry(0.24, 0.24, 0.7);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff0055, fog: false });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.position.copy(origin);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), targetDir);
  scene.add(mesh);

  enemyProjectiles.push({
    mesh: mesh,
    vel: targetDir.clone().multiplyScalar(16.0),
    life: 3.0
  });
}

let ammo = 2;
let isFiring = false;
let fireTimer = 0;
const FIRE_DURATION = 0.22;

let isReloading = false;
let reloadTimer = 0;
const RELOAD_DURATION = 1.35;
let shellsPopped = false;
let shellsInserted = false;
let breechClosed = false;

const shell1UI = document.getElementById('shell-1');
const shell2UI = document.getElementById('shell-2');
const reloadPrompt = document.getElementById('reload-prompt');
const reloadState = document.getElementById('reload-state');
const dryFireBanner = document.getElementById('dry-fire-banner');
const roomClearedBanner = document.getElementById('room-cleared-banner');
const objectiveText = document.getElementById('objective-text');
const waypointHud = document.getElementById('waypoint-hud');
const sectorIdxEl = document.getElementById('sector-idx');
const radarCanvas = document.getElementById('radar-canvas');
const radarCtx = radarCanvas ? radarCanvas.getContext('2d') : null;

function updateAmmoUI() {
  if (ammo === 2) {
    shell1UI.className = "w-6 h-12 rounded-sm border-2 border-amber-400 bg-red-600 flex flex-col justify-between p-0.5 shell-active";
    shell2UI.className = "w-6 h-12 rounded-sm border-2 border-amber-400 bg-red-600 flex flex-col justify-between p-0.5 shell-active";
    reloadPrompt.innerText = "2/2";
    reloadPrompt.className = "text-xs font-black text-amber-400 tracking-wider";
  } else if (ammo === 1) {
    shell1UI.className = "w-6 h-12 rounded-sm border-2 border-amber-400 bg-red-600 flex flex-col justify-between p-0.5 shell-active";
    shell2UI.className = "w-6 h-12 rounded-sm border-2 border-stone-700 bg-stone-900 flex flex-col justify-between p-0.5 shell-empty";
    reloadPrompt.innerText = "1/2";
    reloadPrompt.className = "text-xs font-black text-amber-300 tracking-wider";
  } else {
    shell1UI.className = "w-6 h-12 rounded-sm border-2 border-stone-700 bg-stone-900 flex flex-col justify-between p-0.5 shell-empty";
    shell2UI.className = "w-6 h-12 rounded-sm border-2 border-stone-700 bg-stone-900 flex flex-col justify-between p-0.5 shell-empty";
    reloadPrompt.innerText = "empty";
    reloadPrompt.className = "text-xs font-black text-red-500 tracking-wider animate-pulse";
  }
}

function triggerManualReload() {
  if (!gameStarted || isPaused || isReloading) return;
  if (ammo === 2) return;

  isReloading = true;
  reloadTimer = 0;
  shellsPopped = false;
  shellsInserted = false;
  breechClosed = false;

  reloadState.innerText = "opening...";
  reloadState.className = "text-[10px] text-amber-400 font-mono";
  sound.playBreechOpen();
}

function checkRoomClearance(roomId) {
  const activeEnemiesInRoom = enemies.filter(e => e.roomId === roomId);
  if (activeEnemiesInRoom.length === 0) {
    const roomObj = rooms.find(r => r.id === roomId);
    if (roomObj && !roomObj.cleared) {
      roomObj.cleared = true;
      document.getElementById('room-status').innerText = 'clear';
      document.getElementById('room-status').className = 'px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-600 text-emerald-400 font-bold text-[10px] rounded tracking-wide';

      roomClearedBanner.classList.remove('opacity-0');
      setTimeout(() => roomClearedBanner.classList.add('opacity-0'), 2800);
    }
  }
  updateObjectiveHUD();
}

function updateObjectiveHUD() {
  const remainingHere = enemies.filter(e => e.roomId === currentRoomId).length;
  const totalEnemies = enemies.length;
  if (sectorIdxEl) sectorIdxEl.innerText = String(currentRoomId + 1).padStart(2, '0');

  if (!objectiveText) return;

  if (totalEnemies === 0 && !gameWon) {
    gameWon = true;
    const winOverlay = document.getElementById('win-overlay');
    if (winOverlay) winOverlay.classList.remove('hidden');
    if (document.pointerLockElement) document.exitPointerLock();
  }

  if (remainingHere > 0) {
    objectiveText.innerText = `${remainingHere} here`;
    const nearest = enemies.find(e => e.roomId === currentRoomId);
    if (nearest) waypointGroup.position.set(nearest.pos.x, 3.2, nearest.pos.z);
  } else if (totalEnemies > 0) {
    objectiveText.innerText = `${totalEnemies} remaining`;
    const uncleared = rooms.find(r => !r.cleared && enemies.some(e => e.roomId === r.id));
    if (uncleared) {
      waypointGroup.position.set(
        (uncleared.minX + uncleared.maxX) / 2, 2.5,
        (uncleared.minZ + uncleared.maxZ) / 2
      );
    }
  } else {
    objectiveText.innerText = 'all clear';
  }
}

function activateShield() {
  if (shieldActive || shieldCooldown > 0) return;
  shieldActive = true;
  shieldTimer = SHIELD_DURATION;
  const overlay = document.getElementById('shield-overlay');
  if (overlay) overlay.classList.remove('opacity-0');
}

function updateShield(dt) {
  if (shieldActive) {
    shieldTimer -= dt;
    if (shieldTimer <= 0) {
      shieldActive = false;
      shieldTimer = 0;
      shieldCooldown = SHIELD_COOLDOWN;
      const overlay = document.getElementById('shield-overlay');
      if (overlay) overlay.classList.add('opacity-0');
    }
  } else if (shieldCooldown > 0) {
    shieldCooldown = Math.max(0, shieldCooldown - dt);
  }
  const arc = document.getElementById('shield-arc');
  if (arc) {
    const circ = 113.1;
    if (shieldActive) {
      arc.setAttribute('stroke', '#22d3ee');
      arc.setAttribute('stroke-dashoffset', '0');
    } else {
      const ratio = shieldCooldown / SHIELD_COOLDOWN;
      arc.setAttribute('stroke-dashoffset', String(circ * ratio));
      arc.setAttribute('stroke', ratio > 0 ? '#164e63' : '#06b6d4');
    }
  }
}

// Mini-Radar Compass Rendering
function renderRadar() {
  if (!radarCtx || !radarCanvas) return;
  radarCtx.fillStyle = '#05070a';
  radarCtx.fillRect(0, 0, 64, 64);

  // Radar Grid concentric rings
  radarCtx.strokeStyle = '#1e293b';
  radarCtx.lineWidth = 1;
  radarCtx.beginPath();
  radarCtx.arc(32, 32, 14, 0, Math.PI * 2);
  radarCtx.arc(32, 32, 28, 0, Math.PI * 2);
  radarCtx.stroke();

  // Crosshairs
  radarCtx.strokeStyle = '#1e293b';
  radarCtx.beginPath();
  radarCtx.moveTo(32, 4); radarCtx.lineTo(32, 60);
  radarCtx.moveTo(4, 32); radarCtx.lineTo(60, 32);
  radarCtx.stroke();

  const pX = playerRig.position.x;
  const pZ = playerRig.position.z;
  const pRotY = playerRig.rotation.y;
  const radarScale = 0.95; // World units to radar pixels

  function worldToRadar(wx, wz) {
    const dx = wx - pX;
    const dz = wz - pZ;
    const cos = Math.cos(-pRotY);
    const sin = Math.sin(-pRotY);
    const rx = dx * cos - dz * sin;
    const ry = dx * sin + dz * cos;
    return {
      x: Math.min(59, Math.max(5, 32 + rx * radarScale)),
      y: Math.min(59, Math.max(5, 32 + ry * radarScale))
    };
  }

  // Draw Blast Doors on Radar
  blastDoors.forEach(d => {
    const rPos = worldToRadar(0, d.zPos);
    radarCtx.fillStyle = d.isBreached ? '#10b981' : '#f97316';
    radarCtx.fillRect(rPos.x - 3, rPos.y - 1, 6, 2);
  });

  // Draw Enemies
  enemies.forEach(e => {
    const rPos = worldToRadar(e.pos.x, e.pos.z);
    radarCtx.fillStyle = '#ef4444';
    radarCtx.beginPath();
    radarCtx.arc(rPos.x, rPos.y, 2, 0, Math.PI * 2);
    radarCtx.fill();
  });

  // Draw Waypoint Beacon on Radar
  const wpR = worldToRadar(waypointGroup.position.x, waypointGroup.position.z);
  radarCtx.fillStyle = '#2dd4bf';
  radarCtx.beginPath();
  radarCtx.arc(wpR.x, wpR.y, 3, 0, Math.PI * 2);
  radarCtx.fill();

  // Draw Player Arrow at Center
  radarCtx.fillStyle = '#ffffff';
  radarCtx.beginPath();
  radarCtx.moveTo(32, 27);
  radarCtx.lineTo(29, 36);
  radarCtx.lineTo(35, 36);
  radarCtx.closePath();
  radarCtx.fill();
}

function triggerFire() {
  if (!gameStarted || isPaused || isReloading) return;

  // STRICT: Zero ammo means dry-fire click only
  if (ammo <= 0) {
    sound.playDryFire();
    addCameraTrauma(0.12);
    dryFireBanner.classList.remove('opacity-0');
    setTimeout(() => dryFireBanner.classList.add('opacity-0'), 650);
    return;
  }

  ammo--;
  updateAmmoUI();
  isFiring = true;
  fireTimer = 0;

  sound.playShotgunBlast();
  addCameraTrauma(0.78);

  muzzleFlashGroup.visible = true;
  muzzleFlashGroup.rotation.z = Math.random() * Math.PI * 2;

  // 7-Ray Hitscan Fan (8.5 deg spread)
  const spreadDeg = 8.5 * (Math.PI / 180);
  const halfSpread = spreadDeg / 2;
  const rayCount = 7;
  const camQuat = new THREE.Quaternion();
  camera.getWorldQuaternion(camQuat);
  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);

  for (let i = 0; i < rayCount; i++) {
    const t = (i / (rayCount - 1));
    const yawOffset = -halfSpread + t * spreadDeg;
    const pitchOffset = (Math.random() - 0.5) * 0.04;

    const rayDir = new THREE.Vector3(0, 0, -1);
    rayDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yawOffset);
    rayDir.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitchOffset);
    rayDir.applyQuaternion(camQuat);

    let hitPoint = new THREE.Vector3().copy(camPos).addScaledVector(rayDir, 45.0);
    let hitSomething = false;

    // Check Destructible Blast Doors (Can blast them open!)
    for (let dIdx = 0; dIdx < blastDoors.length; dIdx++) {
      const door = blastDoors[dIdx];
      if (door.isBreached) continue;

      // Ray plane intersection at door.zPos
      const dz = door.zPos - camPos.z;
      if (rayDir.z !== 0 && (dz / rayDir.z) > 0) {
        const t = dz / rayDir.z;
        if (t < 44.0) {
          const impactX = camPos.x + rayDir.x * t;
          const impactY = camPos.y + rayDir.y * t;
          if (impactX >= -2.4 && impactX <= 2.4 && impactY >= 0.1 && impactY <= 5.2) {
            hitPoint = new THREE.Vector3(impactX, impactY, door.zPos);
            hitSomething = true;

            door.hp--;
            sound.playShatter(1.6);
            addCameraTrauma(0.35);

            door.lockCore.material = flashWhiteMat;
            setTimeout(() => {
              door.lockCore.material = new THREE.MeshBasicMaterial({ color: 0xf97316, fog: false });
            }, 80);

            if (door.hp <= 0) {
              door.isBreached = true;
              door.collider.disabled = true;
              sound.playGateOpen();
              triggerPillowSplosion(new THREE.Vector3(0, 2.5, door.zPos), [0x27272a, 0xea580c, 0xf97316, 0xffffff], false);
              scene.remove(door.group);
            }
            updateObjectiveHUD();
            break;
          }
        }
      }
    }

    // Check Enemy Guards
    if (!hitSomething) {
      for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
        const ent = enemies[eIdx];
        const ePos = ent.pos;
        const toTarget = new THREE.Vector3().subVectors(ePos, camPos);
        const projDist = toTarget.dot(rayDir);

        if (projDist > 0 && projDist < 44.0) {
          const closest = new THREE.Vector3().copy(camPos).addScaledVector(rayDir, projDist);
          if (closest.distanceTo(ePos) <= ent.size * 0.72) {
            hitPoint = closest;
            hitSomething = true;

            // Shielded Ward Front Plate Check
            let damageDealt = true;
            if (ent.type === 'shielded') {
              const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), ent.trueYaw);
              const rayImpactAngle = forward.dot(rayDir.clone().negate());
              if (rayImpactAngle > 0.65) {
                damageDealt = false;
                sound.playShellPing();
                addCameraTrauma(0.2);
                ent.hitFlashTimer = 0.05;
              }
            }

            if (damageDealt) {
              ent.hp--;
              ent.pos.addScaledVector(rayDir, 0.45);
              ent.hitFlashTimer = 0.08;
              ent.origMaterials.forEach(item => { item.mesh.material = flashWhiteMat; });

              // Shotgun hit cancels enemy attack into stagger
              if (ent.isTelegraphing) {
                ent.isTelegraphing = false;
                ent.telegraphOct.visible = false;
                ent.isStaggered = true;
                ent.staggerTimer = 0.85;
                ent.attackCooldown = 1.6;
              }

              if (ent.hp <= 0) {
                let pal = [0xef4444, 0xfca5a5, 0x7f1d1d, 0xffffff];
                if (ent.type === 'patrol') pal = [0x10b981, 0x34d399, 0x064e3b, 0xffffff];
                if (ent.type === 'shielded') pal = [0xa855f7, 0xd8b4fe, 0x581c87, 0xffffff];

                triggerPillowSplosion(ent.pos.clone(), pal, true);
                spawnKillMark(ent.pos.clone(), pal);
                scene.remove(ent.group);
                const savedRoomId = ent.roomId;
                enemies.splice(eIdx, 1);
                checkRoomClearance(savedRoomId);
              }
            }
            break;
          }
        }
      }
    }

    // Check Breakable Scenery Props
    if (!hitSomething) {
      for (let pIdx = breakables.length - 1; pIdx >= 0; pIdx--) {
        const prop = breakables[pIdx];
        if (!prop || prop.hp <= 0) continue;

        const toProp = new THREE.Vector3().subVectors(prop.pos, camPos);
        const projDist = toProp.dot(rayDir);

        if (projDist > 0 && projDist < 44.0) {
          const closest = new THREE.Vector3().copy(camPos).addScaledVector(rayDir, projDist);
          if (closest.distanceTo(prop.pos) <= prop.size * 0.75) {
            hitPoint = closest;
            hitSomething = true;
            prop.hp--;
            if (prop.hp <= 0) {
              triggerPillowSplosion(prop.pos.clone(), prop.palette, false);
              scene.remove(prop.group);
              breakables.splice(pIdx, 1);
              propsShatteredCount++;
              document.getElementById('props-shattered').innerText = propsShatteredCount;
            }
            break;
          }
        }
      }
    }

    const muzzleWorld = new THREE.Vector3();
    muzzleFlashGroup.getWorldPosition(muzzleWorld);
    createPelletTracer(muzzleWorld, hitPoint);
  }
}

function updateWeaponChoreography(dt) {
  let targetX = 0.18;
  let targetY = -0.22;
  let targetZ = -0.32;
  let rotX = 0;
  let rotY = 0;
  let rotZ = 0;
  let hingeRotX = 0;

  if (isFiring) {
    fireTimer += dt;
    if (fireTimer < 0.12) {
      const kick = 1.0 - (fireTimer / 0.12);
      targetZ += 0.14 * kick;
      targetY += 0.04 * kick;
      rotX = 0.38 * kick;
      rotZ = -0.05 * kick;
      muzzleFlashGroup.visible = (fireTimer < 0.05);
    } else if (fireTimer < FIRE_DURATION) {
      muzzleFlashGroup.visible = false;
    } else {
      isFiring = false;
      fireTimer = 0;
      muzzleFlashGroup.visible = false;
    }
  }

  if (isReloading) {
    reloadTimer += dt;
    const progress = reloadTimer / RELOAD_DURATION;

    if (progress < 0.24) {
      const p = progress / 0.24;
      targetX = THREE.MathUtils.lerp(0.18, -0.12, p);
      targetY = THREE.MathUtils.lerp(-0.22, -0.30, p);
      rotZ = THREE.MathUtils.lerp(0, 0.42, p);
      rotX = THREE.MathUtils.lerp(0, -0.28, p);
      rotY = THREE.MathUtils.lerp(0, 0.25, p);
      hingeRotX = THREE.MathUtils.lerp(0, 0.78, p);
    } else if (progress < 0.38) {
      targetX = -0.12;
      targetY = -0.30;
      rotZ = 0.42;
      rotX = -0.28;
      rotY = 0.25;
      hingeRotX = 0.78;

      if (!shellsPopped) {
        shellsPopped = true;
        spawnSpentCartridge(0);
        setTimeout(() => spawnSpentCartridge(1), 50);
        reloadState.innerText = "ejecting...";
      }
    } else if (progress < 0.75) {
      targetX = -0.12;
      targetY = -0.30;
      rotZ = 0.42;
      rotX = -0.28;
      rotY = 0.25;
      hingeRotX = 0.78;

      if (!shellsInserted && progress > 0.52) {
        shellsInserted = true;
        sound.playShellInsert();
        setTimeout(() => sound.playShellInsert(), 120);
        reloadState.innerText = "loading...";
      }
    } else if (progress < 0.92) {
      const p = (progress - 0.75) / 0.17;
      hingeRotX = THREE.MathUtils.lerp(0.78, 0.0, p);
      targetX = -0.12;
      targetY = -0.30;
      rotZ = 0.42;
      rotX = -0.28;
      rotY = 0.25;

      if (!breechClosed && p > 0.8) {
        breechClosed = true;
        sound.playBreechClose();
        reloadState.innerText = "closed";
      }
    } else if (progress < 1.0) {
      const p = (progress - 0.92) / 0.08;
      targetX = THREE.MathUtils.lerp(-0.12, 0.18, p);
      targetY = THREE.MathUtils.lerp(-0.30, -0.22, p);
      rotZ = THREE.MathUtils.lerp(0.42, 0, p);
      rotX = THREE.MathUtils.lerp(-0.28, 0, p);
      rotY = THREE.MathUtils.lerp(0.25, 0, p);
      hingeRotX = 0;
    } else {
      isReloading = false;
      reloadTimer = 0;
      ammo = 2;
      updateAmmoUI();
      reloadState.innerText = "ready";
    }
  }

  shotgunRoot.position.set(targetX, targetY, targetZ);
  shotgunRoot.rotation.set(rotX, rotY, rotZ);
  barrelHinge.rotation.x = hingeRotX;
}

const keys = { w: false, a: false, s: false, d: false, space: false };
let isPointerLocked = false;
let playerYVel = 0;
let isGrounded = true;

const pauseOverlay = document.getElementById('pause-overlay');
const startOverlay = document.getElementById('start-overlay');
const startBtn = document.getElementById('start-btn');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');
const deathRestartBtn = document.getElementById('death-restart-btn');
const pauseBtn = document.getElementById('pause-btn');

function togglePause(force = null) {
  if (!gameStarted) return;
  isPaused = (force !== null) ? force : !isPaused;
  if (isPaused) {
    if (pauseOverlay) pauseOverlay.classList.remove('hidden');
    if (document.pointerLockElement === canvas) document.exitPointerLock();
    const hint = document.getElementById('desktop-hint');
    if (hint) hint.style.display = '';
  } else {
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    if (!isMobileUser) canvas.requestPointerLock();
  }
}

if (pauseBtn) pauseBtn.addEventListener('click', () => togglePause(true));
if (resumeBtn) resumeBtn.addEventListener('click', () => togglePause(false));
if (restartBtn) restartBtn.addEventListener('click', () => window.location.reload());
if (deathRestartBtn) deathRestartBtn.addEventListener('click', () => window.location.reload());
const winRestartBtn = document.getElementById('win-restart-btn');
if (winRestartBtn) winRestartBtn.addEventListener('click', () => window.location.reload());

function performJump() {
  if (!isGrounded || !gameStarted || isPaused) return;
  playerYVel = 7.5;
  isGrounded = false;
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.code === 'Escape') {
    togglePause();
    return;
  }
  if (!gameStarted || isPaused) return;

  const k = e.key.toLowerCase();
  if (k === 'w') keys.w = true;
  if (k === 'a') keys.a = true;
  if (k === 's') keys.s = true;
  if (k === 'd') keys.d = true;
  if (e.code === 'Space') performJump();
  if (k === 'r') triggerManualReload();
  if (k === 'q') activateShield();
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w') keys.w = false;
  if (k === 'a') keys.a = false;
  if (k === 's') keys.s = false;
  if (k === 'd') keys.d = false;
});

if (startBtn) {
  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    sound.init();
    gameStarted = true;
    isPaused = false;
    if (startOverlay) startOverlay.classList.add('hidden');
    if (!isMobileUser) canvas.requestPointerLock();
    setTimeout(() => {
      const hint = document.getElementById('desktop-hint');
      if (hint) hint.style.display = 'none';
    }, 10000);
  });
}

document.addEventListener('pointerlockchange', () => {
  isPointerLocked = (document.pointerLockElement === canvas);
});

window.addEventListener('mousemove', (e) => {
  if (!isPointerLocked || !gameStarted || isPaused) return;
  const sens = 0.0022;
  playerRig.rotation.y -= e.movementX * sens;
  pitchRig.rotation.x -= e.movementY * sens;
  const maxPitch = Math.PI * 0.44;
  pitchRig.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, pitchRig.rotation.x));
});

window.addEventListener('mousedown', (e) => {
  if (!isPointerLocked || !gameStarted || isPaused) return;
  if (e.button === 0) {
    triggerFire();
  } else if (e.button === 2) {
    triggerManualReload();
  }
});

// Mobile Virtual Touch
let isMobileUser = false;
const touchStickBase = document.getElementById('touch-stick-base');
const touchStickHead = document.getElementById('touch-stick-head');
const btnTouchJump = document.getElementById('btn-touch-jump');
const btnTouchReload = document.getElementById('btn-touch-reload');

btnTouchJump.addEventListener('touchstart', (e) => { e.preventDefault(); performJump(); });
btnTouchReload.addEventListener('touchstart', (e) => { e.preventDefault(); triggerManualReload(); });

let moveTouchId = null;
let moveStartPos = { x: 0, y: 0 };
let moveVector = { x: 0, y: 0 };

let aimTouchId = null;
let aimLastPos = { x: 0, y: 0 };
let aimStartTime = 0;
let aimStartPos = { x: 0, y: 0 };

let shieldTouchId = null;
let shieldTouchStart = { x: 0, y: 0, time: 0 };

window.addEventListener('touchstart', (e) => {
  isMobileUser = true;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    if (t.clientY < window.innerHeight * 0.18 &&
        t.clientX > window.innerWidth * 0.25 &&
        t.clientX < window.innerWidth * 0.75) {
      if (gameStarted) { togglePause(); return; }
    }
  }

  if (!gameStarted || isPaused) return;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    const screenW = window.innerWidth;
    const screenHalf = screenW / 2;
    const centerMin = screenW * 0.35;
    const centerMax = screenW * 0.65;

    if (t.clientX >= centerMin && t.clientX <= centerMax && shieldTouchId === null) {
      shieldTouchId = t.identifier;
      shieldTouchStart = { x: t.clientX, y: t.clientY, time: performance.now() };
    } else if (t.clientX < screenHalf && moveTouchId === null) {
      moveTouchId = t.identifier;
      moveStartPos = { x: t.clientX, y: t.clientY };
      moveVector = { x: 0, y: 0 };

      touchStickBase.style.left = `${t.clientX}px`;
      touchStickBase.style.top = `${t.clientY}px`;
      touchStickHead.style.left = `${t.clientX}px`;
      touchStickHead.style.top = `${t.clientY}px`;
      touchStickBase.classList.remove('opacity-0');
      touchStickHead.classList.remove('opacity-0');
    } else if (t.clientX >= screenHalf && aimTouchId === null) {
      aimTouchId = t.identifier;
      aimLastPos = { x: t.clientX, y: t.clientY };
      aimStartPos = { x: t.clientX, y: t.clientY };
      aimStartTime = performance.now();
    }
  }
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (!gameStarted || isPaused) return;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];

    if (t.identifier === moveTouchId) {
      const dx = t.clientX - moveStartPos.x;
      const dy = t.clientY - moveStartPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxRadius = 42;

      if (dist > 0) {
        const clamped = Math.min(dist, maxRadius);
        moveVector.x = (dx / dist) * (clamped / maxRadius);
        moveVector.y = (dy / dist) * (clamped / maxRadius);
      }

      touchStickHead.style.left = `${moveStartPos.x + moveVector.x * maxRadius}px`;
      touchStickHead.style.top = `${moveStartPos.y + moveVector.y * maxRadius}px`;
    } else if (t.identifier === aimTouchId) {
      const dx = t.clientX - aimLastPos.x;
      const dy = t.clientY - aimLastPos.y;
      aimLastPos = { x: t.clientX, y: t.clientY };

      const sens = 0.0042;
      playerRig.rotation.y -= dx * sens;
      pitchRig.rotation.x -= dy * sens;
      const maxPitch = Math.PI * 0.44;
      pitchRig.rotation.x = Math.max(-maxPitch, Math.min(maxPitch, pitchRig.rotation.x));
    }
  }
}, { passive: false });

window.addEventListener('touchend', (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];

    if (t.identifier === shieldTouchId) {
      const dur = performance.now() - shieldTouchStart.time;
      const dx = t.clientX - shieldTouchStart.x;
      const dy = t.clientY - shieldTouchStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dur < 300 && dist < 25) activateShield();
      shieldTouchId = null;
    } else if (t.identifier === moveTouchId) {
      moveTouchId = null;
      moveVector = { x: 0, y: 0 };
      touchStickBase.classList.add('opacity-0');
      touchStickHead.classList.add('opacity-0');
    } else if (t.identifier === aimTouchId) {
      const dur = performance.now() - aimStartTime;
      const totalDy = t.clientY - aimStartPos.y;
      const totalDx = t.clientX - aimStartPos.x;
      const dist = Math.sqrt(totalDx * totalDx + totalDy * totalDy);

      if (totalDy > 40 && Math.abs(totalDx) < 60) {
        triggerManualReload();
      } else if (dur < 260 && dist < 20) {
        triggerFire();
      }
      aimTouchId = null;
    }
  }
});

// 2D AABB Wall Sliding Physics
function checkWallCollision(px, pz, radius = 0.52) {
  for (let i = 0; i < wallColliders.length; i++) {
    const w = wallColliders[i];
    if (w.isDoor && w.disabled) continue;

    if (px + radius > w.minX && px - radius < w.maxX &&
        pz + radius > w.minZ && pz - radius < w.maxZ) {
      return true;
    }
  }
  return false;
}

function updatePlayer(dt) {
  const moveSpeed = 6.2;
  const moveDir = new THREE.Vector3();

  if (keys.w) moveDir.z -= 1;
  if (keys.s) moveDir.z += 1;
  if (keys.a) moveDir.x -= 1;
  if (keys.d) moveDir.x += 1;

  if (moveVector.x !== 0 || moveVector.y !== 0) {
    moveDir.x += moveVector.x;
    moveDir.z += moveVector.y;
  }

  if (moveDir.lengthSq() > 0) {
    if (moveDir.length() > 1) moveDir.normalize();
    moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRig.rotation.y);

    const deltaX = moveDir.x * moveSpeed * dt;
    const deltaZ = moveDir.z * moveSpeed * dt;

    // Slide along X
    if (!checkWallCollision(playerRig.position.x + deltaX, playerRig.position.z)) {
      playerRig.position.x += deltaX;
    }
    // Slide along Z
    if (!checkWallCollision(playerRig.position.x, playerRig.position.z + deltaZ)) {
      playerRig.position.z += deltaZ;
    }
  }

  // Vertical Gravity & Jump
  playerYVel -= 22.0 * dt;
  playerRig.position.y += playerYVel * dt;
  if (playerRig.position.y <= 1.6) {
    playerRig.position.y = 1.6;
    playerYVel = 0;
    isGrounded = true;
  }

  // Determine Current Room (2D bounds check)
  const pxR = playerRig.position.x, pzR = playerRig.position.z;
  for (let i = 0; i < rooms.length; i++) {
    if (pxR >= rooms[i].minX && pxR <= rooms[i].maxX &&
        pzR >= rooms[i].minZ && pzR <= rooms[i].maxZ) {
      if (currentRoomId !== rooms[i].id) {
        currentRoomId = rooms[i].id;
        document.getElementById('room-name').innerText = rooms[i].name;
        const statusEl = document.getElementById('room-status');
        if (rooms[i].cleared) {
          statusEl.innerText = 'clear';
          statusEl.className = 'px-1.5 py-0.5 bg-emerald-950/80 border border-emerald-600 text-emerald-400 font-bold text-[10px] rounded tracking-wide';
        } else {
          statusEl.innerText = 'hostile';
          statusEl.className = 'px-1.5 py-0.5 bg-red-950/80 border border-red-600 text-red-400 font-bold text-[10px] rounded tracking-wide';
        }
        updateObjectiveHUD();
      }
      break;
    }
  }
}

function updateEnemies(dt, totalTime) {
  const steppedT = Math.floor(totalTime * ANIM_FPS) / ANIM_FPS;

  // Animate Waypoint Beacon
  waypointGroup.rotation.y = steppedT * 3.5;
  wpOuter.rotation.x = steppedT * 2.0;
  wpRing.rotation.z = steppedT * 1.5;

  // Pulse Blast Door Lock Cores
  for (let d = 0; d < blastDoors.length; d++) {
    const door = blastDoors[d];
    if (!door.isBreached) {
      door.lockCore.rotation.y = steppedT * 4.0;
    }
  }

  for (let i = 0; i < enemies.length; i++) {
    const ent = enemies[i];

    if (ent.hitFlashTimer > 0) {
      ent.hitFlashTimer -= dt;
      if (ent.hitFlashTimer <= 0) {
        ent.origMaterials.forEach(item => { item.mesh.material = item.mat; });
      }
    }

    // Recover from shotgun stagger
    if (ent.isStaggered) {
      ent.staggerTimer -= dt;
      if (ent.staggerTimer <= 0) {
        ent.isStaggered = false;
      }
      continue;
    }

    const dx = playerRig.position.x - ent.pos.x;
    const dz = playerRig.position.z - ent.pos.z;
    const distToPlayer = Math.sqrt(dx * dx + dz * dz);
    const playerInSameRoom = (currentRoomId === ent.roomId);

    // 2.5D stepped yaw formula: angleToCam + round((trueYaw - angleToCam) / (pi/4)) * (pi/4)
    const angleToCam = Math.atan2(playerRig.position.x - ent.pos.x, playerRig.position.z - ent.pos.z);
    const steppedAngle = angleToCam + Math.round((ent.trueYaw - angleToCam) / (Math.PI / 4)) * (Math.PI / 4);
    ent.group.rotation.y = steppedAngle;

    // Floating Bobbing
    ent.group.position.y = 1.2 + Math.sin(steppedT * 2.8 + i) * 0.18;

    if (ent.frontShieldGroup) {
      ent.frontShieldGroup.rotation.z = steppedT * 1.5;
    }

    // TACTICAL BEHAVIORS:
    // 1. Sentry: Stationary, charges telegraphed attack when player is in room
    if (ent.type === 'sentry') {
      ent.trueYaw = angleToCam;
      if (playerInSameRoom && distToPlayer < 24.0) {
        ent.attackCooldown -= dt;
        if (ent.attackCooldown <= 0 && !ent.isTelegraphing) {
          ent.isTelegraphing = true;
          ent.telegraphTimer = 0;
          ent.telegraphOct.visible = true;
          sound.playEnemyTelegraph();
        }
      }
    }
    // 2. Patrol Construct: Paces waypoints, investigates player if in line of sight
    else if (ent.type === 'patrol') {
      if (playerInSameRoom && distToPlayer < 18.0) {
        ent.trueYaw = angleToCam;
        ent.attackCooldown -= dt;
        if (ent.attackCooldown <= 0 && !ent.isTelegraphing) {
          ent.isTelegraphing = true;
          ent.telegraphTimer = 0;
          ent.telegraphOct.visible = true;
          sound.playEnemyTelegraph();
        }
      } else if (ent.patrolRoute && ent.patrolRoute.length > 0) {
        const wp = ent.patrolRoute[ent.patrolIdx];
        const toWpX = wp.x - ent.pos.x;
        const toWpZ = wp.z - ent.pos.z;
        const wpDist = Math.sqrt(toWpX * toWpX + toWpZ * toWpZ);
        ent.trueYaw = Math.atan2(toWpX, toWpZ);

        if (wpDist > 0.4) {
          ent.pos.x += Math.sin(ent.trueYaw) * 2.2 * dt;
          ent.pos.z += Math.cos(ent.trueYaw) * 2.2 * dt;
        } else {
          ent.patrolIdx = (ent.patrolIdx + 1) % ent.patrolRoute.length;
        }
      }
    }
    // 3. Shielded Ward: Fixed shield facing entrance — must circle-strafe to flank
    else if (ent.type === 'shielded') {
      if (playerInSameRoom && distToPlayer < 26.0) {
        if (distToPlayer > 5.5) {
          ent.pos.x += Math.sin(angleToCam) * 1.5 * dt;
          ent.pos.z += Math.cos(angleToCam) * 1.5 * dt;
        }
        ent.attackCooldown -= dt;
        if (ent.attackCooldown <= 0 && !ent.isTelegraphing) {
          ent.isTelegraphing = true;
          ent.telegraphTimer = 0;
          ent.telegraphOct.visible = true;
          sound.playEnemyTelegraph();
        }
      }
    }

    // Combat Readability: 0.45s telegraph windup with spinning octahedron
    if (ent.isTelegraphing) {
      ent.telegraphTimer += dt;
      ent.telegraphOct.rotation.y = steppedT * 8.0;
      ent.telegraphOct.rotation.x = steppedT * 6.0;

      if (ent.telegraphTimer >= ent.telegraphDuration) {
        ent.isTelegraphing = false;
        ent.telegraphOct.visible = false;
        ent.attackCooldown = 1.4 + Math.random() * 0.6;

        // Fire laser projectile toward player position
        const dir = new THREE.Vector3().subVectors(playerRig.position, ent.pos).normalize();
        spawnEnemyLaserProjectile(ent.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), dir);
      }
    }
  }

  // Update Projectiles
  for (let p = enemyProjectiles.length - 1; p >= 0; p--) {
    const proj = enemyProjectiles[p];
    proj.life -= dt;
    proj.mesh.position.addScaledVector(proj.vel, dt);

    // Check Hit on Player
    const pDist = proj.mesh.position.distanceTo(playerRig.position);
    if (pDist < 0.85) {
      if (shieldActive) {
        scene.remove(proj.mesh);
        enemyProjectiles.splice(p, 1);
        continue;
      }
      sound.playHurt();
      addCameraTrauma(0.85);
      playerHealth = Math.max(0, playerHealth - 35);
      document.getElementById('health-val').innerText = `${playerHealth}%`;
      if (playerHealth <= 30) {
        document.getElementById('health-val').className = 'text-red-500 font-bold text-xs animate-pulse';
      }
      if (playerHealth <= 0) {
        gameStarted = false;
        isPaused = true;
        const deathOverlay = document.getElementById('death-overlay');
        if (deathOverlay) deathOverlay.classList.remove('hidden');
        if (document.pointerLockElement) document.exitPointerLock();
      }
      scene.remove(proj.mesh);
      enemyProjectiles.splice(p, 1);
      continue;
    }

    // Check Obstacle Hit
    if (proj.life <= 0 || checkWallCollision(proj.mesh.position.x, proj.mesh.position.z, 0.2)) {
      scene.remove(proj.mesh);
      enemyProjectiles.splice(p, 1);
    }
  }
}

function updateDebrisAndShells(dt) {
  // Ejected spent shells
  for (let i = spentShells.length - 1; i >= 0; i--) {
    const s = spentShells[i];
    s.life -= dt;
    if (s.life <= 0) {
      scene.remove(s.mesh);
      spentShells.splice(i, 1);
      continue;
    }

    s.vel.y -= 19.5 * dt;
    s.mesh.position.addScaledVector(s.vel, dt);
    s.mesh.rotation.x += s.rotVel.x * dt;
    s.mesh.rotation.y += s.rotVel.y * dt;

    if (s.mesh.position.y < 0.04) {
      s.mesh.position.y = 0.04;
      s.vel.y = -s.vel.y * 0.42;
      s.vel.x *= 0.65;
      s.vel.z *= 0.65;
    }
  }

  // Pillow-splosion debris
  for (let i = debrisList.length - 1; i >= 0; i--) {
    const d = debrisList[i];
    d.life -= dt;
    if (d.life <= 0) {
      scene.remove(d.mesh);
      debrisList.splice(i, 1);
      continue;
    }

    if (d.type === 'wafer') {
      d.vel.x *= Math.pow(0.15, dt);
      d.vel.z *= Math.pow(0.15, dt);
      d.vel.y -= 2.8 * dt;
      if (d.vel.y < -0.7) d.vel.y = -0.7;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.rotVel.x * dt;
      d.mesh.rotation.z += d.rotVel.z * dt;
      if (d.mesh.position.y < 0.04) {
        d.mesh.position.y = 0.04;
        d.vel.set(0, 0, 0);
      }
    } else if (d.type === 'voxel') {
      d.vel.y -= 24.0 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.rotVel.x * dt;
      d.mesh.rotation.y += d.rotVel.y * dt;
      if (d.mesh.position.y < 0.08) {
        d.mesh.position.y = 0.08;
        d.vel.y = -d.vel.y * 0.45;
        d.vel.x *= 0.7;
        d.vel.z *= 0.7;
      }
    } else {
      d.vel.y -= 16.0 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.rotVel.x * dt;
      if (d.mesh.position.y < 0.05) {
        d.mesh.position.y = 0.05;
        d.vel.y = -d.vel.y * 0.3;
      }
    }
  }

  // Pellet tracers
  for (let i = tracers.length - 1; i >= 0; i--) {
    const tr = tracers[i];
    tr.life -= dt;
    if (tr.life <= 0) {
      scene.remove(tr.line);
      tr.line.geometry.dispose();
      tr.line.material.dispose();
      tracers.splice(i, 1);
    }
  }
}

let lastTime = performance.now();

function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  const dt = Math.min(0.08, (now - lastTime) / 1000);
  lastTime = now;
  const totalTime = now / 1000;

  // Hitstop freeze frame
  if (hitStopTimer > 0) {
    hitStopTimer -= dt;
    return;
  }

  if (gameStarted && !isPaused) {
    updatePlayer(dt);
    updateWeaponChoreography(dt);
    updateCameraShake(dt);
    updateDebrisAndShells(dt);
    updateEnemies(dt, totalTime);
    updateShield(dt);
    renderRadar();
  }

  // 1. Offscreen Low-Res 360x202 Render Pass
  renderer.setRenderTarget(renderTarget);
  renderer.clear();
  renderer.render(scene, camera);

  // 2. Fullscreen Post-Processing Shader Pass
  renderer.setRenderTarget(null);
  renderer.clear();
  renderer.render(postScene, postCamera);
}

function handleResize() {
  const container = document.getElementById('viewport-container');
  const width = container ? container.clientWidth : window.innerWidth;
  const height = container ? container.clientHeight : window.innerHeight;
  renderer.setSize(width, height);
}
window.addEventListener('resize', handleResize);

window.onload = function () {
  const seed = Date.now() | 0;
  const mapData = generateMap(seed);
  buildScene(mapData);
  basicPopulate(mapData);
  const startRoom = mapData.mapRooms.find(r => r.isStart);
  if (startRoom) {
    playerRig.position.set(startRoom.cx, 1.6, startRoom.maxZ - 2);
    playerRig.rotation.y = 0;
    currentRoomId = mapData.startRoomId;
  }
  handleResize();
  updateAmmoUI();
  updateObjectiveHUD();
  gameLoop(performance.now());
};
