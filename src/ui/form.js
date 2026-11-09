import { el } from './dom.js';
import { parseNumber } from '../calc/units.js';
import { getParam, setParams } from './urlstate.js';
import { resultRow } from './results.js';
import { copyButton } from './clipboard.js';
import { checkPositive, checkMin, checkMax, checkNonNegative, checkNumber } from '../calc/validate.js';

let fieldCounter = 0;

/**
 * Sayı girişi + isteğe bağlı birim seçimi.
 *
 * spec:
 *   key        sonuç nesnesindeki anahtar
 *   label      görünen etiket (ör. "Şerit genişliği W")
 *   name       hata mesajlarında kullanılacak kısa ad (varsayılan: label)
 *   value      başlangıç değeri (seçili birimde)
 *   units      { birimAdı: SIçarpanı } tablosu (yoksa birimsiz)
 *   unit       başlangıç birimi
 *   constraint 'positive' (varsayılan) | 'nonnegative' | 'any'
 *   min, max   dahil sınırlar (isteğe bağlı)
 *   hint       alanın altındaki kısa açıklama
 *
 * Değer ve birim adres çubuğunda `key` ve `key_u` parametreleriyle tutulur (paylaşılabilir bağlantı).
 */
export function numberField(spec) {
  fieldCounter += 1;
  const id = `f-${spec.key}-${fieldCounter}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-err`;
  const name = spec.name ?? spec.label;

  // Bağlantıdan gelen değer/birim varsa onları kullan.
  const urlValue = getParam(spec.key);
  const urlUnit = getParam(`${spec.key}_u`);
  const startUnit = spec.units && urlUnit && spec.units[urlUnit] !== undefined ? urlUnit : spec.unit;

  const input = el('input', {
    id,
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    spellcheck: 'false',
    value: urlValue ?? spec.value ?? '',
    'aria-describedby': [spec.hint ? hintId : null, errorId].filter(Boolean).join(' '),
  });

  let select = null;
  if (spec.units) {
    select = el('select', { 'aria-label': `${name} birimi` },
      ...Object.keys(spec.units).map((u) =>
        el('option', { value: u, selected: u === startUnit }, u)));
  }

  const errorBox = el('div', { class: 'field-error', id: errorId });

  const element = el('div', { class: 'field' },
    el('label', { for: id }, spec.label),
    el('div', { class: 'field-row' }, input, select),
    spec.hint ? el('div', { class: 'field-hint', id: hintId }, spec.hint) : null,
    errorBox,
  );

  function syncUrl() {
    setParams({ [spec.key]: input.value.trim(), [`${spec.key}_u`]: select ? select.value : null });
  }
  input.addEventListener('input', syncUrl);
  select?.addEventListener('change', syncUrl);

  /** SI değerini ve varsa hata mesajını döner. */
  function read() {
    const raw = parseNumber(input.value);
    const value = raw === null || Number.isNaN(raw) || !select ? raw : raw * spec.units[select.value];

    let error;
    switch (spec.constraint ?? 'positive') {
      case 'positive': error = checkPositive(name, value); break;
      case 'nonnegative': error = checkNonNegative(name, value); break;
      default: error = checkNumber(name, value);
    }
    // min/max seçili birimdeki ham değere değil SI değerine uygulanır (birimsiz alanlarda aynıdır).
    if (!error && spec.min !== undefined) error = checkMin(name, value, spec.min);
    if (!error && spec.max !== undefined) error = checkMax(name, value, spec.max);

    if (error) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    errorBox.textContent = error ?? '';
    return { value, error };
  }

  function onChange(callback) {
    input.addEventListener('input', callback);
    select?.addEventListener('change', callback);
  }

  return { key: spec.key, element, read, onChange };
}

/**
 * Bir giriş/sonuç paneli kurar ve her değişiklikte anlık hesaplar.
 *
 * options:
 *   fields   numberField spec dizisi
 *   compute  (values) => { results: [{ label, value }], warnings?: string[] }
 *            Hesap RangeError fırlatırsa mesajı hata olarak gösterilir.
 *   formulas formula() düğümleri
 *   notes    geçerlilik/varsayım notları (string veya düğüm)
 *   diagram  (values, output) => Node  — isteğe bağlı devre şeması. Her değişiklikte yeniden
 *            çizilir. values: girdiler (SI; boş/hatalı alan null/NaN), output: compute
 *            sonucu ya da hata varsa null. compute sonucu `raw` alanında sayısal sonuçlar taşıyabilir.
 */
export function calculatorPanel({ fields, compute, formulas = [], notes = [], diagram = null }) {
  const controls = fields.map(numberField);
  const resultList = el('dl', { class: 'results' });
  const messages = el('div', { class: 'messages', 'aria-live': 'polite' });
  const diagramBox = diagram ? el('div', { class: 'schematic' }) : null;

  function drawDiagram(values, output) {
    if (!diagramBox) return;
    diagramBox.replaceChildren(...[diagram(values, output)].flat());
  }

  function showMessages(errors, warnings) {
    messages.replaceChildren(
      ...errors.map((m) => el('div', { class: 'msg msg-error' }, m)),
      ...warnings.map((m) => el('div', { class: 'msg msg-warn' }, m)),
    );
  }

  function update() {
    const values = {};
    const errors = [];
    for (const control of controls) {
      const { value, error } = control.read();
      values[control.key] = value;
      if (error) errors.push(error);
    }

    if (errors.length) {
      resultList.replaceChildren(el('p', { class: 'result-empty' }, 'Sonuç için girdileri düzeltin.'));
      showMessages(errors, []);
      drawDiagram(values, null);
      return;
    }

    try {
      const output = compute(values);
      const { results, warnings = [] } = output;
      resultList.replaceChildren(...results.map(resultRow));
      showMessages([], warnings);
      drawDiagram(values, output);
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      resultList.replaceChildren(el('p', { class: 'result-empty' }, 'Hesaplanamadı.'));
      showMessages([err.message], []);
      drawDiagram(values, null);
    }
  }

  for (const control of controls) control.onChange(update);

  const element = el('div', { class: 'panel-grid' },
    diagramBox
      ? el('section', { class: 'card card-wide' }, el('h2', {}, 'Devre şeması'), diagramBox)
      : null,
    el('section', { class: 'card' }, el('h2', {}, 'Girdiler'), ...controls.map((c) => c.element)),
    el('section', { class: 'card' }, el('h2', {}, 'Sonuçlar'), resultList, messages),
    formulas.length
      ? el('section', { class: 'card card-wide' }, el('h2', {}, 'Formül'), ...formulas)
      : null,
    notes.length
      ? el('section', { class: 'card card-wide' }, el('h2', {}, 'Geçerlilik ve varsayımlar'),
        el('ul', { class: 'notes' }, ...notes.map((n) => el('li', {}, n))))
      : null,
  );

  update();
  return element;
}

/**
 * Birden çok modu olan hesaplayıcılar için sekme kabuğu.
 * modes: [{ id, label, build: () => HTMLElement }]
 */
export function calculatorView({ title, intro, modes }) {
  const body = el('div');
  const tabs = modes.length > 1 ? el('div', { class: 'tabs', role: 'tablist' }) : null;
  const built = new Map();

  function select(id, { fromUser = false } = {}) {
    if (!built.has(id)) built.set(id, modes.find((m) => m.id === id).build());
    body.replaceChildren(built.get(id));
    tabs?.querySelectorAll('.tab').forEach((t) => {
      const active = t.dataset.mode === id;
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
    });
    if (fromUser) setParams({ mode: id === modes[0].id ? null : id });
  }

  if (tabs) {
    for (const mode of modes) {
      tabs.append(el('button', {
        class: 'tab', type: 'button', role: 'tab', 'data-mode': mode.id,
        onClick: () => select(mode.id, { fromUser: true }),
      }, mode.label));
    }
    // Sekmeler arasında ok tuşlarıyla gezinme (WAI-ARIA tabs kalıbı)
    tabs.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      const list = [...tabs.querySelectorAll('.tab')];
      const current = list.indexOf(document.activeElement);
      if (current === -1) return;
      e.preventDefault();
      let next = current;
      if (e.key === 'ArrowRight') next = (current + 1) % list.length;
      if (e.key === 'ArrowLeft') next = (current - 1 + list.length) % list.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = list.length - 1;
      list[next].focus();
      select(list[next].dataset.mode, { fromUser: true });
    });
  }

  const urlMode = getParam('mode');
  select(modes.some((m) => m.id === urlMode) ? urlMode : modes[0].id);
  return el('article', {},
    el('header', { class: 'calc-header' },
      el('div', { class: 'calc-title-row' },
        el('h1', {}, title),
        copyButton({ getText: () => location.href, label: 'Bağlantıyı kopyala', withLabel: true, className: 'copy-btn copy-link' })),
      intro ? el('p', {}, intro) : null),
    tabs,
    body,
  );
}

/** "doğrulanmalı" etiketi taşıyan not. */
export function verifyNote(text) {
  return el('span', {}, el('span', { class: 'tag-verify' }, 'doğrulanmalı'), ' ', text);
}
