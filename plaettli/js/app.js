import {
  createDocument, getActiveLayer, getActiveFrame,
  addLayer, removeLayer, moveLayerUp, moveLayerDown,
  colorToHex, hexToColor, packColor, unpackColor,
  serializeDocument, deserializeDocument, syncIds,
} from './document.js';
import { Renderer } from './renderer.js';
import { pencilStroke, eraserStroke, floodFill, applyDitherGradient, sampleColor, bresenham, drawRect, drawEllipse } from './tools.js';
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

// Line tool transient state
let lineStart = null;   // {x, y} in doc coords
let linePreview = null; // {x, y} current endpoint

// Rect tool transient state
let rectStart = null;   // {x, y} in doc coords
let rectPreview = null; // {x, y} opposite corner

// Ellipse tool transient state
let ellipseStart = null;
let ellipsePreview = null;

// Shared shape option
let shapeFilled = false;

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
  } else if (currentTool === 'line') {
    lineStart = { x, y };
    linePreview = { x, y };
  } else if (currentTool === 'rect') {
    rectStart = { x, y };
    rectPreview = { x, y };
  } else if (currentTool === 'ellipse') {
    ellipseStart = { x, y };
    ellipsePreview = { x, y };
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
  } else if (currentTool === 'line' && lineStart) {
    linePreview = { x: x1, y: y1 };
    markDirty();
  } else if (currentTool === 'rect' && rectStart) {
    rectPreview = { x: x1, y: y1 };
    markDirty();
  } else if (currentTool === 'ellipse' && ellipseStart) {
    ellipsePreview = { x: x1, y: y1 };
    markDirty();
  }
}

async function onStrokeEnd() {
  const layer = getActiveLayer(doc);

  if (currentTool === 'gradient' && gradientStart && gradientPreview) {
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

  if (currentTool === 'line' && lineStart && linePreview) {
    pencilStroke(layer, lineStart.x, lineStart.y, linePreview.x, linePreview.y,
                 doc.width, doc.height, primaryColor, ditherPresetIdx, brushSize);
    lineStart = null;
    linePreview = null;
    markDirty();
  }

  if (currentTool === 'rect' && rectStart && rectPreview) {
    drawRect(layer, rectStart.x, rectStart.y, rectPreview.x, rectPreview.y,
             doc.width, doc.height, primaryColor, ditherPresetIdx, brushSize, shapeFilled);
    rectStart = null;
    rectPreview = null;
    markDirty();
  }

  if (currentTool === 'ellipse' && ellipseStart && ellipsePreview) {
    drawEllipse(layer, ellipseStart.x, ellipseStart.y, ellipsePreview.x, ellipsePreview.y,
                doc.width, doc.height, primaryColor, ditherPresetIdx, brushSize, shapeFilled);
    ellipseStart = null;
    ellipsePreview = null;
    markDirty();
  }

  const changed = history.endStroke(layer);
  if (changed > 0) {
    refreshLayerThumbs();
    saveToIDB();
    if (changed >= doc.width * doc.height * 0.001) {
      await history.captureSnapshot(renderer.getCompositeCanvas(doc));
    }
  }
}

function onStrokeCancel() {
  // Revert any partial paint from a stroke interrupted by a two-finger gesture
  const layer = getActiveLayer(doc);
  history.cancelStroke(layer);
  // Clear any shape preview state
  gradientStart = null; gradientPreview = null;
  lineStart = null; linePreview = null;
  rectStart = null; rectPreview = null;
  ellipseStart = null; ellipsePreview = null;
  markDirty();
}

function onEyedrop(x, y) {
  if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return;
  // Force a render pass to ensure composite is current
  renderer.render(doc);
  const color = sampleColor(renderer.getCompositeCanvas(doc), x, y);
  primaryColor = color;
  updateColorUI();
}

// --- Overlay drawing (cursor, gradient preview, line preview) ---
// All overlays use r.applyDocTransform(vctx) so coordinates are in doc-pixel * scale space,
// i.e. doc pixel (px,py) lives at (px*scale, py*scale) — rotation handled by the transform.
function drawOverlay(vctx, r) {
  if (currentTool === 'gradient' && gradientPreview) {
    const { ax, ay, bx, by } = gradientPreview;
    const s = r.scale;
    vctx.save();
    r.applyDocTransform(vctx);
    vctx.strokeStyle = '#fff';
    vctx.lineWidth = 2;
    vctx.setLineDash([4, 4]);
    vctx.beginPath();
    vctx.moveTo((ax + 0.5) * s, (ay + 0.5) * s);
    vctx.lineTo((bx + 0.5) * s, (by + 0.5) * s);
    vctx.stroke();
    vctx.strokeStyle = '#000';
    vctx.setLineDash([4, 4]);
    vctx.lineDashOffset = 4;
    vctx.stroke();
    vctx.restore();
  }

  if (currentTool === 'line' && lineStart && linePreview) {
    const s = r.scale;
    const half = Math.floor(brushSize / 2);
    const end = brushSize - half;
    vctx.save();
    r.applyDocTransform(vctx);
    vctx.fillStyle = colorToHex(primaryColor);
    vctx.globalAlpha = 0.85;
    for (const p of bresenham(lineStart.x, lineStart.y, linePreview.x, linePreview.y)) {
      for (let dy = -half; dy < end; dy++) {
        for (let dx = -half; dx < end; dx++) {
          const px = p.x + dx, py = p.y + dy;
          if (px < 0 || py < 0 || px >= doc.width || py >= doc.height) continue;
          if (!shouldDraw(px, py, ditherPresetIdx)) continue;
          vctx.fillRect(px * s, py * s, s, s);
        }
      }
    }
    vctx.restore();
  }

  if (currentTool === 'rect' && rectStart && rectPreview) {
    const s = r.scale;
    const minX = Math.min(rectStart.x, rectPreview.x), maxX = Math.max(rectStart.x, rectPreview.x);
    const minY = Math.min(rectStart.y, rectPreview.y), maxY = Math.max(rectStart.y, rectPreview.y);
    vctx.save();
    r.applyDocTransform(vctx);
    vctx.strokeStyle = colorToHex(primaryColor);
    vctx.fillStyle   = colorToHex(primaryColor);
    vctx.globalAlpha = 0.85;
    if (shapeFilled) {
      vctx.fillRect(minX * s, minY * s, (maxX - minX + 1) * s, (maxY - minY + 1) * s);
    } else {
      vctx.lineWidth = Math.max(1, brushSize * s);
      vctx.strokeRect(
        minX * s + vctx.lineWidth / 2,
        minY * s + vctx.lineWidth / 2,
        (maxX - minX + 1) * s - vctx.lineWidth,
        (maxY - minY + 1) * s - vctx.lineWidth
      );
    }
    vctx.restore();
  }

  if (currentTool === 'ellipse' && ellipseStart && ellipsePreview) {
    const s = r.scale;
    const minX = Math.min(ellipseStart.x, ellipsePreview.x);
    const maxX = Math.max(ellipseStart.x, ellipsePreview.x);
    const minY = Math.min(ellipseStart.y, ellipsePreview.y);
    const maxY = Math.max(ellipseStart.y, ellipsePreview.y);
    const isCircle = Math.abs((maxX - minX) - (maxY - minY)) <= 1;
    const overlayColor = isCircle ? '#00d5ff' : colorToHex(primaryColor);
    const vcx = (minX + maxX + 1) / 2 * s;
    const vcy = (minY + maxY + 1) / 2 * s;
    const vrx = Math.max(0.5, (maxX - minX + 1) / 2 * s);
    const vry = Math.max(0.5, (maxY - minY + 1) / 2 * s);
    vctx.save();
    r.applyDocTransform(vctx);
    vctx.strokeStyle = overlayColor;
    vctx.fillStyle   = overlayColor;
    vctx.globalAlpha = 0.85;
    vctx.beginPath();
    vctx.ellipse(vcx, vcy, vrx, vry, 0, 0, Math.PI * 2);
    if (shapeFilled) {
      vctx.fill();
    } else {
      vctx.lineWidth = Math.max(1, brushSize * s);
      vctx.stroke();
    }
    // Badge: small filled circle beside the bounding box when near-circular
    if (isCircle) {
      const badgeR = Math.max(4, s * 0.7);
      const badgeX = (maxX + 1) * s + badgeR + 3;
      const badgeY = minY * s + badgeR;
      vctx.globalAlpha = 1;
      vctx.fillStyle = '#00d5ff';
      vctx.strokeStyle = '#000';
      vctx.lineWidth = 1.5;
      vctx.beginPath();
      vctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
      vctx.fill();
      vctx.stroke();
    }
    vctx.restore();
  }
}

// --- Render loop ---
function loop() {
  renderIfDirty();
  requestAnimationFrame(loop);
}

// --- Layer thumbnails ---
function renderLayerThumb(canvas, layer, w, h) {
  canvas.width = w;
  canvas.height = h;
  const maxSide = 32;
  const ratio = w / h;
  if (ratio >= 1) {
    canvas.style.width  = maxSide + 'px';
    canvas.style.height = Math.round(maxSide / ratio) + 'px';
  } else {
    canvas.style.height = maxSide + 'px';
    canvas.style.width  = Math.round(maxSide * ratio) + 'px';
  }
  const ctx = canvas.getContext('2d');
  const id  = ctx.createImageData(w, h);
  const out = new Uint32Array(id.data.buffer);
  for (let i = 0; i < out.length; i++) {
    const src = layer.buffer[i];
    const sa  = ((src >>> 24) / 255) * layer.opacity;
    if (sa === 0) { out[i] = 0xffffffff; continue; }
    const r = Math.round((src & 0xff)         * sa + 255 * (1 - sa));
    const g = Math.round(((src >>> 8) & 0xff) * sa + 255 * (1 - sa));
    const b = Math.round(((src >>> 16) & 0xff) * sa + 255 * (1 - sa));
    out[i] = (0xff << 24) | (b << 16) | (g << 8) | r;
  }
  ctx.putImageData(id, 0, 0);
}

function refreshLayerThumbs() {
  const frame = getActiveFrame(doc);
  const layers = [...frame.layers].reverse();
  document.querySelectorAll('#layer-list .layer-thumb').forEach((canvas, i) => {
    if (layers[i]) renderLayerThumb(canvas, layers[i], doc.width, doc.height);
  });
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

    const thumb = document.createElement('canvas');
    thumb.className = 'layer-thumb';
    renderLayerThumb(thumb, layer, doc.width, doc.height);

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

    el.appendChild(thumb);
    el.appendChild(vis);
    el.appendChild(name);
    el.appendChild(opacity);
    el.onclick = () => { doc.activeLayerId = layer.id; renderLayerPanel(); markDirty(); };
    list.appendChild(el);
  }
}

// --- Tool UI ---
function updateShapeFilledUI() {
  const isShape = currentTool === 'rect' || currentTool === 'ellipse';
  ['rect', 'ellipse'].forEach(t => {
    document.querySelector(`[data-tool="${t}"]`)
      ?.classList.toggle('shape-filled', isShape && shapeFilled);
  });
}

function selectTool(tool) {
  if ((tool === 'rect' || tool === 'ellipse') && currentTool === tool) {
    shapeFilled = !shapeFilled;
    updateShapeFilledUI();
    return;
  }
  currentTool = tool;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
  updateShapeFilledUI();
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
  const total = Math.ceil((used + 1) / 4) * 4;
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

// --- Modal dialog ---
let _modalResolve = null;

function showModal({ title, message = '', inputs = [], okLabel = 'OK', danger = false }) {
  return new Promise(resolve => {
    _modalResolve = resolve;
    document.getElementById('modal-title-bar').textContent = title;
    const body = document.getElementById('modal-body-area');
    body.innerHTML = '';
    if (message) {
      const p = document.createElement('p');
      p.textContent = message;
      body.appendChild(p);
    }
    for (const inp of inputs) {
      const row = document.createElement('div');
      row.className = 'modal-row';
      const label = document.createElement('label');
      label.textContent = inp.label;
      const field = document.createElement('input');
      field.type = inp.type || 'text';
      field.value = inp.default ?? '';
      if (inp.min !== undefined) field.min = inp.min;
      if (inp.max !== undefined) field.max = inp.max;
      field.dataset.key = inp.key;
      field.addEventListener('keydown', e => { if (e.key === 'Enter') _modalOk(); });
      row.appendChild(label);
      row.appendChild(field);
      body.appendChild(row);
    }
    const okBtn = document.getElementById('modal-ok-btn');
    okBtn.textContent = okLabel;
    okBtn.className = danger ? 'danger' : '';
    document.getElementById('modal-overlay').classList.remove('hidden');
    setTimeout(() => {
      const first = body.querySelector('input');
      (first ?? okBtn).focus();
      first?.select();
    }, 0);
  });
}

function _modalOk() {
  if (!_modalResolve) return;
  const values = {};
  document.querySelectorAll('#modal-body-area input').forEach(inp => {
    values[inp.dataset.key] = inp.value;
  });
  const resolve = _modalResolve;
  _modalResolve = null;
  document.getElementById('modal-overlay').classList.add('hidden');
  resolve({ ok: true, values });
}

function _modalCancel() {
  if (!_modalResolve) return;
  const resolve = _modalResolve;
  _modalResolve = null;
  document.getElementById('modal-overlay').classList.add('hidden');
  resolve({ ok: false, values: {} });
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
    const pp = document.getElementById('palette-panel');
    const lp = document.getElementById('layers-panel');
    const ppRect = pp.getBoundingClientRect();
    const lpRect = lp.getBoundingClientRect();
    idbSet('empedrat-session', {
      primaryColor, secondaryColor,
      refTx, refTy, refScale, hasRef: !!refImage,
      rotation: renderer.angle,
      palettePanelX: ppRect.left,
      palettePanelY: ppRect.top,
      paletteFolded: pp.classList.contains('folded'),
      layersPanelX: lpRect.left,
      layersPanelY: lpRect.top,
      layersFolded: lp.classList.contains('folded'),
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
      syncIds(doc);
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
      renderer.angle = session.rotation ?? 0;
      updateColorUI();
      const maxX = window.innerWidth  - 40;
      const maxY = window.innerHeight - 40;
      if (session.palettePanelX !== undefined) {
        const pp = document.getElementById('palette-panel');
        pp.style.left  = Math.max(0, Math.min(session.palettePanelX, maxX)) + 'px';
        pp.style.top   = Math.max(0, Math.min(session.palettePanelY, maxY)) + 'px';
        pp.style.right = 'auto';
        if (session.paletteFolded) {
          pp.classList.add('folded');
          document.getElementById('fold-palette-icon').className = 'ph-light ph-caret-down';
        }
      }
      if (session.layersPanelX !== undefined) {
        const lp = document.getElementById('layers-panel');
        lp.style.left  = Math.max(0, Math.min(session.layersPanelX, maxX)) + 'px';
        lp.style.top   = Math.max(0, Math.min(session.layersPanelY, maxY)) + 'px';
        lp.style.right = 'auto';
        if (session.layersFolded) {
          lp.classList.add('folded');
          document.getElementById('fold-layers-icon').className = 'ph-light ph-caret-down';
        }
      }
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
  document.getElementById('palette-panel').style.visibility = '';
  document.getElementById('layers-panel').style.visibility = '';
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

  document.getElementById('tl-btn-clear').addEventListener('click', async () => {
    const { ok } = await showModal({ title: 'Clear Timelapse', message: 'Remove all timelapse frames?', okLabel: 'Clear', danger: true });
    if (!ok) return;
    history.clearSnapshots();
    tlSnaps = [];
    tlPlaying = false;
    clearTimeout(tlTimer);
    panel.classList.add('hidden');
    saveToIDB();
  });
}

async function importProject(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const { doc: loadedDoc, snapshots } = await deserializeDocument(data);
  doc = loadedDoc;
  syncIds(doc);
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
  updateColorUI();
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

function setupPalettePanel() {
  const panel  = document.getElementById('palette-panel');
  const header = document.getElementById('palette-header');
  let drag = false, dsx, dsy, dsl, dst;
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    e.stopPropagation();
    const rect = panel.getBoundingClientRect();
    panel.style.right = 'auto';
    panel.style.left = rect.left + 'px';
    panel.style.top  = rect.top  + 'px';
    drag = true;
    dsx = e.clientX; dsy = e.clientY;
    dsl = rect.left; dst = rect.top;
    header.setPointerCapture(e.pointerId);
  });
  header.addEventListener('pointermove', e => {
    if (!drag) return;
    panel.style.left = (dsl + e.clientX - dsx) + 'px';
    panel.style.top  = (dst + e.clientY - dsy) + 'px';
  });
  header.addEventListener('pointerup', () => { drag = false; scheduleSessionSave(); });
  document.getElementById('btn-fold-palette').addEventListener('click', () => {
    const folded = panel.classList.toggle('folded');
    document.getElementById('fold-palette-icon').className = `ph-light ${folded ? 'ph-caret-down' : 'ph-caret-up'}`;
    scheduleSessionSave();
  });
}

function setupLayersPanel() {
  const panel  = document.getElementById('layers-panel');
  const header = document.getElementById('layers-header');
  let drag = false, dsx, dsy, dsl, dst;
  header.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    e.stopPropagation();
    const rect = panel.getBoundingClientRect();
    panel.style.right = 'auto';
    panel.style.left = rect.left + 'px';
    panel.style.top  = rect.top  + 'px';
    drag = true;
    dsx = e.clientX; dsy = e.clientY;
    dsl = rect.left; dst = rect.top;
    header.setPointerCapture(e.pointerId);
  });
  header.addEventListener('pointermove', e => {
    if (!drag) return;
    panel.style.left = (dsl + e.clientX - dsx) + 'px';
    panel.style.top  = (dst + e.clientY - dsy) + 'px';
  });
  header.addEventListener('pointerup', () => { drag = false; scheduleSessionSave(); });
  document.getElementById('btn-fold-layers').addEventListener('click', () => {
    const folded = panel.classList.toggle('folded');
    document.getElementById('fold-layers-icon').className = `ph-light ${folded ? 'ph-caret-down' : 'ph-caret-up'}`;
    scheduleSessionSave();
  });
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
  new ResizeObserver(() => resizeViewport()).observe(document.getElementById('viewport'));

  const input = new InputHandler(
    document.getElementById('viewport'),
    renderer,
    {
      onStrokeStart,
      onStrokeMove,
      onStrokeEnd,
      onStrokeCancel,
      onEyedrop,
      onPanZoom: () => { markDirty(); scheduleSessionSave(); },
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

  // Palette panel
  setupPalettePanel();

  // Layers panel
  setupLayersPanel();

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
  document.getElementById('btn-export-png').addEventListener('click', async () => {
    const { ok, values } = await showModal({
      title: 'Export PNG',
      inputs: [{ key: 'scale', label: 'Scale', type: 'number', default: '8', min: 1, max: 20 }],
    });
    if (!ok) return;
    exportPNG(Math.max(1, Math.min(20, parseInt(values.scale) || 8)));
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
  document.getElementById('btn-new').addEventListener('click', async () => {
    const { ok, values } = await showModal({
      title: 'New Document',
      inputs: [
        { key: 'w', label: 'Width',  type: 'number', default: String(doc.width),  min: 1, max: 4096 },
        { key: 'h', label: 'Height', type: 'number', default: String(doc.height), min: 1, max: 4096 },
      ],
    });
    if (!ok) return;
    const w = parseInt(values.w), h = parseInt(values.h);
    if (w > 0 && h > 0) newDoc(w, h);
  });
  document.getElementById('btn-resize').addEventListener('click', async () => {
    const { ok, values } = await showModal({
      title: 'Resize Canvas',
      inputs: [
        { key: 'w', label: 'Width',  type: 'number', default: String(doc.width),  min: 1, max: 4096 },
        { key: 'h', label: 'Height', type: 'number', default: String(doc.height), min: 1, max: 4096 },
      ],
    });
    if (!ok) return;
    const w = parseInt(values.w), h = parseInt(values.h);
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
  document.getElementById('btn-reset-rotation').addEventListener('click', () => {
    renderer.angle = 0;
    scheduleSessionSave();
    markDirty();
  });

  // Undo / Redo
  document.getElementById('btn-undo').addEventListener('click', () => {
    if (history.undo(doc)) markDirty();
  });
  document.getElementById('btn-redo').addEventListener('click', () => {
    if (history.redo(doc)) markDirty();
  });

  // Modal buttons
  document.getElementById('modal-ok-btn').addEventListener('click', _modalOk);
  document.getElementById('modal-cancel-btn').addEventListener('click', _modalCancel);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') _modalCancel();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && _modalResolve) { e.preventDefault(); _modalCancel(); return; }
    if (e.target.tagName === 'INPUT') return;
    const key = e.key.toLowerCase();
    if (key === 'p') selectTool('pencil');
    else if (key === 'e') selectTool('eraser');
    else if (key === 'f') selectTool('fill');
    else if (key === 'g') selectTool('gradient');
    else if (key === 'i') selectTool('eyedropper');
    else if (key === 'l') selectTool('line');
    else if (key === 'r' && !e.shiftKey) selectTool('rect');
    else if (key === 'r' && e.shiftKey) { renderer.angle = 0; scheduleSessionSave(); markDirty(); }
    else if (key === 'o') selectTool('ellipse');
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

  // Hamburger menu
  const hamburgerDrop = document.getElementById('hamburger-dropdown');
  document.getElementById('btn-hamburger').addEventListener('click', e => {
    e.stopPropagation();
    hamburgerDrop.classList.toggle('hidden');
  });
  hamburgerDrop.addEventListener('click', () => {
    hamburgerDrop.classList.add('hidden');
  });
  document.addEventListener('click', () => {
    hamburgerDrop.classList.add('hidden');
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
  document.getElementById('btn-palette-clear').addEventListener('click', async () => {
    const { ok } = await showModal({ title: 'Clear Palette', message: 'Remove all palette colors?', okLabel: 'Clear', danger: true });
    if (!ok) return;
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
