# Session Compaction Summary — 2026-10-10

## User Intent
- Add player defensive mechanics to `shot` (mobile-friendly, no hold keys, no buttons)
- Add PWA manifest
- Polish: auto-hide controls, pause from mobile, kill marks on floor

## Contextual Work Summary

### Toggle Shield
- Tap center of screen (middle 30% width) on mobile, `[Q]` on desktop
- 1-second active duration, 8-second cooldown after use
- Blocks incoming enemy projectiles entirely while active
- Cyan screen overlay (`#shield-overlay`) fades in/out on activation
- SVG arc cooldown indicator in top-right corner (drains dark during cooldown, cyan when ready)
- `shieldActive`, `shieldTimer`, `shieldCooldown` state; `activateShield()` + `updateShield(dt)` functions
- Projectile hit check skips damage and removes projectile if `shieldActive`

### Mobile Touch Improvements
- Center-zone touch claim (`shieldTouchId`) checked before left/right split in `touchstart`
- Top-18%-height × middle-50%-width tap triggers `togglePause()` before the `isPaused` early-return guard
- Top-middle pause works both to pause during play and implicitly (resume via overlay buttons)

### Controls Auto-Hide
- Desktop hint (`#desktop-hint`) hidden via `style.display='none'` 10 seconds after game start
- `togglePause()` restores it (`style.display=''`) whenever pausing, so player can recheck controls

### Persistent Kill Marks
- `spawnKillMark(pos, palette)` called alongside `triggerPillowSplosion` on enemy death
- **Floor splatter**: 2–3 overlapping dark flat quads (`splatterGeo`, shared `splatterMat` `0x1a0505`) at y=0.012, group-rotated randomly; cap 20 total (`MAX_FLOOR_SPLATTERS`)
- **Resting chunks**: 3–6 `restingChunkGeo` boxes scattered around kill position in enemy palette colours at y=0.04; cap 60 total (`MAX_PERSISTENT_DEBRIS`)
- Oldest removed when cap reached

### PWA
- `shot/manifest.json` created: standalone, landscape, dark theme `#0c0a09`
- `<link rel="manifest">` added to `index.html` head

## Files Touched

### Core Logic
- **shot/game.js**: Shield state + constants; `activateShield()`, `updateShield(dt)`, `spawnKillMark()`; `[Q]` keydown; `shieldTouchId` touch tracking in `touchstart`/`touchend`; top-middle pause zone in `touchstart`; `updateShield(dt)` called in game loop; projectile hit guard; `spawnKillMark` called on enemy death; `persistentDebris`/`floorSplatters` arrays + shared geo/mat

### UI
- **shot/index.html**: `#shield-overlay` div (z-15, cyan border/bg); SVG arc `#shield-arc` in top-right corner; `id="desktop-hint"` on controls hint; shield entry in controls list and start overlay; `<link rel="manifest">`

### New Files
- **shot/manifest.json**: PWA manifest (standalone, landscape, dark theme)
