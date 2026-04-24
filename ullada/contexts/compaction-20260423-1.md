# Session Compaction Summary

## User Intent
- Build a complete PWA RSVP epub reader called Ullada from a monolithic HTML prototype
- Add local persistence (idb-keyval), PWA manifest, service worker, offline support
- Add a 2-slot library modal with book switching, cover art, and an info/help panel
- Polish layout for both landscape and portrait orientations

## Contextual Work Summary

### Initial Refactor
- Split monolithic `index.html` into `css/style.css`, `js/app.js` (ES module), clean `index.html`
- Switched CDN JSZip to local `lib/jszip.min.js`; Inter font served from `fonts/inter.css`
- Added `manifest.json` and `sw.js` (cache-first service worker with update banner)

### Haptic Feedback
- Imported `initHaptic`/`triggerHaptic` from local `lib/haptic.js` (iOS checkbox-switch trick)
- Added `click` handler on `readerView` (fires after pointerup for real taps, not drags)
- Added `click` handlers on all interactive elements: upload-box, all library modal buttons, hint bar
- `hintEl.click` uses `stopPropagation` to prevent double-firing with the readerView handler
- `pointerup` bails early when `hintEl.contains(e.target)` to prevent `togglePlay` firing

### Persistence (idb-keyval)
- Two book slots: keys `ullada/slot`, `ullada/book-0`, `ullada/book-1`, `ullada/progress-0`, `ullada/progress-1`
- Helper constants `KEY_SLOT`, `bookKey(s)`, `progressKey(s)` centralise key strings
- `loadSaved()` runs at module start; includes migration from old un-namespaced keys (`book`, `progress`, `book-0`, etc.)
- Progress saved on `pauseRsvp()`, on visibility change, and every 50 words during playback
- Bug fixed: `startReadingSession()` was resetting `currentIndex = 0`, wiping restored position

### EPUB Parsing Enhancements
- `extractTextFromEpub` now also extracts book title (dc:title from OPF) and cover image
- `extractCover()` tries three methods: `properties="cover-image"`, `<meta name="cover">`, id-contains-"cover"
- Cover stored as base64 data URL in idb alongside words/chapters/title

### Library Modal
- Trigger: tap the hint bar at bottom of reader (hint made `pointer-events: auto`)
- Modal: dark backdrop + panel with `i` (info) button top-left and `×` top-right
- Grid: 3-column in landscape (cards fill panel height via flex+grid-template-rows:1fr, aspect-ratio removed), 2-column in portrait (book cards keep 2/3 ratio; new-book spans full width as short bar)
- Cards show cover image or placeholder SVG, title (2-line clamp), orange border when active slot
- Clicking a filled slot switches to it; clicking empty slot or new-book opens file picker for active slot
- `openLibrary()` always resets to grid view (not info view)

### Info Panel
- Toggled by the `i` button; button changes to `‹` when info is shown
- Four sections: "What is RSVP?", "Optimal Recognition Point", "Context Window", "Controls"
- Controls rendered as a two-column `dl` grid

### Layout / CSS
- Landscape: panel `height: 82vh`, `overflow: hidden`, flex-column; grid `flex:1`, `grid-template-rows:1fr`; cards `aspect-ratio: unset` — cards always fit without scrolling
- Portrait: hint gets `white-space: normal; width: 80vw` to prevent clipping; library uses 2-col grid
- Service worker bumped to `ullada-v1.2.0` after last set of changes

### Pending Issues (not yet fixed)
- Info panel may clip in landscape (`overflow: hidden` on panel, no scroll on `#library-info`)

### Resolved / Intentional
- **Loader view stays visible after cancelling file picker** — this is intentional. On iOS, custom file types (`.ullada`) are not selectable via the file picker, but files *are* drag-and-droppable onto the loader drop zone. Keeping the loader visible after a cancelled pick leaves the drop target available.
- **`showWPM()` appended " WPM" to chapter titles** — fixed: suffix now only added when value is a number.

## Files Touched

### App Core
- **`js/app.js`**: Full ES module rewrite; all state, EPUB parsing, RSVP engine, gestures, persistence, library modal logic
- **`index.html`**: Clean shell; links CSS/fonts/manifest; library modal HTML; info panel HTML; SW registration

### Styles
- **`css/style.css`**: All styles; landscape + portrait media queries for library modal; hint clickable

### PWA
- **`sw.js`**: Cache-first SW, currently `ullada-v1.2.0`; caches all local assets including fonts and libs
- **`manifest.json`**: Standalone PWA, black theme, icon.png

### Assets (pre-existing, not modified)
- **`lib/haptic.js`**, **`lib/idb-keyval.js`**, **`lib/jszip.min.js`**
- **`fonts/inter.css`**, **`fonts/InterDisplay-*.woff2`**
- **`icon.png`**
