# Empedrat — Next Session Notes

## Mobile (from previous session) ✓ DONE
- `#toggle-sidebar` button (first in toolbar, keyboard shortcut `m`)
- `#toggle-toolbar` fixed floating button (top-right, always visible, updates icon when toggled)
- CSS classes `sidebar-collapsed` / `toolbar-collapsed` on `#app` collapse via grid row/column = 0
- Color picker panel repositions left when sidebar collapsed (CSS sibling selector)

---

## Timelapse Recording ✓ DONE

- `exportTimelapse(frameDelay)` added: replays `ImageBitmap` snapshots onto offscreen canvas at 4× scale via `captureStream(30)` + `MediaRecorder` → downloads `empedrat-timelapse.webm`
- "Timelapse" button opens preview modal (draggable panel, play/pause, scrub, speed slider, export button)
- Timelapse snapshots saved/loaded in `.empedrat` ZIP as `tl/N.png`; restored into `history` on load
- New document clears snapshots; loading a project replaces them

**Still missing:** *(all done)*
- "Clear timelapse" UI action ✓ DONE — button in panel; calls `history.clearSnapshots()` + closes panel + saves
- **Smarter capture threshold** ✓ DONE — `endStroke` returns changed-pixel count; snapshot only when `changed >= docW * docH * 0.001`

---

## Save format ✓ DONE (ZIP + PNG layers)

- `.empedrat` files are ZIP archives: `meta.json` + `f{i}/l{j}.png` per layer + `tl/{n}.png` timelapse frames
- fflate ESM (`libs/fflate.esm.js`) used for ZIP creation/parsing — no external deps beyond that
- Legacy `.json` format removed; only `.empedrat` ZIP files supported
- IDB auto-save uses the same ZIP format (stores `Uint8Array`)

---

## What does "Save" save? ✓ DONE (improved)

Now saves to three IDB keys:
- `empedrat-doc` — layers + palette (unchanged)
- `empedrat-session` — primary/secondary color, ref pan/zoom state, `hasRef` flag (debounced 300ms, triggered by color changes and ref pan/zoom)
- `empedrat-ref` — reference image as JPEG DataURL at 0.9 quality (saved once on image load)

On load, all three are restored: doc → colors → ref image (async img.onload).

**Still not saved:**
- Active tool, brush/eraser size, viewport pan/zoom transform (minor; these are fast to reset)

---

## Shape Tools ✓ DONE

- **Line** ✓ — Bresenham; pixel-accurate overlay; brush size + dither; key `l`
- **Rectangle** ✓ — bounding box drag; filled/outline; viewport-scale overlay; key `r`
- **Ellipse** ✓ — dual-scanline; filled/outline; near-circle indicator (cyan badge + color shift when delta≤1px); key `o`
- **Bézier** — low priority; skip unless specifically requested

## Native prompt/confirm → custom modals ✓ DONE

- Replaced all 5 `prompt()`/`confirm()` calls with `showModal()` — Promise-based, keyboard-friendly (Enter=OK, Esc=Cancel, backdrop click=Cancel)
- New / Resize: separate W + H number fields (no more "64x64" string parsing)
- Export PNG: number field with min/max
- Clear timelapse / Clear palette: message-only confirm with danger-styled OK button

---

## Flip / Rotate Layer

- Horizontal flip, vertical flip of the active layer — trivial pixel remap, no history complexity
- 90° CW / CCW rotation of the active layer (swaps doc dimensions if canvas is non-square — needs a resize or crop decision)
- Buttons in the left panel (Layer section) or toolbar group

---

## Selection Tool

- Marquee (rectangle) select a region in doc coords
- Move selection contents (cut + paste at new position)
- Copy / paste region (duplicate to new position)
- Deselect on tool switch or Escape
- Overlay: dashed animated rectangle ("marching ants") around selection
- Fills / strokes / eyedrop should still work inside selection bounds when active

---

## Animation Frames

- The document model already has `frames[]` + `activeFrameId` — needs UI
- Frame strip at the bottom: thumbnails, add/duplicate/delete/reorder frames
- Playback: fps control, loop toggle, preview in-canvas
- Onion skinning: show prev/next frame(s) semi-transparently on canvas
- Export: animated GIF or APNG (needs an encoder lib — e.g. gif.js or UPNG.js)

---

## Canvas Rotation (tablet comfort)

- Low priority — for comfortable drawing on tablets at odd angles
- Pinch-rotate gesture (two-finger rotate) rotates the viewport transform
- Reset rotation button / keyboard shortcut
- All draw coordinates must be inverse-transformed before hitting the doc pixel grid
- Renderer needs a rotation component in its camera transform (currently tx/ty/scale only)

---

## Palette — clear and add-current-color ✓ DONE

- **Double-click swatch** → opens color picker to edit that palette slot; `applyPickerColor` now handles numeric `pickerTarget`, writes back to `doc.palette[i]`, re-renders swatches, saves to IDB
- **+Color button** → adds `primaryColor` to first empty (value 0) palette slot; no-op if palette is full
- **Clear button** → `confirm()` dialog → `doc.palette.fill(0)` + re-render + save
