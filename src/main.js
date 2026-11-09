import { categories, findCalculator } from './registry.js';
import { initTheme } from './ui/theme.js';
import { el } from './ui/dom.js';

const sidebar = document.getElementById('sidebar');
const content = document.getElementById('content');
const menuToggle = document.getElementById('menu-toggle');

function visibleCategories() {
  return categories.filter((c) => c.calculators.length > 0);
}

function buildNav() {
  sidebar.replaceChildren(
    ...visibleCategories().map((category) =>
      el('div', { class: 'nav-group' },
        el('div', { class: 'nav-group-title' }, category.title),
        ...category.calculators.map((calc) =>
          el('a', { class: 'nav-link', href: `#/${calc.id}`, 'data-id': calc.id }, calc.title),
        ),
      ),
    ),
  );
}

function markActive(id) {
  for (const link of sidebar.querySelectorAll('.nav-link')) {
    if (link.dataset.id === id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function renderHome() {
  content.replaceChildren(
    el('h1', {}, 'EEM Hesap Araçları'),
    el('p', {}, 'Derslerde sık kullanılan hesaplar. Menüden bir hesaplayıcı seçin.'),
    el('div', { class: 'home-grid' },
      ...visibleCategories().map((category) =>
        el('section', { class: 'card' },
          el('h2', {}, category.title),
          el('ul', {},
            ...category.calculators.map((calc) =>
              el('li', {}, el('a', { href: `#/${calc.id}` }, calc.title)),
            ),
          ),
        ),
      ),
    ),
  );
  document.title = 'EEM Hesap Araçları';
}

function route() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const calc = id ? findCalculator(id) : null;
  markActive(calc ? calc.id : null);

  if (!calc) {
    renderHome();
  } else {
    content.replaceChildren();
    calc.render(content);
    document.title = `${calc.title} · EEM Hesap Araçları`;
  }

  sidebar.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  window.scrollTo(0, 0);
}

menuToggle.addEventListener('click', () => {
  const open = sidebar.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});

initTheme(document.getElementById('theme-toggle'));
buildNav();
window.addEventListener('hashchange', route);
route();
