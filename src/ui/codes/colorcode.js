// Renk kodu çözme/oluşturma panelleri (direnç ve bobin ortak).
import { el } from '../dom.js';
import { numberField } from '../form.js';
import { formatSI } from '../../calc/units.js';
import {
  COLORS, bandRoles, colorsForRole, decodeColorBands, encodeColorBands, colorByKey,
} from '../../calc/codes.js';
import {
  selectField, outputCard, codeLayout, wideCard, notesCard, multiplierText, tolText,
} from './common.js';
import { bandedComponent } from './visuals.js';

const ROLE_NAMES = {
  digit: (i) => `${i + 1}. rakam`,
  exp: () => 'Çarpan',
  tol: () => 'Tolerans',
  tcr: () => 'Sıcaklık katsayısı',
};

const optionFor = (c) => ({ value: c.key, text: c.name, color: c.hex });

/**
 * cfg:
 *   kind        'resistor' | 'inductor'
 *   unit        'Ω' | 'H'
 *   scale       taban birimden SI'ya çarpan (Ω: 1, µH: 1e-6)
 *   bandCounts  seçilebilir bant sayıları
 *   defaults    { [bantSayısı]: renkAnahtarları[] }
 */
export function colorDecodePanel(cfg) {
  const visualBox = el('div', { class: 'component-row' });
  const bandBox = el('div');
  const output = outputCard();
  const countSelect = selectField({
    label: 'Bant sayısı',
    options: cfg.bandCounts.map((n) => ({ value: String(n), text: `${n} bant` })),
    value: String(cfg.defaultCount),
  });

  let selects = [];
  let current = [...cfg.defaults[cfg.defaultCount]];

  function buildBands() {
    const count = Number(countSelect.value);
    const roles = bandRoles(count);
    // Bant sayısı değişince varsayılan renklerle başla.
    if (current.length !== count) current = [...cfg.defaults[count]];
    let digitIndex = 0;
    selects = roles.map((role, i) => {
      const label = role === 'digit' ? ROLE_NAMES.digit(digitIndex++) : ROLE_NAMES[role]();
      const options = colorsForRole(role, { first: i === 0 }).map(optionFor);
      const value = options.some((o) => o.value === current[i]) ? current[i] : options[0].value;
      const field = selectField({ label: `${i + 1}. bant — ${label}`, options, value, withSwatch: true });
      field.onChange(update);
      return field;
    });
    bandBox.replaceChildren(...selects.map((f) => f.element));
    update();
  }

  function update() {
    current = selects.map((f) => f.value);
    visualBox.replaceChildren(bandedComponent(current, { kind: cfg.kind, title: 'Seçilen renk bantları' }));
    try {
      const r = decodeColorBands(current);
      const si = r.value * cfg.scale;
      const rows = [
        { label: 'Değer', value: formatSI(si, cfg.unit) },
        { label: 'Tolerans', value: tolText(r.tolerance) },
        { label: 'Aralık', value: `${formatSI(r.min * cfg.scale, cfg.unit)} … ${formatSI(r.max * cfg.scale, cfg.unit)}` },
      ];
      if (r.tcr !== null) rows.push({ label: 'Sıcaklık katsayısı', value: `${r.tcr} ppm/K` });
      const warnings = [];
      if (current[0] === 'gold' || current[0] === 'silver') {
        warnings.push('İlk bant altın/gümüş görünüyorsa bileşeni ters okuyor olabilirsiniz; tolerans bandı sağda olmalı.');
      }
      output.show({ rows, warnings });
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      output.show({ errors: [err.message] });
    }
  }

  countSelect.onChange(buildBands);
  buildBands();

  return codeLayout({
    visual: visualBox,
    visualTitle: cfg.kind === 'inductor' ? 'Bobin' : 'Direnç',
    inputs: [countSelect.element, bandBox],
    output,
    extra: [colorTableCard(cfg), ...(cfg.notes ? [notesCard(cfg.notes)] : [])],
  });
}

export function colorEncodePanel(cfg) {
  const visualBox = el('div', { class: 'component-row' });
  const output = outputCard();
  const valueField = numberField({
    key: 'value', label: cfg.kind === 'inductor' ? 'Endüktans' : 'Direnç', name: 'Değer',
    value: cfg.encodeDefault.value, units: cfg.units, unit: cfg.encodeDefault.unit,
  });
  const countSelect = selectField({
    label: 'Bant sayısı',
    options: [{ value: '4', text: '4 bant (2 rakam)' }, { value: '5', text: '5 bant (3 rakam)' }],
    value: '4',
  });
  const tolSelect = selectField({
    label: 'Tolerans bandı',
    options: colorsForRole('tol').map((c) => ({ value: c.key, text: `${c.name} (${tolText(c.tol)})`, color: c.hex })),
    value: cfg.kind === 'inductor' ? 'silver' : 'gold',
    withSwatch: true,
  });

  function update() {
    const { value, error } = valueField.read();
    if (error) {
      visualBox.replaceChildren();
      output.show({ errors: [error] });
      return;
    }
    const base = value / cfg.scale;
    const digitCount = countSelect.value === '5' ? 3 : 2;
    try {
      const bands = [...encodeColorBands(Number(base.toPrecision(12)), digitCount), tolSelect.value];
      visualBox.replaceChildren(bandedComponent(bands, { kind: cfg.kind, title: 'Oluşan renk bantları' }));
      output.show({
        rows: [
          { label: 'Renkler', value: bands.map((k) => colorByKey(k).name).join(' – ') },
          { label: 'Değer', value: formatSI(value, cfg.unit) },
          { label: 'Tolerans', value: tolText(colorByKey(tolSelect.value).tol) },
        ],
      });
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      visualBox.replaceChildren();
      output.show({ errors: [err.message] });
    }
  }

  valueField.onChange(update);
  countSelect.onChange(update);
  tolSelect.onChange(update);
  update();

  return codeLayout({
    visual: visualBox,
    visualTitle: cfg.kind === 'inductor' ? 'Bobin' : 'Direnç',
    inputs: [valueField.element, countSelect.element, tolSelect.element],
    output,
    extra: [colorTableCard(cfg), ...(cfg.notes ? [notesCard(cfg.notes)] : [])],
  });
}

/** Renk tablosu: rakam, çarpan, tolerans, TCR. */
function colorTableCard(cfg) {
  const head = ['Renk', 'Rakam', 'Çarpan', 'Tolerans'];
  if (cfg.kind === 'resistor') head.push('TCR (ppm/K)');
  const rows = COLORS.filter((c) => c.key !== 'none').map((c) => {
    const cells = [
      el('td', {}, el('span', { class: 'swatch swatch-inline', style: `background:${c.hex}` }), ' ', c.name),
      el('td', {}, c.digit ?? '—'),
      el('td', {}, c.exp !== undefined ? multiplierText(c.exp) + (cfg.kind === 'inductor' ? ' µH' : ' Ω') : '—'),
      el('td', {}, c.tol !== undefined ? tolText(c.tol) : '—'),
    ];
    if (cfg.kind === 'resistor') cells.push(el('td', {}, c.tcr ?? '—'));
    return el('tr', {}, ...cells);
  });
  return wideCard('Renk tablosu (IEC 60062)',
    el('div', { class: 'table-wrap' },
      el('table', { class: 'data-table' },
        el('thead', {}, el('tr', {}, ...head.map((h) => el('th', {}, h)))),
        el('tbody', {}, ...rows))),
    el('p', { class: 'table-note' }, 'Bant yok: tolerans ±%20. Okuma yönü: tolerans bandı genellikle diğerlerinden biraz ayrık ve sağdadır; altın/gümüş ilk bant olamaz.'),
  );
}
