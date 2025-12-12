/**
 * AppManager
 * Handles common UI logic, tab switching (Play vs Book), and initialization.
 */
class AppManager {
  constructor(config) {
    this.appName = config.appName;
    this.onResize = config.onResize;
    this.mode = "play"; // 'play' or 'book'

    this.initUI();
    this.initTheme();
  }

  async initTheme() {
    // Simple script tag check usually, but let's assume idb-keyval is loaded in global scope
    if (typeof idbKeyval !== "undefined") {
      const isDark = await idbKeyval.get("darkMode");
      if (isDark) {
        document.body.classList.add("dark-mode");
      }
    }
  }

  initUI() {
    // Inject Back Button if not present
    if (!document.querySelector(".nav-bar")) {
      const container = document.querySelector(".container");
      const nav = document.createElement("div");
      nav.className = "nav-bar";
      nav.innerHTML =
        '<a href="index.html" class="link-back">← Back to Collection</a>';
      if (container) container.insertBefore(nav, container.firstChild);
    }

    const tabs = document.querySelectorAll(".tab-btn");
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        // Remove active class from all
        tabs.forEach((t) => t.classList.remove("active"));
        document
          .querySelectorAll(".tab-content")
          .forEach((c) => c.classList.remove("active"));

        // Add active to clicked
        btn.classList.add("active");
        const targetId = btn.getAttribute("data-target");
        document.getElementById(targetId).classList.add("active");

        this.mode = targetId === "play-panel" ? "play" : "book";

        // Trigger resize if needed (canvas might need update)
        if (this.onResize) this.onResize();
      });
    });
  }

  setStatus(msg) {
    const el = document.getElementById("status");
    if (el) el.innerText = msg;
  }
}
