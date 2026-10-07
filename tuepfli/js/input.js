// PointerEvent-based input: draw, pan/zoom, long-press eyedropper

const LONG_PRESS_MS = 250;
const LONG_PRESS_DRIFT_PX = 3;
const TAP_MAX_MS = 350;
const TAP_DRIFT_PX = 10;

export class InputHandler {
  constructor(canvas, renderer, callbacks) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.cb = callbacks;
    // {onStrokeStart, onStrokeMove, onStrokeEnd, onStrokeCancel, onEyedrop, onPanZoom}

    this._pointers = new Map(); // pointerId -> {x, y}
    this._drawing = false;
    this._lastDoc = null;  // last doc-space coord for interpolation
    this._longPressTimer = null;
    this._longPressStart = null;
    this._tapMaxPointers = 0;
    this._tapDrifted = false;
    this._tapStartTime = null;
    this._tapDownPos = new Map();

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

    if (this._pointers.size === 0) {
      this._tapMaxPointers = 0;
      this._tapDrifted = false;
      this._tapStartTime = performance.now();
      this._tapDownPos = new Map();
    }

    this._pointers.set(e.pointerId, pos);
    this._tapDownPos.set(e.pointerId, pos);
    this._tapMaxPointers = Math.max(this._tapMaxPointers, this._pointers.size);

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
    } else if (this._pointers.size === 2 && this._drawing) {
      // Second finger arrived — cancel the in-progress single-finger stroke
      this._cancelLongPress();
      this._drawing = false;
      this.cb.onStrokeCancel?.();
    }
  }

  _onMove(e) {
    e.preventDefault();
    if (!this._pointers.has(e.pointerId)) return;
    const pos = this._canvasXY(e);

    if (!this._tapDrifted && this._tapDownPos.has(e.pointerId)) {
      const dp = this._tapDownPos.get(e.pointerId);
      if (Math.hypot(pos.x - dp.x, pos.y - dp.y) > TAP_DRIFT_PX) this._tapDrifted = true;
    }

    this._pointers.set(e.pointerId, pos);

    if (this._pointers.size >= 2) {
      if (this._drawing) {
        // Safety net: second finger moved before its _onDown was processed
        this._cancelLongPress();
        this._drawing = false;
        this.cb.onStrokeCancel?.();
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

    if (this._pointers.size === 0 && this._tapStartTime != null) {
      const elapsed = performance.now() - this._tapStartTime;
      if (!this._tapDrifted && elapsed < TAP_MAX_MS) {
        if (this._tapMaxPointers === 2) this.cb.onUndo?.();
        else if (this._tapMaxPointers === 3) this.cb.onRedo?.();
      }
      this._tapStartTime = null;
    }
  }

  _handlePanZoom() {
    const pts = Array.from(this._pointers.values());
    if (pts.length < 2) return;

    const [a, b] = pts;
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);

    if (this._prevPinch) {
      const dx = midX - this._prevPinch.mx;
      const dy = midY - this._prevPinch.my;
      const dScale = dist / this._prevPinch.dist;
      const dAngle = angle - this._prevPinch.angle;

      const r = this.renderer;

      // Rotate the doc around the pinch midpoint
      if (Math.abs(dAngle) > 0.0005) {
        const docCx = r.tx + r.docW * r.scale / 2;
        const docCy = r.ty + r.docH * r.scale / 2;
        const relX = docCx - midX;
        const relY = docCy - midY;
        const cos = Math.cos(dAngle);
        const sin = Math.sin(dAngle);
        r.tx = midX + relX * cos - relY * sin - r.docW * r.scale / 2;
        r.ty = midY + relX * sin + relY * cos - r.docH * r.scale / 2;
        r.angle += dAngle;
        // Snap to nearest 45°
        const snap45 = Math.PI / 4;
        const nearest = Math.round(r.angle / snap45) * snap45;
        if (Math.abs(r.angle - nearest) < 0.15) r.angle = nearest;
      }

      // Pan: follow the midpoint
      r.tx += dx;
      r.ty += dy;

      // Zoom: scale continuously around pinch midpoint
      const newScale = Math.max(1, Math.min(64, r.scale * dScale));
      r.tx = midX - (midX - r.tx) * (newScale / r.scale);
      r.ty = midY - (midY - r.ty) * (newScale / r.scale);
      r.scale = newScale;
    }
    this._prevPinch = { mx: midX, my: midY, dist, angle };
    this.cb.onPanZoom?.();
  }

  _onWheel(e) {
    e.preventDefault();
    const r = this.renderer;
    let dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 24; // lines → pixels
    if (e.deltaMode === 2) dy *= 400; // pages → pixels
    const factor = Math.pow(0.998, dy);
    const newScale = Math.max(1, Math.min(64, r.scale * factor));
    if (newScale === r.scale) return;
    const { x: cx, y: cy } = this._canvasXY(e);
    r.tx = cx - (cx - r.tx) * (newScale / r.scale);
    r.ty = cy - (cy - r.ty) * (newScale / r.scale);
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
