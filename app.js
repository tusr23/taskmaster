const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const prioritySelect = document.getElementById('todo-priority');
const datetimeInput = document.getElementById('todo-datetime');
const searchInput = document.getElementById('search-input');
const list = document.getElementById('todo-list');
const emptyMsg = document.getElementById('empty-msg');
const statsText = document.getElementById('stats-text');
const liveClock = document.getElementById('live-clock');
const clearBtn = document.getElementById('clear-btn');
const themeToggle = document.getElementById('theme-toggle');
const filterBtns = document.querySelectorAll('.filter-btn');

// Initial sample tasks with sample datetime
const todayEvening = new Date();
todayEvening.setHours(18, 0, 0, 0);

let tasks = JSON.parse(localStorage.getItem('tm_tasks')) || [
  {
    id: 1,
    text: 'Welcome to TaskMaster! 🚀',
    completed: false,
    priority: 'high',
    datetime: todayEvening.toISOString().slice(0, 16)
  },
  {
    id: 2,
    text: 'Check off tasks to mark done',
    completed: true,
    priority: 'medium',
    datetime: ''
  }
];

let currentFilter = 'all';
let searchQuery = '';

// Live Clock in Header
function updateLiveClock() {
  if (!liveClock) return;
  const now = new Date();
  const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  liveClock.textContent = now.toLocaleDateString(undefined, options);
}
setInterval(updateLiveClock, 1000);
updateLiveClock();

// Date & Time formatting helpers
function formatDateTime(isoStr) {
  if (!isoStr) return null;
  const dt = new Date(isoStr);
  if (isNaN(dt.getTime())) return null;

  const now = new Date();
  const isToday = dt.toDateString() === now.toDateString();

  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = dt.toDateString() === tomorrow.toDateString();

  const timeStr = dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  if (isToday) return { label: `Today, ${timeStr}`, isToday: true };
  if (isTomorrow) return { label: `Tomorrow, ${timeStr}`, isToday: false };

  const dateStr = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { label: `${dateStr}, ${timeStr}`, isToday: false };
}

function isOverdue(isoStr, completed) {
  if (!isoStr || completed) return false;
  const dt = new Date(isoStr);
  return !isNaN(dt.getTime()) && dt < new Date();
}

function saveAndRender() {
  localStorage.setItem('tm_tasks', JSON.stringify(tasks));
  render();
}

function render() {
  const q = searchQuery.toLowerCase().trim();
  const filtered = tasks.filter(t => {
    if (currentFilter === 'active' && t.completed) return false;
    if (currentFilter === 'completed' && !t.completed) return false;
    if (q && !t.text.toLowerCase().includes(q)) return false;
    return true;
  });

  list.innerHTML = '';
  filtered.forEach(task => {
    const li = document.createElement('li');
    li.className = `todo-item ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;

    const dtInfo = formatDateTime(task.datetime);
    const overdue = isOverdue(task.datetime, task.completed);

    li.innerHTML = `
      <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}" aria-label="Mark done">
      <div class="todo-content">
        <span class="todo-text">${escapeHTML(task.text)}</span>
        <div class="todo-meta">
          <span class="priority-badge priority-${task.priority || 'medium'}">${task.priority || 'medium'}</span>
          ${dtInfo ? `
            <span class="datetime-badge ${overdue ? 'is-overdue' : ''} ${dtInfo.isToday ? 'is-today' : ''}">
              ${overdue ? '⚠️ Overdue: ' : '📅 '}${dtInfo.label}
            </span>
          ` : ''}
        </div>
      </div>
      <div class="item-actions">
        <button class="edit-btn" data-id="${task.id}" title="Edit task" aria-label="Edit">✏️</button>
        <button class="delete-btn" data-id="${task.id}" title="Delete task" aria-label="Delete">&times;</button>
      </div>
    `;
    list.appendChild(li);
  });

  emptyMsg.style.display = filtered.length === 0 ? 'block' : 'none';
  const doneCount = tasks.filter(t => t.completed).length;
  statsText.textContent = `${doneCount} of ${tasks.length} completed`;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

// Add task with Priority and Date/Time
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  const priority = prioritySelect ? prioritySelect.value : 'medium';
  const datetime = datetimeInput ? datetimeInput.value : '';

  tasks.unshift({
    id: Date.now(),
    text,
    completed: false,
    priority,
    datetime
  });

  input.value = '';
  if (datetimeInput) datetimeInput.value = '';
  saveAndRender();
});

// Live Search Filter
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    render();
  });
}

// Item actions: Toggle Complete, Edit, and Delete
list.addEventListener('click', (e) => {
  const id = Number(e.target.dataset.id);
  if (!id) return;

  // Toggle complete
  if (e.target.type === 'checkbox') {
    const task = tasks.find(t => t.id === id);
    if (task) task.completed = e.target.checked;
    saveAndRender();
    return;
  }

  // Delete
  if (e.target.classList.contains('delete-btn')) {
    tasks = tasks.filter(t => t.id !== id);
    saveAndRender();
    return;
  }

  // Inline Edit
  if (e.target.classList.contains('edit-btn')) {
    const li = e.target.closest('.todo-item');
    const span = li.querySelector('.todo-text');
    const task = tasks.find(t => t.id === id);
    if (!task || li.querySelector('.edit-input')) return;

    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input';
    editInput.value = task.text;
    span.replaceWith(editInput);
    editInput.focus();

    function commitEdit() {
      const newText = editInput.value.trim();
      if (newText) {
        task.text = newText;
      }
      saveAndRender();
    }

    editInput.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') commitEdit();
      if (ev.key === 'Escape') render();
    });
    editInput.addEventListener('blur', commitEdit);
  }
});

// Filter tabs
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
  });
});

// Clear completed
clearBtn.addEventListener('click', () => {
  tasks = tasks.filter(t => !t.completed);
  saveAndRender();
});

// Theme toggle
themeToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  themeToggle.textContent = isDark ? '☀️' : '🌙';
});

// Initial render
render();
