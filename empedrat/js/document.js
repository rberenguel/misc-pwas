// Colors are 0xAABBGGRR (little-endian, matches ImageData RGBA byte order via Uint32 view)

export function packColor(r, g, b, a = 255) {
  return ((a & 0xff) << 24) | ((b & 0xff) << 16) | ((g & 0xff) << 8) | (r & 0xff);
}

export function unpackColor(c) {
  return {
    r: (c) & 0xff,
    g: (c >>> 8) & 0xff,
    b: (c >>> 16) & 0xff,
    a: (c >>> 24) & 0xff,
  };
}

export function colorToHex(c) {
  const { r, g, b } = unpackColor(c);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function hexToColor(hex, a = 255) {
  const v = parseInt(hex.replace('#', ''), 16);
  return packColor((v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff, a);
}

let _layerId = 0;
let _frameId = 0;

export function createLayer(width, height, name = 'Layer') {
  return {
    id: `layer_${++_layerId}`,
    name,
    visible: true,
    opacity: 1.0,
    blendMode: 'source-over',
    buffer: new Uint32Array(width * height),
  };
}

export function createFrame(width, height) {
  return {
    id: `frame_${++_frameId}`,
    durationMs: 100,
    layers: [createLayer(width, height, 'Layer 1')],
  };
}

export function createDocument(width = 64, height = 64) {
  const frame = createFrame(width, height);
  return {
    width,
    height,
    activeFrameIndex: 0,
    activeLayerId: frame.layers[0].id,
    palette: [],
    frames: [frame],
  };
}

export function getActiveFrame(doc) {
  return doc.frames[doc.activeFrameIndex];
}

export function getActiveLayer(doc) {
  const frame = getActiveFrame(doc);
  return frame.layers.find(l => l.id === doc.activeLayerId) ?? frame.layers[0];
}

export function addLayer(doc) {
  const frame = getActiveFrame(doc);
  const layer = createLayer(doc.width, doc.height, `Layer ${frame.layers.length + 1}`);
  frame.layers.push(layer);
  doc.activeLayerId = layer.id;
  return layer;
}

export function removeLayer(doc, layerId) {
  const frame = getActiveFrame(doc);
  if (frame.layers.length <= 1) return false;
  const idx = frame.layers.findIndex(l => l.id === layerId);
  if (idx === -1) return false;
  frame.layers.splice(idx, 1);
  if (doc.activeLayerId === layerId) {
    doc.activeLayerId = frame.layers[Math.max(0, idx - 1)].id;
  }
  return true;
}

export function moveLayerUp(doc, layerId) {
  const frame = getActiveFrame(doc);
  const idx = frame.layers.findIndex(l => l.id === layerId);
  if (idx < frame.layers.length - 1) {
    [frame.layers[idx], frame.layers[idx + 1]] = [frame.layers[idx + 1], frame.layers[idx]];
  }
}

export function moveLayerDown(doc, layerId) {
  const frame = getActiveFrame(doc);
  const idx = frame.layers.findIndex(l => l.id === layerId);
  if (idx > 0) {
    [frame.layers[idx], frame.layers[idx - 1]] = [frame.layers[idx - 1], frame.layers[idx]];
  }
}

export function resizeDocument(doc, newW, newH) {
  doc.width = newW;
  doc.height = newH;
  for (const frame of doc.frames) {
    for (const layer of frame.layers) {
      const newBuf = new Uint32Array(newW * newH);
      const copyW = Math.min(layer._oldWidth ?? newW, newW);
      const copyH = Math.min(layer._oldHeight ?? newH, newH);
      for (let y = 0; y < copyH; y++) {
        for (let x = 0; x < copyW; x++) {
          newBuf[y * newW + x] = layer.buffer[y * copyW + x];
        }
      }
      layer.buffer = newBuf;
    }
  }
}

// --- Serialization ---

import { zipSync, unzipSync, strToU8, strFromU8 } from '../libs/fflate.esm.js';

export async function serializeDocument(doc, snapshots = []) {
  const meta = {
    version: 1,
    width: doc.width,
    height: doc.height,
    activeFrameIndex: doc.activeFrameIndex,
    activeLayerId: doc.activeLayerId,
    palette: doc.palette.filter(c => c !== 0),
    timelapseFrameCount: snapshots.length,
    frames: doc.frames.map(f => ({
      id: f.id,
      durationMs: f.durationMs,
      layers: f.layers.map(l => ({
        id: l.id, name: l.name, visible: l.visible,
        opacity: l.opacity, blendMode: l.blendMode,
      })),
    })),
  };
  const files = { 'meta.json': strToU8(JSON.stringify(meta)) };
  for (let fi = 0; fi < doc.frames.length; fi++) {
    for (let li = 0; li < doc.frames[fi].layers.length; li++) {
      const layer = doc.frames[fi].layers[li];
      const cv = new OffscreenCanvas(doc.width, doc.height);
      cv.getContext('2d').putImageData(
        new ImageData(new Uint8ClampedArray(layer.buffer.buffer), doc.width, doc.height), 0, 0
      );
      const blob = await cv.convertToBlob({ type: 'image/png' });
      files[`f${fi}/l${li}.png`] = new Uint8Array(await blob.arrayBuffer());
    }
  }
  for (let si = 0; si < snapshots.length; si++) {
    const cv = new OffscreenCanvas(snapshots[si].width, snapshots[si].height);
    cv.getContext('2d').drawImage(snapshots[si], 0, 0);
    const blob = await cv.convertToBlob({ type: 'image/png' });
    files[`tl/${si}.png`] = new Uint8Array(await blob.arrayBuffer());
  }
  // level 0: PNG is already DEFLATE-compressed; re-compressing wastes CPU
  return zipSync(files, { level: 0 });
}

// Returns { doc, snapshots: ImageBitmap[] }
export async function deserializeDocument(data) {
  const src = data instanceof Uint8Array ? data : new Uint8Array(data);
  const files = unzipSync(src);
  const meta = JSON.parse(strFromU8(files['meta.json']));
  const frames = [];
  for (let fi = 0; fi < meta.frames.length; fi++) {
    const fm = meta.frames[fi];
    const layers = [];
    for (let li = 0; li < fm.layers.length; li++) {
      const lm = fm.layers[li];
      const png = files[`f${fi}/l${li}.png`];
      const bmp = await createImageBitmap(new Blob([png], { type: 'image/png' }));
      const cv = new OffscreenCanvas(meta.width, meta.height);
      const ctx = cv.getContext('2d');
      ctx.drawImage(bmp, 0, 0);
      bmp.close();
      layers.push({
        id: lm.id, name: lm.name, visible: lm.visible,
        opacity: lm.opacity, blendMode: lm.blendMode,
        buffer: new Uint32Array(ctx.getImageData(0, 0, meta.width, meta.height).data.buffer),
      });
    }
    frames.push({ id: fm.id, durationMs: fm.durationMs, layers });
  }
  const doc = {
    width: meta.width, height: meta.height,
    activeFrameIndex: meta.activeFrameIndex,
    activeLayerId: meta.activeLayerId,
    palette: Array.from(meta.palette).filter(c => c !== 0),
    frames,
  };
  const tlCount = meta.timelapseFrameCount ?? 0;
  const snapshots = await Promise.all(
    Array.from({ length: tlCount }, (_, i) =>
      createImageBitmap(new Blob([files[`tl/${i}.png`]], { type: 'image/png' }))
    )
  );
  return { doc, snapshots };
}

