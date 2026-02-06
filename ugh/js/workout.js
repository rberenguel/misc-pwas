import { STATE, state } from "./state.js";
import { elements, updateColors, resetColors, toggleWakeLock } from "./ui.js";
import { tick } from "./timer.js";
import { saveSession } from "./history.js";

async function countdown() {
  return new Promise((resolve) => {
    let count = 3;
    elements.timer.innerText = count.toString();
    elements.timer.style.fontSize = "28vmin";
    elements.roundInfo.style.display = "none";

    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        elements.timer.innerText = count.toString();
      } else {
        clearInterval(countdownInterval);
        elements.timer.style.fontSize = "42vmin";
        resolve();
      }
    }, 1000);
  });
}

export async function startWorkout() {
  state.current = STATE.COUNTDOWN;

  // Reset Values
  state.seconds = 60;
  state.totalMinutes = 0;
  elements.timer.innerText = "3";
  elements.roundInfo.innerText = "ROUND 1";

  // UI
  elements.startScreen.classList.add("hidden");
  updateColors();

  // Wake Lock
  await toggleWakeLock(true);

  // Countdown
  await countdown();

  // Start running
  state.current = STATE.RUNNING;
  elements.timer.innerText = "00";
  elements.roundInfo.style.display = "block";

  // Loop
  clearInterval(state.timerInterval);
  state.timerInterval = setInterval(tick, 1000);
}

export function pauseWorkout() {
  state.current = STATE.PAUSED;
  clearInterval(state.timerInterval);
  elements.pauseScreen.style.display = "flex";
}

export async function resumeWorkout() {
  state.current = STATE.COUNTDOWN;
  elements.roundInfo.style.display = "none";
  elements.timer.innerText = "3";
  elements.timer.style.fontSize = "28vmin";
  elements.pauseScreen.style.display = "none";
  await toggleWakeLock(true);

  // Countdown
  await countdown();

  // Start running
  state.current = STATE.RUNNING;
  elements.timer.innerText = state.seconds.toString().padStart(2, "0");

  // Loop
  state.timerInterval = setInterval(tick, 1000);
}

export async function cancelWorkout() {
  state.current = STATE.IDLE;
  clearInterval(state.timerInterval);
  await toggleWakeLock(false);

  // UI Reset (no save)
  elements.pauseScreen.style.display = "none";
  elements.startScreen.classList.remove("hidden");

  // Reset visual to black
  resetColors();
}

export async function finishWorkout() {
  state.current = STATE.IDLE;
  clearInterval(state.timerInterval);
  await toggleWakeLock(false);

  // Save Data if meaningful time passed
  const rounds =
    state.seconds < 60 ? state.totalMinutes + 1 : state.totalMinutes;
  if (rounds > 0) saveSession(rounds);

  // UI Reset
  elements.pauseScreen.style.display = "none";
  elements.startScreen.classList.remove("hidden");

  // Reset visual to black
  resetColors();
}
