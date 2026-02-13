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
    { id: 'f1', name: 'Morning shower', start: '08:00', end: '08:20', priority: 'medium
