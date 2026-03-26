# Session Compaction Summary

## User Intent
- Build and polish a spatial reasoning game called **Entrellat** from a single `index.html` prototype
- Make it work well on mobile portrait and feel visually clean
- Tune difficulty (maze complexity, number of faces, animation speed)
- Set up as a proper offline-capable PWA with local dependencies

## Contextual Work Summary

### Project Split
- Extracted monolithic `index.html` into `index.html`, `style.css`, and `game.js`
- Renderer and camera now use game container dimensions (not full window), enabling correct sizing on mobile

### Mobile Layout
- Mobile portrait: `#ui-container` exits absolute positioning, becomes a 2×2 CSS grid below the cube
- Used `height: 100dvh` for correct mobile viewport sizing
- Hover styles wrapped in `@media (hover: hover)` to prevent sticky cyan halo on touch — this was a persistent bug caused by `:hover` getting stuck on tap

### Visual Style
- Replaced red+blue dual offset lines with a single color (orange `#c60` initially)
- Color is now randomized per level from a curated 8-color `PALETTE` constant in `game.js`: yellow, orange, red, green, pink, cyan, purple, grey — all tuned to similar luminosity
- Offset between dual layers set to 0; second layer kept but transparent (easy to restore)

### Difficulty Tuning
- Grid size reduced 14→10 (simpler maze patterns)
- Filled faces reduced 4→3, always forming a cube corner (from 8 valid `cornerTriples`)
- `FRAME_COUNT` constant introduced (currently `2`); controls animation frames cycled — set to `3` for harder mode
- Frame tick interval: 1000ms (1 second)
- Frustum size: 20.8 (≈20% larger than original 25)

### Game UX Fix
- Clicking any card during the resolve phase now skips the 3.5s wait and advances immediately (`resolveTimeout` stored and cancelled)

### PWA Setup
- Title changed to **Entrellat**
- `manifest.json` added (v0.1.0, dark theme, 512×512 `icon.png`)
- Favicon linked to `icon.png`
- `README.md` written with game description and stack info

### Local Dependencies
- Created `libs/` folder with all Three.js dependencies fully local (no CDN)
- `three.js`: `three.module.js` r128 (ES module, full shader chunks) — blckt's build was stripped and missing `encodings_fragment`
- Line2 addons (`LineSegmentsGeometry`, `LineGeometry`, `LineMaterial`, `LineSegments2`, `Line2`): downloaded from `examples/jsm/lines/` (ES module versions)
- Inter-addon `../lines/` import paths rewritten to `./` to match flat `libs/` structure
- `game.js` converted to ES module; importmap in `index.html` maps `'three'` → `./libs/three.js`

## Files Touched

### Core
- **index.html**: Split from monolith; importmap for three; manifest/favicon links; `type="module"` on game script
- **game.js**: ES module with Three.js imports; `FRAME_COUNT` and `PALETTE` config constants; corner-triple face selection; renderer uses container size; sticky-hover fix; tap-to-advance logic
- **style.css**: Mobile portrait layout; `@media (hover: hover)` guard on hover styles

### Assets & Config
- **manifest.json**: PWA manifest, v0.1.0
- **README.md**: Game description, how to play, stack info
- **libs/three.js**: Three.js r128 full ES module build
- **libs/Line*.js**: Five Line2 addon files (jsm, patched import paths)
