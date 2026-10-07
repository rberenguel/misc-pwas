# Empedrat — Feature Inventory

## Tools

| Tool | Key | Notes |
|------|-----|-------|
| Pencil | `p` | Bresenham line, brush size 1–32, dither pattern, symmetry |
| Eraser | `e` | Bresenham line, eraser size 1–32, symmetry |
| Fill | `f` | Flood fill, dither pattern, symmetry |
| Gradient | `g` | Linear + radial, N stops, Bayer8 dither, src-over composite; see below |
| Line | `l` | Bresenham, brush size, dither, symmetry |
| Rectangle | `r` | Outline + filled variants, brush size, dither, symmetry |
| Ellipse | `o` | Outline + filled variants, Zingl integer algorithm, brush size, dither, symmetry, cyan near-circle indicator |
| Select (rect) | `s` | Move, copy, cut, paste (onto new layer), delete, flip H/V within selection |
| Eyedropper | `i` | Samples composite canvas; long-press any tool (250 ms, <3 px drift) triggers eyedrop |

### Tool options (context-sensitive sidebar)
- **Dither pattern**: 14 presets — Solid + 13 Bayer8 densities (4/64 steps, 52/64 down to 4/64)
- **Brush size**: 1–32 px slider (pencil, line, rect, ellipse)
- **Eraser size**: 1–32 px slider
- **Symmetry**: horizontal and/or vertical mirror; draggable axis (drag near guideline); affects pencil, eraser, fill, line, rect, ellipse

---

## Gradient

- N-stop editor in a draggable modal (click sidebar preview to open)
- Per stop: color swatch (opens color picker), range slider, number input (0–100), ↑↓ reorder buttons, × remove
- End stops fixed at 0/100%; minimum 2 stops; "+ Add stop" inserts at midpoint
- **Linear**: drag direction line on canvas; full-canvas fill
- **Radial**: drag center → edge; always clips to circle radius
- Live preview overlay at 75% opacity while dragging; linear shows dashed line, radial shows dashed circle + crosshair
- Sidebar preview canvas reflects current type (linear = vertical bar, radial = centered circle)
- Gradient pixels are src-over composited onto existing pixels (semi-transparent stops blend; destination alpha not consulted)
- Respects alpha lock

---

## Color

- Primary + secondary swatches; swap button
- Color picker: RGBA sliders + number fields + hex input; checkerboard preview when alpha < 255
- Shift-click palette swatch → sets secondary color
- Alpha channel fully supported throughout (pencil, gradient stops, palette entries)

---

## Layers

- Add, delete, reorder (up/down), merge down (src-over composite into layer below)
- Per-layer: visibility toggle, opacity slider (0–1, step 0.05), alpha lock, inline name edit
- **Alpha lock** (`ph-checkerboard` icon, accent when on): all paint ops skip fully-transparent pixels on that layer (pencil, fill, shapes, gradient); eraser unaffected
- Thumbnail: up to 32 px max side, white background for transparent pixels
- Draggable, foldable floating panel; position/fold state persists in IDB

---

## Palette

- Unlimited color slots; always at least one empty row visible
- Click → set primary; Shift+click → set secondary; double-click → open color picker to edit slot (includes Remove button)
- "+ Color" button adds current primary to first empty slot
- Clear palette wipes all slots (confirm dialog)
- Import: Lospec PNG format, JSON
- Export: JSON, PNG
- Draggable, foldable floating panel; position/fold state persists in IDB

---

## Document & File

- **New**: custom W × H (1–4096)
- **Resize**: keeps pixel content, crops or extends
- **Export PNG**: 1–20× scale, downloads as `empedrat.png`
- **Save / Load**: `.empedrat` ZIP format — `meta.json` + `f{i}/l{j}.png` per layer + `tl/{n}.png` timelapse frames
- **Auto-save**: every completed stroke → IDB key `empedrat-doc`
- **Session state** (debounced 300 ms → IDB `empedrat-session`): primary/secondary color, panel positions + fold state, canvas rotation, reference image pan/zoom/visibility

---

## Viewport

- Zoom: 1–64×; buttons, `+`/`-` keys, pinch gesture
- Fit to view: button, `0` key
- Pan: drag empty canvas area; pinch midpoint follows during pinch-zoom
- Rotation: two-finger pinch-rotate; snaps to nearest 45°; reset button + `Shift+R`
- Transparency checkerboard background (grey cells)
- Pixel grid overlay at scale ≥ 4×
- Sidebar collapse: `m` key, panel close/open buttons
- Toolbar collapse: floating toggle button (top-right)

---

## Undo / Redo

- Undo: `Ctrl+Z`, toolbar button, two-finger tap
- Redo: `Ctrl+Shift+Z` / `Ctrl+Y`, toolbar button, three-finger tap
- Dirty-rect history (stores only changed region per stroke); max stack depth enforced
- Timelapse snapshot captured after strokes changing ≥ 0.1% of pixels

---

## Reference Image

- Load any image file (toolbar button)
- Displayed in draggable floating panel
- Pan + pinch-zoom within the panel
- Click to sample color → primary
- Persists between sessions (saved as JPEG 0.9 quality in IDB `empedrat-ref`)

---

## Timelapse

- Composite snapshot auto-captured per qualifying stroke
- Preview modal: play/pause, scrub slider, speed control (33–500 ms/frame)
- Export as `.webm` via `MediaRecorder` + `captureStream(30)`
- Clear all frames (confirm dialog)
- Frames saved/loaded inside `.empedrat` ZIP

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `p` | Pencil |
| `e` | Eraser |
| `f` | Fill |
| `g` | Gradient |
| `i` | Eyedropper |
| `l` | Line |
| `r` | Rectangle |
| `o` | Ellipse |
| `s` | Select |
| `m` | Toggle sidebar |
| `Shift+R` | Reset canvas rotation |
| `0` | Fit to view |
| `+` / `-` | Zoom in / out |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Ctrl+C/X/V` | Copy / Cut / Paste selection |
| `Escape` | Deselect / close flyout |

---

## PWA

- `manifest.json`, `apple-mobile-web-app-capable`, icon — installable on iOS/desktop
