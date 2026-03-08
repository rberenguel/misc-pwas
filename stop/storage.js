const STORAGE_KEY = "stop_history";

export function saveSession(data) {
  try {
    const history = getHistory();
    const now = Date.now();
    history.push({
      timestamp: now,
      dateStr: new Date(now).toISOString().split("T")[0],
      metrics: {
        goAcc:   data.goAcc,   // 0-100
        stopAcc: data.stopAcc, // 0-100
        avgRt:   data.avgRt,   // ms
        ssd:     data.ssd,     // ms
      },
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save session", e);
  }
}

export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const history = data ? JSON.parse(data) : [];
    return history.sort((a, b) => a.timestamp - b.timestamp);
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
}
