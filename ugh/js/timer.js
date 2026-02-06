import { state } from "./state.js";
import { elements } from "./ui.js";
import { updateColors } from "./ui.js";

export function tick() {
  state.seconds--;

  if (state.seconds < 0) {
    state.seconds = 59;
    state.totalMinutes++;
    elements.roundInfo.innerText = `ROUND ${state.totalMinutes + 1}`;
    updateColors();
  }

  // Visual breathing for last 10s
  if (state.seconds < 10) {
    elements.timer.style.opacity = state.seconds % 2 === 0 ? "0.4" : "1";
  } else {
    elements.timer.style.opacity = "1";
  }

  elements.timer.innerText = state.seconds.toString().padStart(2, "0");
}
