const STORAGE_KEY = "summum_history";

export function saveSessionRecord(sessionData) {
  try {
    const history = getHistory();
    const now = Date.now();
    const dateStr = new Date(now).toISOString().split("T")[0];

    const record = {
      timestamp: now,
      dateStr: dateStr,
      metrics: {
        accuracy: sessionData.accuracy,
        finalPace: sessionData.finalPace,
        bestPace: sessionData.bestPace,
      },
    };

    history.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save session record", e);
  }
}

export function getHistory() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const history = data ? JSON.parse(data) : [];
    // Sort by timestamp just in case
    return history.sort((a, b) => a.timestamp - b.timestamp);
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
}
