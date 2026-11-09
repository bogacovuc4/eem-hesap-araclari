import { el } from '../dom.js';
import { calculatorView, numberField, verifyNote } from '../form.js';
import { CAPACITANCE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { decodeCapacitorCode, encodeCapacitorCode, CAP_TOLERANCES } from '../../calc/codes.js';
import { textField, selectField, outputCard, codeLayout, wideCard, notesCard } from './common.js';
import { ceramicCap, smdChip, visualFigure } from './visuals.js';

const notes = [
  '3 haneli kod pikofarad (pF) cinsindendir: ilk iki hane rakam, üçüncü hane sıfır sayısı (104 = 10 × 10⁴ pF = 100 nF).',
  'Sondaki harf toleransı gösterir (ör. 104K = 100 nF ±%10). B, C, D harfleri küçük kapasitelerde mutlak toleranstır (pF).',
  'Harf ondalık gösterimi: 4p7 = 4,7 pF, 4n7 = 4,7 nF, 2µ2 (2u2) = 2,2 µF. R de pF için ondalık virgüldür: 4R7 = 4,7 pF.',
  'İki haneli sayılar doğrudan pF’dir (47 = 47 pF). Film kondansatörlerde ondalıklı sayılar (0.1, .47) genellikle µF’dir.',
  verifyNote('Üçüncü hanede 8 = ×0,01 ve 9 = ×0,1 kullanımı yaygın ama her üreticide aynı değildir.'),
  'Gerilim kodları (ör. 2A = 100 V) ve SMD seramik kondansatörlerin harf-rakam kodları (EIA-198) bu hesaplayıcıda yoktur; çoğu SMD seramik kondansatörün üzerinde hiç yazı bulunmaz.',
];

function toleranceCard() {
  return wideCard('Tolerans harfleri',
    el('div', { class: 'table-wrap' },
      el('table', { class: 'data-table data-table-compact' },
        el('thead', {}, el('tr', {}, ...Object.keys(CAP_TOLERANCES).map((k) => el('th', {}, k)))),
        el('tbody', {}, el('tr', {}, ...Object.values(CAP_TOLERANCES).map((v) => el('td', {}, v)))))));
}

/** Sondaki sıfırları atarak yazar: 4700 → "4700", 0,0047 → "0,0047" */
function plain(v) {
  const n = Number(v.toPrecision(6));
  const text = String(n);
  return text.includes('e') ? formatNumber(n, 3) : text.replace('.', ',');
}

function capRows(pF) {
  return [
    { label: 'Kapasite', value: formatSI(pF * 1e-12, 'F') },
    { label: 'pF', value: plain(pF) },
    { label: 'nF', value: plain(pF / 1e3) },
    { label: 'µF', value: plain(pF / 1e6) },
  ];
}

function decodePanel() {
  const code = textField({ label: 'Kondansatör üzerindeki kod', value: '104K', placeholder: 'ör. 104, 104K, 4n7, 4R7, 47' });
  const output = outputCard();
  const visual = el('div', { class: 'component-row' });

  function update() {
    visual.replaceChildren(visualFigure(ceramicCap(code.value.trim())));
    try {
      const c = decodeCapacitorCode(code.value);
      code.setInvalid(false);
      output.show({
        rows: [
          ...capRows(c.pF),
          { label: 'Tolerans', value: c.tolerance ? `${c.tolerance.text} (${c.tolerance.letter})` : 'Belirtilmemiş' },
          { label: 'Kod biçimi', value: c.format },
        ],
      });
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      code.setInvalid(true, err.message);
      output.show({ errors: [err.message] });
    }
  }
  code.onChange(update);
  update();
  return codeLayout({ visual, visualTitle: 'Kondansatör', inputs: [code.element], output, extra: [toleranceCard(), notesCard(notes)] });
}

function encodePanel() {
  const value = numberField({ key: 'c', label: 'Kapasite', name: 'Kapasite', value: '100', units: CAPACITANCE_UNITS, unit: 'nF' });
  const tol = selectField({
    label: 'Tolerans harfi (isteğe bağlı)',
    options: [{ value: '', text: 'Yok' }, ...Object.entries(CAP_TOLERANCES).map(([k, v]) => ({ value: k, text: `${k} — ${v}` }))],
    value: 'K',
  });
  const output = outputCard();
  const visual = el('div', { class: 'component-row' });

  function update() {
    const { value: c, error } = value.read();
    if (error) {
      visual.replaceChildren();
      output.show({ errors: [error] });
      return;
    }
    try {
      const pF = Number((c / 1e-12).toPrecision(12));
      const codes = encodeCapacitorCode(pF);
      const three = codes.three ? codes.three + tol.value : null;
      visual.replaceChildren(...[
        three && visualFigure(ceramicCap(three), 'Seramik disk'),
        visualFigure(smdChip(codes.letter + tol.value, { kind: 'inductor', title: 'Harf gösterimi' }), 'Harf gösterimi'),
      ].filter(Boolean));
      output.show({
        rows: [
          { label: '3 haneli kod', value: three ?? '— (2 anlamlı basamağa sığmıyor ya da çok büyük)' },
          { label: 'Harf gösterimi', value: codes.letter + tol.value },
          ...capRows(pF),
        ],
      });
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      output.show({ errors: [err.message] });
    }
  }
  value.onChange(update);
  tol.onChange(update);
  update();
  return codeLayout({ visual, visualTitle: 'Olası işaretlemeler', inputs: [value.element, tol.element], output, extra: [toleranceCard(), notesCard(notes)] });
}

export default {
  id: 'codes/capacitor',
  title: 'Kondansatör kodu',
  render(container) {
    container.append(calculatorView({
      title: 'Kondansatör kodu',
      intro: 'Seramik, film ve tantal kondansatörlerin üzerindeki sayı/harf kodları.',
      modes: [
        { id: 'decode', label: 'Koddan değere', build: decodePanel },
        { id: 'encode', label: 'Değerden koda', build: encodePanel },
      ],
    }));
  },
};
