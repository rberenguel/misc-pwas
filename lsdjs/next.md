# Next: LSDJ Web Instrument Workbench

## Goal
A browser-based instrument laboratory that mirrors LSDJ's actual instrument workflow as closely as possible — without becoming a full tracker. The focus stays on **timbre design**: dial in an instrument, preview it instantly, tweak it until it feels right, then copy the settings to paste into the real thing.

---

## Done

- ✅ **Authentic LFSR noise synthesis** — `Math.random()` replaced with real DMG-01 15-bit LFSR + NR43 clock divisors + short/long mode
- ✅ **All-assets-cached PWA** — `manifest.json`, `sw.js`, update banner, `icon.png` header logo, pure-black theme
- ✅ **Pure black palette** — `#000000` backgrounds, `#050505` cards, no blue-grey left anywhere
- ✅ **Mobile-first layout** — tight padding, compact nav with separators, stacked command cards on phone
- ✅ **Prose rewritten** — all informational text passes prose-orchestrator rules (Zinsser / STE / Clark)

---

## Remaining

### 1. Table Step Editor (The Missing Piece)

Tables are where LSDJ instruments come alive. Add a **step sequencer editor**:

- 16 rows (00–0F), matching LSDJ table screen
- Per row: `CMD1`, `CMD2`, `VOLUME`, `TRANSP`
- Each cell accepts LSDJ commands: `S`, `P`, `C`, `H`, `V`, `L`, `R`, `O`, `W`, etc.
- As you edit rows, the **live preview re-triggers** with the new table sequence
- This is the single most important feature for making the tool feel like real LSDJ

### 2. Instrument Editor Panel (New UI)

Instead of static preset cards with a modal inspector, create a **persistent two-column layout**:

- Left: **Instrument List** (like LSDJ's Instrument screen) — click to load one into the editor
- Right: **Live Editor** with controls that match LSDJ's actual fields:
  - `TYPE` — PULSE / WAVE / NOISE / KIT
  - `ENVELOPE` — two hex digits as a single field (e.g. `D1`)
  - `WAVE` / `SHAPE` — duty cycle for pulse, noise shape for noise
  - `P/L/V` — pitch/slide/vibrato mode selector
  - `SYNTH` — which synth RAM table to use (wave channel)
  - `PLAY` — loop / once / ping-pong
  - `TABLE` — link to a table number

Every parameter change triggers an **immediate live preview** of the instrument. No button press needed.

### 3. Waveform Editor (Wave Channel)

For wave channel instruments, the 32-sample waveform is half the sound. Add a **simple wave editor**:

- 32 vertical bars representing the 4-bit sample values (0–15)
- Draw with mouse to sculpt the waveform
- Preview updates instantly
- Presets: sine, square, saw, triangle, and a few classic LSDJ waves

### 4. Phrase-Aware Preview (Short-Term Wish)

Some instruments only make sense in context: a table arpeggio depends on the root note, a pitch sweep depends on the starting frequency. Add a **simple phrase sequencer** below the editor:

- 16 steps, single channel
- Each step: note + instrument + command (e.g. `C-3` + `I01` + `K00`)
- A play button loops the phrase so you hear how the instrument behaves across note changes, note cuts, and phrases
- Keep it minimal: one channel, no song structure, no chains. Just a sandbox to test an instrument in a short musical context.

### 5. Export / Copy Settings

When an instrument is dialed in, provide **one-click copy**:

- Instrument screen values as a compact string (e.g. `PULSE, C2, 25%, T:02`)
- Full table sequence as copy-pasteable text
- Optional: generate a `.sav` snippet or raw hex dump for advanced users

### 6. Visual Polish

- Consider a **DMG-01 LCD green** optional theme for nostalgia
- Monospace everywhere — LSDJ is a text-based interface at its core
- The pure-black theme is now the default; refine accent contrast if needed

---

## Non-Goals (Resist Scope Creep)

- No multi-channel sequencing (this is not a tracker)
- No song / chain / phrase structure beyond a single test phrase
- No sample import (KIT channel)
- No save/load of full projects (just individual instruments / tables)
- No MIDI input or DAW integration

The rule: if it requires thinking about composition structure, it is out of scope. This is a **sound design sandbox**, not a DAW.
