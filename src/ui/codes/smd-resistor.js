import { el } from '../dom.js';
import { calculatorView, numberField, verifyNote } from '../form.js';
import { RESISTANCE_UNITS, formatSI } from '../../calc/units.js';
import { decodeSmdResistor, encodeSmdResistor, E96, EIA96_MULTIPLIERS } from '../../calc/codes.js';
import { textField, outputCard, codeLayout, wideCard, notesCard, multiplierText } from './common.js';
import { smdChip, visualFigure } from './visuals.js';

const notes = [
  '3 haneli kod: ilk iki hane rakam, üçüncü hane sıfır sayısı (472 = 47 × 10² = 4,7 kΩ). Genellikle ±%5 (E24) dirençlerde.',
  '4 haneli kod: ilk üç hane rakam, dördüncü hane sıfır sayısı (1002 = 100 × 10² = 10 kΩ). Genellikle ±%1 (E96).',
  'R harfi ondalık virgül yerine geçer: 4R7 = 4,7 Ω, R47 = 0,47 Ω, 47R = 47 Ω.',
  'EIA-96: iki haneli indeks (01–96) E96 serisindeki değeri, harf çarpanı verir (01C = 100 × 100 = 10 kΩ). Küçük 0603 dirençlerde kullanılır, ±%1.',
  verifyNote('Bazı üreticiler hassas dirençleri ayırmak için kodun altını çizer ya da farklı harfler kullanır; şüphede veri sayfasına bakın.'),
];

function decodePanel() {
  const code = textField({ label: 'Çip üzerindeki kod', value: '472', placeholder: 'ör. 472, 1002, 4R7, 01C', hint: 'Büyük/küçük harf fark etmez.' });
  const output = outputCard();
  const visual = el('div', { class: 'component-row' });

  function update() {
    visual.replaceChildren(visualFigure(smdChip(code.value.trim().toUpperCase(), { title: 'SMD direnç' })));
    try {
      const r = decodeSmdResistor(code.value);
      code.setInvalid(false);
      output.show({
        rows: [
          { label: 'Direnç', value: r.value === 0 ? '0 Ω (köprü)' : formatSI(r.value, 'Ω') },
          { label: 'Kod biçimi', value: r.format },
        ],
        warnings: r.note ? [r.note] : [],
      });
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      code.setInvalid(true);
      output.show({ errors: [err.message] });
    }
  }
  code.onChange(update);
  update();
  return codeLayout({ visual, visualTitle: 'SMD direnç', inputs: [code.element], output, extra: [eiaTableCard(), notesCard(notes)] });
}

function encodePanel() {
  const value = numberField({ key: 'r', label: 'Direnç', name: 'Direnç', value: '10', units: RESISTANCE_UNITS, unit: 'kΩ', constraint: 'nonnegative' });
  const output = outputCard();
  const visual = el('div', { class: 'component-row' });

  function update() {
    const { value: r, error } = value.read();
    if (error) {
      visual.replaceChildren();
      output.show({ errors: [error] });
      return;
    }
    try {
      const c = encodeSmdResistor(Number(r.toPrecision(12)));
      const na = (why) => `— (${why})`;
      visual.replaceChildren(...[
        c.three && visualFigure(smdChip(c.three, { title: '3 haneli' }), '3 haneli'),
        c.four && visualFigure(smdChip(c.four, { title: '4 haneli' }), '4 haneli'),
        c.eia96 && visualFigure(smdChip(c.eia96, { title: 'EIA-96' }), 'EIA-96'),
      ].filter(Boolean));
      output.show({
        rows: [
          { label: '3 haneli', value: c.three ?? na('2 anlamlı basamağa sığmıyor') },
          { label: '4 haneli', value: c.four ?? na('3 anlamlı basamağa sığmıyor') },
          { label: 'EIA-96', value: c.eia96 ?? na('E96 serisinde değil') },
        ],
      });
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      output.show({ errors: [err.message] });
    }
  }
  value.onChange(update);
  update();
  return codeLayout({ visual, visualTitle: 'Olası işaretlemeler', inputs: [value.element], output, extra: [eiaTableCard(), notesCard(notes)] });
}

/** EIA-96 indeks tablosu ve çarpan harfleri (katlanabilir). */
function eiaTableCard() {
  const rows = [];
  for (let i = 0; i < 24; i += 1) {
    rows.push(el('tr', {}, ...[0, 24, 48, 72].flatMap((offset) => [
      el('th', {}, String(i + offset + 1).padStart(2, '0')),
      el('td', {}, E96[i + offset]),
    ])));
  }
  const letters = Object.entries(EIA96_MULTIPLIERS).map(([letter, exp]) => `${letter} ${multiplierText(exp)}`).join(' · ');
  return wideCard('EIA-96 tablosu',
    el('details', {},
      el('summary', {}, 'İndeks → değer tablosunu göster'),
      el('div', { class: 'table-wrap' },
        el('table', { class: 'data-table data-table-compact' },
          el('thead', {}, el('tr', {}, ...Array.from({ length: 4 }, () => [el('th', {}, 'Kod'), el('th', {}, 'Değer')]).flat())),
          el('tbody', {}, ...rows)))),
    el('p', { class: 'table-note' }, `Çarpan harfleri: ${letters}`),
  );
}

export default {
  id: 'codes/smd-resistor',
  title: 'SMD direnç kodu',
  render(container) {
    container.append(calculatorView({
      title: 'SMD direnç kodu',
      intro: 'Yüzey montaj dirençlerin üzerindeki 3 haneli, 4 haneli ve EIA-96 kodları.',
      modes: [
        { id: 'decode', label: 'Koddan değere', build: decodePanel },
        { id: 'encode', label: 'Değerden koda', build: encodePanel },
      ],
    }));
  },
};
