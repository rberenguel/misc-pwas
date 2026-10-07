# Session Compaction Summary

## User Intent
- Add radial gradient support for sphere/planet shading
- Add alpha lock per layer (mask-like transparency preservation)
- Fix gradient alpha compositing (src-over instead of replace)
- Maintain features.md inventory and next.md roadmap

## Contextual Work Summary

### Radial Gradient
- Added `applyDitherRadialGradient` in `tools.js`: drag center→edge defines radius, always clips to circle, Bayer8 dithered
- `gradientType` state (`'linear'`/`'radial'`) in `app.js`; Linear/Radial toggle buttons (`ph-gradient`/`ph-target`) in `opt-gradient` sidebar
- Live overlay shows dashed circle + center crosshair for radial; sidebar preview renders circular gradient
- Removed "Clip" checkbox after user feedback — radial always clips

### Gradient Alpha Compositing Fix
- Previous: gradients replaced pixels entirely (`buf[idx] = color`)
- Fixed: `blendGradientPixel` helper does src-over composite; opaque stops replace, semi-transparent blend, transparent src = no-op
- First attempt incorrectly skipped transparent dst pixels (wrong); corrected to ignore dst alpha entirely

### Long-press Flash Bug (diagnosed, fixed)
- `onEyedrop` called `renderer.render(doc)` without overlay after 250ms long-press, causing gradient preview to disappear
- Fix: removed the explicit `renderer.render(doc)` call — offscreen is already current from the rAF loop

### Alpha Lock
- Per-layer `alphaLocked: boolean` added to `document.js` (createLayer, serialize, deserialize with `?? false` fallback)
- All paint paths check it: `paintPixel` (pencil, shapes), `floodFill` (bails if clicking transparent), both gradient apply functions
- Eraser intentionally unaffected
- UI: `ph-checkerboard` icon per layer row in `renderLayerPanel`; accent-coloured when active; layers panel widened 200→220px

### Palette: Remove Color
- Right-click approach rejected (not mobile-friendly)
- Solution: "Remove" button appears in color picker footer only when editing a palette slot (`typeof pickerTarget === 'number'`)
- `cp-remove` button added to HTML; shown/hidden in `openColorPicker`; splices from `doc.palette` on click

### Documentation
- `features.md` created: full inventory of all working features organized by category (tools, layers, palette, viewport, etc.)
- Palette clarified: unlimited slots, always one empty row, no individual removal previously (now fixed)
- `next.md` updated: gradient done section, alpha lock done section, masking future improvements, gradient stop drag-and-drop rework at top

## Files Touched

### Core Logic
- **tuepfli/js/tools.js**: Added `applyDitherRadialGradient`; `blendGradientPixel` src-over helper; alpha lock checks in `paintPixel`, `floodFill`, both gradient apply functions; `drawRect`/`drawEllipse` filled paths pass `layer.alphaLocked`
- **tuepfli/js/dither.js**: Unchanged this session
- **tuepfli/js/document.js**: `alphaLocked: false` on `createLayer`; serialized/deserialized in both directions

### App State & UI
- **tuepfli/js/app.js**: `gradientType` state; radial apply branch in `onStrokeEnd`; radial overlay in `drawOverlay`; radial sidebar preview in `renderGradientPreview`; `setupGradientOptions` for type toggle; alpha lock button in `renderLayerPanel`; `cp-remove` wired for palette; long-press render call removed from `onEyedrop`

### HTML
- **tuepfli/index.html**: Linear/Radial icon buttons in `opt-gradient`; `cp-remove` button in color picker footer

### CSS
- **tuepfli/css/style.css**: `.gradient-type-row`; `.layer-alpha-locked` (accent color); layers panel 200→220px

### Docs
- **tuepfli/features.md**: Created — full feature inventory
- **tuepfli/next.md**: Gradient + alpha lock done sections added; gradient stop drag-and-drop rework noted at top
