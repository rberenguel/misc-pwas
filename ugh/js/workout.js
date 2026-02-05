import { STATE, state } from './state.js';
import { elements, updateColors, resetColors, toggleWakeLock } from './ui.js';
import { tick } from './timer.js';
import { saveSession } from './history.js';

export async function startWorkout() {
    state.current = STATE.RUNNING;

    // Reset Values
    state.seconds = 60;
    state.totalMinutes = 0;
    elements.timer.innerText = "00";
    elements.roundInfo.innerText = "ROUND 1";

    // UI
    elements.startScreen.classList.add('hidden');
    updateColors();

    // Wake Lock
    await toggleWakeLock(true);

    // Loop
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(tick, 1000);
}

export function pauseWorkout() {
    state.current = STATE.PAUSED;
    clearInterval(state.timerInterval);
    elements.pauseScreen.style.display = 'flex';
}

export async function resumeWorkout() {
    state.current = STATE.RUNNING;
    elements.pauseScreen.style.display = 'none';
    await toggleWakeLock(true);
    state.timerInterval = setInterval(tick, 1000);
}

export async function cancelWorkout() {
    state.current = STATE.IDLE;
    clearInterval(state.timerInterval);
    await toggleWakeLock(false);

    // UI Reset (no save)
    elements.pauseScreen.style.display = 'none';
    elements.startScreen.classList.remove('hidden');

    // Reset visual to black
    resetColors();
}

export async function finishWorkout() {
    state.current = STATE.IDLE;
    clearInterval(state.timerInterval);
    await toggleWakeLock(false);

    // Save Data if meaningful time passed
    const rounds = state.seconds < 60 ? state.totalMinutes + 1 : state.totalMinutes;
    if (rounds > 0) saveSession(rounds);

    // UI Reset
    elements.pauseScreen.style.display = 'none';
    elements.startScreen.classList.remove('hidden');

    // Reset visual to black
    resetColors();
}
