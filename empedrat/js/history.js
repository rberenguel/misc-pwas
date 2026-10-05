// Dirty-rect undo/redo with timelapse snapshot log

const MAX_HISTORY = 64;

export class History {
  constructor() {
    this._stack = [];  // [{layerId, x, y, w, h, before, after}]
    this._future = [];
    this._snapshots = []; // timelapse: ImageBitmap or null
    this._pending = null; // in-progress stroke record
  }

  // Call before a stroke begins
  beginStroke(layer, docW, docH, x = 0, y = 0, w = null, h = null) {
    const sw = w ?? docW;
    const sh = h ?? docH;
    const before = layer.buffer.slice(y * docW + x, (y + sh - 1) * docW + x + sw);
    this._pending = { layerId: layer.id, x, y, w: sw, h: sh, docW, before, after: null };
  }

  // Call after a stroke ends — returns true if layer was modified
  endStroke(layer) {
    if (!this._pending) return false;
    const { x, y, w, h, docW } = this._pending;
    const after = layer.buffer.slice(y * docW + x, (y + h - 1) * docW + x + w);
    const modified = after.some((v, i) => v !== this._pending.before[i]);
    if (modified) {
      this._pending.after = after;
      this._stack.push(this._pending);
      if (this._stack.length > MAX_HISTORY) this._stack.shift();
      this._future = [];
    }
    this._pending = null;
    return modified;
  }

  undo(doc) {
    const entry = this._stack.pop();
    if (!entry) return false;
    this._apply(doc, entry, 'before');
    this._future.push(entry);
    return true;
  }

  redo(doc) {
    const entry = this._future.pop();
    if (!entry) return false;
    this._apply(doc, entry, 'after');
    this._stack.push(entry);
    return true;
  }

  _apply(doc, entry, which) {
    for (const frame of doc.frames) {
      const layer = frame.layers.find(l => l.id === entry.layerId);
      if (!layer) continue;
      const { x, y, w, h, docW } = entry;
      const src = entry[which];
      layer.buffer.set(src, y * docW + x);
      break;
    }
  }

  // Timelapse: capture composite canvas as ImageBitmap after each stroke
  async captureSnapshot(compositeCanvas) {
    try {
      const bmp = await createImageBitmap(compositeCanvas);
      this._snapshots.push(bmp);
    } catch (_) {}
  }

  getSnapshots() {
    return this._snapshots;
  }

  clearSnapshots() {
    for (const bmp of this._snapshots) bmp.close?.();
    this._snapshots = [];
  }

  setSnapshots(bitmaps) {
    this.clearSnapshots();
    this._snapshots = bitmaps;
  }
}
