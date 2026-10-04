# Session Compaction Summary

## User Intent
- Build and iterate on a dimetric isometric tower-defence game (`tower/`) in a single HTML file, then split into separate files
- Fix bugs and improve visual/gameplay correctness (range, projections, attack animations)
- Add a power-grid resource system as a second strategic dimension
- Polish UX: hover tooltips, range previews, tower on/off animations

## Contextual Work Summary

### Project Split
- `tower/index.html` was a monolithic ~1600-line file; refactored into `index.html` (markup), `style.css` (styles), `game.js` (all logic)

### Bug Fixes
- **Prism beam persisted on screen**: beams were added to `overlayEffectsContainer` (persistent) instead of `activeBeamsContainer` (cleared each tick)
- **`overlayEffectsContainer` was undefined**: `initializeGame` created it as `overlayFxContainer` (stray variable); renamed to match the module-level declaration
- **Range preview was wrong shape**: initial fix drew a screen-space circle (wrong) then a dimetric-ratio ellipse (wrong); correct formula is axis-aligned ellipse with semi-axes `R·TILE_WIDTH·√2/2` and `R·TILE_HEIGHT·√2/2`, matching the actual grid-space Euclidean range check

### Range & Targeting Overhaul
- All `spec.range` values changed from screen pixels to **tile units** (Obelisk 2.5, Bastion 4.5, Prism 2.5, Sanctuary 3, Pylon 2.5)
- `findTarget()` now uses `enemy.getGridPos()` + grid-space `Math.hypot`
- `MortarShell` stores target grid coords; `detonate()` AoE check is also grid-space
- `pulseBufferAura()` uses tower `gx/gy` directly

### Zoom / View
- Tile size increased from 68×28 to 96×40 to match the telephoto feel of the sibling `into/` project (Three.js, FOV 28)
- `gridOrigin.y` shifted from 18% to 24% of screen height for better vertical centering

### Wave Difficulty
- Enemy base stats bumped ~15-20%; HP scaling per wave 15%→22%; speed also scales +4%/wave
- Wave size formula `6+wave×3` → `8+wave×4`; spawn interval tightened; harder units introduced 1-2 waves earlier
- Tessera blink cooldown 120→90

### Power Grid System
- New `PYLON` tower type: 120 flux, range 2.5 tiles, outputs 2 power units, no attack
- Ambient pool of 1 unit (powers exactly 1 Obelisk without any pylons)
- `allocatePower()` runs each tick: sorts consumers by fewest-covering-pylons first (priority for constrained towers), drains from most-loaded pylon (fair share), falls back to ambient
- Tower `powered`/`shutoff` flags; unpowered/shutoff towers skip all attacks and fade to 28% alpha via lerp (`0.1 * delta` per frame)
- Short tap on existing tower (< 450 ms) = toggle shutoff; long hold slot reserved for future upgrades
- `GRID POWER X/Y` badge added to top HUD

### Hover Tooltips
- Hovering canvas over an existing tower shows a glass-panel tooltip: DPS (or effect for support towers), power draw, range in tiles, current status (ACTIVE / OFFLINE / NO POWER)
- Hovering palette buttons shows the same panel with COST instead of STATUS, using `showSpecTooltip` positioned above the button
- Sanctuary and Pylon show "EFFECT" label with descriptive text instead of a numeric DPS
- Hover over existing tower also tints the tile green (offline→turn on) or red (online→turn off)
- `pointerleave` / `pointercancel` clean up hold state and hide tooltip

## Files Touched

### Game Logic
- **tower/game.js**: All gameplay logic; main file for all changes above (~1450 lines)

### Markup
- **tower/index.html**: Structural HTML only; added PYLON button, GRID POWER HUD badge, tower-tooltip div with `tt-cost-row` / `tt-status-row` toggle rows; fixed upside-down "DEPLOY TOWERS" label (removed invalid `writing-vertical rotate-180` classes)

### Styles
- **tower/style.css**: Extracted from original monolith; no changes since extraction

## Key State / Architecture Notes
- `TOWER_SPECS` keys: `OBELISK`, `BASTION`, `PRISM`, `SANCTUARY`, `PYLON` — all have `powerCost` and `range` in tile units
- `Enemy.getGridPos()` returns fractional `{gx, gy}` from segment progress; used for all range checks
- `holdState = { gx, gy, startTime }` tracks pointer-down on existing towers; finalised in `handlePointerUp`; threshold `HOLD_THRESHOLD_MS = 450`
- `allocatePower()` must be called before `tower.update()` each tick — already wired in ticker
- Long-hold → upgrade panel is stubbed with `showToast('UPGRADE SYSTEM: COMING SOON')`
