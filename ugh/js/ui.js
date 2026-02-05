export const elements = {
    body: null,
    startScreen: null,
    pauseScreen: null,
    historyScreen: null,
    deleteModal: null,
    timer: null,
    roundInfo: null,
    historyList: null
};

export function initElements() {
    elements.body = document.body;
    elements.startScreen = document.getElementById('start-screen');
    elements.pauseScreen = document.getElementById('pause-screen');
    elements.historyScreen = document.getElementById('history-screen');
    elements.deleteModal = document.getElementById('delete-modal');
    elements.timer = document.getElementById('timer');
    elements.roundInfo = document.getElementById('round-info');
    elements.historyList = document.getElementById('history-list');
}

export function updateColors() {
    const h = Math.floor(Math.random() * 360);
    const s = 85 + Math.random() * 15;
    const l = 45 + Math.random() * 15;

    document.documentElement.style.setProperty('--bg-color', `hsl(${h}, ${s}%, ${l}%)`);

    const isBrightHue = (h > 40 && h < 190);
    const isLight = l > 50;
    const textColor = (isBrightHue || isLight) ? '#000' : '#fff';

    document.documentElement.style.setProperty('--text-color', textColor);
}

export function resetColors() {
    document.documentElement.style.setProperty('--bg-color', '#000');
    document.documentElement.style.setProperty('--text-color', '#fff');
}

export async function toggleWakeLock(active) {
    if ('wakeLock' in navigator) {
        try {
            const { state } = await import('./state.js');
            if (active && !state.wakeLock) {
                state.wakeLock = await navigator.wakeLock.request('screen');
            } else if (!active && state.wakeLock) {
                state.wakeLock.release();
                state.wakeLock = null;
            }
        } catch (e) {
            console.log('Wake lock error:', e);
        }
    }
}
