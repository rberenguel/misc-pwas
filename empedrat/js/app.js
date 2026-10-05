import {
  createDocument, getActiveLayer, getActiveFrame,
  addLayer, removeLayer, moveLayerUp, moveLayerDown,
  colorToHex, hexToColor, packColor, unpackColor,
  serializeDocument, deserializeDocument,
} from './document.js';
import { Renderer } from './renderer.js';
import { pencilStroke, eraserStroke, floodFill, applyDitherGradient, sampleColor } from './tools.js';
import { History } from './history.js';
import { InputHandler } from './input.js';
import { initPalette, loadLospecPng, exportPaletteJSON, exportPalettePNG, importPaletteJSON } from './palette.js';
import { DITHER_PRESETS, shouldDraw } from './dither.js';
import { set as idbSet, get as idbGet } from '../libs/idb-keyval.js';

// --- State ---
let doc = createDocument(64, 64);
initPalette(doc);

let primaryColor = doc.palette[0]; // black
let secondaryColor = doc.palette[1]; // white
let currentTool = 'pencil'; // pencil | eraser | fill | gradient | eyedropper
let ditherPresetIdx = 0;   // 0 = Solid, 1-13 = Bayer8 densities
let brushSize = 1;
let eraserSize = 1;

// Gradient tool transient state
let gradientStart = null;   // {x, y} in doc coords
let gradientPreview = null; // {ax, ay, bx, by}

const renderer = new Renderer(document.getElementById('viewport'));
const history = new History();

let _dirty = false;
function markDirty() { _dirty = true; }
function renderIfDirty() {
  if (!_dirty) return;
  _dirty = false;
  renderer.render(doc, drawOverlay);
}

// --- Resize viewport canvas to window ---
function resizeViewport() {
  const vp = document.getElementById('viewport');
  vp.width = vp.offsetWidth;
  vp.height = vp.offsetHeight;
  renderer.resize(doc.width, doc.height);
  markDirty();
}

// --- Tool callbacks ---
function onStrokeStart(x, y, pressure) {
  if (currentTool === 'eyedropper') {
    onEyedrop(x, y);
    return;
  }

  const layer = getActiveLayer(doc);
  history.beginStroke(layer, doc.width, doc.height);

  if (currentTool === 'pencil') {
    pencilStroke(layer, x, y, x, y, doc.width, doc.height, primaryColor, ditherPresetIdx, brushSize);
    markDirty();
  } else if (currentTool === 'eraser') {
    eraserStroke(layer, x, y, x, y, doc.width, doc.height, eraserSize);
    markDirty();
  } else if (currentTool === 'fill') {
    floodFill(layer, x, y, primaryColor, doc.width, doc.height);
    markDirty();
  } else if (currentTool === 'gradient') {
    gradientStart = { x, y };
  }
}

function onStrokeMove(x0, y0, x1, y1, pressure) {
  if (currentTool === 'eyedropper') {
    onEyedrop(x1, y1);
    return;
  }

  const layer = getActiveLayer(doc);
  if (currentTool === 'pencil') {
    pencilStroke(layer, x0, y0, x1, y1, doc.width, doc.height, primaryColor, ditherPresetIdx, brushSize);
    markDirty();
  } else if (currentTool === 'eraser') {
    eraserStroke(layer, x0, y0, x1, y1, doc.width, doc.height, eraserSize);
    markDirty();
  } else if (currentTool === 'gradient' && gradientStart) {
    gradientPreview = { ax: gradientStart.x, ay: gradientStart.y, bx: x1, by: y1 };
    markDirty();
  }
}

async function onStrokeEnd() {
  const layer = getActiveLayer(doc);

  if (currentTool === 'gradient' && gradientStart && gradientPreview) {
    const stops = [
      { color: primaryColor, pos: 0 },
      { color: secondaryColor, pos: 1 },
    ];
    applyDitherGradient(
      layer, doc.width, doc.height, primaryColor, secondaryColor,
      gradientPreview.ax, gradientPreview.ay,
      gradientPreview.bx, gradientPreview.by,
      ditherPresetIdx
    );
    gradientStart = null;
    gradientPreview = null;
    markDirty();
  }

  const modified = history.endStroke(layer);
  if (modified) {
    await history.captureSnapshot(renderer.getCompositeCanvas(doc));
    saveToIDB();
  }
}

function onEyedrop(x, y) {
  if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return;
  // Force a render pass to ensure composite is current
  renderer.render(doc);
  const color = sampleColor(renderer.getCompositeCanvas(doc), x, y);
  primaryColor = color;
  updateColorUI();
}

// --- Overlay drawing (cursor, gradient preview) ---
function drawOverlay(vctx, r) {
  if (currentTool === 'gradient' && gradientPreview) {
    const { ax, ay, bx, by } = gradientPreview;
    const toVX = dx => r.tx + dx * r.scale + r.scale / 2;
    const toVY = dy => r.ty + dy * r.scale + r.scale / 2;
    vctx.save();
    vctx.strokeStyle = '#fff';
    vctx.lineWidth = 2;
    vctx.setLineDash([4, 4]);
    vctx.beginPath();
    vctx.moveTo(toVX(ax), toVY(ay));
    vctx.lineTo(toVX(bx), toVY(by));
    vctx.stroke();
    vctx.strokeStyle = '#000';
    vctx.setLineDash([4, 4]);
    vctx.lineDashOffset = 4;
    vctx.stroke();
    vctx.restore();
  }
}

// --- Render loop ---
function loop() {
  renderIfDirty();
  requestAnimationFrame(loop);
}

// --- Layer UI ---
function renderLayerPanel() {
  const frame = getActiveFrame(doc);
  const list = document.getElementById('layer-list');
  list.innerHTML = '';

  const layers = [...frame.layers].reverse(); // render top-to-bottom visually
  for (const layer of layers) {
    const el = document.createElement('div');
    el.className = 'layer-item' + (layer.id === doc.activeLayerId ? ' active' : '');

    const vis = document.createElement('button');
    vis.className = 'layer-vis ph-light ' + (layer.visible ? 'ph-eye' : 'ph-eye-slash');
    vis.title = layer.visible ? 'Hide layer' : 'Show layer';
    vis.onclick = (e) => { e.stopPropagation(); layer.visible = !layer.visible; markDirty(); renderLayerPanel(); };

    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = layer.name;
    name.ondblclick = () => {
      const input = document.createElement('input');
      input.value = layer.name;
      input.className = 'layer-name-input';
      name.replaceWith(input);
      input.focus();
      input.select();
      input.onblur = () => { layer.name = input.value || layer.name; renderLayerPanel(); };
      input.onkeydown = e => { if (e.key === 'Enter' || e.key === 'Escape') input.blur(); };
    };

    const opacity = document.createElement('input');
    opacity.type = 'range'; opacity.min = 0; opacity.max = 1; opacity.step = 0.05;
    opacity.value = layer.opacity;
    opacity.className = 'layer-opacity';
    opacity.title = 'Opacity';
    opacity.oninput = () => { layer.opacity = parseFloat(opacity.value); markDirty(); };

    el.appendChild(vis);
    el.appendChild(name);
    el.appendChild(opacity);
    el.onclick = () => { doc.activeLayerId = layer.id; renderLayerPanel(); };
    list.appendChild(el);
  }
}

// --- Tool UI ---
function selectTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
}

// --- Pattern picker ---

function renderPatternPreview(presetIdx) {
  const S = 8;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  const id = ctx.createImageData(S, S);
  const out = new Uint32Array(id.data.buffer);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      out[y * S + x] = shouldDraw(x, y, presetIdx) ? 0xff000000 : 0xffffffff;
    }
  }
  ctx.putImageData(id, 0, 0);
  return c;
}

function updatePatternTrigger() {
  const canvas = document.getElementById('pattern-current');
  const ctx = canvas.getContext('2d');
  const id = ctx.createImageData(8, 8);
  const out = new Uint32Array(id.data.buffer);
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++)
      out[y * 8 + x] = shouldDraw(x, y, ditherPresetIdx) ? 0xff000000 : 0xffffffff;
  ctx.putImageData(id, 0, 0);
  document.getElementById('pattern-current-label').textContent = DITHER_PRESETS[ditherPresetIdx].label;
}

function initPatternPicker() {
  const dropdown = document.getElementById('pattern-dropdown');
  DITHER_PRESETS.forEach((preset, idx) => {
    const btn = document.createElement('button');
    btn.className = 'pattern-opt' + (idx === ditherPresetIdx ? ' active' : '');
    btn.title = preset.label;
    btn.dataset.idx = idx;
    btn.appendChild(renderPatternPreview(idx));
    btn.onclick = () => {
      ditherPresetIdx = idx;
      document.querySelectorAll('.pattern-opt').forEach(b =>
        b.classList.toggle('active', +b.dataset.idx === idx));
      updatePatternTrigger();
      dropdown.classList.add('hidden');
    };
    dropdown.appendChild(btn);
  });

  document.getElementById('pattern-trigger').addEventListener('click', () => {
    dropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', e => {
    if (!document.getElementById('pattern-picker').contains(e.target))
      dropdown.classList.add('hidden');
  });

  updatePatternTrigger();
}

// --- Color UI ---
function updateColorUI() {
  document.getElementById('primary-swatch').style.background = colorToHex(primaryColor);
  document.getElementById('secondary-swatch').style.background = colorToHex(secondaryColor);
  scheduleSessionSave();
}

function renderPaletteSwatches() {
  const grid = document.getElementById('palette-grid');
  grid.innerHTML = '';
  const used = doc.palette.length;
  const total = Math.ceil((used + 1) / 8) * 8;
  for (let i = 0; i < total; i++) {
    const c = i < used ? doc.palette[i] : 0;
    const swatch = document.createElement('button');
    swatch.className = 'palette-swatch' + (c === 0 ? ' empty' : '');
    swatch.style.background = c ? colorToHex(c) : '';
    swatch.title = c ? colorToHex(c) : 'Empty — click to add primary color';
    if (c) {
      swatch.onclick = (e) => {
        if (e.shiftKey) { secondaryColor = c; } else { primaryColor = c; }
        updateColorUI();
      };
      swatch.ondblclick = (e) => { e.preventDefault(); openColorPicker(i, doc.palette[i]); };
      swatch.oncontextmenu = (e) => { e.preventDefault(); secondaryColor = c; updateColorUI(); };
    } else {
      swatch.onclick = () => {
        doc.palette.push(primaryColor);
        renderPaletteSwatches();
        saveToIDB();
      };
    }
    grid.appendChild(swatch);
  }
}

// --- Color picker panel ---
let pickerTarget = 'primary'; // 'primary' | 'secondary' | palette index
function openColorPicker(target, initialColor) {
  pickerTarget = target;
  const panel = document.getElementById('color-picker-panel');
  panel.classList.remove('hidden');
  const hex = colorToHex(initialColor);
  document.getElementById('cp-hex').value = hex.replace('#', '');
  const { r, g, b } = unpackColor(initialColor);
  document.getElementById('cp-r').value = r;
  document.getElementById('cp-g').value = g;
  document.getElementById('cp-b').value = b;
  updatePickerPreview(r, g, b);
}

function updatePickerPreview(r, g, b) {
  document.getElementById('cp-preview').style.background = `rgb(${r},${g},${b})`;
}

function applyPickerColor() {
  const r = parseInt(document.getElementById('cp-r').value) || 0;
  const g = parseInt(document.getElementById('cp-g').value) || 0;
  const b = parseInt(document.getElementById('cp-b').value) || 0;
  const color = packColor(r, g, b, 255);
  if (pickerTarget === 'primary') {
    primaryColor = color;
    updateColorUI();
  } else if (pickerTarget === 'secondary') {
    secondaryColor = color;
    updateColorUI();
  } else if (typeof pickerTarget === 'number') {
    doc.palette[pickerTarget] = color;
    renderPaletteSwatches();
    saveToIDB();
  }
  document.getElementById('color-picker-panel').classList.add('hidden');
}

// --- Save / Load ---
async function saveToIDB() {
  try {
    await idbSet('empedrat-doc', await serializeDocument(doc, history.getSnapshots()));
  } catch (_) {}
}

let _sessionSaveTimer = null;
function scheduleSessionSave() {
  clearTimeout(_sessionSaveTimer);
  _sessionSaveTimer = setTimeout(() => {
    _sessionSaveTimer = null;
    idbSet('empedrat-session', {
      primaryColor, secondaryColor,
      refTx, refTy, refScale, hasRef: !!refImage,
    }).catch(() => {});
  }, 300);
}

async function saveRefImageToIDB() {
  if (!refImage) return;
  try {
    const c = document.createElement('canvas');
    c.width = refImage.naturalWidth; c.height = refImage.naturalHeight;
    c.getContext('2d').drawImage(refImage, 0, 0);
    await idbSet('empedrat-ref', c.toDataURL('image/jpeg', 0.9));
  } catch (_) {}
}

async function loadFromIDB() {
  try {
    const json = await idbGet('empedrat-doc');
    if (json) {
      const { doc: loadedDoc, snapshots } = await deserializeDocument(json);
      doc = loadedDoc;
      history.setSnapshots(snapshots);
      renderer.resize(doc.width, doc.height);
      renderer.fitToView(doc.width, doc.height);
      renderLayerPanel();
      renderPaletteSwatches();
      markDirty();
    }
    const session = await idbGet('empedrat-session');
    if (session) {
      primaryColor   = session.primaryColor   ?? primaryColor;
      secondaryColor = session.secondaryColor ?? secondaryColor;
      updateColorUI();
    }
    const refDataUrl = await idbGet('empedrat-ref');
    if (refDataUrl && session?.hasRef) {
      const img = new Image();
      img.onload = () => {
        refImage = img;
        refTx    = session.refTx    ?? 0;
        refTy    = session.refTy    ?? 0;
        refScale = session.refScale ?? 1;
        renderRefCanvas();
        document.getElementById('ref-panel').classList.remove('hidden');
      };
      img.src = refDataUrl;
    }
  } catch (_) {}
}

function exportPNG(scale = 8) {
  // Force a full render first
  renderer.render(doc);
  const src = renderer.getCompositeCanvas(doc);
  const out = document.createElement('canvas');
  out.width = doc.width * scale;
  out.height = doc.height * scale;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, out.width, out.height);
  out.toBlob(blob => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'empedrat.png';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

async function exportProject() {
  const bytes = await serializeDocument(doc, history.getSnapshots());
  const blob = new Blob([bytes], { type: 'application/zip' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'empedrat.empedrat';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function exportTimelapse(frameDelay = 33) {
  const snapshots = history.getSnapshots();
  if (!snapshots.length) { alert('No timelapse frames captured yet.'); return; }
  if (!HTMLCanvasElement.prototype.captureStream) {
    alert('Timelapse export requires canvas.captureStream(), not supported in this browser.');
    return;
  }
  const scale = 4;
  const w = snapshots[0].width * scale;
  const h = snapshots[0].height * scale;
  const offscreen = document.createElement('canvas');
  offscreen.width = w; offscreen.height = h;
  const ctx = offscreen.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const stream = offscreen.captureStream(30);
  const mimeType = ['video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) || 'video/webm';
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks = [];
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
  const origTitle = document.title;
  document.title = `Exporting timelapse (${snapshots.length} frames)…`;
  recorder.start(100);
  await new Promise(r => setTimeout(r, 100));
  for (const bmp of snapshots) {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    await new Promise(r => setTimeout(r, frameDelay));
  }
  recorder.stop();
  await new Promise(r => { recorder.onstop = r; });
  document.title = origTitle;
  const blob = new Blob(chunks, { type: 'video/webm' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'empedrat-timelapse.webm';
  a.click();
  URL.revokeObjectURL(a.href);
}

// --- Timelapse preview ---
let tlSnaps = [], tlFrame = 0, tlPlaying = false, tlDelay = 80, tlTimer = null;

function openTimelapsePanel() {
  tlSnaps = history.getSnapshots();
  if (!tlSnaps.length) { alert('No timelapse frames yet.'); return; }
  tlPlaying = false;
  clearTimeout(tlTimer);
  tlFrame = 0;
  const canvas = document.getElementById('tl-canvas');
  canvas.width  = tlSnaps[0].width;
  canvas.height = tlSnaps[0].height;
  const scrub = document.getElementById('tl-scrub');
  scrub.max = tlSnaps.length - 1;
  scrub.value = 0;
  tlDrawFrame();
  tlUpdatePlayUI();
  document.getElementById('timelapse-panel').classList.remove('hidden');
}

function tlDrawFrame() {
  const canvas = document.getElementById('tl-canvas');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tlSnaps[tlFrame], 0, 0);
  document.getElementById('tl-scrub').value = tlFrame;
  document.getElementById('tl-frame-counter').textContent = `${tlFrame + 1}/${tlSnaps.length}`;
}

function tlUpdatePlayUI() {
  document.getElementById('tl-play-icon').className =
    tlPlaying ? 'ph-light ph-pause' : 'ph-light ph-play';
}

function tlTick() {
  if (!tlPlaying || !tlSnaps.length) return;
  tlFrame = (tlFrame + 1) % tlSnaps.length;
  tlDrawFrame();
  tlTimer = setTimeout(tlTick, tlDelay);
}

function setupTimelapsePanel() {
  const panel  = document.getElementById('timelapse-panel');
  const header = document.getElementById('tl-header');

  let drag = false, dsx, dsy, dsl, dst;
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    e.stopPropagation();
    const rect = panel.getBoundingClientRect();
    panel.style.transform = 'none';
    panel.style.left = rect.left + 'px';
    panel.style.top  = rect.top  + 'px';
    drag = true; dsx = e.clientX; dsy = e.clientY; dsl = rect.left; dst = rect.top;
    header.setPointerCapture(e.pointerId);
  });
  header.addEventListener('pointermove', e => {
    if (!drag) return;
    panel.style.left = (dsl + e.clientX - dsx) + 'px';
    panel.style.top  = (dst + e.clientY - dsy) + 'px';
  });
  header.addEventListener('pointerup', () => { drag = false; });

  document.getElementById('btn-close-tl').addEventListener('click', () => {
    tlPlaying = false; clearTimeout(tlTimer); tlUpdatePlayUI();
    panel.classList.add('hidden');
  });

  document.getElementById('tl-btn-play').addEventListener('click', () => {
    tlPlaying = !tlPlaying;
    tlUpdatePlayUI();
    if (tlPlaying) { clearTimeout(tlTimer); tlTimer = setTimeout(tlTick, tlDelay); }
    else clearTimeout(tlTimer);
  });

  document.getElementById('tl-scrub').addEventListener('input', e => {
    tlFrame = parseInt(e.target.value);
    tlDrawFrame();
  });

  document.getElementById('tl-speed').addEventListener('input', e => {
    tlDelay = parseInt(e.target.value);
    document.getElementById('tl-speed-val').textContent = `${tlDelay}ms`;
  });

  document.getElementById('tl-btn-export').addEventListener('click', () => {
    exportTimelapse(tlDelay);
  });
}

async function importProject(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const { doc: loadedDoc, snapshots } = await deserializeDocument(data);
  doc = loadedDoc;
  history.setSnapshots(snapshots);
  renderer.resize(doc.width, doc.height);
  renderer.fitToView(doc.width, doc.height);
  renderLayerPanel();
  renderPaletteSwatches();
  markDirty();
  saveToIDB();
}

// --- Resize doc ---
function resizeDoc(w, h) {
  // Naive: create new layers at new size (no copy for now — will improve)
  const newDoc = createDocument(w, h);
  newDoc.palette = doc.palette;
  // Copy what fits
  const frame = getActiveFrame(doc);
  const newFrame = getActiveFrame(newDoc);
  newFrame.layers = [];
  for (const layer of frame.layers) {
    const newLayer = { ...layer, buffer: new Uint32Array(w * h) };
    const copyW = Math.min(doc.width, w);
    const copyH = Math.min(doc.height, h);
    for (let y = 0; y < copyH; y++) {
      for (let x = 0; x < copyW; x++) {
        newLayer.buffer[y * w + x] = layer.buffer[y * doc.width + x];
      }
    }
    newFrame.layers.push(newLayer);
  }
  newDoc.activeLayerId = newFrame.layers[0]?.id ?? '';
  doc = newDoc;
  renderer.resize(w, h);
  renderer.fitToView(w, h);
  renderLayerPanel();
  markDirty();
  saveToIDB();
}

// --- New document ---
function newDoc(w, h) {
  history.clearSnapshots();
  doc = createDocument(w, h);
  initPalette(doc);
  primaryColor = doc.palette[0];
  secondaryColor = doc.palette[1];
  renderer.resize(w, h);
  renderer.fitToView(w, h);
  renderLayerPanel();
  renderPaletteSwatches();
  markDirty();
  saveToIDB();
}

// --- Reference image ---
let refImage = null;
let refTx = 0, refTy = 0, refScale = 1;

function _refXY(canvas, e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) * canvas.width  / r.width,
    y: (e.clientY - r.top)  * canvas.height / r.height,
  };
}

function loadRefImage(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    refImage = img;
    URL.revokeObjectURL(url);
    const canvas = document.getElementById('ref-canvas');
    const w = canvas.offsetWidth || 240;
    const h = canvas.offsetHeight || 200;
    refScale = Math.min(w / img.width, h / img.height);
    refTx = (w - img.width  * refScale) / 2;
    refTy = (h - img.height * refScale) / 2;
    renderRefCanvas();
    document.getElementById('ref-panel').classList.remove('hidden');
    saveRefImageToIDB();
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}

function renderRefCanvas() {
  if (!refImage) return;
  const canvas = document.getElementById('ref-canvas');
  const w = canvas.offsetWidth || 240;
  const h = canvas.offsetHeight || 200;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(refTx, refTy);
  ctx.scale(refScale, refScale);
  ctx.drawImage(refImage, 0, 0);
  ctx.restore();
  scheduleSessionSave();
}

function sampleFromRef(e) {
  const canvas = document.getElementById('ref-canvas');
  const { x, y } = _refXY(canvas, e);
  const d = canvas.getContext('2d').getImageData(Math.round(x), Math.round(y), 1, 1).data;
  if (d[3] === 0) return;
  primaryColor = packColor(d[0], d[1], d[2], 255);
  updateColorUI();
}

function setupRefPanel() {
  const panel  = document.getElementById('ref-panel');
  const header = document.getElementById('ref-header');
  const canvas = document.getElementById('ref-canvas');

  // Panel drag via header
  let panelDrag = false, pdSx, pdSy, pdSl, pdSt;
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    e.stopPropagation();
    panelDrag = true;
    pdSx = e.clientX; pdSy = e.clientY;
    pdSl = panel.offsetLeft; pdSt = panel.offsetTop;
    header.setPointerCapture(e.pointerId);
  });
  header.addEventListener('pointermove', e => {
    if (!panelDrag) return;
    panel.style.left = (pdSl + e.clientX - pdSx) + 'px';
    panel.style.top  = (pdSt + e.clientY - pdSy) + 'px';
  });
  header.addEventListener('pointerup', () => { panelDrag = false; });

  document.getElementById('btn-close-ref').addEventListener('click', () => {
    panel.classList.add('hidden');
  });

  // Internal pan/zoom + long-press eyedrop
  const REF_LONG_MS = 250;
  const REF_DRIFT_PX = 3;
  const refPtrs = new Map();
  let refDragging = false;
  let refLongTimer = null;
  let refLongStart = null;
  let refPrevPinch = null;

  canvas.addEventListener('pointerdown', e => {
    e.stopPropagation();
    canvas.setPointerCapture(e.pointerId);
    refPtrs.set(e.pointerId, _refXY(canvas, e));
    if (refPtrs.size >= 2 && refLongTimer) {
      clearTimeout(refLongTimer); refLongTimer = null;
    }
    if (refPtrs.size === 1) {
      refDragging = false;
      refLongStart = { cx: e.clientX, cy: e.clientY, e };
      refLongTimer = setTimeout(() => {
        refLongTimer = null;
        if (!refDragging) sampleFromRef(refLongStart.e);
      }, REF_LONG_MS);
    }
  });

  canvas.addEventListener('pointermove', e => {
    if (!refPtrs.has(e.pointerId)) return;
    e.stopPropagation();
    const pos  = _refXY(canvas, e);
    const prev = refPtrs.get(e.pointerId);
    refPtrs.set(e.pointerId, pos);

    if (refLongTimer && refLongStart) {
      const dx = e.clientX - refLongStart.cx;
      const dy = e.clientY - refLongStart.cy;
      if (Math.hypot(dx, dy) > REF_DRIFT_PX) {
        clearTimeout(refLongTimer); refLongTimer = null;
        refDragging = true;
      }
    }

    if (refPtrs.size >= 2) {
      const pts = Array.from(refPtrs.values());
      const [a, b] = pts;
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      if (refPrevPinch) {
        const dScale = dist / refPrevPinch.dist;
        const newScale = Math.max(0.05, Math.min(20, refScale * dScale));
        refTx = midX - (midX - refTx) * (newScale / refScale) + (midX - refPrevPinch.mx);
        refTy = midY - (midY - refTy) * (newScale / refScale) + (midY - refPrevPinch.my);
        refScale = newScale;
        renderRefCanvas();
      }
      refPrevPinch = { mx: midX, my: midY, dist };
    } else if (refDragging) {
      refTx += pos.x - prev.x;
      refTy += pos.y - prev.y;
      renderRefCanvas();
    }
  });

  const _refPointerEnd = e => {
    e.stopPropagation();
    if (refLongTimer) { clearTimeout(refLongTimer); refLongTimer = null; }
    refPtrs.delete(e.pointerId);
    refPrevPinch = null;
    if (refPtrs.size === 0) refDragging = false;
  };
  canvas.addEventListener('pointerup',     _refPointerEnd);
  canvas.addEventListener('pointercancel', _refPointerEnd);

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    e.stopPropagation();
    const { x: cx, y: cy } = _refXY(canvas, e);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.max(0.05, Math.min(20, refScale * factor));
    refTx = cx - (cx - refTx) * (newScale / refScale);
    refTy = cy - (cy - refTy) * (newScale / refScale);
    refScale = newScale;
    renderRefCanvas();
  }, { passive: false });

  new ResizeObserver(() => renderRefCanvas()).observe(panel);
}

// --- Init ---
export function init() {
  resizeViewport();
  window.addEventListener('resize', () => { resizeViewport(); });

  const input = new InputHandler(
    document.getElementById('viewport'),
    renderer,
    {
      onStrokeStart,
      onStrokeMove,
      onStrokeEnd,
      onEyedrop,
      onPanZoom: () => markDirty(),
    }
  );

  // Tool buttons
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => selectTool(btn.dataset.tool));
  });

  // Pattern picker
  initPatternPicker();

  // Brush size
  document.getElementById('brush-size').addEventListener('input', e => {
    brushSize = parseInt(e.target.value) || 1;
    document.getElementById('brush-size-val').textContent = brushSize;
  });

  // Eraser size
  document.getElementById('eraser-size').addEventListener('input', e => {
    eraserSize = parseInt(e.target.value) || 1;
    document.getElementById('eraser-size-val').textContent = eraserSize;
  });

  // Layer controls
  document.getElementById('btn-add-layer').addEventListener('click', () => {
    addLayer(doc);
    renderLayerPanel();
  });
  document.getElementById('btn-del-layer').addEventListener('click', () => {
    removeLayer(doc, doc.activeLayerId);
    renderLayerPanel();
    markDirty();
  });
  document.getElementById('btn-layer-up').addEventListener('click', () => {
    moveLayerUp(doc, doc.activeLayerId);
    renderLayerPanel();
    markDirty();
  });
  document.getElementById('btn-layer-down').addEventListener('click', () => {
    moveLayerDown(doc, doc.activeLayerId);
    renderLayerPanel();
    markDirty();
  });

  // Color swatches
  document.getElementById('primary-swatch').addEventListener('click', () => {
    openColorPicker('primary', primaryColor);
  });
  document.getElementById('secondary-swatch').addEventListener('click', () => {
    openColorPicker('secondary', secondaryColor);
  });
  document.getElementById('swap-colors').addEventListener('click', () => {
    [primaryColor, secondaryColor] = [secondaryColor, primaryColor];
    updateColorUI();
  });

  // Color picker panel
  ['cp-r','cp-g','cp-b'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      const r = parseInt(document.getElementById('cp-r').value) || 0;
      const g = parseInt(document.getElementById('cp-g').value) || 0;
      const b = parseInt(document.getElementById('cp-b').value) || 0;
      document.getElementById('cp-hex').value =
        [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
      updatePickerPreview(r, g, b);
    });
  });
  document.getElementById('cp-hex').addEventListener('input', e => {
    const hex = e.target.value.replace(/[^0-9a-fA-F]/g,'').slice(0,6);
    if (hex.length === 6) {
      const v = parseInt(hex, 16);
      document.getElementById('cp-r').value = (v >> 16) & 0xff;
      document.getElementById('cp-g').value = (v >> 8) & 0xff;
      document.getElementById('cp-b').value = v & 0xff;
      updatePickerPreview((v>>16)&0xff, (v>>8)&0xff, v&0xff);
    }
  });
  document.getElementById('cp-apply').addEventListener('click', applyPickerColor);
  document.getElementById('cp-cancel').addEventListener('click', () => {
    document.getElementById('color-picker-panel').classList.add('hidden');
  });

  // Reference image
  setupRefPanel();
  document.getElementById('btn-load-ref').addEventListener('click', () => {
    document.getElementById('file-ref').click();
  });
  document.getElementById('file-ref').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) loadRefImage(f);
    e.target.value = '';
  });

  // Export/Import buttons
  document.getElementById('btn-export-png').addEventListener('click', () => {
    const scale = parseInt(prompt('Export scale (1-20)?', '8')) || 8;
    exportPNG(Math.max(1, Math.min(20, scale)));
  });
  document.getElementById('btn-export-project').addEventListener('click', exportProject);
  document.getElementById('btn-import-project').addEventListener('click', () => {
    document.getElementById('file-import').click();
  });
  document.getElementById('file-import').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) importProject(f);
    e.target.value = '';
  });

  // Palette import/export
  document.getElementById('btn-palette-export-json').addEventListener('click', () => exportPaletteJSON(doc.palette));
  document.getElementById('btn-palette-export-png').addEventListener('click', () => exportPalettePNG(doc.palette));
  document.getElementById('btn-palette-import').addEventListener('click', () => {
    document.getElementById('file-palette').click();
  });
  document.getElementById('file-palette').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    let colors;
    if (f.name.endsWith('.png')) {
      colors = await loadLospecPng(f);
    } else {
      colors = await importPaletteJSON(f);
    }
    doc.palette = colors.filter(c => c !== 0);
    renderPaletteSwatches();
    e.target.value = '';
  });

  // Resize / New doc modal
  document.getElementById('btn-new').addEventListener('click', () => {
    const dim = prompt('New document (WxH)?', `${doc.width}x${doc.height}`);
    if (!dim) return;
    const [w, h] = dim.split('x').map(Number);
    if (w > 0 && h > 0) newDoc(w, h);
  });
  document.getElementById('btn-resize').addEventListener('click', () => {
    const dim = prompt('Resize canvas (WxH)?', `${doc.width}x${doc.height}`);
    if (!dim) return;
    const [w, h] = dim.split('x').map(Number);
    if (w > 0 && h > 0) resizeDoc(w, h);
  });

  // Zoom controls
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    renderer.scale = Math.min(64, renderer.scale + 1);
    markDirty();
  });
  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    renderer.scale = Math.max(1, renderer.scale - 1);
    markDirty();
  });
  document.getElementById('btn-zoom-fit').addEventListener('click', () => {
    renderer.fitToView(doc.width, doc.height);
    markDirty();
  });

  // Undo / Redo
  document.getElementById('btn-undo').addEventListener('click', () => {
    if (history.undo(doc)) markDirty();
  });
  document.getElementById('btn-redo').addEventListener('click', () => {
    if (history.redo(doc)) markDirty();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    const key = e.key.toLowerCase();
    if (key === 'p') selectTool('pencil');
    else if (key === 'e') selectTool('eraser');
    else if (key === 'f') selectTool('fill');
    else if (key === 'g') selectTool('gradient');
    else if (key === 'i') selectTool('eyedropper');
    else if (key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault(); if (history.undo(doc)) markDirty();
    } else if ((key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
               (key === 'y' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault(); if (history.redo(doc)) markDirty();
    } else if (key === '+' || key === '=') {
      renderer.scale = Math.min(64, renderer.scale + 1); markDirty();
    } else if (key === '-') {
      renderer.scale = Math.max(1, renderer.scale - 1); markDirty();
    } else if (key === '0') {
      renderer.fitToView(doc.width, doc.height); markDirty();
    } else if (key === 'm') {
      document.getElementById('app').classList.toggle('sidebar-collapsed');
    }
  });

  // Mobile toggles
  document.getElementById('toggle-toolbar').addEventListener('click', () => {
    const app = document.getElementById('app');
    const collapsed = app.classList.toggle('toolbar-collapsed');
    document.getElementById('toggle-toolbar-icon').className = `ph-light ${collapsed ? 'ph-caret-down' : 'ph-caret-up'}`;
  });
  function toggleSidebar() {
    document.getElementById('app').classList.toggle('sidebar-collapsed');
  }
  document.getElementById('panel-close-btn').addEventListener('click', toggleSidebar);
  document.getElementById('panel-open-tab').addEventListener('click', toggleSidebar);

  // Timelapse preview + export
  setupTimelapsePanel();
  document.getElementById('btn-timelapse').addEventListener('click', openTimelapsePanel);

  // Palette add/clear
  document.getElementById('btn-palette-clear').addEventListener('click', () => {
    if (!confirm('Clear all palette colors?')) return;
    doc.palette = [];
    renderPaletteSwatches();
    saveToIDB();
  });

  // Initial render
  renderer.resize(doc.width, doc.height);
  renderer.fitToView(doc.width, doc.height);
  renderLayerPanel();
  renderPaletteSwatches();
  updateColorUI();
  markDirty();

  // Load saved state
  loadFromIDB();

  // Register SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  loop();
}
