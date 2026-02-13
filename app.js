const STORAGE_KEY   = "gameboard_v2";
const FAVORITES_KEY = "gameboard_favorites_v2";
const HISTORY_KEY   = "gameboard_history_v2";

const defaultState = { date: todayStr(), tasks: [] };

function todayStr() {
  return new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState, date: todayStr(), tasks: [] };
    const p = JSON.parse(raw);
    return { date: p.date || todayStr(), tasks: Array.isArray(p.tasks) ? p.tasks : [] };
  } catch { return { ...defaultState, date: todayStr(), tasks: [] }; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(window.__state)); }

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return getDefaultFavorites();
    return JSON.parse(raw);
  } catch { return getDefaultFavorites(); }
}
function saveFavorites() { localStorage.setItem(FAVORITES_KEY, JSON.stringify(window.__favorites)); }

function getDefaultFavorites() {
  return [
    { id: 'f1', name: 'Morning shower', start: '08:00', end: '08:20', priority: 'medium' },
    { id: 'f2', name: 'Breakfast',      start: '08:20', end: '08:45', priority: 'medium' },
    { id: 'f3', name: 'Dog walk',        start: '09:00', end: '09:30', priority: 'high'   },
    { id: 'f4', name: 'Lunch',           start: '12:30', end: '13:00', priority: 'medium' },
    { id: 'f5', name: 'Short break',     start: '15:00', end: '15:15', priority: 'low'    },
  ];
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}
function saveHistory(history) { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }

function recalcBasePoints(tasks) {
  if (!tasks.length) return tasks;
  const weights = { high: 3, medium: 2, low: 1 };
  const totalWeight = tasks.reduce((sum, t) => sum + (weights[t.priority] || 2), 0);
  let remaining = 100;
  return tasks.map((t, i) => {
    if (i === tasks.length - 1) return { ...t, basePoints: Math.max(1, remaining) };
    const pts = Math.max(1, Math.round((weights[t.priority] || 2) / totalWeight * 100));
    remaining -= pts;
    return { ...t, basePoints: pts };
  });
}

function parseHM(hm) {
  if (!hm || typeof hm !== 'string') return null;
  const [h, m] = hm.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function computeSpeedBonus(task) {
  const startMin = parseHM(task.start);
  const dueMin   = parseHM(task.due);
  const doneMin  = parseHM(task.completedTime);
  if (startMin === null || dueMin === null || doneMin === null) return 0;
  const window  = dueMin - startMin;
  const earlyBy = dueMin - doneMin;
  if (window <= 0 || earlyBy <= 0) return 0;
  const pct   = earlyBy / window;
  return Math.max(0, Math.round(task.basePoints * Math.min(pct, 0.5)));
}

function isDone(task) { return !!task.completedTime; }

function render() {
  const state = window.__state;
  document.getElementById('todayDate').textContent = state.date;
  state.tasks = recalcBasePoints(state.tasks);

  const tbody = document.getElementById('tasksBody');
  const table = document.getElementById('tasksTable');
  const empty = document.getElementById('emptyState');

  if (!state.tasks.length) {
    empty.style.display = 'block';
    table.style.display = 'none';
  } else {
    empty.style.display = 'none';
    table.style.display = 'table';
  }

  tbody.innerHTML = '';
  let completedCount = 0, baseTotal = 0, bonusTotal = 0;

  for (const task of state.tasks) {
    const done  = isDone(task);
    const bonus = done ? computeSpeedBonus(task) : 0;
    const total = done ? task.basePoints + bonus : 0;
    if (done) { completedCount++; baseTotal += task.basePoints; bonusTotal += bonus; }

    const priorityLabel = { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' };
    const priorityClass = { high: 'priority-high', medium: 'priority-medium', low: 'priority-low' };

    let bonusHtml;
    if (!done) bonusHtml = `<span class="bonus-badge bonus-none">—</span>`;
    else if (bonus > 0) bonusHtml = `<span class="bonus-badge bonus-good">+${bonus} ⚡</span>`;
    else bonusHtml = `<span class="bonus-badge bonus-none">On time</span>`;

    const tr = document.createElement('tr');
    if (done) tr.classList.add('done-row');
    tr.innerHTML = `
      <td><span class="priority-badge ${priorityClass[task.priority] || ''}">${priorityLabel[task.priority] || ''}</span> ${escHtml(task.name)}</td>
      <td>${escHtml(task.start)}</td>
      <td>${escHtml(task.due)}</td>
      <td><strong>${task.basePoints}</strong></td>
      <td><input type="time" class="completedTime" data-id="${task.id}" value="${escHtml(task.completedTime || '')}" /></td>
      <td>${bonusHtml}</td>
      <td><strong>${done ? total : '—'}</strong></td>
      <td class="status-done">${done ? '✅' : ''}</td>
      <td><button class="btn-remove" data-remove="${task.id}" title="Remove task">✕</button></td>
    `;
    tbody.appendChild(tr);
  }

  const grandTotal = baseTotal + bonusTotal;
  document.getElementById('sbCompleted').textContent = completedCount;
  document.getElementById('sbTotalTasks').textContent = state.tasks.length;
  document.getElementById('sbBase').textContent = baseTotal;
  document.getElementById('sbBonus').textContent = bonusTotal;
  document.getElementById('sbTotal').textContent = grandTotal;
  document.getElementById('sbPct').textContent = `${grandTotal} / 100+ pts`;

  document.querySelectorAll('.completedTime').forEach(input => {
    input.addEventListener('change', e => {
      const id = e.target.getAttribute('data-id');
      const t  = state.tasks.find(x => x.id === id);
      if (!t) return;
      t.completedTime = e.target.value || '';
      saveState(); render();
    });
  });

  document.querySelectorAll('[data-remove]').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.currentTarget.getAttribute('data-remove');
      state.tasks = state.tasks.filter(x => x.id !== id);
      saveState(); render();
    });
  });
}

function renderFavoritesBar() {
  const bar = document.getElementById('favoritesBar');
  bar.innerHTML = '';
  if (!window.__favorites.length) {
    bar.innerHTML = '<span class="fav-empty">No favorites yet — click "Manage Favorites" to add some!</span>';
    return;
  }
  window.__favorites.forEach(fav => {
    const btn = document.createElement('button');
    btn.className = 'fav-btn';
    btn.textContent = `${fav.name} (${fav.start}–${fav.end})`;
    btn.addEventListener('click', () => addTaskFromFavorite(fav));
    bar.appendChild(btn);
  });
}

function renderFavoritesModal() {
  const list = document.getElementById('favoritesList');
  list.innerHTML = '';
  if (!window.__favorites.length) {
    list.innerHTML = '<p style="color:var(--muted);font-size:13px;">No favorites yet.</p>';
    return;
  }
  window.__favorites.forEach(fav => {
    const div = document.createElement('div');
    div.className = 'fav-item';
    div.innerHTML = `
      <span class="fav-item-name">${escHtml(fav.name)}</span>
      <span class="fav-item-times">${escHtml(fav.start)} – ${escHtml(fav.end)} · ${fav.priority}</span>
      <button class="btn-remove fav-item-del" data-del-fav="${fav.id}">✕</button>
    `;
    list.appendChild(div);
  });
  document.querySelectorAll('[data-del-fav]').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.currentTarget.getAttribute('data-del-fav');
      window.__favorites = window.__favorites.filter(f => f.id !== id);
      saveFavorites(); renderFavoritesBar(); renderFavoritesModal();
    });
  });
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const history = loadHistory();
  const keys = Object.keys(history).sort().reverse();
  if (!keys.length) {
    list.innerHTML = '<p class="history-empty">No saved games yet. Play today and click "Save Today\'s Game"!</p>';
    return;
  }
  list.innerHTML = '';
  keys.forEach(key => {
    const day = history[key];
    const completedTasks = day.tasks.filter(t => t.completedTime);
    const baseTotal  = completedTasks.reduce((s, t) => s + (t.basePoints || 0), 0);
    const bonusTotal = completedTasks.reduce((s, t) => s + computeSpeedBonus(t), 0);
    const grand = baseTotal + bonusTotal;
    const div = document.createElement('div');
    div.className = 'history-day';
    div.innerHTML = `
      <div class="history-day-header">
        <span class="history-date">${escHtml(day.date)}</span>
        <span class="history-score">🏆 ${grand} pts</span>
      </div>
      <div class="history-tasks">
        ${day.tasks.map(t => `
          <div class="history-task ${t.completedTime ? 'completed' : ''}">
            <span>${t.completedTime ? '✅' : '⬜'} ${escHtml(t.name)}</span>
            <span>${t.completedTime ? `${t.basePoints + computeSpeedBonus(t)} pts` : '—'}</span>
          </div>
        `).join('')}
      </div>
    `;
    list.appendChild(div);
  });
}

function uid() { return 't_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function addTaskFromFavorite(fav) {
  const state = window.__state;
  if (state.tasks.find(t => t.name === fav.name)) { alert(`"${fav.name}" is already in today's tasks.`); return; }
  state.tasks.push({ id: uid(), name: fav.name, start: fav.start, due: fav.end, priority: fav.priority || 'medium', completedTime: '' });
  saveState(); render();
}

function wireAddTask() {
  document.getElementById('btnAddTask').addEventListener('click', () => {
    const name     = document.getElementById('newTaskName').value.trim();
    const start    = document.getElementById('newTaskStart').value;
    const end      = document.getElementById('newTaskEnd').value;
    const priority = document.getElementById('newTaskPriority').value;
    if (!name)  { alert('Please enter a task name.'); return; }
    if (!start) { alert('Please enter a start time.'); return; }
    if (!end)   { alert('Please enter an end time.'); return; }
    window.__state.tasks.push({ id: uid(), name, start, due: end, priority, basePoints: 10, completedTime: '' });
    saveState(); render();
    document.getElementById('newTaskName').value  = '';
    document.getElementById('newTaskStart').value = '';
    document.getElementById('newTaskEnd').value   = '';
  });
  document.getElementById('newTaskName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btnAddTask').click();
  });
}

function wireSaveDay() {
  document.getElementById('btnSaveDay').addEventListener('click', () => {
    const state = window.__state;
    if (!state.tasks.length) { alert('No tasks to save!'); return; }
    const history = loadHistory();
    history[todayKey()] = { date: state.date, tasks: JSON.parse(JSON.stringify(state.tasks)) };
    saveHistory(history);
    alert('✅ Today\'s game saved to history!');
  });
}

function wireNewDay() {
  document.getElementById('btnNewDay').addEventListener('click', () => {
    if (!confirm('Start a new day? This will clear today\'s tasks (save first if needed).')) return;
    window.__state = { date: todayStr(), tasks: [] };
    saveState(); render();
  });
}

function wireFavoritesModal() {
  const modal   = document.getElementById('favoritesModal');
  const overlay = document.getElementById('overlay');
  document.getElementById('btnManageFavorites').addEventListener('click', () => {
    renderFavoritesModal();
    modal.classList.remove('hidden');
    overlay.classList.remove('hidden');
  });
  document.getElementById('btnCloseFavorites').addEventListener('click', closeModals);
  overlay.addEventListener('click', closeModals);
  document.getElementById('btnAddFavorite').addEventListener('click', () => {
    const name     = document.getElementById('favName').value.trim();
    const start    = document.getElementById('favStart').value;
    const end      = document.getElementById('favEnd').value;
    const priority = document.getElementById('favPriority').value;
    if (!name)  { alert('Please enter a name.'); return; }
    if (!start) { alert('Please enter a start time.'); return; }
    if (!end)   { alert('Please enter an end time.'); return; }
    window.__favorites.push({ id: uid(), name, start, end, priority });
    saveFavorites(); renderFavoritesBar(); renderFavoritesModal();
    document.getElementById('favName').value  = '';
    document.getElementById('favStart').value = '';
    document.getElementById('favEnd').value   = '';
  });
}

function wireHistoryModal() {
  document.getElementById('btnHistory').addEventListener('click', () => {
    renderHistory();
    document.getElementById('historyModal').classList.remove('hidden');
    document.getElementById('overlay').classList.remove('hidden');
  });
  document.getElementById('btnCloseHistory').addEventListener('click', closeModals);
}

function closeModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById('overlay').classList.add('hidden');
}

function wireResetDay() {
  document.getElementById('btnResetDay').addEventListener('click', () => {
    if (!confirm('Clear all completion times for today?')) return;
    window.__state.tasks = window.__state.tasks.map(t => ({ ...t, completedTime: '' }));
    saveState(); render();
  });
}

function wireExport() {
  document.getElementById('btnExport').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(window.__state, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'gameboard-export.json';
    a.click(); URL.revokeObjectURL(url);
  });
}

function wireImport() {
  document.getElementById('fileImport').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text   = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.tasks)) { alert("Doesn't look like a valid export."); return; }
      window.__state = { date: parsed.date || todayStr(), tasks: parsed.tasks };
      saveState(); render();
    } catch { alert('Could not parse JSON file.'); }
    finally { e.target.value = ''; }
  });
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

(function init() {
  window.__state     = loadState();
  window.__favorites = loadFavorites();
  wireAddTask(); wireSaveDay(); wireNewDay();
  wireFavoritesModal(); wireHistoryModal();
  wireResetDay(); wireExport(); wireImport();
  renderFavoritesBar(); render();
})();
