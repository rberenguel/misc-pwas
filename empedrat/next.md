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

**Still missing:**
- "Clear timelapse" UI action (can call `history.clearSnapshots()` — just needs a button)
- **Smarter capture threshold**: consider skipping `captureSnapshot` when `changedPixels < docW * docH * 0.001`

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

## Shape Tools

- **Line** — click-drag, Bresenham pixel line; preview overlay while dragging, commits on release. Respects brush size and current pattern/dither.
- **Rectangle** — click-drag bounding box; filled or outline toggle; pixel-perfect corners.
- **Ellipse** — click-drag bounding box; midpoint ellipse algorithm; filled or outline.
- **Bézier** — tricky: needs a multi-click flow (start → control point(s) → end) with a live preview. Low priority; skip if control-point UX feels too fiddly for pixel art use.

---

## Palette — clear and add-current-color ✓ DONE

- **Double-click swatch** → opens color picker to edit that palette slot; `applyPickerColor` now handles numeric `pickerTarget`, writes back to `doc.palette[i]`, re-renders swatches, saves to IDB
- **+Color button** → adds `primaryColor` to first empty (value 0) palette slot; no-op if palette is full
- **Clear button** → `confirm()` dialog → `doc.palette.fill(0)` + re-render + save
