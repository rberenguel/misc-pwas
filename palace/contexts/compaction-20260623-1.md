# Session Compaction Summary

## User Intent
- Add randomized reverse question types to Mode 1 (was number→PAO only; now also P/A/O→number)
- Track per-question-type accuracy stats separately
- Fix display bugs in the new flashcard layout
- Bump version to 0.3.0

## Contextual Work Summary

### Randomized Question Types
- Mode 1 now picks one of 4 types per card (25% each): number→PAO, person→#, action→#, object→#
- For reverse questions: only the prompted PAO field is shown; reveal shows only the number
- Hint badges (major system consonants) shown only for number→PAO questions

### Flashcard HTML Restructure
- Added `#flashcard-pao-prompt` (shown as question for reverse types)
- Added `#flashcard-row-num` inside answer area (shown on reveal for reverse types)
- Added IDs to P/A/O answer rows (`flashcard-row-p/a/o`) for individual show/hide
- Removed all P/A/O/# label spans — bare values only

### Bug Fix: CSS Specificity
- `hidden` attribute was silently ignored because `.pao-prompt { display: flex }` and `.pao-row { display: flex }` beat the browser's `[hidden] { display: none }` at equal specificity
- Switched all visibility toggling to `style.display = 'none'` / `''` (inline styles always win)

### Stats Tracking
- `computePegStatsM1` now returns `{ pegStats, byType }` instead of bare `pegStats`
- `byType` tracks attempts/correct per question type; old sessions default to `'number'`
- Mode 1 stats tab shows a 2×2 "By question type" grid (# → PAO, P → #, A → #, O → #)
- Open question: heatmap currently uses combined accuracy across all types — user asked whether it should show number→PAO only (undecided)

### Version Bump
- `manifest.json` and `sw.js` cache name bumped from `0.2.0` → `0.3.0`
- New cache name forces service worker to evict old cached JS on activate

## Files Touched

### Core Logic
- **js/app.js**: Added `M1_QTYPES`, `state.m1CurrentQType`; rewrote `renderMode1Card()` with show/hide logic; `scoreMode1()` stores `questionType` per card
- **js/stats.js**: `computePegStatsM1` returns `{ pegStats, byType }`; backward-compatible with old sessions

### UI
- **js/ui-stats.js**: Destructures new return shape; adds `.qtype-grid` breakdown section in Mode 1 tab
- **index.html**: New prompt/answer elements in flashcard; P/A/O row IDs; label spans removed
- **css/style.css**: `.pao-prompt`, `.pao-prompt-value`, `.answer-num`, `.qtype-grid` styles added

### Config
- **manifest.json**: version 0.3.0
- **sw.js**: cache name `palace-v0.3.0`
