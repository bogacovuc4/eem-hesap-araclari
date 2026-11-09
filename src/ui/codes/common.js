// Kod hesaplayıcıları için ortak arayüz parçaları (seçim kutusu, metin alanı, çıktı kartı).
import { el } from '../dom.js';
import { resultRow } from '../results.js';
import { getParam, setParams } from '../urlstate.js';

let counter = 0;
const nextId = (prefix) => `${prefix}-${(counter += 1)}`;

/**
 * Seçim kutusu. options: [{ value, text, color? }]
 * color verilirse kutunun yanında seçili rengin örneği gösterilir.
 */
export function selectField({ label, options, value, withSwatch = false, param = null }) {
  const id = nextId('sel');
  // param verilirse seçim adres çubuğunda tutulur (geçerli bir seçenekse oradan okunur).
  const fromUrl = param ? getParam(param) : null;
  const start = options.some((o) => o.value === fromUrl) ? fromUrl : value;
  const select = el('select', { id, class: 'select-wide' },
    ...options.map((o) => el('option', { value: o.value, selected: o.value === start }, o.text)));
  if (param) select.addEventListener('change', () => setParams({ [param]: select.value === value ? null : select.value }));
  const swatch = withSwatch ? el('span', { class: 'swatch', 'aria-hidden': 'true' }) : null;

  function paintSwatch() {
    if (!swatch) return;
    const color = options.find((o) => o.value === select.value)?.color;
    swatch.style.background = color ?? 'transparent';
    swatch.classList.toggle('swatch-empty', !color);
  }
  select.addEventListener('change', paintSwatch);
  paintSwatch();

  const element = el('div', { class: 'field' },
    el('label', { for: id }, label),
    el('div', { class: 'field-row' }, swatch, select));
  return {
    element,
    get value() { return select.value; },
    onChange(cb) { select.addEventListener('change', cb); },
  };
}

/**
 * Metin girişi (kod girmek için). Değer adres çubuğunda `param` adıyla tutulur (varsayılan "code").
 */
export function textField({ label, value = '', placeholder = '', hint = '', param = 'code' }) {
  const id = nextId('txt');
  const hintId = `${id}-hint`;
  const errorId = `${id}-err`;
  const input = el('input', {
    id, type: 'text', value: getParam(param) ?? value, placeholder, autocomplete: 'off', spellcheck: 'false', class: 'code-input',
    'aria-describedby': [hint ? hintId : null, errorId].filter(Boolean).join(' '),
  });
  const errorBox = el('div', { class: 'field-error', id: errorId });
  input.addEventListener('input', () => setParams({ [param]: input.value.trim() }));
  const element = el('div', { class: 'field' },
    el('label', { for: id }, label),
    el('div', { class: 'field-row' }, input),
    hint ? el('div', { class: 'field-hint', id: hintId }, hint) : null,
    errorBox);
  return {
    element,
    get value() { return input.value; },
    /** Geçersizse alanın altında mesaj gösterir. */
    setInvalid(flag, message = '') {
      if (flag) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
      errorBox.textContent = flag ? message : '';
    },
    onChange(cb) { input.addEventListener('input', cb); },
  };
}

/** Sonuç kartı: satırlar + hata/uyarı mesajları. */
export function outputCard(title = 'Sonuçlar') {
  const list = el('dl', { class: 'results' });
  const messages = el('div', { class: 'messages', 'aria-live': 'polite' });
  const element = el('section', { class: 'card' }, el('h2', {}, title), list, messages);

  return {
    element,
    show({ rows = [], errors = [], warnings = [] }) {
      list.replaceChildren(...(rows.length
        ? rows.map(resultRow)
        : [el('p', { class: 'result-empty' }, errors.length ? 'Sonuç için girdiyi düzeltin.' : '—')]));
      messages.replaceChildren(
        ...errors.map((m) => el('div', { class: 'msg msg-error' }, m)),
        ...warnings.map((m) => el('div', { class: 'msg msg-warn' }, m)),
      );
    },
  };
}

/** Görsel (geniş) + girdiler + sonuçlar + ek kartlar düzeni. */
export function codeLayout({ visual, visualTitle = 'Görünüm', inputs, output, extra = [] }) {
  return el('div', { class: 'panel-grid' },
    el('section', { class: 'card card-wide' }, el('h2', {}, visualTitle), visual),
    el('section', { class: 'card' }, el('h2', {}, 'Girdiler'), ...inputs),
    output.element,
    ...extra,
  );
}

/** Başlıklı geniş kart. */
export function wideCard(title, ...children) {
  return el('section', { class: 'card card-wide' }, el('h2', {}, title), ...children);
}

/** Notlar listesi kartı. */
export function notesCard(notes) {
  return wideCard('Notlar ve varsayımlar', el('ul', { class: 'notes' }, ...notes.map((n) => el('li', {}, n))));
}

/** Çarpan metni: −2 → "×0,01", 3 → "×1 k" */
export function multiplierText(exp) {
  const names = { '-3': '×0,001', '-2': '×0,01', '-1': '×0,1', 0: '×1', 1: '×10', 2: '×100', 3: '×1 k', 4: '×10 k', 5: '×100 k', 6: '×1 M', 7: '×10 M', 8: '×100 M', 9: '×1 G' };
  return names[exp];
}

/** Tolerans yüzdesi metni: 0.5 → "±%0,5" */
export const tolText = (t) => `±%${String(t).replace('.', ',')}`;
