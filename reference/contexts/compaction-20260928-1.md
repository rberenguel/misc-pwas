# Session Compaction Summary

## User Intent
- Build a simple PWA to load a reference image and view it in Picture-in-Picture on iOS
- Use case: drawing apps that lack native reference image positioning
- Support rotation (90° CW increments) before converting to PiP video

## Contextual Work Summary

### Scaffolding
- Created `reference/` PWA from scratch (index.html, manifest.json, style.css, app.js)
- No service worker, no external fonts — minimal structure based on existing PWAs in repo
- Dark theme, safe-area-inset support for iPhone home bar

### Image Upload & Display
- File input triggered by tap on full-screen upload area
- Image drawn to `<canvas>` (not `<img>`) to enable correct rotation and later stream capture
- Canvas dimensions swap correctly for 90°/270° rotations; `redraw()` guards against unnecessary dimension resets to avoid canvas clearing

### Rotation
- 90° CW increments stored in `rotation` state variable
- Canvas redrawn on each rotation with correct translated/rotated context

### PiP — Extended Debugging Journey
- Initial approach: `canvas.captureStream()` → `video.srcObject` → `requestPictureInPicture()` directly
- Multiple failures: AbortError (too many awaits burned the user gesture token), InvalidStateError (video not ready), black frames (canvas hidden with `display:none` killed captureStream on iOS)
- **Root cause**: iOS Safari won't capture frames from a `display:none` canvas
- **Fix**: video overlays canvas via `position:absolute; inset:0` — canvas stays rendered, never hidden
- rAF loop continuously redraws canvas while in video mode to keep stream active
- `play()` called inside the ✦ button handler (user gesture), not on image load
- Native iOS video controls (including PiP button) handle PiP — no `requestPictureInPicture()` call needed

### UI / Mode Switching
- ✦ button enters video mode: canvas capture stream starts, video overlay shown, rotate disabled
- ✕ button exits video mode: stream stopped, video hidden, canvas visible again
- ⊕ loads a new image (exits video mode first if needed)

## Files Touched

### PWA Root — `reference/`
- **index.html**: Full structure; canvas + video both in `#canvas-wrap`; ✦ button (was ▶); apple-touch-icon/manifest links
- **manifest.json**: Added `icons` array pointing to `icon.png`
- **style.css**: Dark theme; `#canvas-wrap` is `position:relative`; `#video` is `position:absolute; inset:0; object-fit:contain; display:none` — shown via `.active` class
- **app.js**: Upload, redraw, enterVideoMode/exitVideoMode with rAF loop, mode-aware rotate/new handlers
