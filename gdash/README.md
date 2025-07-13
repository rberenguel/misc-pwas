# GDash

A simple, local-first, PWA-based Kanban-like board to visually track projects and associated links.

## Features

-   **Local-First:** All data is stored directly in your browser's IndexedDB. No third-party services or network connection required.
-   **Drag & Drop:** Create new cards by dragging URLs onto the add button. Update a card's primary link by dragging a new URL onto it.
-   **Task Management:** Add, edit, delete, and reorder line items within each card.
-   **Customization:**
    -   Add icons to tasks using `:icon-name:` syntax (powered by Iconoir).
    -   Color-code icons using `:icon-name: :color-name:`.
-   **Developer Workflow:**
    -   Link cards to local project folders to open them directly in VS Code.
    -   Backup and restore your entire board to a JSON file (`Cmd/Ctrl+S` and `Cmd/Ctrl+O`).
