/* --- AUDIO SYNTHESIS MODULE --- */

let audioEnabled = false;
let audioCtx = null;

export function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

export function isAudioEnabled() {
  return audioEnabled;
}

export function toggleAudio() {
  initAudio();
  audioEnabled = !audioEnabled;
  return audioEnabled;
}

export function playTone(freq, dur, type = "sine", gainLevel = 0.12) {
  if (!audioEnabled || !audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(gainLevel, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (e) {
    console.warn('[Audio] Failed to play tone', e);
  }
}

export function playServeHit() {
  playTone(520, 0.12, "sine", 0.14);
}

export function playRallyHit(isFast = false) {
  playTone(isFast ? 460 : 420, 0.10, "sine", 0.12);
}

export function playBounce() {
  playTone(280, 0.06, "sine", 0.08);
}

export function playFaultSound() {
  playTone(180, 0.28, "sawtooth", 0.15);
}

export function playErrorSound() {
  playTone(150, 0.25, "sawtooth", 0.14);
}

export function playWinnerSound() {
  playTone(130, 0.35, "triangle", 0.16);
}
