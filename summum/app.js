import { initHaptic, triggerHaptic, triggerHapticError } from "./haptic.js";

// --- State ---
let gameState = "idle"; // 'idle', 'playing', 'paused'
let currentDigit = null;
let previousDigit = null;
let intervalMs = 3000;
let fastestInterval = 3000;

let streak = 0;
let correct = 0;
let total = 0;

let hasAnsweredCurrent = true;
let timerId = null;

let keyBuffer = "";
let keyTimeout = null;

// --- DOM Elements ---
const elAcc = document.getElementById("ui-acc");
const elStreak = document.getElementById("ui-streak");
const elPace = document.getElementById("ui-pace");
const elBest = document.getElementById("ui-best");
const elProgress = document.getElementById("progress-bar");
const elDisplayArea = document.getElementById("display-area");
const elIdleText = document.getElementById("idle-text");
const elDigit = document.getElementById("digit");
const elStatus = document.getElementById("status-text");
const elNumpad = document.getElementById("numpad");

let numpadButtons = [];
let btnPlay = null;

// --- Icons ---
const playIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const pauseIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
const resetIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`;

// --- Initialization ---
function initNumpad() {
  for (let i = 2; i <= 18; i++) {
    const btn = document.createElement("button");
    btn.className = "numpad-btn";
    btn.innerText = i;
    btn.onclick = () => handleInput(i);
    btn.disabled = true;
    numpadButtons.push(btn);
    elNumpad.appendChild(btn);
  }

  // Add controls wrapper
  const controlsWrapper = document.createElement("div");
  controlsWrapper.className = "controls-wrapper";

  btnPlay = document.createElement("button");
  btnPlay.className = "control-btn play-btn";
  btnPlay.innerHTML = playIcon;
  btnPlay.onclick = togglePlayState;

  const btnReset = document.createElement("button");
  btnReset.className = "control-btn reset-btn";
  btnReset.innerHTML = resetIcon;
  btnReset.onclick = resetGame;

  controlsWrapper.appendChild(btnPlay);
  controlsWrapper.appendChild(btnReset);
  elNumpad.appendChild(controlsWrapper);
}

// --- Core Logic ---
function handleTick() {
  // Check for missed answer
  if (!hasAnsweredCurrent && previousDigit !== null) {
    handleError("miss");
  } else {
    updateFeedback("none");
  }

  // Generate next
  previousDigit = currentDigit;
  currentDigit = Math.floor(Math.random() * 9) + 1;

  // If previous is null, this is the very first digit, no answer expected yet
  hasAnsweredCurrent = previousDigit === null;

  updateUI();
  startProgressBar();

  timerId = setTimeout(handleTick, intervalMs);
}

function handleInput(val) {
  if (gameState !== "playing" || hasAnsweredCurrent || previousDigit === null)
    return;

  const expectedSum = previousDigit + currentDigit;

  if (val === expectedSum) {
    correct++;
    total++;
    updateFeedback("correct");

    streak++;
    if (streak > 0 && streak % 2 === 0) {
      // Fast speed up: drop interval by 25%
      intervalMs = Math.max(500, Math.round(intervalMs * 0.75));
      fastestInterval = Math.min(fastestInterval, intervalMs);
    }
  } else {
    handleError("wrong");
  }

  hasAnsweredCurrent = true;
  updateUI();
}

function handleError(type) {
  total++;
  streak = 0;
  updateFeedback(type);
  // Slow down: only increase interval by 5% on a miss
  intervalMs = Math.min(5000, Math.round(intervalMs * 1.05));
}

// --- UI Updates ---
function updateUI() {
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  elAcc.innerText = accuracy;

  elStreak.innerText = streak;
  elStreak.className = streak >= 4 ? "streak-hot" : "";

  elPace.innerText = (intervalMs / 1000).toFixed(2);
  elBest.innerText = (fastestInterval / 1000).toFixed(2);

  if (gameState === "idle") {
    elIdleText.classList.remove("hidden");
    elDigit.classList.add("hidden");
  } else {
    elIdleText.classList.add("hidden");
    elDigit.classList.remove("hidden");
    elDigit.innerText = currentDigit !== null ? currentDigit : "?";

    // Retrigger pop animation
    elDigit.classList.remove("animate-pop");
    void elDigit.offsetWidth; // trigger reflow
    elDigit.classList.add("animate-pop");
  }

  numpadButtons.forEach((btn) => (btn.disabled = gameState !== "playing"));
  btnPlay.innerHTML = gameState === "playing" ? pauseIcon : playIcon;
}

function updateFeedback(type) {
  elDigit.className = "digit-text animate-pop ";
  elDisplayArea.className = "display-area ";

  if (type === "correct") {
    elDigit.classList.add("text-correct");
    elDisplayArea.classList.add("border-correct");
    elStatus.innerText = "";
    triggerHaptic();
  } else if (type === "wrong" || type === "miss") {
    elDigit.classList.add("text-wrong");
    elDisplayArea.classList.add("border-wrong");
    elStatus.innerText = type === "miss" ? "Missed!" : "Wrong!";
    triggerHapticError();
  } else {
    elDigit.classList.add("text-normal");
    elDisplayArea.classList.add("border-normal");
    elStatus.innerText = gameState === "paused" ? "Paused" : "";
  }
}

function startProgressBar() {
  elProgress.style.transition = "none";
  elProgress.style.width = "100%";

  // Force reflow
  void elProgress.offsetWidth;

  elProgress.style.transition = `width ${intervalMs}ms linear`;
  elProgress.style.width = "0%";
}

function stopProgressBar() {
  elProgress.style.transition = "none";
  // Calculate remaining width based on computed style if we wanted true pause/resume,
  // but simpler to just snap to 0 or 100 for this type of rapid game.
}

// --- Controls ---
function togglePlayState() {
  triggerHaptic();
  if (gameState === "playing") {
    gameState = "paused";
    clearTimeout(timerId);
    stopProgressBar();
    updateFeedback("none");
  } else {
    let wasIdle = gameState === "idle";
    gameState = "playing";
    updateFeedback("none");
    if (wasIdle) {
      handleTick();
    } else {
      // Restart current tick
      startProgressBar();
      timerId = setTimeout(handleTick, intervalMs);
    }
  }
  updateUI();
}

function resetGame() {
  triggerHaptic();
  clearTimeout(timerId);
  gameState = "idle";
  currentDigit = null;
  previousDigit = null;
  intervalMs = 3000;
  fastestInterval = 3000;
  streak = 0;
  correct = 0;
  total = 0;
  hasAnsweredCurrent = true;

  elProgress.style.transition = "none";
  elProgress.style.width = "100%";

  updateFeedback("none");
  updateUI();
}

// --- Keyboard Support ---
window.addEventListener("keydown", (e) => {
  if (gameState !== "playing") return;

  if (e.key >= "0" && e.key <= "9") {
    keyBuffer += e.key;

    if (keyTimeout) clearTimeout(keyTimeout);

    if (
      keyBuffer.length === 2 ||
      (keyBuffer !== "1" && keyBuffer.length === 1)
    ) {
      const val = parseInt(keyBuffer, 10);
      handleInput(val);
      keyBuffer = "";
    } else {
      keyTimeout = setTimeout(() => {
        const val = parseInt(keyBuffer, 10);
        if (!isNaN(val)) handleInput(val);
        keyBuffer = "";
      }, 300);
    }
  }
});

// Run Init
initHaptic();
initNumpad();
updateUI();
