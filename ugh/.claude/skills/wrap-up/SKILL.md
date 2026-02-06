---
name: wrap-up
description: Pre-commit wrap-up for ugh — version bump, sanity checks, summary
disable-model-invocation: false
---

# Wrap-Up: Pre-Commit Checklist

Prepare the ugh PWA for commit.

## Your Responsibilities

1. **Version Bump**

   - Ask user which version bump type (patch/minor/major)
   - Read current version from `manifest.json` (root level)
   - Calculate new version and update it
   - **Never** bump without user approval

2. **README Sanity Check**

   - Review what changed during the session
   - If new features, UI changes, or behavior modifications were added, verify `README.md` exists and covers them
   - If anything is missing, flag it to the user (don't silently add docs — they may have already done it)

3. **manifest.json Sanity Check**

   - If any new icon sizes or resources were added, verify they're correctly referenced
   - Check `name`, `short_name`, `theme_color`, `background_color` are still appropriate
   - Verify `start_url` and `display` mode are correct

4. **Code Structure Check**

   - Verify all JS modules are properly imported/exported
   - If new JS files were added, ensure they're loaded in `index.html` or imported correctly
   - Check CSS changes don't break mobile viewport or fullscreen experience

5. **Summary Report**

   - Show version bump: e.g. `0.1.0 → 0.2.0`
   - List what changed this session (UI, timer logic, history, etc.)
   - Flag anything that still needs attention
   - Ready for commit

## Key Files

- `manifest.json` — PWA manifest with version, name, icons, theme
- `index.html` — main HTML structure and screen layout
- `css/style.css` — styles for timer, screens, buttons
- `js/app.js` — main entry point and event handlers
- `js/workout.js` — workout state machine (start/pause/resume/finish)
- `js/timer.js` — timer tick logic and round progression
- `js/history.js` — session storage and export
- `js/state.js` — global state management
- `js/ui.js` — UI updates and wake lock

6. **Code Formatting**

   - Run `prettier . --write` in the repo root before commit (if prettier is configured)
