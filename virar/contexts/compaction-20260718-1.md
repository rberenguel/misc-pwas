# Session Compaction Summary

## User Intent
- Build a vanilla JS PWA image editor in `/Users/ruben/code/misc-pwas/img/` inspired by the Android app at `https://github.com/fishcu/TheGreatEqualizer`
- Port the OKLab histogram equalisation pipeline to the browser (no GPU, no dependencies)
- Integrate dithering from `../eink-bg` and colour quantisation from `/Users/ruben/code/tessella`
- Mobile-friendly UI with tabs, a draggable split comparison view, and a pure black theme

## Contextual Work Summary

### Algorithm Research
- Cloned TheGreatEqualizer to `/tmp/TheGreatEqualizer` and read prototype Python code, GLSL compute shaders, and Kotlin GPU pipeline
- Fully understood the two-pass pipeline: (1) sRGB→OKLab + vignette + relative chroma, (2) CDF transfer + zone tinting + grain + gamut clamp + sRGB output
- Read `ImagePipeline.kt` to understand the `buildTransferLutWithEdges` edge-fixup logic
- Read `FitParams.kt` for the Adam-optimizer-based CDF fitting (numerical gradients, 500 steps)

### Core Pipeline (all inlined in single HTML)
- **OKLab colour science**: `rgbToOklab`, `oklabToRgb` using M1/M2/M1_INV/M2_INV matrices; `eotf`/`oetf` sRGB transfer functions
- **Gamut LUT**: 256×360 bisection (20 iterations) at startup giving max OKLab chroma per (L, hue) for sRGB gamut; bilinear lookup `gamutMax`
- **Histograms**: 256-bin, cap redistribution, `buildTransferLut` with `interpInv` (CDF specification) and tail edge-fixup
- **Adam CDF fitter**: `fitChannel` — trims CDF, runs 500 Adam steps with numerical gradients, returns t/s/c/g/xLo/xHi
- **Zone weights**: CDF-adaptive smoothstep partition into shadows/midtones/highlights
- **Film grain**: pre-generated 1024×1024 noise texture (`genNoise`), sampled per pixel with midtone envelope
- **Vignette**: exposure darkening in linear light before OKLab conversion, highlight-protected

### Post-Processing (Output tab)
- **B&W dithering** (from `eink-bg/index.html`): Floyd-Steinberg, Atkinson, Bayer 4×4, pseudo-blue noise, threshold; converts to greyscale first
- **Colour quantise** (from `tessella/src/quantizer.js`): k-means on ≤50k sampled pixels → palette of 2–16 colours; optional Bayer 8×8 or Floyd-Steinberg dithering against palette; `applyQuantize` / `kmeansColors`

### UI
- **Tabs**: Luma / Chroma / Zones / FX / Output — each a separate scrollable panel
- **Mobile sliders**: thicker track (4–6px), `@media (pointer: coarse)` enlargement
- **Split view**: single canvas, draggable divider (mouse + touch), `origOffscreen` canvas for left-half original; toggle via **Split** button or `S` key; `splitPos` tracked as 0–1 fraction
- **Dice**: randomises all OKLab + FX params and regenerates grain texture
- **HEIC error**: on image load failure detects HEIC and shows a 4-second overlay message

### Theme
- Changed from Solarized Dark to pure black (`#000000` / `#111111`) on user request

## Files Touched

### Primary Output
- **`/Users/ruben/code/misc-pwas/img/index.html`**: Single-file PWA; complete implementation of the pipeline, UI, post-processing, split view; ~750 lines total

### References Read (not modified)
- `/tmp/TheGreatEqualizer/prototype/main.py`, `oklab.py`, `fit_params.py`
- `/tmp/TheGreatEqualizer/android/app/src/main/assets/shaders/pass1_rgb_to_oklab.glsl`, `pass2_cdf_to_srgb.glsl`
- `/tmp/TheGreatEqualizer/android/app/src/main/java/com/thegreatequalizer/app/ImagePipeline.kt`, `FitParams.kt`, `GpuPipeline.kt`
- `/Users/ruben/code/misc-pwas/eink-bg/index.html` (dithering functions)
- `/Users/ruben/code/tessella/src/quantizer.js` (k-means + Bayer quantise)

## Open / Potential Next Steps
- Test on actual mobile device (sliders, split drag, tab scrolling)
- Add palette presets from `tessella/palettes/` (PNG files encoding palette colours)
- Consider WebWorker for processing to keep UI responsive on large images
- PWA manifest + service worker for offline/installable use
- Full-resolution export (currently capped at 1400px longest side)
