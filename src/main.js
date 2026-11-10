import { categories, findCalculator, matches, allCalculators } from './registry.js';
import { initTheme } from './ui/theme.js';
import { mountBackground } from './ui/background.js';
import { el } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { currentRoute } from './ui/urlstate.js';

const sidebar = document.getElementById('sidebar');
const content = document.getElementById('content');
const menuToggle = document.getElementById('menu-toggle');
let redrawHome = null; // ana sayfa açıkken ızgarayı yeniden çizer

function refreshAfterFavorite() {
  buildNav();
  filterNav(sideSearch.input.value);
  markActive(currentRoute().path);
  redrawHome?.();
  for (const b of content.querySelectorAll('.calc-header .fav-btn[data-calc]')) {
    const fresh = calcStar(findCalculator(b.dataset.calc), Number(b.dataset.size));
    b.replaceWith(fresh);
    fresh.focus();
  }
}

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
// Favori dersler (kategoriler). Favoriler hem menüde hem ana sayfada en üstte, favoriye
// eklenme sırasıyla gösterilir. Yalnızca bu tarayıcıda saklanır.
// ---------------------------------------------------------------------------
const FAV_KEY = 'eem-fav-cats';

function readFavorites() {
  try {
    const list = JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((id) => categories.some((c) => c.id === id)) : [];
  } catch {
    return [];
  }
}
let favorites = readFavorites();

function isFavorite(id) {
  return favorites.includes(id);
}

function toggleFavorite(id) {
  favorites = isFavorite(id) ? favorites.filter((x) => x !== id) : [...favorites, id];
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(favorites));
  } catch {
    // kaydedilemezse favoriler yalnızca bu sayfa açıkken geçerli
  }
  refreshAfterFavorite();
}

/** Favoriler önce (eklenme sırasıyla), sonra diğer dersler (özgün sırayla). */
function orderedCategories() {
  const withCalcs = categories.filter((c) => c.calculators.length > 0);
  return {
    fav: favorites.map((id) => withCalcs.find((c) => c.id === id)).filter(Boolean),
    rest: withCalcs.filter((c) => !isFavorite(c.id)),
  };
}

function starButton(category, size = 16) {
  const on = isFavorite(category.id);
  const btn = el('button', {
    type: 'button',
    class: on ? 'fav-btn is-fav' : 'fav-btn',
    'aria-pressed': String(on),
    'aria-label': on ? `${category.title} favorilerden çıkar` : `${category.title} favorilere ekle`,
    title: on ? 'Favorilerden çıkar' : 'Favorilere ekle',
  }, icon('star', { size }));
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const scope = btn.closest('.sidebar') ? '.sidebar' : '.content';
    toggleFavorite(category.id);
    // Odak yeniden çizilen düğmeye geri gelsin (klavye kullanıcıları için)
    document.querySelector(`${scope} .fav-btn[data-cat="${category.id}"]`)?.focus();
  });
  btn.dataset.cat = category.id;
  return btn;
}

// Favori hesaplayıcılar: ders favorilerinden ayrı liste, aynı mantık.
const FAV_CALC_KEY = 'eem-fav-calcs';

function readFavoriteCalcs() {
  try {
    const list = JSON.parse(localStorage.getItem(FAV_CALC_KEY) ?? '[]');
    return Array.isArray(list) ? list.filter((id) => findCalculator(id)) : [];
  } catch {
    return [];
  }
}
let favoriteCalcs = readFavoriteCalcs();

function isFavoriteCalc(id) {
  return favoriteCalcs.includes(id);
}

function toggleFavoriteCalc(id) {
  favoriteCalcs = isFavoriteCalc(id) ? favoriteCalcs.filter((x) => x !== id) : [...favoriteCalcs, id];
  try {
    localStorage.setItem(FAV_CALC_KEY, JSON.stringify(favoriteCalcs));
  } catch {
    // kaydedilemezse favoriler yalnızca bu sayfa açıkken geçerli
  }
  refreshAfterFavorite();
}

function calcStar(calc, size = 16) {
  const on = isFavoriteCalc(calc.id);
  const btn = el('button', {
    type: 'button',
    class: on ? 'fav-btn is-fav' : 'fav-btn',
    'aria-pressed': String(on),
    'aria-label': on ? `${calc.title} favorilerden çıkar` : `${calc.title} favorilere ekle`,
    title: on ? 'Hesaplayıcıyı favorilerden çıkar' : 'Hesaplayıcıyı favorilere ekle',
  }, icon('star', { size }));
  btn.dataset.calc = calc.id;
  btn.dataset.size = String(size);
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Aynı hesaplayıcının birden çok yıldızı olabilir (favori listesi + ders kartı): tıklanan konumu hatırla
    const host = btn.closest('[data-fav-zone]')?.dataset.favZone ?? '';
    toggleFavoriteCalc(calc.id);
    document.querySelector(`[data-fav-zone="${host}"] .fav-btn[data-calc="${calc.id}"]`)?.focus();
  });
  return btn;
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

// Açık kategoriler bu tarayıcıda hatırlanır (localStorage kapalıysa yalnızca oturum boyunca).
const NAV_KEY = 'eem-nav-open';
function readOpenGroups() {
  try {
    const list = JSON.parse(localStorage.getItem(NAV_KEY) ?? 'null');
    return Array.isArray(list) ? new Set(list) : new Set();
  } catch {
    return new Set();
  }
}
function saveOpenGroups() {
  try {
    localStorage.setItem(NAV_KEY, JSON.stringify([...openGroups]));
  } catch {
    // kaydedilemezse durum yalnızca bu sayfa açıkken korunur
  }
}
const openGroups = readOpenGroups();
let searching = false;

function setGroupOpen(group, open) {
  group.querySelector('.nav-group-head').setAttribute('aria-expanded', String(open));
  group.querySelector('.nav-items').hidden = !open;
}

function navGroup(category) {
  {
      const itemsId = `nav-items-${category.id}`;
      const total = category.calculators.length;
      const chevron = icon('chevron', { size: 16 });
      chevron.setAttribute('class', 'icon nav-chevron');
      const head = el('button', {
        type: 'button', class: 'nav-group-head', 'aria-expanded': 'false', 'aria-controls': itemsId,
      },
      icon(category.icon, { size: 18 }),
      el('span', { class: 'nav-group-name' }, category.title),
      el('span', { class: 'nav-count', 'data-total': total, title: `${total} hesaplayıcı` }, String(total)),
      chevron);
      const group = el('div', { class: isFavorite(category.id) ? 'nav-group is-fav' : 'nav-group', 'data-cat': category.id },
        el('div', { class: 'nav-group-row' }, head, starButton(category)),
        el('div', { class: 'nav-items', id: itemsId },
          ...category.calculators.map((calc) =>
            el('a', { class: 'nav-link', href: `#/${calc.id}`, 'data-id': calc.id }, calc.title))));
      head.addEventListener('click', () => {
        if (searching) return; // arama sırasında gruplar sonuçlara göre açılır
        const open = !openGroups.has(category.id);
        if (open) openGroups.add(category.id);
        else openGroups.delete(category.id);
        saveOpenGroups();
        setGroupOpen(group, open);
      });
      setGroupOpen(group, openGroups.has(category.id));
      return group;
  }
}

function buildNav() {
  const { fav, rest } = orderedCategories();
  const section = (...children) => el('div', { class: 'nav-section' }, ...children);
  const favCalcList = favoriteCalcs.map(findCalculator).filter(Boolean);
  navGroups.replaceChildren(
    ...(favCalcList.length ? [
      section(icon('star', { size: 14 }), 'Favori hesaplayıcılar'),
      el('div', { class: 'nav-fav-calcs' }, ...favCalcList.map((calc) =>
        el('a', { class: 'nav-link', href: `#/${calc.id}`, 'data-id': calc.id }, calc.title))),
    ] : []),
    ...(fav.length ? [section(icon('star', { size: 14 }), 'Favoriler'), ...fav.map(navGroup), section('Tüm dersler')] : []),
    ...rest.map(navGroup),
  );
  if (!sidebar.contains(navGroups)) {
    sidebar.replaceChildren(el('div', { class: 'side-search' }, sideSearch.wrap), navGroups, navEmpty);
  }
}

function filterNav(query) {
  searching = Boolean(query.trim());
  let shown = 0;
  for (const group of navGroups.querySelectorAll('.nav-group')) {
    let groupShown = 0;
    for (const link of group.querySelectorAll('.nav-link')) {
      const ok = !searching || matches(findCalculator(link.dataset.id), query);
      link.hidden = !ok;
      if (ok) groupShown += 1;
    }
    const count = group.querySelector('.nav-count');
    count.textContent = searching ? String(groupShown) : count.dataset.total;
    group.hidden = groupShown === 0;
    // Aramada eşleşen gruplar açılır; arama bitince kullanıcının seçimi geri gelir
    setGroupOpen(group, searching ? groupShown > 0 : openGroups.has(group.dataset.cat));
    shown += groupShown;
  }
  for (const label of navGroups.querySelectorAll('.nav-section, .nav-fav-calcs')) label.hidden = searching;
  navEmpty.replaceChildren(...(shown === 0 ? [noResults(query)] : []));
}

function markActive(id) {
  for (const link of sidebar.querySelectorAll('.nav-link')) {
    if (link.dataset.id === id) {
      link.setAttribute('aria-current', 'page');
      // Açık sayfanın kategorisi her zaman görünsün
      const group = link.closest('.nav-group');
      if (group && !searching && !openGroups.has(group.dataset.cat)) {
        openGroups.add(group.dataset.cat);
        saveOpenGroups();
        setGroupOpen(group, true);
      }
    } else {
      link.removeAttribute('aria-current');
    }
  }
}

// ---------------------------------------------------------------------------
// Ana sayfa
// ---------------------------------------------------------------------------
function calcCard(calc) {
  return el('div', { class: 'calc-item' },
    el('a', { class: 'calc-link', href: `#/${calc.id}` },
      el('span', { class: 'calc-link-title' }, calc.title),
      calc.summary ? el('span', { class: 'calc-link-summary' }, calc.summary) : null),
    calcStar(calc, 16));
}

function renderHome() {
  const grid = el('div', { class: 'home-grid' });
  const empty = el('div', { 'aria-live': 'polite' });

  const favWrap = el('div', {});
  const favCalcWrap = el('div', {});
  let lastQuery = '';

  function card(category, query) {
    const list = category.calculators.filter((c) => !query.trim() || matches(c, query));
    if (!list.length) return null;
    return el('section', { class: isFavorite(category.id) ? 'card home-card is-fav' : 'card home-card' },
      el('h2', {}, icon(category.icon, { size: 16 }), el('span', { class: 'home-card-title' }, category.title), starButton(category, 18)),
      el('div', { class: 'calc-links', 'data-fav-zone': `cat-${category.id}` }, ...list.map(calcCard)));
  }

  function drawGrid(query = '') {
    lastQuery = query;
    const { fav, rest } = orderedCategories();
    const favCards = fav.map((c) => card(c, query)).filter(Boolean);
    const restCards = rest.map((c) => card(c, query)).filter(Boolean);
    const favCalcList = favoriteCalcs.map(findCalculator).filter((c) => c && (!query.trim() || matches(c, query)));
    favCalcWrap.replaceChildren(...(favCalcList.length ? [
      el('h2', { class: 'home-section-title' }, icon('star', { size: 16 }), 'Favori hesaplayıcılarım'),
      el('div', { class: 'card fav-calc-card' },
        el('div', { class: 'calc-links fav-calc-grid', 'data-fav-zone': 'fav-calcs' }, ...favCalcList.map(calcCard))),
    ] : []));
    if (favCards.length) {
      favWrap.replaceChildren(
        el('h2', { class: 'home-section-title' }, icon('star', { size: 16 }), 'Favori derslerim'),
        el('div', { class: 'home-grid home-grid-fav' }, ...favCards),
        el('h2', { class: 'home-section-title' }, 'Tüm dersler'),
      );
    } else if (!favorites.length && !favoriteCalcs.length && !query.trim()) {
      favWrap.replaceChildren(el('p', { class: 'fav-hint' }, icon('star', { size: 14 }),
        'İpucu: bir dersin ya da hesaplayıcının yanındaki yıldıza basarak onu favorilere ekleyin; favoriler en üstte görünür.'));
    } else if (favCalcList.length && !query.trim()) {
      favWrap.replaceChildren(el('h2', { class: 'home-section-title' }, 'Tüm dersler'));
    } else {
      favWrap.replaceChildren();
    }
    grid.replaceChildren(...restCards);
    empty.replaceChildren(...(favCards.length + restCards.length ? [] : [noResults(query)]));
  }
  redrawHome = () => drawGrid(lastQuery);

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
      el('h1', {}, el('span', {}, 'EEM Hesap Araçları')),
      el('p', {}, `${categories.length} alanda ${allCalculators().length} hesaplayıcı: RF'den güç sistemlerine, sinyallerden sayısal tasarıma. Değerler yazdıkça hesaplanır, bağlantı girdiğiniz değerleri saklar.`)),
    homeSearch.wrap,
    recent.length
      ? el('section', { class: 'recent' },
        el('h2', { class: 'recent-title' }, icon('clock', { size: 16 }), 'Son kullanılanlar'),
        el('div', { class: 'chips' }, ...recent.map((c) => el('a', { class: 'chip', href: `#/${c.id}` }, c.title))))
      : null,
    favCalcWrap,
    favWrap,
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

  if (calc) homeBtn.removeAttribute('aria-current');
  else homeBtn.setAttribute('aria-current', 'page');
  if (!calc) {
    renderHome();
  } else {
    redrawHome = null;
    content.replaceChildren();
    calc.render(content);
    const titleRow = content.querySelector('.calc-title-row');
    if (titleRow) {
      const actions = el('div', { class: 'calc-actions', 'data-fav-zone': 'page' }, calcStar(calc, 20));
      const copy = titleRow.lastElementChild !== titleRow.querySelector('h1') ? titleRow.lastElementChild : null;
      if (copy) actions.append(copy);
      titleRow.append(actions);
    }
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

// Ana menü düğmesi: masaüstünde simge + yazı, mobilde yalnızca simge
const homeBtn = document.getElementById('home-btn');
homeBtn.replaceChildren(icon('home', { size: 18 }), el('span', { class: 'home-btn-label' }, 'Ana menü'));
homeBtn.addEventListener('click', () => {
  // Zaten ana sayfadaysa en üste kaydır
  if (!currentRoute().path) window.scrollTo({ top: 0, behavior: 'smooth' });
});
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
mountBackground();
buildNav();
window.addEventListener('hashchange', route);
route();
