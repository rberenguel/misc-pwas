import { get, set } from "./libs/idb-keyval.js";

const COLOR_MAP = {
    // Primary
    red: '#c00',
    green: '#0c0',
    blue: '#00c',

    // Secondary (bright)
    yellow: '#cc0',
    magenta: '#c0c',
    cyan: '#0cc',

    // Tertiary / Mixed
    orange: '#c60',
    lime: '#6c0',
    purple: '#60c',
    rose: '#c66',
    teal: '#0c6',
    violet: '#c06',

    // Dark versions
    darkred: '#600',
    darkgreen: '#060',
    darkblue: '#006',
    olive: '#660',
    maroon: '#606',
    navy: '#066'
};

function generateUUID() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16),
  );
}

function normalizePath(pathStr) {
  let normalized = pathStr.trim();
  if (normalized.startsWith("file://")) {
    normalized = normalized.substring(7); // Remove 'file://'
  }
  if (normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1); // Remove trailing slash
  }
  return normalized;
}

// --- CONFIGURATION & STATE ---
const STORAGE_KEY = "gemini-project-board-cards";
let localCards = [];

// --- DOM ELEMENTS ---
const cardsContainer = document.getElementById("cards-container");
const addCardBtn = document.getElementById("add-card-btn");
const deleteModal = document.getElementById("delete-modal");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
const pathModal = document.getElementById("path-modal");
const pathInput = document.getElementById("path-input");
const confirmPathBtn = document.getElementById("confirm-path-btn");

document.querySelectorAll(".cancel-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    deleteModal.classList.remove("visible");
    pathModal.classList.remove("visible");
  });
});

// --- DATA HANDLING ---
async function loadCardsFromStorage() {
  localCards = (await get(STORAGE_KEY)) || [];
}
function saveCardsToStorage() {
  // This doesn't need to be awaited in most cases,
  // it can save in the background.
  set(STORAGE_KEY, localCards);
}
function getCardById(id) {
  return localCards.find((card) => card.id === id);
}
function updateCard(id, updates) {
  const cardIndex = localCards.findIndex((card) => card.id === id);
  if (cardIndex > -1) {
    localCards[cardIndex] = { ...localCards[cardIndex], ...updates };
    saveCardsToStorage();
  }
}

// --- RENDERING ---
function renderBoard() {
  cardsContainer.innerHTML = "";
  localCards.forEach((cardData) => {
    const cardElement = createCardElement(cardData);
    cardsContainer.appendChild(cardElement);
  });
}

function createCardElement(cardData) {
  const scene = document.createElement("div");
  scene.className = "card-scene";
  scene.dataset.id = cardData.id;

  const card = document.createElement("div");
  card.className = "card";

  const front = document.createElement("div");
  front.className = "card-face card-front";

  const back = document.createElement("div");
  back.className = "card-face card-back";

  // Use the user-specified icon for VS Code
  const vscodeLink = cardData.projectPath
    ? `<a href="vscode://file${cardData.projectPath}" class="primary-link" title="Open in VS Code"><button class="icon-btn"><i class="iconoir iconoir-code"></i></button></a>`
    : "";

  front.innerHTML = `
        <div class="card-header"><div class="card-title" contenteditable="true"></div></div>
        <div class="card-body">
            <div class="context-list"></div>
            <button class="add-context-btn">+ Add item</button>
        </div>
        <div class="card-footer">
            <div class="card-links">
                <a href="${cardData.primaryUrl}" target="_blank" class="primary-link" title="Open Link"><button class="icon-btn"><i class="iconoir iconoir-link"></i></button></a>
                ${vscodeLink}
            </div>
            <div class="card-actions">
                <button class="icon-btn folder-btn" title="Set project folder"><i class="iconoir iconoir-folder"></i></button>
                <button class="icon-btn flip-btn" title="View History"><i class="iconoir iconoir-refresh"></i></button>
                <button class="icon-btn delete-btn" title="Delete Card"><i class="iconoir iconoir-trash"></i></button>
            </div>
        </div>`;
  front.querySelector(".card-title").textContent =
    cardData.title || "New Project";

  const historyItems = (cardData.urlHistory || [])
    .map((url) => `<li><a href="${url}" target="_blank">${url}</a></li>`)
    .join("");
  back.innerHTML = `<div class="card-back-header">Link History</div><ul class="history-list">${historyItems || "<li>No history yet.</li>"}</ul>`;

  card.appendChild(front);
  card.appendChild(back);
  scene.appendChild(card);

  renderContextList(scene, cardData);
  addCardEventListeners(scene, cardData);

  return scene;
}

function renderContextList(cardElement, cardData) {
    const contextListEl = cardElement.querySelector('.context-list');
    contextListEl.innerHTML = '';
    (cardData.contextItems || []).forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'context-item';
        itemEl.setAttribute('draggable', true); // Re-add draggable to the whole item for simplicity
        itemEl.dataset.itemId = item.id;
        itemEl.title = new Date(item.createdAt).toLocaleString();

        const viewEl = document.createElement('div');
        viewEl.className = 'context-item-view';
        
        // Regex to find :icon: and optional :color:
        const match = item.text.match(/^:([a-z0-9\-]+):(?:\s*:([a-z]+):)?/);
        let textContent = item.text;

        if (match) {
            const iconName = match[1];
            const colorName = match[2];
            
            const iconEl = document.createElement('i');
            iconEl.className = `iconoir iconoir-${iconName}`;
            
            if (colorName && COLOR_MAP[colorName]) {
                iconEl.style.color = COLOR_MAP[colorName];
            }
            
            viewEl.appendChild(iconEl);
            textContent = item.text.substring(match[0].length).trim();
        }
        
        const textSpan = document.createElement('span');
        textSpan.className = 'context-item-text';
        textSpan.textContent = textContent;
        viewEl.appendChild(textSpan);
        itemEl.appendChild(viewEl);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-item-btn';
        deleteBtn.innerHTML = '&times;';
        deleteBtn.title = 'Delete item';
        itemEl.appendChild(deleteBtn);

        contextListEl.appendChild(itemEl);
    });
}

// --- EVENT LISTENERS ---
function addCardEventListeners(cardElement, initialCardData) {
  const cardId = initialCardData.id;

  cardElement.querySelector(".card-title").addEventListener("blur", (e) => {
    updateCard(cardId, { title: e.target.textContent });
  });

  const contextListEl = cardElement.querySelector(".context-list");

  // Switch to edit mode on click
contextListEl.addEventListener('click', (e) => {
    const viewEl = e.target.closest('.context-item-view');
    if (viewEl) {
        const itemEl = viewEl.closest('.context-item');
        if (itemEl.querySelector('.context-item-edit-area')) return;

        const itemId = itemEl.dataset.itemId;
        const cardData = getCardById(cardId);
        const item = cardData.contextItems.find(i => i.id === itemId);

        const textarea = document.createElement('textarea');
        textarea.className = 'context-item-edit-area';
        textarea.value = item.text;
        
        // Auto-resize logic
        function resizeTextarea() {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        }
        textarea.addEventListener('input', resizeTextarea);

        viewEl.style.display = 'none';
        itemEl.prepend(textarea);
        textarea.focus();
        textarea.select();
        resizeTextarea(); // Set initial size

        const saveAndSwitchToView = () => {
            const newText = textarea.value.trim();
            if (newText) {
                item.text = newText;
            } else {
                cardData.contextItems = cardData.contextItems.filter(i => i.id !== itemId);
            }
            updateCard(cardId, { contextItems: cardData.contextItems });
            renderContextList(cardElement, getCardById(cardId));
        };

        textarea.addEventListener('blur', saveAndSwitchToView);
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { // Save on Enter, allow newlines with Shift+Enter
                e.preventDefault();
                textarea.blur();
            } else if (e.key === 'Escape') {
                textarea.value = item.text;
                textarea.blur();
            }
        });
    }
});

  // Handle item deletion
  contextListEl.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-item-btn")) {
      const itemId = e.target.closest(".context-item").dataset.itemId;
      const cardData = getCardById(cardId);
      const updatedItems = cardData.contextItems.filter(
        (item) => item.id !== itemId,
      );
      updateCard(cardId, { contextItems: updatedItems });
      renderContextList(cardElement, getCardById(cardId));
    }
  });

  cardElement
    .querySelector(".add-context-btn")
    .addEventListener("click", () => {
      const cardData = getCardById(cardId);
      const newItem = {
        id: generateUUID(),
        text: ":task-list: New item",
        createdAt: new Date().toISOString(),
      };
      const newItems = [...(cardData.contextItems || []), newItem];
      updateCard(cardId, { contextItems: newItems });
      renderContextList(cardElement, getCardById(cardId));
    });

  // Drag and Drop for context items
  let draggedItemId = null;
  contextListEl.addEventListener("dragstart", (e) => {
    const handle = e.target.closest(".drag-handle");
    if (handle) {
      const itemEl = handle.closest(".context-item");
      draggedItemId = itemEl.dataset.itemId;
      // Add dragging class to the whole item for visual feedback
      itemEl.classList.add("dragging");
    }
  });

  contextListEl.addEventListener("dragend", (e) => {
    // Find any item that is currently being dragged and remove the class
    const draggingEl = contextListEl.querySelector(".context-item.dragging");
    if (draggingEl) {
      draggingEl.classList.remove("dragging");
    }
  });

  contextListEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    const target = e.target.closest(".context-item");
    if (target && target.dataset.itemId !== draggedItemId) {
      const rect = target.getBoundingClientRect();
      const isTopHalf = e.clientY < rect.top + rect.height / 2;
      document
        .querySelectorAll(".context-item")
        .forEach((el) =>
          el.classList.remove("drag-over-top", "drag-over-bottom"),
        );
      target.classList.add(isTopHalf ? "drag-over-top" : "drag-over-bottom");
    }
  });

  contextListEl.addEventListener("drop", (e) => {
    e.preventDefault();
    document
      .querySelectorAll(".context-item")
      .forEach((el) =>
        el.classList.remove("drag-over-top", "drag-over-bottom"),
      );
    const targetItemEl = e.target.closest(".context-item");
    if (targetItemEl && draggedItemId) {
      const targetItemId = targetItemEl.dataset.itemId;
      const cardData = getCardById(cardId);
      const items = [...cardData.contextItems];
      const draggedItem = items.find((item) => item.id === draggedItemId);
      const remainingItems = items.filter((item) => item.id !== draggedItemId);
      let targetIndex = remainingItems.findIndex(
        (item) => item.id === targetItemId,
      );

      const rect = targetItemEl.getBoundingClientRect();
      const isTopHalf = e.clientY < rect.top + rect.height / 2;
      if (!isTopHalf) targetIndex++;

      remainingItems.splice(targetIndex, 0, draggedItem);
      updateCard(cardId, { contextItems: remainingItems });
      renderBoard();
    }
    draggedItemId = null;
  });

  cardElement.querySelector(".folder-btn").addEventListener("click", () => {
    const cardData = getCardById(cardId);
    pathInput.value = cardData.projectPath || "";
    pathModal.dataset.cardId = cardId;
    pathModal.classList.add("visible");
    pathInput.focus();
  });

  cardElement.querySelector(".delete-btn").addEventListener("click", () => {
    deleteModal.classList.add("visible");
    confirmDeleteBtn.dataset.cardId = cardId;
  });
  cardElement
    .querySelector(".flip-btn")
    .addEventListener("click", () =>
      cardElement.querySelector(".card").classList.toggle("is-flipped"),
    );
  cardElement
    .querySelector(".card-back")
    .addEventListener("click", () =>
      cardElement.querySelector(".card").classList.toggle("is-flipped"),
    );

  cardElement.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    cardElement.querySelector(".card").style.border =
      "1px solid var(--accent-color)";
  });
  cardElement.addEventListener("dragleave", (e) => {
    e.stopPropagation();
    cardElement.querySelector(".card").style.border =
      "1px solid var(--primary-border-color)";
  });
  cardElement.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    cardElement.querySelector(".card").style.border =
      "1px solid var(--primary-border-color)";
    const url =
      e.dataTransfer.getData("URL") || e.dataTransfer.getData("text/uri-list");
    const cardData = getCardById(cardId);
    if (url && url !== cardData.primaryUrl) {
      const newHistory = [cardData.primaryUrl, ...(cardData.urlHistory || [])];
      updateCard(cardId, { primaryUrl: url, urlHistory: newHistory });
      renderBoard();
    }
  });
  // Add this block inside the addCardEventListeners function

const cardBody = cardElement.querySelector('.card-body');
cardBody.addEventListener('wheel', function(e) {
    // First, check if the element's content is actually overflowing.
    // If not, we don't need to do anything and can let the page scroll normally.
    if (this.scrollHeight <= this.clientHeight) {
        return;
    }

    // If the element IS scrollable, take control.
    // Prevent the default browser action (which is to scroll the page).
    e.preventDefault();

    // Manually apply the scroll delta from the mouse wheel to this element.
    this.scrollTop += e.deltaY;
});
}

// --- GLOBAL EVENT LISTENERS ---
addCardBtn.addEventListener("dragover", (e) => {
  e.preventDefault();
  addCardBtn.classList.add("drag-over");
});
addCardBtn.addEventListener("dragleave", () =>
  addCardBtn.classList.remove("drag-over"),
);
addCardBtn.addEventListener("drop", (e) => {
  e.preventDefault();
  addCardBtn.classList.remove("drag-over");
  const url =
    e.dataTransfer.getData("URL") || e.dataTransfer.getData("text/uri-list");
  if (url) {
    const newCard = {
      id: generateUUID(),
      title: "New Project",
      primaryUrl: url,
      urlHistory: [],
      contextItems: [],
      createdAt: new Date().toISOString(),
      projectPath: "",
    };
    localCards.push(newCard);
    saveCardsToStorage();
    renderBoard();
  }
});

confirmDeleteBtn.addEventListener("click", () => {
  const cardId = confirmDeleteBtn.dataset.cardId;
  localCards = localCards.filter((card) => card.id !== cardId);
  saveCardsToStorage();
  renderBoard();
  deleteModal.classList.remove("visible");
});

confirmPathBtn.addEventListener("click", () => {
  const cardId = pathModal.dataset.cardId;
  const rawPath = pathInput.value;
  if (cardId) {
    const normalizedPath = normalizePath(rawPath);
    updateCard(cardId, { projectPath: normalizedPath });
    renderBoard();
  }
  pathModal.classList.remove("visible");
});

pathInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") confirmPathBtn.click();
});

// --- SAVE/LOAD TO DISK ---
function exportData() {
  const dataStr = JSON.stringify(localCards, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.download = `gemini-board-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function importData() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json";
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      try {
        const content = readerEvent.target.result;
        const importedCards = JSON.parse(content);
        if (Array.isArray(importedCards)) {
          // Basic validation
          localCards = importedCards;
          saveCardsToStorage();
          renderBoard();
        } else {
          alert("Invalid file format.");
        }
      } catch (error) {
        alert("Error reading or parsing file.");
        console.error(error);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey) {
    if (e.key === "s") {
      e.preventDefault();
      exportData();
    } else if (e.key === "o") {
      e.preventDefault();
      importData();
    }
  }
});

// --- INITIALIZE ---
async function init() {
  await loadCardsFromStorage();
  renderBoard();
}
init();
