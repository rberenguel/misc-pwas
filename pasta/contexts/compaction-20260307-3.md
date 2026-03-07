# Session Compaction Summary

## User Intent

- Fix `edit` command not preserving tags correctly.
- Add a `copy`/`cp` command to copy all visible snippets.
- Add version `0.1.0` to `manifest.json` and display it in the `help` output.

## Contextual Work Summary

### Bug Fix: `edit` tag preservation

- `edit` was appending existing tags (e.g. `!foo`) to the prepopulated `mod` command.
- Since `mod` toggles tags, this caused all existing tags to be removed on submit.
- Fix: removed the tag string from the `edit`-generated `mod` command (app.js:283).
- Tags are now left untouched unless explicitly toggled via a standalone `mod` call.

### New Command: `copy`/`cp`

- Copies all currently visible snippets (per `rowMap`) to the clipboard.
- Contents are joined with `\n\n` (blank line between each).
- Added to the command handler in `app.js` and documented in `help`.

### Versioning

- Updated `manifest.json` version from `0.0.1` → `0.1.0`.
- Added `appVersion` fetch at startup (reads from `manifest.json`).
- `help` output now shows **Pasta v0.1.0** using the fetched version.

## Files Touched

- **app.js**: Fixed `edit` tag bug, added `copy`/`cp` handler, added `appVersion` fetch, updated help text.
- **manifest.json**: Bumped version to `0.1.0`.
