# Product & Architecture Design Bible: Pixel Editor (v0 $\to$ v1)

A browser-native, zero-dependency pixel art studio built with vanilla HTML5, CSS3, and modern JavaScript. Optimized for high-fidelity dithering, urban sketching workflows, touch/stylus ergonomics, and direct embedding into a native iOS WebKit container.

---

Some existing tooling:
- LOSPEC from-image palette importer in ~/code/tessella
- Wide suite of fonts to start with in palace/ (here in misc-pwas)
- Installable PWA, refresh notification, etc also in palace/
- Canvas handling, touch, menus, etc can get some inspiration from ~/code/mos (basic pixel editor), ~/code/goita (advanced screenshot editor), ~/code/pinta (schema generator), ~/code/diag (basic diagramming tool)
---

## 1. Document & Memory Architecture

The core uses a composite raster document model. To ensure high drawing performance on up to 800×600 canvases, all layer data resides in packed 32-bit typed arrays (`Uint32Array` backed by a shared `ArrayBuffer` per layer).

### 1.1 Data Schema

```typescript
interface DocumentModel {
  width: number;             // e.g., 100 to 800
  height: number;            // e.g., 75 to 600
  activeFrameIndex: number;  // 0 in v0
  activeLayerId: string;
  palette: Uint32Array;      // Active palette colors stored as 0xAABBGGRR
  frames: Frame[];
}

interface Frame {
  id: string;
  durationMs: number;        // Future-proofing for v1 animation
  layers: Layer[];
}

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;           // 0.0 to 1.0
  blendMode: 'source-over';  // Extendable to multiply, overlay in v1
  buffer: Uint32Array;       // Length = width * height (0xAABBGGRR)
}

```

### 1.2 Color Encoding

Colors are stored in little-endian format as `0xAABBGGRR`. This allows single-cycle `Uint32` assignment (`buffer[y * width + x] = packedColor`) without per-channel overhead.

---

## 2. Rendering Pipeline & Viewport

```
[ Active Layer Uint32Array ] ──┐
[ Inactive Layer 1 Buffer  ] ──┼─> [ Compositor Canvas ] ──> [ Viewport Canvas ]
[ Inactive Layer 2 Buffer  ] ──┘   (Offscreen 1:1)           (CSS Scaled & Transformed)

```

1. **Offscreen Compositor:** An offscreen `CanvasRenderingContext2D` matching document bounds ($W \times H$). Layers composite sequentially from bottom to top using their respective opacities.
2. **Display Viewport:** A full-window DOM `<canvas>` styled with:
```css
canvas.viewport {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  touch-action: none;
  position: absolute;
  will-change: transform;
}

```


3. **Camera Transform Matrix:** Viewport pan and zoom are executed via hardware-accelerated CSS transforms:

$$\text{transform} = \text{translate3d}(T_x\text{px},\, T_y\text{px},\, 0)\;\text{scale}(S)$$



This decouples rendering resolution from touch-panning frame rates.

---

## 3. Dithering Engine Specifications

Brushes and gradients apply Bayer matrix threshold evaluation anchored to **canvas coordinates** so patterns remain coherent across multiple overlapping brush strokes.

### 3.1 Bayer Threshold Matrix Formulation

For an $M \times M$ matrix, the coordinate threshold is:


$$T = \frac{B_M(x \bmod M,\, y \bmod M) + 0.5}{M^2}$$

* Supported matrices: $2\times2$, $4\times4$, $8\times8$, and custom checkerboard kernels.

### 3.2 Dither Modes & Ramps

* **Two-Color Mask:** Primary Color ($C_1$) dithered against Secondary Color / Transparent ($C_2$).
* **Multi-Stop Ramp Gradient:**
* User defines stops: $S_0, S_1, \dots, S_n$ with positions $P_i \in [0.0, 1.0]$.
* Linear space vector: Given start point $A(x_1, y_1)$ and end point $B(x_2, y_2)$, project coordinate $P(x, y)$ onto segment $AB$ to compute progression $t \in [0.0, 1.0]$.
* Identify bounding stops $S_k$ and $S_{k+1}$ such that $P_k \le t \le P_{k+1}$.
* Compute local ratio:

$$r = \frac{t - P_k}{P_{k+1} - P_k}$$


* Compare $r$ against matrix threshold $T$: if $r > T$, paint $S_{k+1}$; otherwise paint $S_k$.



---

## 4. Input Handling & Touch Architecture

The engine uses standard `PointerEvents` to support mouse, fingers, and stylus without third-party frameworks.

| Interaction | Gesture / Event | Implementation Details |
| --- | --- | --- |
| **Draw / Paint** | 1-Finger / Stylus Drag | `pointerdown`, `pointermove`, `pointerup` on viewport. Active pointer is locked via `setPointerCapture`. Bresenham line interpolation fills gaps during fast drags. |
| **Pan & Zoom** | 2-Finger Drag / Pinch | Multi-touch detected via `event.touches.length === 2`. Calculates touch midpoint for pan delta and distance ratio for zoom scale $S$. |
| **Eyedropper** | Long-Press Hold (250ms) | Hold timer starts on `pointerdown`. If drag distance $< 3\text{px}$ during the window, paint cancels and a floating circular magnifying loupe opens. Sample read directly from composite buffer. |
| **Reference Eyedrop** | Tap / Hold on Ref Window | Reads directly from the reference image buffer independent of canvas zoom. |

---

## 5. Toolset & Operational Specs (v0)

* **Pencil / Dither Brush:** Bresenham's line algorithm running over the active layer's `Uint32Array`. Applies matrix dither based on the brush's active threshold mask.
* **Eraser:** Clears target bits to `0x00000000` (transparent). Supports standard square/round tips and patterned dither erasure.
* **Flood Fill:** Scanline 4-way stack-based flood fill with optional tolerance checking against target `Uint32` color.
* **Dither Gradient:** Click/drag vector overlay with live preview; commits the calculated pattern to the active layer buffer on release.
* **Palette Manager:**
* Free 24-bit RGB/HSV color picker.
* Direct Lospec palette loader (fetches or parses PNG Lospec palette sheets by sampling unique pixel values).
* Palette export/import as native JSON and PNG swatches.


* **Floating Reference Image:**
* Draggable, resizable floating picture-in-picture (PiP) panel overlay.
* Internal touch pan/zoom tracking for the reference view.
* Sampleable via the long-press Eyedropper.



---

## 6. Timelapse Engine & History Stack

To balance memory constraints and instant undo capabilities on mobile Safari:

* **Undo/Redo History:** Action-based dirty-rect delta buffer. On `pointerdown`, record target area bounds; on `pointerup`, store only the before/after slices of modified `Uint32` rects.
* **Timelapse Snapshot Log:**
* Triggers strictly on stroke end (`pointerup`).
* If the active layer buffer was modified, capture the complete composite canvas as an offscreen frame.
* Store frames as compressed `ImageBitmap` instances or binary PNG blobs in memory to avoid garbage collection spikes.


* **Video Export Pipeline:**
* Replays stored keyframes onto a dedicated export canvas upscaled to target output (e.g., 1080p, 4K) using `ctx.imageSmoothingEnabled = false`.
* Encodes to video using `canvas.captureStream(30)` pumped into `MediaRecorder` (`video/mp4` or `video/webm`).



---

## 7. Export Pipeline

* **Upscaled PNG:** Nearest-neighbor software scaling from 1:1 up to 20×. Pixel-perfect rendering:
```javascript
const exportCanvas = document.createElement('canvas');
exportCanvas.width = doc.width * scaleFactor;
exportCanvas.height = doc.height * scaleFactor;
const ctx = exportCanvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.drawImage(compositorCanvas, 0, 0, exportCanvas.width, exportCanvas.height);

```


* **Lossless Project JSON:** Serializes width, height, palette values, and base64-encoded/RLE layer buffers for seamless reloading.

---

## 8. Version 0 to Version 1 Migration Roadmap

```
+-------------------------------------------------------------+
|                          VERSION 0                          |
|  - 1 Frame                                                  |
|  - Multi-Layer Support (Uint32Array)                        |
|  - Dither Matrix System (Ramps & Brushes)                   |
|  - Touch / Stylus Navigation Engine                         |
|  - Stroke-Driven Timelapse Engine                           |
+-------------------------------------------------------------+
                              │
                              ▼
+-------------------------------------------------------------+
|                          VERSION 1                          |
|  - Timeline UI Panel (Frame Navigation & Scrubbing)         |
|  - Frame Duplication & Onion Skinning (Compositor passes)   |
|  - Native WebKit App Wrapper (Capacitor / Swift WebView)   |
|  - Apple Pencil Pressure -> Dynamic Dither Thresholds       |
|  - Animated GIF / APNG / Sprite Sheet Exporters             |
+-------------------------------------------------------------+

```

Because frames and layers are already decoupled inside `DocumentModel`, migrating to v1 requires adding the visual timeline slider and looping the compositor across `frames[i]`—with zero changes to the underlying drawing, dithering, or history systems.