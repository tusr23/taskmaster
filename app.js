// TaskMaster — Minimal & Beginner-Friendly JavaScript
// Features: LocalStorage, Progress Bar, Subtasks, Search, Filters, Themes, and PDF Print

// 1. STATE & DATA
const defaultTasks = [
  { id: 1, text: "Welcome to TaskMaster! 🚀", completed: false, priority: "high", category: "general", datetime: "", subtasks: ["Explore subtasks and tags"] },
  { id: 2, text: "Click Export to PDF to print or save", completed: false, priority: "medium", category: "work", datetime: "", subtasks: [] }
];

let tasks = JSON.parse(localStorage.getItem("tm_tasks")) || defaultTasks;
let currentFilter = "all";
let currentCategory = "all";
let searchQuery = "";
let currentSort = "manual";

// Category display labels
const categories = { general: "📌 General", work: "💼 Work", personal: "👤 Personal", study: "📚 Study", health: "🏃 Health", finance: "💰 Finance" };

// Save tasks to LocalStorage and update the screen
function saveAndRender() {
  localStorage.setItem("tm_tasks", JSON.stringify(tasks));
  renderTasks();
}

// 2. RENDER TASKS & DASHBOARD
function renderTasks() {
  const q = searchQuery.toLowerCase().trim();
  const searchClearBtn = document.getElementById("search-clear-btn");
  if (searchClearBtn) searchClearBtn.style.display = q ? "block" : "none";

  // Filter tasks
  const filtered = tasks.filter(t => {
    if (currentFilter === "active" && t.completed) return false;
    if (currentFilter === "completed" && !t.completed) return false;
    if (currentCategory !== "all" && t.category !== currentCategory) return false;
    if (q && !t.text.toLowerCase().includes(q) && !(t.subtasks && t.subtasks.some(s => s.toLowerCase().includes(q)))) return false;
    return true;
  });

  // Sort tasks
  const sorted = [...filtered].sort((a, b) => {
    if (currentSort === "due-asc") return (a.datetime || "z").localeCompare(b.datetime || "z");
    if (currentSort === "priority-desc") {
      const p = { high: 3, medium: 2, low: 1 };
      return (p[b.priority] || 2) - (p[a.priority] || 2);
    }
    if (currentSort === "created-desc") return b.id - a.id;
    if (currentSort === "alpha-asc") return a.text.localeCompare(b.text);
    return 0;
  });

  // Build task list HTML
  const listEl = document.getElementById("todo-list");
  listEl.innerHTML = sorted.map(t => {
    const isOverdue = t.datetime && !t.completed && new Date(t.datetime) < new Date();
    const subtasks = t.subtasks || [];
    return `
      <li class="todo-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
        <div class="todo-row">
          <input type="checkbox" class="task-checkbox" data-id="${t.id}" ${t.completed ? 'checked' : ''}>
          <div class="todo-content">
            <span class="todo-title">${escapeHTML(t.text)}</span>
            <div class="todo-meta">
              <span class="badge">${categories[t.category] || "General"}</span>
              <span class="badge prio-${t.priority}">${(t.priority || 'medium').toUpperCase()}</span>
              ${t.datetime ? `<span class="badge ${isOverdue ? 'overdue' : ''}">📅 ${t.datetime.replace('T', ' ')}</span>` : ''}
            </div>

            <!-- Native HTML5 <details> for collapsible subtasks -->
            <details class="subtasks-box" ${subtasks.length ? 'open' : ''}>
              <summary class="subtasks-summary">${subtasks.length ? `Subtasks (${subtasks.length})` : '+ Add subtask'}</summary>
              <ul class="subtasks-list">
                ${subtasks.map((s, idx) => `
                  <li class="subtask-item">
                    <span>• ${escapeHTML(s)}</span>
                    <button class="subtask-delete" data-task-id="${t.id}" data-idx="${idx}">&times;</button>
                  </li>
                `).join('')}
              </ul>
              <form class="subtask-form" data-task-id="${t.id}">
                <input type="text" placeholder="New subtask..." required autocomplete="off">
                <button type="submit">Add</button>
              </form>
            </details>
          </div>

          <div class="actions">
            <button class="btn-action edit" data-id="${t.id}" title="Edit">✏️</button>
            <button class="btn-action delete" data-id="${t.id}" title="Delete">&times;</button>
          </div>
        </div>
      </li>
    `;
  }).join('');

  // Update progress bar and counts
  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  const overdue = tasks.filter(t => t.datetime && !t.completed && new Date(t.datetime) < new Date()).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  document.getElementById("empty-msg").style.display = sorted.length ? "none" : "block";
  document.getElementById("stats-text").textContent = `${done} of ${total} completed`;
  document.getElementById("progress-percent").textContent = `${percent}%`;
  document.getElementById("progress-bar-fill").style.width = `${percent}%`;
  document.getElementById("metric-total").innerHTML = `Total: <strong>${total}</strong>`;
  document.getElementById("metric-active").innerHTML = `Active: <strong>${total - done}</strong>`;
  document.getElementById("metric-done").innerHTML = `Done: <strong>${done}</strong>`;
  
  const overdueEl = document.getElementById("metric-overdue");
  overdueEl.style.display = overdue ? "inline-block" : "none";
  if (overdue) overdueEl.innerHTML = `⚠️ Overdue: <strong>${overdue}</strong>`;
}

function escapeHTML(str) {
  const p = document.createElement("p");
  p.textContent = str || "";
  return p.innerHTML;
}

// 3. TASK ACTIONS (Add, Toggle, Delete, Edit, Subtasks)
document.getElementById("todo-form").addEventListener("submit", e => {
  e.preventDefault();
  const input = document.getElementById("todo-input");
  if (!input.value.trim()) return;

  tasks.unshift({
    id: Date.now(),
    text: input.value.trim(),
    completed: false,
    category: document.getElementById("todo-category").value,
    priority: document.getElementById("todo-priority").value,
    datetime: document.getElementById("todo-datetime").value,
    subtasks: []
  });

  input.value = "";
  document.getElementById("todo-datetime").value = "";
  saveAndRender();
});

// Click delegation on task list
document.getElementById("todo-list").addEventListener("click", e => {
  const target = e.target;
  const id = Number(target.dataset.id || target.closest("li")?.dataset.id);
  const task = tasks.find(t => t.id === id);

  // Checkbox toggle
  if (target.classList.contains("task-checkbox") && task) {
    task.completed = target.checked;
    saveAndRender();
  }

  // Delete task
  if (target.classList.contains("delete")) {
    tasks = tasks.filter(t => t.id !== id);
    saveAndRender();
  }

  // Edit task title
  if (target.classList.contains("edit") && task) {
    const updated = prompt("Edit task title:", task.text);
    if (updated && updated.trim()) {
      task.text = updated.trim();
      saveAndRender();
    }
  }

  // Delete subtask
  if (target.classList.contains("subtask-delete")) {
    const taskId = Number(target.dataset.taskId);
    const subIdx = Number(target.dataset.idx);
    const parentTask = tasks.find(t => t.id === taskId);
    if (parentTask) {
      parentTask.subtasks.splice(subIdx, 1);
      saveAndRender();
    }
  }
});

// Add subtask form submission
document.getElementById("todo-list").addEventListener("submit", e => {
  if (e.target.classList.contains("subtask-form")) {
    e.preventDefault();
    const taskId = Number(e.target.dataset.taskId);
    const input = e.target.querySelector("input");
    const parentTask = tasks.find(t => t.id === taskId);
    if (parentTask && input.value.trim()) {
      if (!parentTask.subtasks) parentTask.subtasks = [];
      parentTask.subtasks.push(input.value.trim());
      saveAndRender();
    }
  }
});

// 4. CONTROLS: Search, Filters, Sort, Theme, & Clock
document.getElementById("search-input").addEventListener("input", e => {
  searchQuery = e.target.value;
  renderTasks();
});

document.getElementById("search-clear-btn").addEventListener("click", () => {
  searchQuery = "";
  document.getElementById("search-input").value = "";
  renderTasks();
});

document.getElementById("sort-select").addEventListener("change", e => {
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

document.getElementById("clear-btn").addEventListener("click", () => {
  tasks = tasks.filter(t => !t.completed);
  saveAndRender();
});

// Theme toggle
document.getElementById("theme-toggle").addEventListener("click", () => {
  const isDark = document.documentElement.getAttribute("data-theme") !== "light";
  document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
  localStorage.setItem("tm_theme", isDark ? "light" : "dark");
  document.getElementById("theme-toggle").textContent = isDark ? "☀️" : "🌙";
});
const savedTheme = localStorage.getItem("tm_theme") || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
document.getElementById("theme-toggle").textContent = savedTheme === "light" ? "☀️" : "🌙";

// Live Clock
function updateClock() {
  document.getElementById("live-clock").textContent = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// 5. NATIVE DIALOG MODAL & EXPORT (PDF, JSON, Markdown)
const modal = document.getElementById("settings-modal");
document.getElementById("backup-btn").addEventListener("click", () => modal.showModal());
document.getElementById("modal-close-btn").addEventListener("click", () => modal.close());

// PDF Export (Uses browser native print / Save as PDF)
document.getElementById("export-pdf-btn").addEventListener("click", () => {
  modal.close();
  window.print();
});

// JSON Export & Import
document.getElementById("export-json-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `TaskMaster_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
});

document.getElementById("import-json-file").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (Array.isArray(data)) {
        tasks = data;
        saveAndRender();
        document.getElementById("backup-status-msg").textContent = `✅ Imported ${tasks.length} tasks!`;
      }
    } catch (_) {
      document.getElementById("backup-status-msg").textContent = "❌ Invalid file.";
    }
  };
  reader.readAsText(file);
});

// Copy Markdown
document.getElementById("copy-markdown-btn").addEventListener("click", async () => {
  let md = `# TaskMaster Export\n\n`;
  tasks.forEach(t => {
    md += `- [${t.completed ? 'x' : ' '}] ${t.text} [${t.priority.toUpperCase()}]\n`;
    t.subtasks?.forEach(s => md += `  - [ ] ${s}\n`);
  });
  await navigator.clipboard.writeText(md);
  document.getElementById("backup-status-msg").textContent = "✅ Copied Markdown checklist!";
});

// Keyboard Shortcuts
document.addEventListener("keydown", e => {
  if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) return;
  if (e.key === "/") {
    e.preventDefault();
    document.getElementById("search-input").focus();
  } else if (e.key === "n" || e.key === "N") {
    e.preventDefault();
    document.getElementById("todo-input").focus();
  }
});

// Initial Render
renderTasks();
