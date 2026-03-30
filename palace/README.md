# Palace

Mobile-first PWA for training the [Major System](https://en.wikipedia.org/wiki/Mnemonic_major_system) as a real-time mental scratchpad.

## Modes

**Mode 1 — Major System** (`book-bookmark`): Flashcard drill, numbers 1–100 → peg word. Self-graded pass/fail. Shows consonant hints on reveal (e.g. 42 → R · N).

**Mode 2 — Sequence** (`list-numbers`): Memorise a sequence of random icons, then recall them in order from a 100-icon grid. Timed. A perfect 100-icon run is the main performance benchmark.

**Mode 3 — Recall** (`list-magnifying-glass`): Random pegs paired with random icons. Tests retrieval out of order. Includes ghost pegs (never encoded) to force confident "Slot is Empty" answers.

## Stats

Per-mode stats with per-peg heatmaps, ML-style Recall/Precision/Specificity metrics for Mode 3, and a radar chart showing which area needs the most attention. Data persists in IndexedDB. Export/import via JSON.

## Dev

```
# Regenerate service worker cache list after adding files
go run get_cache.go
# Then paste output into sw.js CACHE_FILES and bump CACHE_NAME version
```

No build step. Serve any static file server from the project root.
