(function () {
  "use strict";

  const STORAGE_KEY = "line-arranger-state-v1";

  /** @type {{inbox: {id:string, text:string}[], page: {id:string, text:string}[]}} */
  let state = loadState() || { inbox: [], page: [] };

  const inboxList = document.getElementById("inbox-list");
  const pageList = document.getElementById("page-list");
  const inboxCount = document.getElementById("inbox-count");
  const pageCount = document.getElementById("page-count");
  const bulkInput = document.getElementById("bulk-input");
  const quickInput = document.getElementById("quick-input");
  const toast = document.getElementById("toast");

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.inbox) || !Array.isArray(parsed.page)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 1800);
  }

  function zoneArray(zone) {
    return zone === "inbox" ? state.inbox : state.page;
  }

  function findCard(id) {
    let arr = state.inbox;
    let idx = arr.findIndex((c) => c.id === id);
    if (idx !== -1) return { zone: "inbox", arr, idx };
    arr = state.page;
    idx = arr.findIndex((c) => c.id === id);
    if (idx !== -1) return { zone: "page", arr, idx };
    return null;
  }

  function render() {
    renderList(inboxList, state.inbox, "inbox");
    renderList(pageList, state.page, "page");
    inboxCount.textContent = state.inbox.length;
    pageCount.textContent = state.page.length;
  }

  function renderList(listEl, items, zone) {
    listEl.innerHTML = "";
    for (const item of items) {
      listEl.appendChild(createCard(item, zone));
    }
  }

  function createCard(item, zone) {
    const li = document.createElement("li");
    li.className = "card";
    li.draggable = true;
    li.dataset.id = item.id;
    li.dataset.zone = zone;

    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "⠿";
    li.appendChild(handle);

    const textEl = document.createElement("div");
    textEl.className = "card-text";
    textEl.textContent = item.text;
    textEl.title = "Double-click to edit";
    li.appendChild(textEl);

    textEl.addEventListener("dblclick", () => beginEdit(textEl, item, zone));

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const moveBtn = document.createElement("button");
    moveBtn.className = "move-btn";
    moveBtn.textContent = zone === "inbox" ? "→" : "←";
    moveBtn.title = zone === "inbox" ? "Send to arrangement" : "Send back to fragments";
    moveBtn.addEventListener("click", () => {
      moveCard(item.id, zone === "inbox" ? "page" : "inbox");
    });
    actions.appendChild(moveBtn);

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "✕";
    removeBtn.title = "Delete";
    removeBtn.addEventListener("click", () => {
      removeCard(item.id);
    });
    actions.appendChild(removeBtn);

    li.appendChild(actions);

    li.addEventListener("dragstart", (e) => {
      li.classList.add("dragging");
      e.dataTransfer.setData("text/plain", item.id);
      e.dataTransfer.effectAllowed = "move";
    });
    li.addEventListener("dragend", () => {
      li.classList.remove("dragging");
    });

    return li;
  }

  function beginEdit(textEl, item, zone) {
    textEl.contentEditable = "true";
    textEl.classList.add("editing");
    textEl.focus();
    document.execCommand("selectAll", false, null);

    function finish(save) {
      textEl.contentEditable = "false";
      textEl.classList.remove("editing");
      textEl.removeEventListener("blur", onBlur);
      textEl.removeEventListener("keydown", onKeydown);
      if (save) {
        const newText = textEl.textContent.trim();
        if (newText) {
          const found = findCard(item.id);
          if (found) {
            found.arr[found.idx].text = newText;
            saveState();
          }
        } else {
          removeCard(item.id);
          return;
        }
      } else {
        textEl.textContent = item.text;
      }
    }

    function onBlur() {
      finish(true);
    }
    function onKeydown(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        textEl.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    }

    textEl.addEventListener("blur", onBlur);
    textEl.addEventListener("keydown", onKeydown);
  }

  function moveCard(id, toZone) {
    const found = findCard(id);
    if (!found || found.zone === toZone) return;
    const [card] = found.arr.splice(found.idx, 1);
    zoneArray(toZone).push(card);
    saveState();
    render();
  }

  function removeCard(id) {
    const found = findCard(id);
    if (!found) return;
    found.arr.splice(found.idx, 1);
    saveState();
    render();
  }

  // Some apps (Scrivener included) put rich-text on the clipboard whose
  // plain-text flavor has already lost its paragraph breaks. When HTML is
  // available, convert its block-level boundaries back into real newlines
  // instead of trusting the plain-text flavor.
  function htmlToPlainTextWithBreaks(html) {
    const withBreaks = html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n");
    const doc = new DOMParser().parseFromString(withBreaks, "text/html");
    return doc.body.textContent || "";
  }

  function insertTextAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = value.slice(0, start) + text + value.slice(end);
    const pos = start + text.length;
    textarea.selectionStart = textarea.selectionEnd = pos;
  }

  bulkInput.addEventListener("paste", (e) => {
    const cd = e.clipboardData || window.clipboardData;
    if (!cd) return;
    const html = cd.getData("text/html");
    if (!html) return; // no rich-text flavor, let the default plain-text paste happen
    e.preventDefault();
    insertTextAtCursor(bulkInput, htmlToPlainTextWithBreaks(html));
  });

  function addLinesToInbox(rawText) {
    const lines = rawText
      .split(/\r\n|\r|\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return 0;
    for (const line of lines) {
      state.inbox.push({ id: makeId(), text: line });
    }
    saveState();
    render();
    return lines.length;
  }

  // --- Drag and drop reordering within / across lists ---

  function setupDropZone(listEl, zone) {
    listEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      listEl.classList.add("drag-over");
      const dragging = document.querySelector(".card.dragging");
      if (!dragging) return;
      const after = getCardAfterPoint(listEl, e.clientY);
      if (after == null) {
        listEl.appendChild(dragging);
      } else {
        listEl.insertBefore(dragging, after);
      }
    });

    listEl.addEventListener("dragleave", (e) => {
      if (e.target === listEl) listEl.classList.remove("drag-over");
    });

    listEl.addEventListener("drop", (e) => {
      e.preventDefault();
      listEl.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      const found = findCard(id);
      if (!found) return;

      // DOM was already reordered live during dragover, so read the
      // intended position from the DOM before touching the data model.
      const domIds = Array.from(listEl.children).map((el) => el.dataset.id);
      const insertAt = domIds.indexOf(id);

      const [card] = found.arr.splice(found.idx, 1);
      const targetArr = zoneArray(zone);
      const at = insertAt < 0 ? targetArr.length : insertAt;
      targetArr.splice(at, 0, card);

      saveState();
      render();
    });
  }

  function getCardAfterPoint(listEl, y) {
    const cards = Array.from(listEl.querySelectorAll(".card:not(.dragging)"));
    let closest = null;
    let closestOffset = Number.NEGATIVE_INFINITY;
    for (const card of cards) {
      const rect = card.getBoundingClientRect();
      const offset = y - rect.top - rect.height / 2;
      if (offset < 0 && offset > closestOffset) {
        closestOffset = offset;
        closest = card;
      }
    }
    return closest;
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  // --- Wire up controls ---

  document.getElementById("shuffle-btn").addEventListener("click", () => {
    if (state.inbox.length < 2) return;
    shuffleArray(state.inbox);
    saveState();
    render();
    showToast("Fragments shuffled");
  });

  document.getElementById("add-bulk-btn").addEventListener("click", () => {
    const count = addLinesToInbox(bulkInput.value);
    if (count > 0) {
      bulkInput.value = "";
      showToast(`Added ${count} line${count === 1 ? "" : "s"} to fragments`);
    }
  });

  quickInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const text = quickInput.value.trim();
      if (text) {
        state.inbox.push({ id: makeId(), text });
        saveState();
        render();
        quickInput.value = "";
      }
    }
  });

  document.getElementById("export-text-btn").addEventListener("click", () => {
    const text = state.page.map((c) => c.text).join("\n");
    downloadFile(text, "arrangement.txt", "text/plain");
  });

  document.getElementById("export-json-btn").addEventListener("click", () => {
    downloadFile(JSON.stringify(state, null, 2), "line-arranger-project.json", "application/json");
  });

  document.getElementById("import-json-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.inbox) || !Array.isArray(parsed.page)) {
          throw new Error("Invalid project file");
        }
        state = parsed;
        saveState();
        render();
        showToast("Project loaded");
      } catch (err) {
        showToast("Could not load file: " + err.message);
      }
      e.target.value = "";
    };
    reader.readAsText(file);
  });

  document.getElementById("clear-btn").addEventListener("click", () => {
    if (!confirm("Clear all lines from the fragments and arrangement? This cannot be undone.")) return;
    state = { inbox: [], page: [] };
    saveState();
    render();
    showToast("Cleared");
  });

  const helpOverlay = document.getElementById("help-overlay");

  function openHelp() {
    helpOverlay.classList.remove("hidden");
  }

  function closeHelp() {
    helpOverlay.classList.add("hidden");
  }

  document.getElementById("help-btn").addEventListener("click", openHelp);
  document.getElementById("close-help").addEventListener("click", closeHelp);
  helpOverlay.addEventListener("click", (e) => {
    if (e.target === helpOverlay) closeHelp();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !helpOverlay.classList.contains("hidden")) closeHelp();
  });

  function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  setupDropZone(inboxList, "inbox");
  setupDropZone(pageList, "page");
  render();
})();
