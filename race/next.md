# Future improvements

## Proper menu
Replace the current overlay with a real menu that has controls enabled (gamepad/keyboard navigable). Should handle track selection, race settings, and credits from one place.

## Mobile / touch
Compare with `../../flux` for reference. Touch areas (left = steer left, right = steer right, maybe a tap zone for gas) could work. Consider defaulting to accelerate-always to lower the skill floor — touch steering is hard enough without also managing the gas.

## Time attack & shareable challenges ✓
Race time (frame-accurate, shown as m:ss.cc) displayed live in the HUD. On finish a centered overlay (matching the main menu style) shows place, time, challenge result (green beat / red miss), a copyable challenge URL, and a Next Race button. URL encodes `track`, `laps`, and `best` — loading it sets the lap count and shows the challenge target live in the HUD.

## Better splash screen
The current one is minimal. A proper animated intro with the track rendering in the background, car driving in, and a bold title would set the tone.

## Hide the parameter tuning GUI ✓
Gated behind `window.showTuning()` in the browser console, or append `&tuning` to any URL hash to auto-open it on load.

## Bug: waypoint AI stuck after sharp-curve failure ✓
If a waypoint AI car has near-zero speed off-track for 2 s, it is temporarily rescued by switching to spline mode (reliable centerline follower). Once it returns on-track, it hands back to waypoint mode.

## Code organisation
The game logic, rendering, and UI wiring are all tangled in `app.js`. Worth splitting into clearer modules — e.g. `race.js` for race state machine, `hud.js` for all DOM overlays, keeping `app.js` as thin bootstrap only.
