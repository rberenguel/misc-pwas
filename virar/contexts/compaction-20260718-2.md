# Session Compaction Summary

## User Intent
- Split the monolithic `index.html` into separate ES modules and add a PWA manifest
- Fix bugs in the quantization post-processing (dither modes had no effect)
- Add seed color support for k-means quantization with an eyedropper UX
- Polish the Output tab layout and fix UI annoyances (tab height jumps, button naming)

## Contextual Work Summary

### Module Split
- Extracted all JS from `index.html` into `js/color.js`, `js/gamut.js`, `js/histogram.js`, `js/pipeline.js`, `js/postprocess.js`, `js/ui.js`
- `index.html` now has only HTML + CSS; entry point is `<script type="module" src="js/ui.js">`
- `processImage` signature changed: now takes `(srcPixels, procW, procH, params)` instead of using globals
- Gamut LUT state lives in `gamut.js`; `isGamutReady()` replaces the old null check on `gamutLut`

### PWA Manifest
- Added `manifest.json` with black theme, standalone display, references `icon.png` (512×512, user to provide)
- Added `<link rel="manifest">` and `<meta name="theme-color">` to `index.html`

### Quantization Bug Fixes
- **Floyd-Steinberg was always zero**: error was computed after writing quantized value back, so `data[p] - nc[0]` was always 0. Fixed to use pre-write `r - nc[0]`
- **Bayer factor too small**: `DF=6` out of 255 was invisible; raised to `DF=32`

### Seed Colors for Quantization
- Seeds inject phantom pixels (`SEED_PULL=500` copies per seed) into the k-means sample pool — centroids are attracted but not pinned, so they still represent actual image clusters
- Eyedropper UX: `+ Color` button enters pick mode, canvas switches to showing the pre-quantization processed image (`lastDst`), user clicks to sample a pixel; swatch appears as `<input type=color>` for fine-tuning; Escape cancels
- Sampling always from `lastDst` (not `postDst`) so the picked color is from what actually gets quantized
- Up to 6 seeds; each has an `×` remove button

### Output Tab Layout
- Restructured with `subsec-title` sections (Mode / Algorithm / Colors / Dither / Seed colors) to match FX tab style
- Removed `out-sub` wrapper class; subsec-title margins handle spacing

### Other UI Fixes
- **Stable tab height**: replaced `display:none/block` on tab panes with CSS grid stacking (`grid-area:1/1`, `visibility:hidden/visible`) so controls panel is always sized to the tallest tab (Luma/Chroma)
- **"Reset" renamed "Defaults"**: the button restores default equalisation params, not a no-op identity; "Reset" was misleading

## Files Touched

### HTML / CSS
- **`img/index.html`**: Stripped all inline JS; added manifest link + theme-color meta; restructured Output tab with subsec-titles + seed color section; CSS for seed swatches, pick-mode button state, grid-stack tab panes; "Reset" → "Defaults"

### PWA
- **`img/manifest.json`**: New file — PWA manifest (black theme, icon.png reference)

### JS Modules (all new)
- **`img/js/color.js`**: OKLab matrices, eotf/oetf, rgbToOklab/oklabToRgb
- **`img/js/gamut.js`**: Gamut LUT state; exports `buildGamutLut`, `gamutMax`, `isGamutReady`
- **`img/js/histogram.js`**: histogram, capHist, buildTransferLut, lutLookup, fitChannel, PI_4
- **`img/js/pipeline.js`**: processImage (now pure function taking srcPixels/dims/params), genNoise
- **`img/js/postprocess.js`**: applyDither, applyQuantize (with seeds), kmeansColors (phantom pixel seeding), Floyd/Bayer fixes
- **`img/js/ui.js`**: All DOM state, event wiring, eyedropper pick mode (enterPickMode/exitPickMode/addSeedColor), getSeedColors, applyPostProcess, boot

## Open / Potential Next Steps
- Test seed colors with real image (orange cat use case)
- Vignette formula deliberately tight (by design from original); user aware
- WebWorker for processing to keep UI responsive on large images
- Full-resolution export (currently capped at 1400px longest side)
- Service worker for offline/installable PWA
