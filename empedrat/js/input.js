// PointerEvent-based input: draw, pan/zoom, long-press eyedropper

const LONG_PRESS_MS = 250;
const LONG_PRESS_DRIFT_PX = 3;

export class InputHandler {
  constructor(canvas, renderer, callbacks) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.cb = callbacks;
    // {onStrokeStart, onStrokeMove, onStrokeEnd, onEyedrop, onPanZoom}

    this._pointers = new Map(); // pointerId -> {x, y}
    this._drawing = false;
    this._lastDoc = null;  // last doc-space coord for interpolation
    this._longPressTimer = null;
    this._longPressStart = null;

    canvas.addEventListener('pointerdown', this._onDown.bind(this));
    canvas.addEventListener('pointermove', this._onMove.bind(this));
    canvas.addEventListener('pointerup',   this._onUp.bind(this));
    canvas.addEventListener('pointercancel', this._onUp.bind(this));
    canvas.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
  }

  _canvasXY(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _onDown(e) {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    const pos = this._canvasXY(e);
    this._pointers.set(e.pointerId, pos);

    if (this._pointers.size === 1) {
      const docPt = this.renderer.viewToDoc(pos.x, pos.y);
      this._longPressStart = { vx: e.clientX, vy: e.clientY, docPt };
      this._longPressTimer = setTimeout(() => {
        this._longPressTimer = null;
        this.cb.onEyedrop?.(docPt.x, docPt.y);
      }, LONG_PRESS_MS);

      this._drawing = false;
      this._lastDoc = docPt;
      this.cb.onStrokeStart?.(docPt.x, docPt.y, e.pressure ?? 1);
      this._drawing = true;
    }
  }

  _onMove(e) {
    e.preventDefault();
    if (!this._pointers.has(e.pointerId)) return;
    const pos = this._canvasXY(e);
    this._pointers.set(e.pointerId, pos);

    if (this._pointers.size >= 2) {
      if (this._drawing) {
        this._cancelLongPress();
        this._drawing = false;
        this.cb.onStrokeEnd?.();
      }
      this._handlePanZoom();
      return;
    }

    if (this._longPressTimer && this._longPressStart) {
      const dx = e.clientX - this._longPressStart.vx;
      const dy = e.clientY - this._longPressStart.vy;
      if (Math.hypot(dx, dy) > LONG_PRESS_DRIFT_PX) this._cancelLongPress();
    }

    if (this._drawing) {
      const docPt = this.renderer.viewToDoc(pos.x, pos.y);
      this.cb.onStrokeMove?.(this._lastDoc.x, this._lastDoc.y, docPt.x, docPt.y, e.pressure ?? 1);
      this._lastDoc = docPt;
    }
  }

  _onUp(e) {
    e.preventDefault();
    this._cancelLongPress();
    this._pointers.delete(e.pointerId);

    if (this._drawing && this._pointers.size === 0) {
      this._drawing = false;
      this.cb.onStrokeEnd?.();
    }
  }

  _handlePanZoom() {
    const pts = Array.from(this._pointers.values());
    if (pts.length < 2) return;

    const [a, b] = pts;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);

    if (this._prevPinch) {
      const dx = midX - this._prevPinch.mx;
      const dy = midY - this._prevPinch.my;
      const dScale = dist / this._prevPinch.dist;

      const r = this.renderer;
      r.tx += dx;
      r.ty += dy;

      const newScale = Math.max(1, Math.min(64, Math.round(r.scale * dScale)));
      if (newScale !== r.scale) {
        r.tx = Math.round(midX - (midX - r.tx) * (newScale / r.scale));
        r.ty = Math.round(midY - (midY - r.ty) * (newScale / r.scale));
        r.scale = newScale;
      } else {
        r.tx = Math.round(r.tx + dx);
        r.ty = Math.round(r.ty + dy);
      }
    }
    this._prevPinch = { mx: midX, my: midY, dist };
    this.cb.onPanZoom?.();
  }

  _onWheel(e) {
    e.preventDefault();
    const r = this.renderer;
    const oldScale = r.scale;
    const newScale = Math.max(1, Math.min(64, oldScale + (e.deltaY < 0 ? 1 : -1)));
    if (newScale === oldScale) return;
    const { x: cx, y: cy } = this._canvasXY(e);
    r.tx = Math.round(cx - (cx - r.tx) * (newScale / oldScale));
    r.ty = Math.round(cy - (cy - r.ty) * (newScale / oldScale));
    r.scale = newScale;
    this.cb.onPanZoom?.();
  }

  _cancelLongPress() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
    this._prevPinch = null;
  }
}
