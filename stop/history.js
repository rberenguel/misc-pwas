import { getHistory } from "./storage.js";

let currentViewDate = new Date();
let currentSessions = [];

export function openHistoryModal() {
  currentSessions = getHistory();
  currentViewDate = new Date();
  const modal = document.getElementById("history-modal");
  const list  = document.getElementById("history-list");

  if (currentSessions.length === 0) {
    list.innerHTML = "<p style='text-align:center;opacity:0.7;margin-top:2rem;'>No sessions yet. Play a game!</p>";
    modal.classList.remove("hidden");
    return;
  }
  renderCalendar(currentSessions);
  modal.classList.remove("hidden");
}

function computeStreak(sessions) {
  if (!sessions.length) return 0;
  const daySet = new Set(sessions.map(s => {
    const d = new Date(s.timestamp);
    return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
  }));
  const check = new Date();
  check.setHours(0, 0, 0, 0);
  const key = d => d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
  if (!daySet.has(key(check))) check.setDate(check.getDate() - 1);
  let streak = 0;
  while (daySet.has(key(check))) { streak++; check.setDate(check.getDate() - 1); }
  return streak;
}

function renderCalendar(sessions) {
  const list  = document.getElementById("history-list");
  const year  = currentViewDate.getFullYear();
  const month = currentViewDate.getMonth();

  const byDate = {};
  sessions.forEach(s => {
    const d   = new Date(s.timestamp);
    const key = d.getFullYear() + "-" + String(d.getMonth()).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0");
    (byDate[key] = byDate[key] || []).push(s);
  });

  const firstDay   = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startDow = firstDay.getDay() - 1;
  if (startDow === -1) startDow = 6;

  const monthName = currentViewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const streak    = computeStreak(sessions);
  const today     = new Date();

  let html =
    '<div class="calendar-header">' +
      '<button class="calendar-nav" id="prev-month">&larr;</button>' +
      "<h3>" + monthName + "</h3>" +
      '<button class="calendar-nav" id="next-month">&rarr;</button>' +
    "</div>" +
    (streak > 0 ? '<div class="calendar-streak">&#x1F525; ' + streak + "-day streak</div>" : "") +
    '<div class="calendar-grid">' +
    ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => '<div class="calendar-day-header">' + d + "</div>").join("") ;

  for (let i = 0; i < startDow; i++) html += '<div class="calendar-day empty"></div>';

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  for (let day = 1; day <= daysInMonth; day++) {
    const key      = year + "-" + String(month).padStart(2,"0") + "-" + String(day).padStart(2,"0");
    const sessions = byDate[key] || [];
    const isToday  = isCurrentMonth && today.getDate() === day;
    let cls = "calendar-day" + (isToday ? " today" : "") + (sessions.length ? " has-sessions" : "");
    html += '<div class="' + cls + '" data-date="' + key + '">' +
      '<div class="calendar-day-number">' + day + "</div>" +
      (sessions.length ? '<div class="session-indicator">' + sessions.length + "</div>" : "") +
    "</div>";
  }
  html += "</div>";
  html += renderTrends(sessions);
  html += '<div id="day-details" class="day-details hidden"></div>';

  list.innerHTML = html;

  document.getElementById("prev-month").addEventListener("click", e => {
    e.stopPropagation();
    currentViewDate.setMonth(currentViewDate.getMonth() - 1);
    renderCalendar(currentSessions);
  });
  document.getElementById("next-month").addEventListener("click", e => {
    e.stopPropagation();
    currentViewDate.setMonth(currentViewDate.getMonth() + 1);
    renderCalendar(currentSessions);
  });
  document.querySelectorAll(".calendar-day.has-sessions").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      showDayDetails(el.dataset.date, byDate[el.dataset.date] || []);
    });
  });
}

function renderTrends(sessions) {
  const recent = [...sessions].sort((a,b) => b.timestamp - a.timestamp).slice(0,15).reverse();
  if (recent.length < 2) return "";

  const metrics = [
    { key: "goAcc",   label: "Go acc",   unit: "%",  invertColor: false },
    { key: "stopAcc", label: "Stop acc", unit: "%",  invertColor: false },
    { key: "avgRt",   label: "Avg RT",   unit: "ms", invertColor: true  },
  ];

  let html = '<div class="history-trends">';
  metrics.forEach(m => {
    const vals = recent.map(s => s.metrics[m.key] || 0);
    const max  = Math.max(...vals, 1);
    const min  = Math.min(...vals);
    const range = max - min;

    let bars = "";
    vals.forEach(v => {
      const h   = range > 0 ? Math.max(5, ((v - min) / range) * 100) : 10;
      let cls   = "trend-bar";
      if (v === max) cls += m.invertColor ? " low"  : " high";
      if (v === min) cls += m.invertColor ? " high" : " low";
      bars += '<div class="' + cls + '" style="height:' + h + '%;" tabindex="0">' +
        '<span class="trend-tooltip">' + v + m.unit + "</span></div>";
    });

    html += '<div class="trend-chart">' +
      '<div class="trend-header"><div class="trend-label"><strong>' + m.label + "</strong></div></div>" +
      '<div class="trend-bars">' + bars + "</div>" +
      "</div>";
  });
  return html + "</div>";
}

function showDayDetails(dateKey, sessions) {
  const el   = document.getElementById("day-details");
  const date = new Date(dateKey + "T12:00:00");
  const label = date.getFullYear() + "-" + String(date.getMonth()+1).padStart(2,"0") + "-" + String(date.getDate()).padStart(2,"0");
  const sorted = [...sessions].sort((a,b) => b.timestamp - a.timestamp);

  let html = '<div class="day-details-header"><h3>' + label + '</h3>' +
    '<button class="close-details" id="close-details">&times;</button></div>' +
    '<div class="day-sessions">';

  sorted.forEach((s, i) => {
    const t = new Date(s.timestamp);
    const time = String(t.getHours()).padStart(2,"0") + ":" + String(t.getMinutes()).padStart(2,"0");
    html += '<div class="session-card">' +
      '<div class="session-header"><strong>Session ' + (i+1) + "</strong>" +
      '<span class="session-time">' + time + "</span></div>" +
      '<div class="session-stats">' +
        "<span>Go: " + s.metrics.goAcc + "%</span>" +
        "<span>Stop: " + s.metrics.stopAcc + "%</span>" +
        "<span>RT: " + s.metrics.avgRt + "ms</span>" +
        "<span>SSD: " + s.metrics.ssd + "ms</span>" +
      "</div></div>";
  });
  html += "</div>";

  el.innerHTML = html;
  el.classList.remove("hidden");
  document.getElementById("close-details").addEventListener("click", e => {
    e.stopPropagation();
    el.classList.add("hidden");
  });
}
