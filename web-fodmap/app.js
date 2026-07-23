/* FODMAP Assistant — web version.
 * State, search/filter, category browse, favourites (localStorage), and the
 * detail sheet. Food data comes from data.js (const FOODS). */

'use strict';

const LEVELS = {
  low:      { title: 'Enjoy',   summary: 'Low FODMAP — safe in normal servings.' },
  moderate: { title: 'Careful', summary: 'Low FODMAP only in a small serving — watch the portion.' },
  high:     { title: 'Avoid',   summary: 'High FODMAP — best avoided during elimination.' },
};
const LEVEL_RANK = { low: 0, moderate: 1, high: 2 };

const CATEGORY_EMOJI = {
  'Fruits': '🍓', 'Vegetables': '🥕', 'Grains & Cereals': '🌾',
  'Dairy & Alternatives': '🥛', 'Protein': '🍗', 'Legumes & Pulses': '🫘',
  'Nuts & Seeds': '🥜', 'Sweeteners': '🍯', 'Condiments & Sauces': '🧂',
  'Beverages': '🥤', 'Herbs & Spices': '🌿',
};

const FAV_KEY = 'fodmap.favourites.v1';

// Sort safe-first, then alphabetical.
const foods = [...FOODS].sort((a, b) => {
  if (LEVEL_RANK[a.level] !== LEVEL_RANK[b.level]) return LEVEL_RANK[a.level] - LEVEL_RANK[b.level];
  return a.name.localeCompare(b.name);
});

let favourites = loadFavourites();
let activeLevel = 'all';

// ---------- Persistence ----------
function loadFavourites() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}
function saveFavourites() {
  try { localStorage.setItem(FAV_KEY, JSON.stringify([...favourites])); } catch {}
}
function isFav(food) { return favourites.has(food.name); }
function toggleFav(food) {
  if (favourites.has(food.name)) favourites.delete(food.name);
  else favourites.add(food.name);
  saveFavourites();
}

// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };

function foodRow(food) {
  const li = el('li', 'food-item');
  li.tabIndex = 0;
  li.setAttribute('role', 'button');

  const bar = el('div', `level-bar ${food.level}`);
  const main = el('div', 'food-main');
  const name = el('div', 'food-name'); name.textContent = food.name;
  const cat = el('div', 'food-cat');
  cat.textContent = `${CATEGORY_EMOJI[food.category] || ''} ${food.category}`.trim();
  main.append(name, cat);

  const badge = el('span', `badge ${food.level}`);
  badge.textContent = LEVELS[food.level].title;

  li.append(bar, main, badge);
  const open = () => openSheet(food);
  li.addEventListener('click', open);
  li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  return li;
}

function renderList(container, items, emptyEl) {
  container.innerHTML = '';
  if (emptyEl) emptyEl.hidden = items.length > 0;
  container.hidden = items.length === 0;
  for (const f of items) container.appendChild(foodRow(f));
}

// ---------- Search ----------
function currentResults() {
  const q = $('#searchInput').value.trim().toLowerCase();
  return foods.filter((f) => {
    if (activeLevel !== 'all' && f.level !== activeLevel) return false;
    if (!q) return true;
    return f.name.toLowerCase().includes(q)
      || f.category.toLowerCase().includes(q)
      || f.fodmaps.some((g) => g.toLowerCase().includes(q));
  });
}
function renderSearch() {
  const results = currentResults();
  const count = $('#resultCount');
  count.textContent = results.length ? `${results.length} food${results.length === 1 ? '' : 's'}` : '';
  renderList($('#searchList'), results, $('#searchEmpty'));
}

// ---------- Categories ----------
function categories() {
  return [...new Set(foods.map((f) => f.category))].sort();
}
function renderCategories() {
  const list = $('#categoryList');
  list.innerHTML = '';
  for (const cat of categories()) {
    const inCat = foods.filter((f) => f.category === cat);
    const safe = inCat.filter((f) => f.level === 'low').length;
    const li = el('li', 'category-item');
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    const emoji = el('span', 'category-emoji'); emoji.textContent = CATEGORY_EMOJI[cat] || '▦';
    const main = el('div');
    const name = el('div', 'category-name'); name.textContent = cat;
    const sub = el('div', 'category-sub'); sub.textContent = `${inCat.length} foods · ${safe} safe to enjoy`;
    main.append(name, sub);
    const chev = el('span', 'category-chev'); chev.textContent = '›';
    li.append(emoji, main, chev);
    const open = () => openCategory(cat);
    li.addEventListener('click', open);
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    list.appendChild(li);
  }
}
function openCategory(cat) {
  $('#categoryList').hidden = true;
  $('#categoryDetail').hidden = false;
  $('#categoryTitle').textContent = cat;
  renderList($('#categoryFoodList'), foods.filter((f) => f.category === cat), null);
}
function closeCategory() {
  $('#categoryDetail').hidden = true;
  $('#categoryList').hidden = false;
}

// ---------- Favourites ----------
function renderFavourites() {
  const items = foods.filter((f) => favourites.has(f.name));
  renderList($('#favList'), items, $('#favEmpty'));
}

// ---------- Detail sheet ----------
function openSheet(food) {
  const body = $('#sheetBody');
  const lvl = LEVELS[food.level];
  const tags = food.fodmaps.length
    ? `<div class="detail-section"><h3>FODMAPs present</h3><div class="fodmap-tags">${
        food.fodmaps.map((g) => `<span class="fodmap-tag">${escapeHTML(g)}</span>`).join('')
      }</div></div>`
    : '';
  const note = food.note
    ? `<div class="detail-section"><h3>💡 Tip</h3><p>${escapeHTML(food.note)}</p></div>`
    : '';
  body.innerHTML = `
    <div class="verdict-card ${food.level}">
      <p class="verdict-title">${escapeHTML(food.name)}</p>
      <p class="verdict-cat">${CATEGORY_EMOJI[food.category] || ''} ${escapeHTML(food.category)} · ${lvl.title}</p>
      <p class="verdict-summary">${lvl.summary}</p>
    </div>
    <div class="detail-section"><h3>⚖️ Serving guidance</h3><p>${escapeHTML(food.serving)}</p></div>
    ${tags}
    ${note}
    <button class="star-btn ${isFav(food) ? 'is-fav' : ''}" id="favBtn">
      ${isFav(food) ? '★ Saved to favourites' : '☆ Add to favourites'}
    </button>`;
  $('#favBtn').addEventListener('click', () => {
    toggleFav(food);
    openSheet(food);       // re-render button state
    renderFavourites();
  });
  $('#sheet').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  $('#sheet').hidden = true;
  document.body.style.overflow = '';
}
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Tabs ----------
function switchTab(target) {
  document.querySelectorAll('.tab').forEach((t) => { t.hidden = t.dataset.tab !== target; });
  document.querySelectorAll('.tabbtn').forEach((b) => b.classList.toggle('is-on', b.dataset.target === target));
  if (target === 'favourites') renderFavourites();
  if (target === 'categories') closeCategory();
  window.scrollTo(0, 0);
}

// ---------- Theme ----------
function initTheme() {
  const saved = localStorage.getItem('fodmap.theme');
  if (saved) document.documentElement.style.colorScheme = saved;
  $('#themeToggle').addEventListener('click', () => {
    const now = document.documentElement.style.colorScheme === 'dark' ? 'light' : 'dark';
    document.documentElement.style.colorScheme = now;
    document.documentElement.setAttribute('data-theme', now);
    try { localStorage.setItem('fodmap.theme', now); } catch {}
  });
}

// ---------- Wire up ----------
function init() {
  renderSearch();
  renderCategories();
  $('#dbStats').textContent = `Database: ${foods.length} foods across ${categories().length} categories.`;

  $('#searchInput').addEventListener('input', renderSearch);

  $('#filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    activeLevel = btn.dataset.level;
    document.querySelectorAll('#filters .chip').forEach((c) => c.classList.toggle('is-on', c === btn));
    renderSearch();
  });

  document.querySelector('.tabbar').addEventListener('click', (e) => {
    const btn = e.target.closest('.tabbtn');
    if (btn) switchTab(btn.dataset.target);
  });

  $('#categoryBack').addEventListener('click', closeCategory);
  $('#sheetClose').addEventListener('click', closeSheet);
  $('#sheetBackdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });

  initTheme();

  // Offline support when served over http(s) (e.g. after Add to Home Screen).
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
