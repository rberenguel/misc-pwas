# Session Compaction Summary

## User Intent
- Build a mobile-first PWA for training the Major System memory technique (number-peg associations + visual icon vocabulary)
- Refactor a single-file prototype into a clean modular app with persistent stats, rich analytics, and polished UI
- Ensure full offline capability via service worker for iOS installation

## Contextual Work Summary

### Architecture Refactor
- Split monolithic `index.html` into modules: `js/app.js`, `js/data.js`, `js/stats.js`, `js/radar.js`, `js/ui-stats.js`, `css/style.css`
- Phosphor icons moved to local font (`fonts/phosphor/`) linked via `<link>` in HTML (not `@import`) so `get_cache.go` can discover them
- `libs/idb-keyval.js` and `libs/haptic.js` copied from sibling projects

### Game Logic (`js/app.js`)
- Three modes preserved: Major System flashcards (Mode 1), Visual Sequence (Mode 2), RAM/Recall combination (Mode 3)
- Full timing instrumentation added throughout: per-card reveal latency (M1), per-icon encoding duration (M2), per-item encoding + decoding response times (M3)
- All click handlers wired via `wireAll()` with `triggerHaptic()` as first call — no `touchstart` handlers anywhere
- Global X button (red, header) replaces all Back/End Drill/Quit buttons; `visibility:hidden` on menu keeps layout stable

### Stats & Analytics (`js/stats.js`, `js/ui-stats.js`, `js/radar.js`)
- Sessions stored as typed objects in IndexedDB (single `"palace-sessions"` key); aggregates computed on demand
- ML-style metrics for Mode 3: Recall (TP/TP+FN), Precision (TP/TP+FP), Specificity (ghost peg accuracy)
- Per-peg heatmaps (10×10 grid) for Mode 1 (accuracy + speed toggle) and Mode 3 (recall accuracy)
- 5-domain pentagon radar chart adapted from `../../bt/radar.js`: Index, Speed, Span, Recall, Vigilance
- Export (JSON download) and import (merge by timestamp, deduplicate) for data safety
- `initStatsWiring()` called once at startup; `renderStats()` called on each open — no duplicate listener accumulation

### UI / Layout
- Persistent `<header>` outside all screens ensures stable layout across navigation
- Main menu: 3 square icon cards (`min(42vw, 42vh)`) in a column; Stats button absolutely positioned at bottom
- Setup screens: same square treatment with numbers, identical centering — buttons land at same position as menu cards
- Encoding screen: full-width `aspect-ratio:1` square frame, icon at `42vw`, thin progress bar + label at absolute bottom, `padding-bottom:15%` for optical upward shift — applied to menu, setup, and drill screens
- Mode 1 drill: same square flashcard layout, pass/fail buttons use `visibility` not `display` to avoid layout shift on reveal
- Major System consonant hint shown on flashcard reveal as pill badges (e.g. `[R]` `[N]` for 42)
- All purple (`--primary`) replaced with white (`--text`); `--secondary` (teal) retained only for decoding prompts

### PWA / Offline
- `manifest.json` created (v0.1.0, `palace`, dark theme)
- `sw.js`: cache-first strategy, auto-cleans old caches on activate, named `palace-v0.1.0`
- `get_cache.go` copied from `../../bt/` — run `go run get_cache.go` from palace root to regenerate `CACHE_FILES`
- `icon.png` referenced as favicon + apple-touch-icon (file to be added by user, 512×512)

## Files Touched

### App
- **index.html**: Full rewrite — modular screens, persistent header, SW registration, font link
- **manifest.json**: New — PWA metadata, v0.1.0
- **sw.js**: New — service worker with full cache list
- **get_cache.go**: Copied from `../../bt/` unchanged

### JavaScript
- **js/app.js**: All game logic, timing, haptic wiring, navigation, stats integration
- **js/data.js**: `MAJOR_PEGS`, `PHOSPHOR_ICONS`, `MAJOR_CONSONANTS`, `majorHintDigits()`
- **js/stats.js**: IDB read/write, `computePegStatsM1/M3()`, export/import/clear
- **js/radar.js**: 5-domain pentagon radar (adapted from bt), `buildRadar(container, sessions)`
- **js/ui-stats.js**: Tab renderers, heatmaps, ML metrics display, `initStatsWiring()` / `renderStats()`

### Styles
- **css/style.css**: All styles; no `@import`; global header, square card patterns, encoding layout, stats tabs/heatmap/radar

### Assets
- **fonts/phosphor/phosphor.css**: Copied from `../iconer/fonts/phosphor/`
- **fonts/phosphor/Phosphor-Light.woff2**: Copied from `../iconer/fonts/phosphor/`
- **libs/idb-keyval.js**: Copied from `../gdash/libs/`
- **libs/haptic.js**: Copied from `../summum/`
