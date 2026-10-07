# Session Compaction Summary

## User Intent
- Polish and extend the Tuepfli (formerly Plaettli) pixel art editor
- Improve pan/zoom smoothness and add multi-touch gestures
- Redesign tool system with subtool flyouts and context-sensitive sidebar
- Implement rectangular selection with move, delete, and flip actions

## Contextual Work Summary

### Rename: Plaettli → Tuepfli
- Folder renamed `plaettli/` → `tuepfli/`
- Title, manifest name/short_name, and SW cache key updated throughout

### Touch Gesture: Two/Three-Finger Tap Undo/Redo
- Added tap detection in `input.js`: tracks `_tapMaxPointers`, `_tapDrifted`, `_tapStartTime`, `_tapDownPos`
- Two-finger tap fires `onUndo`, three-finger tap fires `onRedo` (< 350ms, < 10px drift)
- Wired `onUndo`/`onRedo` callbacks in `app.js` InputHandler constructor

### Smooth Pinch/Scroll Zoom
- Removed integer rounding (`Math.round`) and `_pinchScaleAcc` accumulator from `_handlePanZoom`
- Scale is now a continuous float; tx/ty update smoothly each frame
- Scroll zoom replaced ±1 integer steps with `Math.pow(0.998, pixelDelta)` exponential factor
- Line/page `deltaMode` normalized to pixel equivalents

### Subtool Flyout System
- 8 individual toolbar buttons → 6 slot buttons (`data-slot`): draw, erase, fill, shape, select, utility
- Tapping active slot opens a flyout panel with all subtools; tapping inactive slot switches to last-used subtool
- Slot button icon updates to reflect the currently active subtool
- `SLOTS` and `TOOL_META` data structures define groupings and icons
- `slotLastTool` map remembers last active subtool per slot
- `openFlyout` / `closeFlyout` functions; document click closes flyout

### Shape Subtools: Filled Variants
- `shapeFilled` boolean removed; filled shapes are now separate subtools: `rect-filled`, `ellipse-filled`
- Icons: `ph-rectangle-dashed`/`ph-rectangle` and `ph-circle-dashed`/`ph-circle` distinguish stroke vs filled
- All stroke/move/end/cancel handlers updated to check `currentTool === 'rect-filled'` etc.

### Context-Sensitive Sidebar
- Static Pattern + Brush sections replaced with `#tool-options` containing four panes:
  - `#opt-pattern`: shown for all drawing tools
  - `#opt-brush`: shown for pencil, line, rect, ellipse (stroke only)
  - `#opt-eraser`: shown for eraser only
  - `#opt-selection`: shown for select-rect when a selection exists
- Bug fixed: added global `.hidden { display: none !important; }` CSS rule (previously only element-specific rules existed)
- Selection action buttons (`btn-sel-delete`, `btn-sel-fliph`, `btn-sel-flipv`, `btn-sel-clear`) laid out in 2×2 grid via `grid-template-columns: 1fr 1fr`

### Selection Tool (`s` key)
- New tool `select-rect` in the `select` slot
- Drag to create rectangular marquee with animated marching ants overlay (`_selDashOffset` animated in `loop()`)
- **Move**: dragging inside an existing selection lifts pixels into `selMoveBuffer`, clears them from the layer, and floats them as an overlay; committed on release
- **Cancel during move**: `history.cancelStroke` restores pixels; selection snaps to `selMoveOrigin`
- **Actions** (in sidebar): Delete, Flip H, Flip V, Deselect — all use `history.beginStroke`/`endStroke`
- Switching away from `select-rect` clears the selection; Escape deselects

## Files Touched

### Core Logic
- **tuepfli/js/input.js**: Tap undo/redo detection; smooth pinch (float scale, no accumulator); exponential scroll zoom; `_cancelLongPress` simplified
- **tuepfli/js/app.js**: Subtool system (SLOTS, TOOL_META, slotLastTool, flyout functions); context-sensitive sidebar (`updateToolOptions`); selection state + move logic; `onStroke*` handlers updated for new tool names; `drawOverlay` adds marquee + move preview; `loop()` animates dash offset; keyboard shortcuts updated (added `s`, `escape`)

### UI
- **tuepfli/index.html**: 6 slot buttons replace 8 tool buttons; `#tool-options` with four context-sensitive panes replaces static sidebar sections; `#subtool-flyout` div added
- **tuepfli/css/style.css**: Global `.hidden` rule added; `.tool-btn.shape-filled` removed; `#subtool-flyout` styles; `#tool-options` container; `.sel-actions` 2×2 grid

### Infrastructure
- **tuepfli/manifest.json**: Name → Tuepfli
- **tuepfli/sw.js**: Cache → `tuepfli-v0.8`
