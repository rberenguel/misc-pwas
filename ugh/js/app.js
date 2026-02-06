import { STATE, state } from "./state.js";
import { elements, initElements, toggleWakeLock } from "./ui.js";
import {
  startWorkout,
  pauseWorkout,
  resumeWorkout,
  cancelWorkout,
  finishWorkout,
} from "./workout.js";
import { renderHistory, deleteSession, exportHistory } from "./history.js";

function initEventListeners() {
  // Body click handler
  elements.body.addEventListener("click", (e) => {
    // Safety: If we clicked a button or history toggle, ignore
    if (e.target.closest(".btn") || e.target.closest("#history-toggle")) return;

    // State-based handling
    if (state.current === STATE.RUNNING) {
      pauseWorkout();
    } else if (state.current === STATE.IDLE) {
      if (!elements.startScreen.classList.contains("hidden")) {
        startWorkout();
      }
    }
  });

  // Pause screen buttons
  document.getElementById("btn-resume").addEventListener("click", (e) => {
    e.stopPropagation();
    resumeWorkout();
  });

  document.getElementById("btn-cancel").addEventListener("click", (e) => {
    e.stopPropagation();
    cancelWorkout();
  });

  document.getElementById("btn-finish").addEventListener("click", (e) => {
    e.stopPropagation();
    finishWorkout();
  });

  // History toggle
  document.getElementById("history-toggle").addEventListener("click", (e) => {
    e.stopPropagation();
    renderHistory();
    elements.historyScreen.style.display = "flex";
  });

  // History screen buttons
  document
    .getElementById("btn-export-history")
    .addEventListener("click", async (e) => {
      e.stopPropagation();
      await exportHistory();
    });

  document
    .getElementById("btn-close-history")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      elements.historyScreen.style.display = "none";
    });

  // Delete confirmation modal
  document
    .getElementById("btn-confirm-delete")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      if (state.pendingDeleteIdx !== null) {
        deleteSession(state.pendingDeleteIdx);
        state.pendingDeleteIdx = null;
      }
      elements.deleteModal.style.display = "none";
    });

  document
    .getElementById("btn-cancel-delete")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      state.pendingDeleteIdx = null;
      elements.deleteModal.style.display = "none";
    });

  // Visibility change handler
  document.addEventListener("visibilitychange", () => {
    if (
      document.visibilityState === "visible" &&
      state.current === STATE.RUNNING
    ) {
      toggleWakeLock(true);
    }
  });
}

// Initialize app
initElements();
initEventListeners();
