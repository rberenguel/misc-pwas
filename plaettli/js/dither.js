const BAYER8 = [
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];

// 14 presets: Solid + 13 Bayer8 at 4/64 steps, range 52/64..4/64
const PRESET_DENSITIES = [52,48,44,40,36,32,28,24,20,16,12,8,4].map(n => n / 64);

export const DITHER_PRESETS = [
  { label: 'Solid', solid: true },
  ...PRESET_DENSITIES.map((d, i) => ({ label: `#${i + 1}`, solid: false, density: d })),
];

// Returns true if canvas pixel (x,y) should be drawn for the given preset index
export function shouldDraw(x, y, presetIdx) {
  const p = DITHER_PRESETS[presetIdx];
  if (!p || p.solid) return true;
  const t = (BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
  return p.density > t;
}

// Project canvas point onto segment A->B, return t in [0,1]
export function projectOntoSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return 0;
  return Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
}

// Gradient dither between two colors using preset
export function ditherGradientPx(x, y, t, c0, c1, presetIdx) {
  const p = DITHER_PRESETS[presetIdx];
  if (!p || p.solid) return t > 0.5 ? c1 : c0;
  const threshold = (BAYER8[(y & 7) * 8 + (x & 7)] + 0.5) / 64;
  return t > threshold ? c1 : c0;
}
