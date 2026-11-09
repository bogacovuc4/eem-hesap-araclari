import { categories, findCalculator, matches, allCalculators } from './registry.js';
import { initTheme } from './ui/theme.js';
import { el } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { currentRoute } from './ui/urlstate.js';

const sidebar = document.getElementById('sidebar');
const content = document.getElementById('content');
const menuToggle = document.getElementById('menu-toggle');

// ---------------------------------------------------------------------------
// Son kullanılanlar (yalnızca bu tarayıcıda; localStorage kapalıysa sessizce atlanır)
// ---------------------------------------------------------------------------
const RECENT_KEY = 'eem-recent';
const RECENT_MAX = 6;

function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(list) ? list.map(findCalculator).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function pushRecent(id) {
  try {
    const ids = readRecent().map((c) => c.id).filter((x) => x !== id);
    localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...ids].slice(0, RECENT_MAX)));
  } catch {
    // localStorage kullanılamıyorsa liste tutulmaz.
  }
}

// ---------------------------------------------------------------------------
// Arama kutusu
// ---------------------------------------------------------------------------
function searchBox({ id, placeholder, onInput, onEnter, large = false }) {
  const input = el('input', {
    id, type: 'search', placeholder, autocomplete: 'off', spellcheck: 'false',
    class: large ? 'search-input search-large' : 'search-input',
    'aria-label': 'Hesaplayıcı ara',
  });
  input.addEventListener('input', () => onInput(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); onEnter(input.value); }
    if (e.key === 'Escape') { input.value = ''; onInput(''); }
  });
  const wrap = el('div', { class: 'search-wrap' }, icon('search', { size: 16 }), input,
    el('kbd', { class: 'search-kbd', 'aria-hidden': 'true' }, '/'));
  return { wrap, input };
}

function noResults(query) {
  return el('p', { class: 'no-results' },
    `“${query}” için sonuç yok. `,
    el('span', {}, 'Örneğin “renk”, “mikroşerit”, “dB”, “filtre” ya da “rüzgâr” deneyin.'));
}

function goToFirstMatch(query) {
  const first = allCalculators().find((c) => matches(c, query));
  if (first) location.hash = `#/${first.id}`;
}

// ---------------------------------------------------------------------------
// Kenar çubuğu
// ---------------------------------------------------------------------------
const navGroups = el('div');
const navEmpty = el('div', { 'aria-live': 'polite' });
const sideSearch = searchBox({
  id: 'side-search',
  placeholder: 'Hesaplayıcı ara…',
  onInput: filterNav,
  onEnter: goToFirstMatch,
});

function buildNav() {
  navGroups.replaceChildren(
    ...categories.filter((c) => c.calculators.length > 0).map((category) =>
      el('div', { class: 'nav-group' },
        el('div', { class: 'nav-group-title' }, category.title),
        ...category.calculators.map((calc) =>
          el('a', { class: 'nav-link', href: `#/${calc.id}`, 'data-id': calc.id }, calc.title)),
      )),
  );
  sidebar.replaceChildren(el('div', { class: 'side-search' }, sideSearch.wrap), navGroups, navEmpty);
}

function filterNav(query) {
  let shown = 0;
  for (const group of navGroups.querySelectorAll('.nav-group')) {
    let groupShown = 0;
    for (const link of group.querySelectorAll('.nav-link')) {
      const ok = !query.trim() || matches(findCalculator(link.dataset.id), query);
      link.hidden = !ok;
      if (ok) groupShown += 1;
    }
    group.hidden = groupShown === 0;
    shown += groupShown;
  }
  navEmpty.replaceChildren(...(shown === 0 ? [noResults(query)] : []));
}

function markActive(id) {
  for (const link of sidebar.querySelectorAll('.nav-link')) {
    if (link.dataset.id === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

// ---------------------------------------------------------------------------
// Ana sayfa
// ---------------------------------------------------------------------------
function calcCard(calc) {
  return el('a', { class: 'calc-link', href: `#/${calc.id}` },
    el('span', { class: 'calc-link-title' }, calc.title),
    calc.summary ? el('span', { class: 'calc-link-summary' }, calc.summary) : null);
}

function renderHome() {
  const grid = el('div', { class: 'home-grid' });
  const empty = el('div', { 'aria-live': 'polite' });

  function drawGrid(query = '') {
    const sections = categories.map((category) => {
      const list = category.calculators.filter((c) => !query.trim() || matches(c, query));
      if (!list.length) return null;
      return el('section', { class: 'card home-card' },
        el('h2', {}, category.title),
        el('div', { class: 'calc-links' }, ...list.map(calcCard)));
    }).filter(Boolean);
    grid.replaceChildren(...sections);
    empty.replaceChildren(...(sections.length ? [] : [noResults(query)]));
  }

  const homeSearch = searchBox({
    id: 'home-search',
    placeholder: 'Ne hesaplamak istiyorsunuz? (ör. empedans, renk kodu, Betz)',
    onInput: drawGrid,
    onEnter: goToFirstMatch,
    large: true,
  });

  const recent = readRecent();
  content.replaceChildren(...[
    el('header', { class: 'home-header' },
      el('h1', {}, 'EEM Hesap Araçları'),
      el('p', {}, `${allCalculators().length} hesaplayıcı: anten/RF, devre, rüzgâr enerjisi ve bileşen kodları. Değerler yazdıkça hesaplanır, bağlantı girdiğiniz değerleri saklar.`)),
    homeSearch.wrap,
    recent.length
      ? el('section', { class: 'recent' },
        el('h2', { class: 'recent-title' }, icon('clock', { size: 16 }), 'Son kullanılanlar'),
        el('div', { class: 'chips' }, ...recent.map((c) => el('a', { class: 'chip', href: `#/${c.id}` }, c.title))))
      : null,
    grid,
    empty,
  ].filter(Boolean));
  drawGrid();
  document.title = 'EEM Hesap Araçları';
}

// ---------------------------------------------------------------------------
// Yönlendirme
// ---------------------------------------------------------------------------
let lastPath = null;

function route() {
  const { path } = currentRoute();
  const calc = path ? findCalculator(path) : null;
  markActive(calc ? calc.id : null);

  if (!calc) {
    renderHome();
  } else {
    content.replaceChildren();
    calc.render(content);
    document.title = `${calc.title} · EEM Hesap Araçları`;
    pushRecent(calc.id);
  }

  closeMenu();
  if (path !== lastPath) window.scrollTo(0, 0);
  lastPath = path;
}

// ---------------------------------------------------------------------------
// Mobil menü ve klavye kısayolu
// ---------------------------------------------------------------------------
function closeMenu() {
  sidebar.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}

menuToggle.replaceChildren(icon('menu', { size: 20 }));
menuToggle.addEventListener('click', () => {
  const open = sidebar.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  if (open) sideSearch.input.focus();
});

// "/" ile arama kutusuna odaklan (bir alana yazarken değil)
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;
  e.preventDefault();
  const home = document.getElementById('home-search');
  if (home) { home.focus(); return; }
  if (getComputedStyle(sidebar).display === 'none') {
    sidebar.classList.add('open');
    menuToggle.setAttribute('aria-expanded', 'true');
  }
  sideSearch.input.focus();
});

initTheme(document.getElementById('theme-toggle'));
buildNav();
window.addEventListener('hashchange', route);
route();
