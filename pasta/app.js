const DB_NAME = "pasta_db",
  STORE = "snippets",
  SETTINGS = "settings";
let db,
  snippets = [],
  rowMap = [];

const initDB = () =>
  new Promise((res) => {
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE))
        d.createObjectStore(STORE, { keyPath: "name" });
      if (!d.objectStoreNames.contains(SETTINGS))
        d.createObjectStore(SETTINGS, { keyPath: "key" });
    };
    req.onsuccess = (e) => {
      db = e.target.result;
      res();
    };
  });

const dbOps = {
  put: (data) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ ...data, updated: Date.now() });
    return new Promise((r) => (tx.oncomplete = r));
  },
  del: (name) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(name);
    return new Promise((r) => (tx.oncomplete = r));
  },
  clear: () => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    return new Promise((r) => (tx.oncomplete = r));
  },
  getSetting: (key) =>
    new Promise((res) => {
      const req = db
        .transaction(SETTINGS, "readonly")
        .objectStore(SETTINGS)
        .get(key);
      req.onsuccess = () => res(req.result?.value);
    }),
  setSetting: (key, value) => {
    const tx = db.transaction(SETTINGS, "readwrite");
    tx.objectStore(SETTINGS).put({ key, value });
    return new Promise((r) => (tx.oncomplete = r));
  },
};

const refresh = async () => {
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).getAll();
  req.onsuccess = () => {
    snippets = req.result.sort((a, b) => b.updated - a.updated);
    render(); // Show all after refresh
  };
};

const output = document.getElementById("terminal-output"),
  input = document.getElementById("cmd-input");

const render = (query = "") => {
  const q = (typeof query === "string" ? query : "").toLowerCase();
  const filtered = snippets.filter(
    (s) =>
      s.name.toLowerCase().includes(q) || s.content.toLowerCase().includes(q),
  );
  rowMap = filtered;
  output.innerHTML = filtered
    .map(
      (s, i) => `
        <div class="snippet-item" data-index="${i}">
            <span class="row-id">${i + 1}</span>
            <span class="snippet-name">${s.name}</span>
            <span class="snippet-preview">${s.content.split("\n")[0].substring(0, 60)}${s.content.includes("\n") || s.content.length > 60 ? "..." : ""}</span>
        </div>
    `,
    )
    .join("");
};

// TASCA EXPORT LOGIC: Native Save Picker -> Navigator Share -> Download Fallback
const handleExport = async () => {
  const dataStr = JSON.stringify(snippets, null, 2);
  const filename = `pasta_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.json`;
  const blob = new Blob([dataStr], { type: "application/json" });

  // 1. Desktop: File System Access API
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
      });
      const writable = await handle.createWritable();
      await writable.write(dataStr);
      await writable.close();
      return;
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    }
  }

  // 2. iOS/Mobile: Share API
  const file = new File([blob], filename, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (e.name !== "AbortError") console.error(e);
    }
  }

  // 3. Fallback: Standard Download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

// TASCA IMPORT LOGIC: Triggers the hidden file picker from index.html
const handleImport = () => document.getElementById("import-picker").click();

document.getElementById("import-picker").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      await dbOps.clear();
      for (const s of data) await dbOps.put(s);
      await refresh();
    } catch (err) {
      alert("Import failed: " + err.message);
    }
  };
  reader.readAsText(file);
});

// TASCA PERSISTENCE LOGIC
const handleSave = async () => {
  const handle = await dbOps.getSetting("syncFileHandle");
  if (!handle) return alert("Use 'link' first");
  if ((await handle.queryPermission({ mode: "readwrite" })) !== "granted") {
    if ((await handle.requestPermission({ mode: "readwrite" })) !== "granted")
      return;
  }
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(snippets, null, 2));
  await writable.close();
};

const handleLoad = async () => {
  const handle = await dbOps.getSetting("syncFileHandle");
  if (!handle) return alert("No file linked");
  const file = await handle.getFile();
  const text = await file.text();
  const data = JSON.parse(text);
  await dbOps.clear();
  for (const s of data) await dbOps.put(s);
  await refresh();
};

const handleLink = async () => {
  const [handle] = await window.showOpenFilePicker({
    types: [{ accept: { "application/json": [".json"] } }],
  });
  await dbOps.setSetting("syncFileHandle", handle);
  await handleLoad();
};

input.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    const val = input.value;
    const valStr = val.trim();
    const cmdMatch = valStr.match(/^([^\s]+)/);
    const cmd = cmdMatch ? cmdMatch[1].toLowerCase() : "";

    // Parsers for different commands using strictly space/tab delimiters to preserve newlines
    if (cmd === "add" || cmd === "a") {
      const match = valStr.match(
        /^(?:add|a)[ \t]+([^ \t\n]+)(?:[ \t]+([\s\S]*))?$/i,
      );
      if (match && match[1]) {
        const name = match[1];
        const content = match[2] ? match[2].trim() : "";
        await dbOps.put({ name, content });
        input.value = "";
        input.style.height = "auto";
        await refresh();
      }
    } else if (cmd === "rm" || cmd === "remove") {
      const match = valStr.match(/^(?:rm|remove)[ \t]+(\d+)/i);
      if (match && match[1]) {
        const id = parseInt(match[1]);
        const snip = rowMap[id - 1];
        if (snip) {
          await dbOps.del(snip.name);
        }
        input.value = "";
        input.style.height = "auto";
        await refresh();
      }
    } else if (cmd === "mod" || cmd === "modify" || cmd === "m") {
      const match = valStr.match(
        /^(?:mod|modify|m)[ \t]+(\d+)[ \t]+([^ \t\n]+)(?:[ \t]+([\s\S]*))?$/i,
      );
      if (match && match[1] && match[2]) {
        const id = parseInt(match[1]);
        const newName = match[2];
        const newContent = match[3] ? match[3].trim() : "";

        const oldSnip = rowMap[id - 1];
        if (oldSnip) {
          if (newName !== oldSnip.name) {
            await dbOps.del(oldSnip.name);
          }
          await dbOps.put({ name: newName, content: newContent });
        }
        input.value = "";
        input.style.height = "auto";
        await refresh();
      }
    } else if (cmd === "edit" || cmd === "ed") {
      const match = valStr.match(/^(?:edit|ed)[ \t]+(\d+)/i);
      if (match && match[1]) {
        const id = parseInt(match[1]);
        const snip = rowMap[id - 1];
        if (snip) {
          input.value = `mod ${id} ${snip.name} ${snip.content}`;
          input.style.height = "auto";
          input.style.height = input.scrollHeight + "px";
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }
    } else if (!valStr) {
      input.value = "";
      input.style.height = "auto";
      render();
    } else if (cmd === "help" || cmd === "?") {
      const h = valStr.match(/^(?:help|\?)[ \t]+([\s\S]*)$/i)?.[1] || "";
      let html = "";
      if (!h) {
        html = `<div class="msg-standalone"><span style="color:var(--yellow)">Commands:</span> list/l, add, rm/remove, mod, edit, help, link, save, load, imp, exp. Type <span class="msg-hl">help [cmd]</span> for details.</div>`;
      } else if (h === "list" || h === "l") {
        html = `<div class="msg-help msg-standalone"><span class="msg-hl">list</span> [query] (or <span class="msg-hl">l</span>)<br>Filters snippets by query. Shows all if no query provided.</div>`;
      } else if (h === "add" || h === "a") {
        html = `<div class="msg-help msg-standalone"><span class="msg-hl">add</span> name <span class="msg-arg">content...</span><br>Creates a new snippet. Overwrites if name exists.</div>`;
      } else if (h === "mod" || h === "m") {
        html = `<div class="msg-help msg-standalone"><span class="msg-hl">mod</span> ID <span class="msg-arg">newName</span> <span class="msg-arg">newContent...</span><br>Updates an existing snippet. Replaces name and content.</div>`;
      } else if (h === "edit" || h === "ed") {
        html = `<div class="msg-help msg-standalone"><span class="msg-hl">edit</span> ID<br>Populates the input with a <span class="msg-hl">mod</span> command for quick editing. preserves newlines.</div>`;
      } else if (h === "rm" || h === "remove") {
        html = `<div class="msg-help msg-standalone"><span class="msg-hl">rm</span> ID (or <span class="msg-hl">remove</span>)<br>Deletes the snippet at the specified ID.</div>`;
      } else if (h === "link" || h === "save" || h === "load") {
        html = `<div class="msg-help msg-standalone"><span class="msg-hl">link</span> / <span class="msg-hl">save</span> / <span class="msg-hl">load</span><br>Syncs with a local JSON file (requires File System Access API support).</div>`;
      } else if (h === "imp" || h === "exp") {
        html = `<div class="msg-help msg-standalone"><span class="msg-hl">imp</span> / <span class="msg-hl">exp</span><br>Imports/exports snippets as a JSON file.</div>`;
      } else {
        html = `<span class="msg-error">No specific help for: ${h}</span>`;
      }
      input.value = "";
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
      output.innerHTML = html + output.innerHTML;
    } else if (cmd === "list" || cmd === "l") {
      const query = valStr.match(/^(?:list|l)[ \t]+([\s\S]*)$/i)?.[1] || "";
      input.value = "";
      input.style.height = "auto";
      render(query);
    } else if (cmd === "link") {
      await handleLink();
      input.value = "";
      input.style.height = "auto";
      render();
    } else if (cmd === "save") {
      await handleSave();
      input.value = "";
      input.style.height = "auto";
      render();
    } else if (cmd === "load") {
      await handleLoad();
      input.value = "";
      input.style.height = "auto";
      render();
    } else if (cmd === "imp" || cmd === "import") {
      handleImport();
      input.value = "";
      input.style.height = "auto";
    } // input reset, refresh happens via event
    else if (cmd === "exp" || cmd === "export") {
      await handleExport();
      input.value = "";
      input.style.height = "auto";
      render();
    } else if (rowMap.length > 0) {
      await navigator.clipboard.writeText(rowMap[0].content);
      input.value = "";
      input.style.height = "auto";
      // Don't render() here to keep the list stable
    }
  }
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = input.scrollHeight + "px";
});

// Click anywhere to focus input, or click snippet to copy
document.body.addEventListener("click", async (e) => {
  const item = e.target.closest(".snippet-item");
  if (item) {
    const idx = item.getAttribute("data-index");
    const snip = rowMap[idx];
    if (snip) {
      try {
        await navigator.clipboard.writeText(snip.content);
        // Visual feedback
        const origBg = item.style.backgroundColor;
        item.style.backgroundColor = "var(--base02)";
        setTimeout(() => {
          item.style.backgroundColor = origBg;
        }, 150);
      } catch (err) {
        console.error("Failed to copy", err);
      }
    }
    // Return focus to input even after copying
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  } else {
    // Move cursor to end of current text if not already focused
    if (document.activeElement !== input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
});

initDB().then(refresh);
