# Session Compaction Summary

## User Intent
- Build a pixel art editor (Empedrat) from the ground up per `empedrat/design.md`
- Proper multi-file PWA structure (not a single HTML blob)
- Dither system modelled after Pixaki: numbered presets, no density slider, rectangular previews
- Reference image panel as floating draggable overlay

## Contextual Work Summary

### Project Bootstrap
- Created full PWA structure: `index.html`, `manifest.json`, `sw.js`, `css/style.css`, `js/` modules, `libs/`, `fonts/` (copied from palace/)
- Three-column CSS grid layout: left panel (colors + pattern + brush + layers), center canvas, right panel (doc info)

### Core Data Model (`js/document.js`)
- `DocumentModel` with `Uint32Array` buffers per layer, 0xAABBGGRR color encoding
- `createDocument`, `createFrame`, `createLayer`, add/remove/move layer helpers
- JSON serialization via base64-encoded buffers

### Rendering (`js/renderer.js`)
- `Renderer` class: offscreen compositor canvas + viewport canvas
- Integer-only zoom (1–64) to prevent grid misalignment
- Checkerboard transparency background, pixel grid at scale ≥ 4
- `viewToDoc()` uses `getBoundingClientRect()` offset (fixed click-position bug)

### Dither Engine (`js/dither.js`)
- Rewrote twice; now: `DITHER_PRESETS` array — Solid + 13 Bayer8 presets at densities 13/14 down to 1/14
- `shouldDraw(x, y, presetIdx)` — single function, canvas-anchored coordinates
- `ditherGradientPx` for the gradient tool (primary→secondary color across a vector)

### Tools (`js/tools.js`)
- `pencilStroke`: Bresenham + square brush stamp, dither per-pixel via `shouldDraw`
- `eraserStroke`: square stamp, sets pixels to 0
- `floodFill`: scanline 4-way stack fill with tolerance
- `applyDitherGradient`: fills entire layer with primary→secondary dither along a drag vector

### Input (`js/input.js`)
- `InputHandler`: pointer capture, Bresenham interpolation between events
- Two-finger pan/zoom (integer snap), wheel zoom (integer step)
- Long-press eyedropper (250ms, 3px drift cancel)
- All coords transformed via `_canvasXY()` using `getBoundingClientRect`

### History (`js/history.js`)
- Dirty-rect undo/redo (before/after `Uint32Array` slices per stroke)
- Timelapse snapshots via `createImageBitmap` after each modifying stroke

### Palette (`js/palette.js`)
- 32-color palette, default colours populated from `DEFAULT_PALETTE`
- Lospec PNG import (unique pixel sampling), JSON import/export, PNG export

### App Wiring (`js/app.js`)
- Tools: pencil (p), eraser (e), fill (f), gradient (g), eyedropper (i)
- Keyboard shortcuts: tools, undo/redo (Ctrl+Z/Shift+Z), zoom (+/-/0)
- Pattern grid: 7-column grid of 8×8 canvas previews (CSS upscaled, `image-rendering: pixelated`)
- Brush size + eraser size sliders
- Color picker panel (RGB sliders + hex input, synced)
- Palette swatches (left-click = primary, right-click = secondary)
- IDB autosave on every stroke; load on init
- PNG export (scale prompt), project JSON save/load

### Reference Image Panel
- Floating draggable `<div id="ref-panel">` with CSS `resize: both`
- `ResizeObserver` re-renders ref canvas on panel resize
- Eyedropper tool samples from ref canvas when clicked on it
- Load button in toolbar (`ph-image-square` icon)

## Files Touched

### Core Logic
- **empedrat/js/document.js**: Full data model, color encoding, serialization
- **empedrat/js/renderer.js**: Compositor + viewport, integer zoom, transparency BG
- **empedrat/js/dither.js**: Bayer8 presets (Solid + #1–#13), `shouldDraw`, gradient helper
- **empedrat/js/tools.js**: Pencil/eraser/fill/gradient, brush size support
- **empedrat/js/input.js**: Pointer events, pan/zoom, long-press, coord offset fix
- **empedrat/js/history.js**: Undo/redo dirty-rect, timelapse capture
- **empedrat/js/palette.js**: Default palette, Lospec PNG, JSON import/export
- **empedrat/js/app.js**: Full app init, all UI wiring, pattern grid, ref panel

### UI
- **empedrat/index.html**: Full layout, toolbar, panels, ref panel, color picker panel
- **empedrat/css/style.css**: Dark theme, 3-col grid, pattern swatches, ref panel, color picker

### PWA
- **empedrat/manifest.json**: PWA manifest
- **empedrat/sw.js**: Service worker with cache-first strategy
- **empedrat/fonts/**: Copied Phosphor Light from palace/
- **empedrat/libs/idb-keyval.js**: Copied from palace/

## Known State / Next Steps
- Pattern previews: 8×8 Bayer8 tile upscaled — should look chunky and correct
- No alignment toggle (Canvas vs Brush) — user said not to add without asking
- Gradient tool uses Bayer8 preset (same as pencil) — works but might want its own preset picker
- Right panel shows doc info placeholder but no content wired up yet
- No timelapse export UI yet (snapshots captured in memory but no export trigger)
- `media/icon.png` not created — PWA icon missing
