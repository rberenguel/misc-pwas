# Neon Rally

A browser-based top-down arcade racer built with PixiJS. Drift-heavy physics inspired by Gene Rally, procedural tracks, shareable track IDs, and AI opponents that learn from their mistakes.

[Play it](#) — or paste a track hash like `#track=X7kP9m` to race a specific circuit.

---

## Quick Start

```bash
# Serve with any static file server
npx serve .
# or
python3 -m http.server 8080
```

Open `http://localhost:8080` and click **OK** on the controls overlay to start.

---

## Controls

| Key | Action |
|---|---|
| `↑` / `↓` | Gas / Brake |
| `←` / `→` | Steer |
| `Space` / `Esc` | Pause |
| `D` | Toggle debug panel |

---

## Gameplay

- **Grid start**: You begin 6th (last). Five AI cars start ahead of you.
- **Race starts are bunched**: Launch stiction makes the first second a slow crawl — grid position matters.
- **Drafting**: Tuck in behind an AI on a straight to gain +1.5 speed. Pull out and overtake.
- **Cornering**: The AI pre-brakes for corners. You must match that discipline — hard steering at high speed causes understeer.
- **5 laps** by default. Change in the tuning panel.

---

## Track Sharing

Every generated track gets a unique 6-character ID (e.g. `aB3xK9`). The URL auto-updates to `#track=aB3xK9`. Share that link — anyone who opens it gets the exact same track.

You can also type a track ID into the **Parameter Tuning** panel and hit Enter.

---

## AI Opponents

Each of the 5 AI cars has a randomized personality:

- **Risk factor** (0.2–1.0): Cautious cars brake early; aggressive ones carry speed into corners and sometimes crash.
- **Line offset** (inside ↔ outside): They take different racing lines.
- **Grip** (0.03–0.05): Low-grip cars slide more and leave skid marks.
- **Max speed** (9.5–10.5): Some are faster on straights.

### AI Learning

AI cars remember where they went off-track or got stuck. On the next lap, they brake earlier and take a tighter line through those segments. The memory slowly decays, so a car that masters a corner will gradually speed back up.

Watch the browser console for `[LEARN]` and `[USE]` events.

---

## Architecture

| File | Role |
|---|---|
| `app.js` | Game loop, UI, track sharing, minimap, race state |
| `car.js` | Shared physics for player and AI (acceleration, grip, drift, off-track handling) |
| `ai.js` | Waypoint following, curvature-based braking, learning memory, draft detection |
| `track.js` | Procedural track generation (Catmull-Rom splines), seeded PRNG, track ID encoding |
| `renderer.js` | Car sprites, camera, particles, skid marks |
| `index.html` | Entry point, PixiJS 8 + lil-gui import map |

---

## License

MIT
