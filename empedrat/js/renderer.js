import { getActiveFrame, unpackColor } from './document.js';

export class Renderer {
  constructor(viewportCanvas) {
    this.viewport = viewportCanvas;
    this.vctx = viewportCanvas.getContext('2d');

    this.offscreen = document.createElement('canvas');
    this.octx = this.offscreen.getContext('2d');

    // Camera state
    this.tx = 0;
    this.ty = 0;
    this.scale = 4;

    this._gridCanvas = document.createElement('canvas');
    this._gridCtx = this._gridCanvas.getContext('2d');
    this._gridDirty = true;
  }

  resize(docW, docH) {
    this.offscreen.width = docW;
    this.offscreen.height = docH;
    this._gridDirty = true;
  }

  // Center the document in the viewport
  fitToView(docW, docH) {
    const vw = this.viewport.width;
    const vh = this.viewport.height;
    this.scale = Math.min(Math.floor(vw / docW), Math.floor(vh / docH), 16);
    if (this.scale < 1) this.scale = 1;
    this.tx = Math.round((vw - docW * this.scale) / 2);
    this.ty = Math.round((vh - docH * this.scale) / 2);
  }

  // Convert viewport coords to document pixel coords
  viewToDoc(vx, vy) {
    return {
      x: Math.floor((vx - this.tx) / this.scale),
      y: Math.floor((vy - this.ty) / this.scale),
    };
  }

  render(doc, overlayFn = null) {
    const frame = getActiveFrame(doc);
    const w = doc.width;
    const h = doc.height;

    // Composite all visible layers onto offscreen canvas
    const imageData = this.octx.createImageData(w, h);
    const out = new Uint32Array(imageData.data.buffer);

    for (const layer of frame.layers) {
      if (!layer.visible) continue;
      const alpha = layer.opacity;
      if (alpha === 0) continue;

      for (let i = 0; i < out.length; i++) {
        const src = layer.buffer[i];
        if ((src >>> 24) === 0) continue; // fully transparent

        if (alpha === 1.0 && (out[i] >>> 24) === 0) {
          // Fast path: opaque layer over transparent bg
          out[i] = src;
        } else {
          // Alpha composite: src over dst
          const sa = ((src >>> 24) / 255) * alpha;
          const da = (out[i] >>> 24) / 255;
          const oa = sa + da * (1 - sa);
          if (oa === 0) { out[i] = 0; continue; }
          const sr = (src) & 0xff;
          const sg = (src >>> 8) & 0xff;
          const sb = (src >>> 16) & 0xff;
          const dr = (out[i]) & 0xff;
          const dg = (out[i] >>> 8) & 0xff;
          const db = (out[i] >>> 16) & 0xff;
          const or_ = Math.round((sr * sa + dr * da * (1 - sa)) / oa);
          const og = Math.round((sg * sa + dg * da * (1 - sa)) / oa);
          const ob = Math.round((sb * sa + db * da * (1 - sa)) / oa);
          const oa8 = Math.round(oa * 255);
          out[i] = (oa8 << 24) | (ob << 16) | (og << 8) | or_;
        }
      }
    }

    this.octx.putImageData(imageData, 0, 0);

    // Draw to viewport with scale
    const vctx = this.vctx;
    vctx.clearRect(0, 0, this.viewport.width, this.viewport.height);

    // Checkerboard background for transparency
    this._drawTransparencyBg(w, h);

    vctx.save();
    vctx.translate(this.tx, this.ty);
    vctx.scale(this.scale, this.scale);
    vctx.imageSmoothingEnabled = false;
    vctx.drawImage(this.offscreen, 0, 0);
    vctx.restore();

    // Grid overlay (only when scale >= 4)
    if (this.scale >= 4) this._drawGrid(w, h);

    // Overlay (cursor, selection, gradient preview, etc.)
    if (overlayFn) overlayFn(vctx, this);
  }

  _drawTransparencyBg(w, h) {
    const vctx = this.vctx;
    const s = this.scale;
    const x0 = this.tx;
    const y0 = this.ty;
    const pw = w * s;
    const ph = h * s;
    const cellSize = Math.max(4, s);

    vctx.save();
    for (let y = 0; y < ph; y += cellSize) {
      for (let x = 0; x < pw; x += cellSize) {
        const even = (Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0;
        vctx.fillStyle = even ? '#888' : '#aaa';
        vctx.fillRect(x0 + x, y0 + y, Math.min(cellSize, pw - x), Math.min(cellSize, ph - y));
      }
    }
    vctx.restore();
  }

  _drawGrid(w, h) {
    const vctx = this.vctx;
    const s = this.scale;
    vctx.save();
    vctx.strokeStyle = 'rgba(0,0,0,0.12)';
    vctx.lineWidth = 1;
    vctx.beginPath();
    for (let x = 0; x <= w; x++) {
      const px = this.tx + x * s;
      vctx.moveTo(px + 0.5, this.ty);
      vctx.lineTo(px + 0.5, this.ty + h * s);
    }
    for (let y = 0; y <= h; y++) {
      const py = this.ty + y * s;
      vctx.moveTo(this.tx, py + 0.5);
      vctx.lineTo(this.tx + w * s, py + 0.5);
    }
    vctx.stroke();
    vctx.restore();
  }

  // Returns a canvas with the full composite at 1:1
  getCompositeCanvas(doc) {
    return this.offscreen;
  }
}
