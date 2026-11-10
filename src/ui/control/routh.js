import { el } from '../dom.js';
import { calculatorView } from '../form.js';
import { formula } from '../formula.js';
import { formatNumber } from '../../calc/units.js';
import { routhTable, parseList } from '../../calc/signals.js';
import { textField, outputCard, codeLayout, wideCard, notesCard } from '../codes/common.js';

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const pow = (n) => (n === 0 ? '' : n === 1 ? 's' : `s${String(n).split('').map((d) => SUP[d]).join('')}`);

function polyText(coeffs) {
  const n = coeffs.length - 1;
  const terms = coeffs.map((c, k) => [c, n - k]).filter(([c]) => c !== 0);
  return terms.map(([c, p], idx) => {
    const sign = c < 0 ? (idx ? ' − ' : '−') : idx ? ' + ' : '';
    const abs = Math.abs(c);
    const num = abs === 1 && p > 0 ? '' : clean(abs);
    return `${sign}${num}${pow(p)}`;
  }).join('') || '0';
}

/** Gereksiz sıfırlar olmadan: 2 → "2", 112.6666 → "112,67", 1e-9 → "1×10^-9". */
function clean(x) {
  const abs = Math.abs(x);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e7)) return formatNumber(x, 5);
  return String(Number(x.toPrecision(6))).replace('.', ',').replace('-', '−');
}
const cell = (x) => (Math.abs(x) < 1e-6 && x !== 0 ? 'ε' : clean(x));

function tableView(result) {
  const width = Math.max(...result.rows.map((r) => r.values.length));
  return el('div', { class: 'table-wrap' },
    el('table', { class: 'data-table routh-table' },
      el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Satır'),
        ...Array.from({ length: width }, (_, k) => el('th', { scope: 'col' }, k === 0 ? '1. sütun' : `${k + 1}.`)))),
      el('tbody', {}, ...result.rows.map((row, i) => {
        const prev = i ? result.firstColumn[i - 1] : null;
        const flip = prev !== null && Math.sign(prev) !== Math.sign(row.values[0]);
        return el('tr', {},
          el('th', { scope: 'row' }, pow(row.power) || 's⁰'),
          ...row.values.map((x, k) => el('td', { class: k === 0 ? (flip ? 'first-col sign-flip' : 'first-col') : '' }, cell(x))));
      }))));
}

function panel() {
  const input = textField({
    label: 'Karakteristik polinom katsayıları',
    value: '1; 2; 3; 4; 5',
    placeholder: 'ör. 1; 6; 11; 6',
    hint: 'En yüksek dereceden başlayarak; noktalı virgül ya da boşlukla ayırın. Eksik terim için 0 yazın.',
    param: 'c',
  });
  const output = outputCard();
  const tableBox = el('div');
  const polyBox = el('p', { class: 'poly-text' });

  function update() {
    try {
      const coeffs = parseList(input.value.replace(/−/g, '-'));
      if (coeffs.length < 2) throw new RangeError('En az iki katsayı girin.');
      if (coeffs.length > 16) throw new RangeError('En çok 15. derece desteklenir.');
      const r = routhTable(coeffs);
      input.setInvalid(false);
      polyBox.textContent = `Δ(s) = ${polyText(coeffs)}`;
      const warnings = [];
      if (!r.allSameSign) warnings.push('Katsayıların hepsi aynı işaretli değil (ya da sıfır var): bu tek başına kararsızlık ya da sınırda kararlılık demektir.');
      if (r.special === 'zero-row') warnings.push('Tamamen sıfır bir satır çıktı: jω ekseni ya da orijine simetrik kökler var. Satır, yardımcı polinomun türeviyle dolduruldu; işaret değişimi yoksa sistem sınırda (marjinal) kararlıdır.');
      if (r.special === 'epsilon') warnings.push('İlk sütunda sıfır çıktı ve küçük pozitif ε ile değiştirildi (tabloda “ε”).');
      output.show({
        rows: [
          { label: 'Derece', value: String(coeffs.length - 1) },
          { label: 'İlk sütundaki işaret değişimi', value: String(r.signChanges) },
          { label: 'Sağ yarı düzlemdeki kök sayısı', value: String(r.signChanges) },
          { label: 'Sonuç', value: r.stable ? 'kararlı (tüm kökler sol yarı düzlemde)' : r.signChanges > 0 ? 'kararsız' : 'kararlı değil (sınırda kararlı olabilir)' },
        ],
        warnings,
      });
      tableBox.replaceChildren(tableView(r));
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      input.setInvalid(true, err.message);
      output.show({ errors: [err.message] });
      tableBox.replaceChildren();
      polyBox.textContent = '';
    }
  }
  input.onChange(update);
  update();

  return codeLayout({
    visual: el('div', {}, polyBox, tableBox),
    visualTitle: 'Routh tablosu',
    inputs: [input.element],
    output,
    extra: [
      wideCard('Kural', formula(
        String.raw`b_1=\frac{a_1a_2-a_0a_3}{a_1},\qquad b_2=\frac{a_1a_4-a_0a_5}{a_1},\ \dots`,
        'b1 = (a1·a2 − a0·a3)/a1,  b2 = (a1·a4 − a0·a5)/a1, …')),
      notesCard([
        'İlk sütundaki işaret değişimi sayısı, sağ yarı düzlemdeki kök sayısına eşittir (Routh–Hurwitz ölçütü).',
        'Kapalı çevrim için karakteristik denklem 1 + G(s)H(s) = 0’ın paydasıdır. K’ya bağlı kararlılık aralığı için K’yı farklı değerlerle deneyin.',
        'Örnekler: “1; 6; 11; 6” = (s+1)(s+2)(s+3) kararlı; “1; 2; 24; 48; −25; −50” sıfır satırlı özel durum.',
      ]),
    ],
  });
}

export default {
  id: 'control/routh',
  title: 'Routh–Hurwitz kararlılık',
  render(container) {
    container.append(calculatorView({
      title: 'Routh–Hurwitz kararlılık tablosu',
      intro: 'Karakteristik polinomun katsayılarından Routh tablosu, sağ yarı düzlem kök sayısı ve kararlılık.',
      modes: [{ id: 'routh', label: 'Routh', build: panel }],
    }));
  },
};
