export const STATE = {
  IDLE: "idle",
  COUNTDOWN: "countdown",
  RUNNING: "running",
  PAUSED: "paused",
};

export const state = {
  current: STATE.IDLE,
  seconds: 60,
  totalMinutes: 0,
  timerInterval: null,
  wakeLock: null,
  pendingDeleteIdx: null,
};
