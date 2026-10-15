// TaskMaster — High-Performance, Minimal-Footprint Task & Focus Suite
const $ = id => document.getElementById(id);
const defaultTasks = [
  { id: 1, text: "Welcome to TaskMaster! 🚀", completed: false, priority: "high", category: "general", datetime: "", subtasks: ["Explore subtasks and tags"] },
  { id: 2, text: "Click Export to PDF to print or save", completed: false, priority: "medium", category: "work", datetime: "", subtasks: [] }
];

// 1. STATE & STORAGE
let tasks = JSON.parse(localStorage.getItem("tm_tasks")) || defaultTasks;
let currentFilter = "all", currentCategory = "all", currentSort = "manual", searchQuery = "";

const categories = { general: "📌 General", work: "💼 Work", personal: "👤 Personal", study: "📚 Study", health: "🏃 Health", finance: "💰 Finance" };
const prioWeight = { high: 3, medium: 2, low: 1 };

// Pomodoro State
const POMO_SECS = { focus: 1500, short: 300, long: 900 };
let pomoMode = "focus", pomoLeft = 1500, pomoTimer = null, pomoTask = null;
let pomoSessions = +localStorage.getItem("tm_pomo_sessions") || 0;
let pomoSound = localStorage.getItem("tm_pomo_sound") !== "false";
let pomoOpen = localStorage.getItem("tm_pomo_visible") !== "false";

const save = () => { localStorage.setItem("tm_tasks", JSON.stringify(tasks)); render(); };

// Web Audio API Chime (Zero network requests / external files)
function playTone(success) {
  if (!pomoSound) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime;
    if (success) {
      [523.25, 659.25, 783.99].forEach((f, i) => osc.frequency.setValueAtTime(f, t + i * 0.15));
      g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      osc.start(t); osc.stop(t + 0.85);
    } else {
      osc.type = "triangle"; osc.frequency.setValueAtTime(440, t);
      g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      osc.start(t); osc.stop(t + 0.15);
    }
  } catch (_) {}
}

const escapeHTML = str => {
  const p = document.createElement("p");
  p.textContent = str || "";
  return p.innerHTML;
};

// 2. RENDER ENGINE
function render() {
  const q = searchQuery.toLowerCase().trim();
  const now = new Date();

  // Filter tasks
  const filtered = tasks.filter(t => 
    (currentFilter === "all" || (currentFilter === "active" ? !t.completed : t.completed)) &&
    (currentCategory === "all" || t.category === currentCategory) &&
    (!q || t.text.toLowerCase().includes(q) || t.subtasks?.some(s => s.toLowerCase().includes(q)))
  );

  // Sort tasks
  filtered.sort((a, b) => 
    currentSort === "due-asc" ? (a.datetime || "z").localeCompare(b.datetime || "z") :
    currentSort === "priority-desc" ? (prioWeight[b.priority] || 2) - (prioWeight[a.priority] || 2) :
    currentSort === "created-desc" ? b.id - a.id :
    currentSort === "alpha-asc" ? a.text.localeCompare(b.text) : 0
  );

  // Render Task Cards
  $("todo-list").innerHTML = filtered.map(t => {
    const isOverdue = t.datetime && !t.completed && new Date(t.datetime) < now;
    const isFocused = t.id === pomoTask;
    const subs = t.subtasks || [];
    return `
      <li class="todo-item ${t.completed ? 'completed' : ''} ${isFocused ? 'is-focused-task' : ''}" data-id="${t.id}">
        <div class="todo-row">
          <input type="checkbox" class="task-checkbox" data-id="${t.id}" ${t.completed ? 'checked' : ''}>
          <div class="todo-content">
            <span class="todo-title">${escapeHTML(t.text)}</span>
            <div class="todo-meta">
              <span class="badge">${categories[t.category] || "General"}</span>
              <span class="badge prio-${t.priority}">${(t.priority || 'medium').toUpperCase()}</span>
              ${t.datetime ? `<span class="badge ${isOverdue ? 'overdue' : ''}">📅 ${t.datetime.replace('T', ' ')}</span>` : ''}
              ${isFocused ? `<span class="badge prio-high">⚡ Focusing</span>` : ''}
            </div>
            <details class="subtasks-box" ${subs.length ? 'open' : ''}>
              <summary class="subtasks-summary">${subs.length ? `Subtasks (${subs.length})` : '+ Add subtask'}</summary>
              <ul class="subtasks-list">
                ${subs.map((s, idx) => `
                  <li class="subtask-item">
                    <span>• ${escapeHTML(s)}</span>
                    <button class="subtask-delete" data-task-id="${t.id}" data-idx="${idx}">&times;</button>
                  </li>`).join('')}
              </ul>
              <form class="subtask-form" data-task-id="${t.id}">
                <input type="text" placeholder="New subtask..." required autocomplete="off">
                <button type="submit">Add</button>
              </form>
            </details>
          </div>
          <div class="actions">
            <button class="btn-action focus-task" data-id="${t.id}" title="${isFocused ? 'Unlink Focus' : 'Focus with Pomodoro'}">${isFocused ? '🍅' : '⏱️'}</button>
            <button class="btn-action edit" data-id="${t.id}" title="Edit">✏️</button>
            <button class="btn-action delete" data-id="${t.id}" title="Delete">&times;</button>
          </div>
        </div>
      </li>`;
  }).join('');

  // Dashboard Metrics
  const total = tasks.length, done = tasks.filter(t => t.completed).length;
  const overdue = tasks.filter(t => t.datetime && !t.completed && new Date(t.datetime) < now).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  $("empty-msg").style.display = filtered.length ? "none" : "block";
  $("stats-text").textContent = `${done} of ${total} completed`;
  $("progress-percent").textContent = `${pct}%`;
  $("progress-bar-fill").style.width = `${pct}%`;
  $("metric-total").innerHTML = `Total: <strong>${total}</strong>`;
  $("metric-active").innerHTML = `Active: <strong>${total - done}</strong>`;
  $("metric-done").innerHTML = `Done: <strong>${done}</strong>`;
  $("metric-overdue").style.display = overdue ? "inline-block" : "none";
  if (overdue) $("metric-overdue").innerHTML = `⚠️ Overdue: <strong>${overdue}</strong>`;

  renderPomo();
}

// 3. POMODORO ENGINE
function renderPomo() {
  const card = $("pomodoro-section");
  if (!card) return;
  card.classList.toggle("hidden", !pomoOpen);
  $("pomo-toggle-btn")?.classList.toggle("active", pomoOpen);

  const m = String(Math.floor(pomoLeft / 60)).padStart(2, "0");
  const s = String(pomoLeft % 60).padStart(2, "0");
  const formatted = `${m}:${s}`;
  $("pomo-time-display").textContent = formatted;
  $("pomo-progress-fill").style.width = `${(pomoLeft / POMO_SECS[pomoMode]) * 100}%`;

  const startBtn = $("pomo-start-btn");
  if (pomoTimer) {
    startBtn.textContent = `⏸ Pause ${pomoMode === 'focus' ? 'Focus' : 'Break'}`;
    card.classList.add("running");
    document.title = `(${formatted}) 🍅 TaskMaster`;
  } else {
    startBtn.textContent = pomoLeft < POMO_SECS[pomoMode] ? "▶ Resume" : "▶ Start Focus";
    card.classList.remove("running");
    document.title = "TaskMaster — Smart Task Manager";
  }

  $("pomo-session-pill").textContent = `${pomoSessions} session${pomoSessions === 1 ? '' : 's'}`;
  $("pomo-sound-btn").textContent = pomoSound ? "🔔" : "🔕";

  const t = tasks.find(x => x.id === pomoTask);
  $("pomo-current-task-name").textContent = t ? t.text : "No task selected (Click ⏱️ on any task below)";
  $("pomo-clear-task-btn").style.display = t ? "inline-block" : "none";
}

function togglePomo() {
  if (pomoTimer) {
    clearInterval(pomoTimer); pomoTimer = null;
  } else {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    playTone(false);
    pomoTimer = setInterval(() => {
      if (pomoLeft > 0) {
        pomoLeft--; renderPomo();
      } else {
        clearInterval(pomoTimer); pomoTimer = null;
        playTone(true);
        if (pomoMode === "focus") {
          pomoSessions++;
          localStorage.setItem("tm_pomo_sessions", pomoSessions);
          const t = tasks.find(x => x.id === pomoTask);
          if (t && !t.completed && confirm(`🎉 25m Focus done! Mark "${t.text}" as completed?`)) {
            t.completed = true; pomoTask = null; save();
          }
          setPomoMode(pomoSessions % 4 === 0 ? "long" : "short");
        } else {
          setPomoMode("focus");
        }
      }
    }, 1000);
  }
  renderPomo();
}

function setPomoMode(mode) {
  if (pomoTimer) { clearInterval(pomoTimer); pomoTimer = null; }
  pomoMode = mode; pomoLeft = POMO_SECS[mode];
  document.querySelectorAll(".pomo-mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  renderPomo();
}

function togglePomoCard(open = !pomoOpen) {
  pomoOpen = open;
  localStorage.setItem("tm_pomo_visible", pomoOpen);
  renderPomo();
}

// 4. TASK ACTIONS & EVENT DELEGATION
$("todo-form").addEventListener("submit", e => {
  e.preventDefault();
  const input = $("todo-input");
  if (!input.value.trim()) return;
  tasks.unshift({
    id: Date.now(),
    text: input.value.trim(),
    completed: false,
    category: $("todo-category").value,
    priority: $("todo-priority").value,
    datetime: $("todo-datetime").value,
    subtasks: []
  });
  input.value = ""; $("todo-datetime").value = "";
  save();
});

$("todo-list").addEventListener("click", e => {
  const t = e.target;
  const id = Number(t.dataset.id || t.closest("li")?.dataset.id);
  const task = tasks.find(x => x.id === id);

  if (t.classList.contains("task-checkbox") && task) {
    task.completed = t.checked; save();
  } else if (t.classList.contains("focus-task") && task) {
    pomoTask = pomoTask === id ? null : id;
    if (pomoTask) {
      togglePomoCard(true);
      $("pomodoro-section")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    render();
  } else if (t.classList.contains("delete")) {
    if (pomoTask === id) pomoTask = null;
    tasks = tasks.filter(x => x.id !== id); save();
  } else if (t.classList.contains("edit") && task) {
    const text = prompt("Edit task:", task.text);
    if (text?.trim()) { task.text = text.trim(); save(); }
  } else if (t.classList.contains("subtask-delete")) {
    const parent = tasks.find(x => x.id === +t.dataset.taskId);
    parent?.subtasks.splice(+t.dataset.idx, 1); save();
  }
});

$("todo-list").addEventListener("submit", e => {
  if (e.target.classList.contains("subtask-form")) {
    e.preventDefault();
    const parent = tasks.find(x => x.id === +e.target.dataset.taskId);
    const input = e.target.querySelector("input");
    if (parent && input.value.trim()) {
      (parent.subtasks = parent.subtasks || []).push(input.value.trim());
      save();
    }
  }
});

// 5. SEARCH, FILTERS, CONTROLS
$("search-input").addEventListener("input", e => { searchQuery = e.target.value; render(); });
$("search-clear-btn").addEventListener("click", () => { searchQuery = $("search-input").value = ""; render(); });
$("sort-select").addEventListener("change", e => { currentSort = e.target.value; render(); });
$("clear-btn").addEventListener("click", () => { tasks = tasks.filter(t => !t.completed); save(); });

document.querySelector(".filter-tabs").addEventListener("click", e => {
  if (e.target.dataset.filter) {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    currentFilter = e.target.dataset.filter;
    render();
  }
});

$("category-chips").addEventListener("click", e => {
  if (e.target.dataset.category) {
    document.querySelectorAll(".chip-btn").forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
    currentCategory = e.target.dataset.category;
    render();
  }
});

// Theme & Clock
const applyTheme = theme => {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("tm_theme", theme);
  $("theme-toggle").textContent = theme === "light" ? "☀️" : "🌙";
};
$("theme-toggle").addEventListener("click", () => applyTheme(document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light"));
applyTheme(localStorage.getItem("tm_theme") || "dark");

setInterval(() => {
  $("live-clock").textContent = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}, 1000);

// Pomodoro Controls
$("pomo-start-btn")?.addEventListener("click", togglePomo);
$("pomo-reset-btn")?.addEventListener("click", () => { pomoLeft = POMO_SECS[pomoMode]; if (pomoTimer) togglePomo(); renderPomo(); });
$("pomo-skip-btn")?.addEventListener("click", () => setPomoMode(pomoMode === "focus" ? "short" : "focus"));
$("pomo-toggle-btn")?.addEventListener("click", () => togglePomoCard());
$("pomo-close-btn")?.addEventListener("click", () => togglePomoCard(false));
$("pomo-clear-task-btn")?.addEventListener("click", () => { pomoTask = null; render(); });
$("pomo-sound-btn")?.addEventListener("click", () => {
  pomoSound = !pomoSound; localStorage.setItem("tm_pomo_sound", pomoSound); renderPomo();
});
document.querySelectorAll(".pomo-mode-btn").forEach(b => b.addEventListener("click", () => setPomoMode(b.dataset.mode)));

// 6. BACKUP MODAL & EXPORT (PDF, JSON, Markdown)
const modal = $("settings-modal");
$("backup-btn").addEventListener("click", () => modal.showModal());
$("modal-close-btn").addEventListener("click", () => modal.close());
$("export-pdf-btn").addEventListener("click", () => { modal.close(); window.print(); });

$("export-json-btn").addEventListener("click", () => {
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" })),
    download: `TaskMaster_${new Date().toISOString().slice(0, 10)}.json`
  });
  a.click();
});

$("import-json-file").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (Array.isArray(data)) {
        tasks = data; save();
        $("backup-status-msg").textContent = `✅ Imported ${tasks.length} tasks!`;
      }
    } catch { $("backup-status-msg").textContent = "❌ Invalid JSON."; }
  };
  reader.readAsText(file);
});

$("copy-markdown-btn").addEventListener("click", async () => {
  const md = "# TaskMaster Export\n\n" + tasks.map(t => 
    `- [${t.completed ? 'x' : ' '}] ${t.text} [${t.priority.toUpperCase()}]\n` +
    (t.subtasks?.map(s => `  - [ ] ${s}\n`).join('') || '')
  ).join('');
  await navigator.clipboard.writeText(md);
  $("backup-status-msg").textContent = "✅ Copied Markdown checklist!";
});

// 7. KEYBOARD SHORTCUTS
document.addEventListener("keydown", e => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
  if (e.key === "/") { e.preventDefault(); $("search-input").focus(); }
  else if (e.key === "n" || e.key === "N") { e.preventDefault(); $("todo-input").focus(); }
  else if (e.key === "p" || e.key === "P") { e.preventDefault(); togglePomoCard(); }
  else if (e.code === "Space" && pomoOpen) { e.preventDefault(); togglePomo(); }
});

// Initial Render
render();
