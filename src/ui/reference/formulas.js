// Formül özeti: derslere göre formüller, sayfa içi arama ve bölümlere atlama.
import { el } from '../dom.js';
import { formula } from '../formula.js';
import { icon } from '../icons.js';
import { copyButton } from '../clipboard.js';
import { getParam, setParams } from '../urlstate.js';
import { normalize } from '../../registry.js';
import { FORMULA_SECTIONS } from './formula-data.js';
import { splitTex } from './split-tex.js';

/**
 * Yan yana yazılmış formülleri parçalara ayırıp esnek bir satıra dizer: yer varsa yan yana,
 * yoksa alt alta akar (dar kartta ve telefonda yatay kaydırma gerekmez).
 * KaTeX yüklenemezse düz metin yalnızca bir kez gösterilir.
 */
function formulaLines(tex, plain) {
  const parts = splitTex(tex);
  if (parts.length <= 1) return [formula(tex, plain)];
  return [el('div', { class: 'fx-flow', role: 'math', 'aria-label': plain },
    ...parts.map((t, k) => {
      const node = formula(t, k === 0 ? plain : '');
      node.removeAttribute('role');
      node.setAttribute('aria-hidden', 'true');
      return node;
    }))];
}

function item([title, tex, plain, note, calcId]) {
  const node = el('div', { class: 'fx-item' },
    el('div', { class: 'fx-head' },
      el('h3', { class: 'fx-title' }, title),
      el('div', { class: 'fx-actions' },
        calcId ? el('a', { class: 'fx-calc', href: `#/${calcId}`, title: 'Hesaplayıcıyı aç' }, icon('arrow', { size: 14 }), 'Hesapla') : null,
        copyButton({ getText: () => tex, label: `${title} LaTeX kodunu kopyala` }))),
    ...formulaLines(tex, plain),
    note ? el('p', { class: 'fx-note' }, note) : null);
  node.dataset.search = normalize(`${title} ${plain} ${note ?? ''}`);
  return node;
}

function render(container) {
  const total = FORMULA_SECTIONS.reduce((s, x) => s + x.items.length, 0);
  const input = el('input', {
    type: 'search', class: 'search-input search-large', placeholder: 'Formüllerde ara (ör. rezonans, Laplace, Gauss)…',
    autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Formüllerde ara', value: getParam('q') ?? '',
  });
  const empty = el('p', { class: 'no-results', hidden: true }, 'Eşleşen formül yok.');
  const sections = FORMULA_SECTIONS.map((sec) => el('section', { class: 'card card-wide fx-section', id: `fx-${sec.id}` },
    el('h2', {}, sec.title, el('span', { class: 'fx-count' }, String(sec.items.length))),
    el('div', { class: 'fx-grid' }, ...sec.items.map(item))));
  const chips = el('nav', { class: 'chips fx-chips', 'aria-label': 'Bölümler' },
    ...FORMULA_SECTIONS.map((sec) => el('button', {
      type: 'button', class: 'chip',
      onClick: () => document.getElementById(`fx-${sec.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    }, sec.title)));

  function filter() {
    const words = normalize(input.value).split(/\s+/).filter(Boolean);
    let shown = 0;
    for (const sec of sections) {
      let n = 0;
      for (const it of sec.querySelectorAll('.fx-item')) {
        const ok = words.every((w) => it.dataset.search.includes(w) || normalize(sec.querySelector('h2').firstChild.textContent).includes(w));
        it.hidden = !ok;
        if (ok) n += 1;
      }
      sec.hidden = n === 0;
      shown += n;
    }
    empty.hidden = shown > 0;
    setParams({ q: input.value.trim() });
  }
  input.addEventListener('input', filter);

  container.append(el('article', {},
    el('header', { class: 'calc-header' },
      el('div', { class: 'calc-title-row' },
        el('h1', {}, 'Formül özeti'),
        copyButton({ getText: () => location.href, label: 'Bağlantıyı kopyala', withLabel: true, className: 'copy-btn copy-link' })),
      el('p', {}, `${FORMULA_SECTIONS.length} derste ${total} temel formül. “Hesapla” bağlantısı ilgili hesaplayıcıyı açar; kopyala düğmesi LaTeX kodunu kopyalar.`)),
    el('div', { class: 'search-wrap fx-search' }, icon('search', { size: 16 }), input),
    chips,
    el('div', { class: 'panel-grid' }, ...sections),
    empty));
  if (input.value) filter();
}

export default {
  id: 'reference/formulas',
  title: 'Formül özeti',
  render,
};
