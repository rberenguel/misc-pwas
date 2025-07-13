# GDash

A simple, local-first, PWA-based Kanban-like board to visually track projects (I crafted this in particular to
track things I chat with Gemini about) and associated links.

Use it from https://mostlymaths.net/misc-pwas/gdash/index.html and install it locally as a Chrome Web App.

No data is sent anywhere, this is local-only.

![](https://raw.githubusercontent.com/rberenguel/misc-pwas/gh-pages/gdash/media/gdash.png)

## Features

- **Local-First:** All data is stored directly in your browser's IndexedDB. No third-party services or network connection required.
- **Drag & Drop Cards:** Create new cards by dragging URLs onto the '+' button. Reorder cards by dragging and dropping them into the desired position.
- **Drag & Drop Links:** Update a card's primary link (i.e. the chat link) or associate a GitHub repository by dragging a URL onto the card.
- **Primary Link history:** The primary link history is kept on the back of the card. This would be useful if you create new chats for separate features.
- **Task Management:** Add, edit, delete, and reorder line items within each card.
- **Customization:**
  - **Color-coded Titles:** Add a color to a project title by prefixing it with `:color-name:` (e.g., `:red: My Project`).
  - **Icons for Tasks:** Add icons to tasks using `:icon-name:` syntax (powered by Iconoir).
  - **Color-coded Icons:** Color-code icons using `:icon-name: :color-name:`.
- **Developer Workflow:**
  - **VS Code Integration:** Click the code icon to open the associated local project folder directly in VS Code. If no path is set, the icon will be greyed out; clicking it will prompt you to enter the path. Shift-click the icon to edit the existing path.
  - **GitHub Links:** Add a GitHub link by dragging a GitHub URL into a card. Shift-click the GitHub icon to copy the repository URL.
  - **Backup & Restore:** Backup and restore your entire board to a JSON file (`Cmd/Ctrl+S` and `Cmd/Ctrl+O`).

#### Colors available:

```
const COLOR_MAP = {
  // Primary
  red: "#c00",
  green: "#0c0",
  blue: "#00c",
  grey: "#ccc",
  darkgrey: "#666",
  black: "#000",

  // Secondary (bright)
  yellow: "#cc0",
  magenta: "#c0c",
  cyan: "#0cc",

  // Tertiary / Mixed
  orange: "#c60",
  lime: "#6c0",
  purple: "#60c",
  rose: "#c66",
  teal: "#0c6",
  violet: "#c06",

  // Dark versions
  darkred: "#600",
  darkgreen: "#060",
  darkblue: "#006",
  olive: "#660",
  maroon: "#606",
  navy: "#066",
};
```
