/**
 * TaskMaster — Beginner-Friendly & Clean Task Management App
 * Features: Categories, Subtasks, Priorities, Due Dates, Audio, Confetti, and PDF Export.
 */

// ==========================================
// 1. STATE & STORAGE
// ==========================================

// Sample starter tasks for new users
const defaultTasks = [
  {
    id: 1,
    text: "Welcome to TaskMaster! 🚀",
    completed: false,
    priority: "high",
    category: "general",
    datetime: "",
    createdAt: Date.now(),
    subtasks: [
      { id: 101, text: "Try checking off this subtask", completed: false },
      { id: 102, text: "Click the sound icon to toggle audio", completed: true }
    ]
  },
  {
    id: 2,
    text: "Explore tags, search, and PDF export",
    completed: false,
    priority: "medium",
    category: "work",
    datetime: "",
    createdAt: Date.now() - 1000,
    subtasks: []
  }
];

// Load tasks from LocalStorage or use default tasks
let tasks = JSON.parse(localStorage.getItem("tm_tasks")) || defaultTasks;
let currentFilter = "all";       // "all" | "active" | "completed"
let currentCategory = "all";     // "all" | "general" | "work" | "personal" | ...
let searchQuery = "";
let currentSort = "manual";      // "manual" | "due-asc" | "priority-desc" | "created-desc" | "alpha-asc"
let openSubtasks = new Set();    // Stores task IDs that have subtask accordion open
let draggedTaskId = null;        // For drag-and-drop reordering
let soundEnabled = localStorage.getItem("tm_sound") !== "false";

// Helper to save tasks to LocalStorage and update UI
function saveAndRender() {
  localStorage.setItem("tm_tasks", JSON.stringify(tasks));
  renderTasks();
}

// Category display labels
const categoryLabels = {
  general: "📌 General",
  work: "💼 Work",
  personal: "👤 Personal",
  study: "📚 Study",
  health: "🏃 Health",
  finance: "💰 Finance"
};

// Escape user text to prevent HTML injection
function escapeHTML(str) {
  const p = document.createElement("p");
  p.textContent = str || "";
  return p.innerHTML;
}

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const form = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const categorySelect = document.getElementById("todo-category");
const prioritySelect = document.getElementById("todo-priority");
const datetimeInput = document.getElementById("todo-datetime");
const taskList = document.getElementById("todo-list");
const emptyMsg = document.getElementById("empty-msg");

const searchInput = document.getElementById("search-input");
const searchClearBtn = document.getElementById("search-clear-btn");
const sortSelect = document.getElementById("sort-select");

const statsText = document.getElementById("stats-text");
const liveClock = document.getElementById("live-clock");
const progressBar = document.getElementById("progress-bar-fill");
const progressPercent = document.getElementById("progress-percent");

const metricTotal = document.getElementById("metric-total");
const metricActive = document.getElementById("metric-active");
const metricDone = document.getElementById("metric-done");
const metricOverdue = document.getElementById("metric-overdue");

const themeToggle = document.getElementById("theme-toggle");
const soundToggle = document.getElementById("sound-toggle");
const backupBtn = document.getElementById("backup-btn");
const clearBtn = document.getElementById("clear-btn");

const settingsModal = document.getElementById("settings-modal");
const modalCloseBtn = document.getElementById("modal-close-btn");
const exportPdfBtn = document.getElementById("export-pdf-btn");
const exportJsonBtn = document.getElementById("export-json-btn");
const importJsonFile = document.getElementById("import-json-file");
const copyMarkdownBtn = document.getElementById("copy-markdown-btn");
const backupStatusMsg = document.getElementById("backup-status-msg");

// ==========================================
// 3. AUDIO & CONFETTI EFFECTS
// ==========================================
let audioContext = null;

function playSound(type) {
  if (!soundEnabled) return;
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();

    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    if (type === "pop") {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "chime") {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const o = audioContext.createOscillator();
        const g = audioContext.createGain();
        const t = now + i * 0.08;
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.15, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        o.connect(g);
        g.connect(audioContext.destination);
        o.start(t);
        o.stop(t + 0.3);
      });
    }
  } catch (_) {}
}

// Celebration Confetti
function triggerConfetti() {
  const canvas = document.getElementById("confetti-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ["#6366f1", "#a855f7", "#ec4899", "#3b82f6", "#10b981", "#f59e0b"];
  const particles = Array.from({ length: 70 }, () => ({
    x: canvas.width * (0.3 + Math.random() * 0.4),
    y: canvas.height * 0.4,
    vx: (Math.random() - 0.5) * 12,
    vy: (Math.random() - 1) * 10 - 2,
    size: Math.random() * 7 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    opacity: 1
  }));

  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.opacity -= 0.015;
      if (p.opacity > 0) {
        active = true;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(p.x, p.y, p.size, p.size);
      }
    });
    if (active) requestAnimationFrame(update);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  update();
}

// ==========================================
// 4. LIVE CLOCK & DATE HELPERS
// ==========================================
function updateClock() {
  if (liveClock) {
    liveClock.textContent = new Date().toLocaleDateString(undefined, {
      weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
    });
  }
}
setInterval(updateClock, 1000);
updateClock();

function formatDueDate(isoStr) {
  if (!isoStr) return null;
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function checkOverdue(isoStr, completed) {
  if (!isoStr || completed) return false;
  const d = new Date(isoStr);
  return !isNaN(d.getTime()) && d < new Date();
}

// ==========================================
// 5. RENDERING (Tasks, Dashboard, Progress)
// ==========================================
function getSortedTasks(list) {
  const arr = [...list];
  switch (currentSort) {
    case "due-asc":
      return arr.sort((a, b) => {
        if (!a.datetime) return 1;
        if (!b.datetime) return -1;
        return new Date(a.datetime) - new Date(b.datetime);
      });
    case "priority-desc": {
      const weights = { high: 3, medium: 2, low: 1 };
      return arr.sort((a, b) => (weights[b.priority] || 2) - (weights[a.priority] || 2));
    }
    case "created-desc":
      return arr.sort((a, b) => b.createdAt - a.createdAt);
    case "alpha-asc":
      return arr.sort((a, b) => a.text.localeCompare(b.text));
    default:
      return arr;
  }
}

function renderTasks() {
  // 1. Filter Tasks
  const q = searchQuery.toLowerCase().trim();
  if (searchClearBtn) searchClearBtn.style.display = q ? "block" : "none";

  const filtered = tasks.filter(t => {
    if (currentFilter === "active" && t.completed) return false;
    if (currentFilter === "completed" && !t.completed) return false;
    if (currentCategory !== "all" && t.category !== currentCategory) return false;
    if (q) {
      const matchText = t.text.toLowerCase().includes(q);
      const matchSub = t.subtasks && t.subtasks.some(st => st.text.toLowerCase().includes(q));
      if (!matchText && !matchSub) return false;
    }
    return true;
  });

  const sorted = getSortedTasks(filtered);

  // 2. Render List Items
  taskList.innerHTML = "";
  sorted.forEach(t => {
    const li = document.createElement("li");
    li.className = `todo-item ${t.completed ? "completed" : ""}`;
    li.dataset.id = t.id;
    li.draggable = currentSort === "manual";

    const dueDateText = formatDueDate(t.datetime);
    const isOverdue = checkOverdue(t.datetime, t.completed);
    const catLabel = categoryLabels[t.category] || "📌 General";
    const subtasks = t.subtasks || [];
    const doneSubCount = subtasks.filter(s => s.completed).length;
    const isExpanded = openSubtasks.has(t.id);

    li.innerHTML = `
      <div class="todo-row">
        ${currentSort === "manual" ? '<span class="drag-handle" title="Drag to reorder">⋮⋮</span>' : ""}
        <input type="checkbox" class="task-checkbox" data-id="${t.id}" ${t.completed ? "checked" : ""}>
        <div class="todo-content">
          <div class="todo-title">${escapeHTML(t.text)}</div>
          <div class="todo-meta">
            <span class="badge">${catLabel}</span>
            <span class="badge prio-${t.priority || 'medium'}">${(t.priority || 'medium').toUpperCase()}</span>
            ${dueDateText ? `<span class="badge ${isOverdue ? 'overdue' : ''}">📅 ${isOverdue ? '⚠️ ' : ''}${dueDateText}</span>` : ""}
            <button class="subtasks-toggle-btn" data-id="${t.id}">
              ${subtasks.length > 0 ? `☑️ ${doneSubCount}/${subtasks.length} subtasks ${isExpanded ? '▲' : '▼'}` : '+ subtask'}
            </button>
          </div>
        </div>
        <div class="actions">
          <button class="btn-action edit" data-id="${t.id}" title="Edit task">✏️</button>
          <button class="btn-action delete" data-id="${t.id}" title="Delete task">&times;</button>
        </div>
      </div>

      ${isExpanded ? `
        <div class="subtasks-box">
          <ul class="subtasks-list">
            ${subtasks.map(s => `
              <li class="subtask-item ${s.completed ? 'completed' : ''}">
                <input type="checkbox" class="subtask-checkbox" data-task-id="${t.id}" data-subtask-id="${s.id}" ${s.completed ? 'checked' : ''}>
                <span>${escapeHTML(s.text)}</span>
                <button class="subtask-delete" data-task-id="${t.id}" data-subtask-id="${s.id}">&times;</button>
              </li>
            `).join("")}
          </ul>
          <form class="subtask-form" data-task-id="${t.id}">
            <input type="text" placeholder="Add a subtask..." required autocomplete="off">
            <button type="submit">Add</button>
          </form>
        </div>
      ` : ""}
    `;

    // Drag-and-drop event listeners
    if (currentSort === "manual") {
      li.addEventListener("dragstart", (e) => {
        draggedTaskId = t.id;
        li.classList.add("dragging");
      });
      li.addEventListener("dragover", (e) => {
        e.preventDefault();
        const rect = li.getBoundingClientRect();
        const top = e.clientY < rect.top + rect.height / 2;
        li.classList.toggle("drag-top", top);
        li.classList.toggle("drag-bottom", !top);
      });
      li.addEventListener("dragleave", () => {
        li.classList.remove("drag-top", "drag-bottom");
      });
      li.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedTaskId && draggedTaskId !== t.id) {
          const fromIdx = tasks.findIndex(item => item.id === draggedTaskId);
          const toIdx = tasks.findIndex(item => item.id === t.id);
          if (fromIdx !== -1 && toIdx !== -1) {
            const [moved] = tasks.splice(fromIdx, 1);
            const rect = li.getBoundingClientRect();
            const insertBefore = e.clientY < rect.top + rect.height / 2;
            tasks.splice(insertBefore ? toIdx : toIdx + 1, 0, moved);
            playSound("pop");
            saveAndRender();
          }
        }
      });
      li.addEventListener("dragend", () => {
        draggedTaskId = null;
        document.querySelectorAll(".todo-item").forEach(item => item.classList.remove("dragging", "drag-top", "drag-bottom"));
      });
    }

    taskList.appendChild(li);
  });

  // 3. Update Progress & Metrics
  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const overdueCount = tasks.filter(t => checkOverdue(t.datetime, t.completed)).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  if (emptyMsg) emptyMsg.style.display = sorted.length === 0 ? "block" : "none";
  if (statsText) statsText.textContent = `${done} of ${total} completed`;
  if (progressPercent) progressPercent.textContent = `${percent}%`;
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (metricTotal) metricTotal.innerHTML = `Total: <strong>${total}</strong>`;
  if (metricActive) metricActive.innerHTML = `Active: <strong>${total - done}</strong>`;
  if (metricDone) metricDone.innerHTML = `Done: <strong>${done}</strong>`;
  if (metricOverdue) {
    metricOverdue.style.display = overdueCount > 0 ? "inline-block" : "none";
    metricOverdue.innerHTML = `⚠️ Overdue: <strong>${overdueCount}</strong>`;
  }
}

// ==========================================
// 6. EVENT HANDLERS
// ==========================================

// Add New Task
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = todoInput.value.trim();
  if (!text) return;

  tasks.unshift({
    id: Date.now(),
    text,
    completed: false,
    priority: prioritySelect.value,
    category: categorySelect.value,
    datetime: datetimeInput.value,
    createdAt: Date.now(),
    subtasks: []
  });

  todoInput.value = "";
  datetimeInput.value = "";
  playSound("pop");
  saveAndRender();
});

// Task List Clicks (Toggle, Delete, Edit, Subtasks)
taskList?.addEventListener("click", (e) => {
  const target = e.target;

  // 1. Toggle Task Checkbox
  if (target.classList.contains("task-checkbox")) {
    const id = Number(target.dataset.id);
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.completed = target.checked;
      if (task.completed) {
        playSound("pop");
        const remaining = tasks.filter(t => !t.completed).length;
        if (remaining === 0 && tasks.length > 0) {
          playSound("chime");
          triggerConfetti();
        } else if (task.priority === "high") {
          triggerConfetti();
        }
      }
      saveAndRender();
    }
  }

  // 2. Delete Task
  if (target.classList.contains("delete")) {
    const id = Number(target.dataset.id);
    tasks = tasks.filter(t => t.id !== id);
    openSubtasks.delete(id);
    playSound("pop");
    saveAndRender();
  }

  // 3. Toggle Subtask Drawer
  const subBtn = target.closest(".subtasks-toggle-btn");
  if (subBtn) {
    const id = Number(subBtn.dataset.id);
    openSubtasks.has(id) ? openSubtasks.delete(id) : openSubtasks.add(id);
    renderTasks();
  }

  // 4. Toggle Subtask Checkbox
  if (target.classList.contains("subtask-checkbox")) {
    const taskId = Number(target.dataset.taskId);
    const subId = Number(target.dataset.subtaskId);
    const task = tasks.find(t => t.id === taskId);
    const sub = task?.subtasks?.find(s => s.id === subId);
    if (sub) {
      sub.completed = target.checked;
      playSound("pop");
      saveAndRender();
    }
  }

  // 5. Delete Subtask
  if (target.classList.contains("subtask-delete")) {
    const taskId = Number(target.dataset.taskId);
    const subId = Number(target.dataset.subtaskId);
    const task = tasks.find(t => t.id === taskId);
    if (task?.subtasks) {
      task.subtasks = task.subtasks.filter(s => s.id !== subId);
      playSound("pop");
      saveAndRender();
    }
  }

  // 6. Edit Task Title Inline
  if (target.classList.contains("edit")) {
    const id = Number(target.dataset.id);
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const newText = prompt("Edit task title:", task.text);
    if (newText && newText.trim()) {
      task.text = newText.trim();
      playSound("pop");
      saveAndRender();
    }
  }
});

// Add Subtask Submit
taskList?.addEventListener("submit", (e) => {
  if (e.target.classList.contains("subtask-form")) {
    e.preventDefault();
    const taskId = Number(e.target.dataset.taskId);
    const input = e.target.querySelector("input");
    const text = input?.value.trim();
    if (!text) return;

    const task = tasks.find(t => t.id === taskId);
    if (task) {
      if (!task.subtasks) task.subtasks = [];
      task.subtasks.push({ id: Date.now(), text, completed: false });
      playSound("pop");
      saveAndRender();
    }
  }
});

// Search, Filters, Sorting & Clear Done
searchInput?.addEventListener("input", (e) => {
  searchQuery = e.target.value;
  renderTasks();
});

searchClearBtn?.addEventListener("click", () => {
  searchQuery = "";
  searchInput.value = "";
  renderTasks();
});

sortSelect?.addEventListener("change", (e) => {
  currentSort = e.target.value;
  renderTasks();
});

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

document.querySelectorAll(".chip-btn").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip-btn").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    currentCategory = chip.dataset.category;
    renderTasks();
  });
});

clearBtn?.addEventListener("click", () => {
  const before = tasks.length;
  tasks = tasks.filter(t => !t.completed);
  if (tasks.length < before) {
    playSound("pop");
    saveAndRender();
  }
});

// Sound Toggle
soundToggle?.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  localStorage.setItem("tm_sound", String(soundEnabled));
  soundToggle.textContent = soundEnabled ? "🔊" : "🔇";
  if (soundEnabled) playSound("pop");
});
if (soundToggle) soundToggle.textContent = soundEnabled ? "🔊" : "🔇";

// Theme Toggle
themeToggle?.addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  const newTheme = isDark ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("tm_theme", newTheme);
  themeToggle.textContent = newTheme === "light" ? "☀️" : "🌙";
});
const savedTheme = localStorage.getItem("tm_theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
if (themeToggle) themeToggle.textContent = savedTheme === "light" ? "☀️" : "🌙";

// ==========================================
// 7. BACKUP, EXPORT & SHORTCUTS
// ==========================================
backupBtn?.addEventListener("click", () => {
  if (settingsModal) {
    settingsModal.style.display = "flex";
    if (backupStatusMsg) backupStatusMsg.textContent = "";
  }
});

modalCloseBtn?.addEventListener("click", () => {
  if (settingsModal) settingsModal.style.display = "none";
});

settingsModal?.addEventListener("click", (e) => {
  if (e.target === settingsModal) settingsModal.style.display = "none";
});

// Export to PDF (Creates a printable report and triggers browser print/Save as PDF)
exportPdfBtn?.addEventListener("click", () => {
  const doneCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });

  let taskRows = tasks.map(t => `
    <div style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
      <span style="color: #6366f1; font-weight: bold;">${t.completed ? '☑' : '☐'}</span>
      <strong style="${t.completed ? 'text-decoration: line-through; color: #94a3b8;' : ''}">${escapeHTML(t.text)}</strong>
      <span style="font-size: 11px; padding: 2px 6px; background: #f1f5f9; border-radius: 4px; margin-left: 8px;">${(t.priority || 'medium').toUpperCase()}</span>
      <span style="font-size: 11px; padding: 2px 6px; background: #f1f5f9; border-radius: 4px; margin-left: 4px;">${categoryLabels[t.category] || 'General'}</span>
      ${t.subtasks && t.subtasks.length > 0 ? `
        <div style="padding-left: 20px; font-size: 12px; color: #64748b; margin-top: 4px;">
          ${t.subtasks.map(s => `<div>${s.completed ? '☑' : '☐'} ${escapeHTML(s.text)}</div>`).join("")}
        </div>
      ` : ""}
    </div>
  `).join("");

  const printDoc = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>TaskMaster Summary Report</title>
      <style>
        body { font-family: sans-serif; padding: 24px; color: #0f172a; line-height: 1.5; }
        h1 { margin-bottom: 4px; color: #6366f1; }
        .stats { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 8px; margin: 16px 0; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        th { background: #f1f5f9; }
        kbd { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 6px; font-family: monospace; }
      </style>
    </head>
    <body>
      <h1>TaskMaster ⚡ Report</h1>
      <p style="color: #64748b; font-size: 13px; margin: 0;">Generated on: ${dateStr}</p>
      <div class="stats">
        <strong>Total Tasks:</strong> ${totalCount} |
        <strong>Completed:</strong> ${doneCount} (${pct}%) |
        <strong>Active:</strong> ${totalCount - doneCount}
      </div>
      <h3>📋 Tasks List</h3>
      <div>${taskRows || '<p>No tasks available.</p>'}</div>
      <h3 style="margin-top: 24px;">⌨️ Keyboard Shortcuts Reference</h3>
      <table>
        <tr><th>Action</th><th>Shortcut</th></tr>
        <tr><td>Focus search bar</td><td><kbd>/</kbd></td></tr>
        <tr><td>Add new task</td><td><kbd>N</kbd></td></tr>
        <tr><td>Close modal / clear search</td><td><kbd>Esc</kbd></td></tr>
        <tr><td>Submit task or subtask</td><td><kbd>Enter</kbd></td></tr>
      </table>
    </body>
    </html>
  `;

  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);
  iframe.contentDocument.write(printDoc);
  iframe.contentDocument.close();
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => iframe.remove(), 1000);

  if (backupStatusMsg) backupStatusMsg.textContent = "📄 Opening print / Save as PDF dialog...";
  playSound("pop");
});

// Export JSON
exportJsonBtn?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `TaskMaster_Backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  if (backupStatusMsg) backupStatusMsg.textContent = "✅ Exported tasks to JSON file!";
});

// Import JSON
importJsonFile?.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (Array.isArray(imported)) {
        tasks = imported;
        saveAndRender();
        if (backupStatusMsg) backupStatusMsg.textContent = `✅ Imported ${tasks.length} tasks!`;
        playSound("chime");
      }
    } catch (_) {
      if (backupStatusMsg) backupStatusMsg.textContent = "❌ Invalid JSON file.";
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

// Copy Markdown
copyMarkdownBtn?.addEventListener("click", async () => {
  let md = `# TaskMaster Tasks (${new Date().toLocaleDateString()})\n\n`;
  tasks.forEach(t => {
    md += `- [${t.completed ? 'x' : ' '}] ${t.text} [${t.priority.toUpperCase()}] [#${t.category}]\n`;
    t.subtasks?.forEach(s => {
      md += `  - [${s.completed ? 'x' : ' '}] ${s.text}\n`;
    });
  });
  await navigator.clipboard.writeText(md);
  if (backupStatusMsg) backupStatusMsg.textContent = "✅ Copied Markdown checklist to clipboard!";
  playSound("pop");
});

// Global Keyboard Shortcuts
document.addEventListener("keydown", (e) => {
  const active = document.activeElement;
  const isTyping = active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName);

  if (e.key === "Escape") {
    if (settingsModal && settingsModal.style.display !== "none") settingsModal.style.display = "none";
    if (searchInput && active === searchInput) {
      searchInput.value = "";
      searchQuery = "";
      searchInput.blur();
      renderTasks();
    }
    return;
  }

  if (isTyping) return;

  if (e.key === "/") {
    e.preventDefault();
    searchInput?.focus();
  } else if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    todoInput?.focus();
  }
});

// ==========================================
// 8. INITIAL STARTUP
// ==========================================
renderTasks();
