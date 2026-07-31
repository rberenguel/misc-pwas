# Future improvements

## Proper menu
Replace the current overlay with a real menu that has controls enabled (gamepad/keyboard navigable). Should handle track selection, race settings, and credits from one place.

## Mobile / touch
Compare with `../../flux` for reference. Touch areas (left = steer left, right = steer right, maybe a tap zone for gas) could work. Consider defaulting to accelerate-always to lower the skill floor — touch steering is hard enough without also managing the gas.

## Time attack & shareable challenges
Show elapsed time (in frames, not wall-clock, for reproducibility across hardware) at the end of a race alongside place. Allow encoding track seed, lap count, and best frame-time into a URL hash, so players can challenge each other to beat a specific run on a specific track.

## Better splash screen
The current one is minimal. A proper animated intro with the track rendering in the background, car driving in, and a bold title would set the tone.

## Hide the parameter tuning GUI
The dat.GUI panel is useful for development and for curious players, but shouldn't be visible by default. Gate it behind a console command (`window.showTuning?.()` or similar) so it stays accessible without cluttering the game UI.

## Bug: waypoint AI stuck after sharp-curve failure
On tight corners, waypoint AI cars sometimes overshoot so badly they end up off-track and never recover — they circle or sit stationary as if they crashed and died. The `_recovering` flag and off-track memory exist but aren't enough to rescue them in the worst cases. Likely needs a hard timeout: if speed is near zero for N frames while off-track, teleport/reset the car back to the nearest track centerline point.

## Code organisation
The game logic, rendering, and UI wiring are all tangled in `app.js`. Worth splitting into clearer modules — e.g. `race.js` for race state machine, `hud.js` for all DOM overlays, keeping `app.js` as thin bootstrap only.
