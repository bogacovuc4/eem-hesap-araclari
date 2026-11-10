import { el } from '../dom.js';
import { calculatorView } from '../form.js';
import { formula } from '../formula.js';
import { formatNumber } from '../../calc/units.js';
import { dft, parseList } from '../../calc/signals.js';
import { textField, outputCard, codeLayout, wideCard, notesCard } from '../codes/common.js';
import { lineChart } from '../chart.js';

function panel() {
  const input = textField({
    label: 'Örnekler x[n]',
    value: '1; 2; 3; 4; 0; 0; 0; 0',
    placeholder: 'ör. 1; 0; -1; 0',
    hint: 'n = 0, 1, 2… sırasıyla; noktalı virgül ya da boşlukla ayırın (en çok 256)',
    param: 'x',
  });
  const output = outputCard();
  const chartBox = el('div');
  const tableBox = el('div');

  function update() {
    try {
      const x = parseList(input.value.replace(/−/g, '-'));
      if (!x.length) throw new RangeError('En az bir örnek girin.');
      const X = dft(x);
      input.setInvalid(false);
      const energyTime = x.reduce((s, v) => s + v * v, 0);
      const energyFreq = X.reduce((s, b) => s + b.mag ** 2, 0) / x.length;
      const peak = X.slice(1, Math.floor(x.length / 2) + 1).reduce((a, b) => (b.mag > a.mag ? b : a), { mag: -1, k: null });
      output.show({
        rows: [
          { label: 'N (nokta sayısı)', value: String(x.length) },
          { label: 'DC bileşen X[0]', value: formatNumber(X[0].re, 6) },
          { label: 'Ortalama X[0]/N', value: formatNumber(X[0].re / x.length, 6) },
          { label: 'En büyük AC bileşen', value: peak.k === null ? '—' : `k = ${peak.k}, |X| = ${formatNumber(peak.mag, 5)}` },
          { label: 'Enerji Σ|x[n]|²', value: formatNumber(energyTime, 6) },
          { label: 'Parseval (1/N)Σ|X[k]|²', value: formatNumber(energyFreq, 6) },
        ],
      });
      chartBox.replaceChildren(lineChart({
        title: 'Genlik spektrumu |X[k]|',
        points: X.map((b) => ({ x: b.k, y: b.mag })),
        dots: X.map((b) => ({ x: b.k, y: b.mag })),
        xLabel: 'k (frekans indeksi)',
        yLabel: '|X[k]|',
        xFormat: (v) => formatNumber(v, 3),
        yFormat: (v, precise) => formatNumber(v, precise ? 5 : 3),
        yMinFixed: 0,
      }));
      tableBox.replaceChildren(el('div', { class: 'table-wrap' }, el('table', { class: 'data-table data-table-compact' },
        el('thead', {}, el('tr', {}, ...['k', 'Re X[k]', 'Im X[k]', '|X[k]|', '∠X[k] (°)'].map((h) => el('th', { scope: 'col' }, h)))),
        el('tbody', {}, ...X.map((b) => el('tr', {},
          el('th', { scope: 'row' }, String(b.k)),
          ...[b.re, b.im, b.mag, b.mag ? b.phaseDeg : 0].map((v) => el('td', {}, formatNumber(v, 5)))))))));
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      input.setInvalid(true, err.message);
      output.show({ errors: [err.message] });
      chartBox.replaceChildren();
      tableBox.replaceChildren();
    }
  }
  input.onChange(update);
  update();

  return codeLayout({
    visual: chartBox,
    visualTitle: 'Spektrum',
    inputs: [input.element],
    output,
    extra: [
      wideCard('DFT katsayıları', tableBox),
      wideCard('Formül', formula(String.raw`X[k]=\sum_{n=0}^{N-1}x[n]\,e^{-j2\pi kn/N},\qquad f_k=\frac{k}{N}f_s`, 'X[k] = Σ x[n]·e^(−j2πkn/N),  fk = k·fs/N')),
      notesCard([
        'Gerçel girişte spektrum eşlenik simetriktir: |X[k]| = |X[N−k]|. Anlamlı frekanslar k = 0 … N/2’dir.',
        'k. bileşenin gerçek frekansı fk = k·fs/N; frekans çözünürlüğü fs/N’dir. Sıfır ekleme (zero padding) eğriyi sıklaştırır ama çözünürlüğü artırmaz.',
        'Tek bir sinüsün genliği A ise |X[k]| = A·N/2 olur (tam periyot örneklendiğinde).',
      ]),
    ],
  });
}

export default {
  id: 'signals/dft',
  title: 'DFT (ayrık Fourier dönüşümü)',
  render(container) {
    container.append(calculatorView({
      title: 'Ayrık Fourier dönüşümü (DFT)',
      intro: 'Örnek dizisinin DFT katsayıları, genlik spektrumu ve Parseval denetimi.',
      modes: [{ id: 'dft', label: 'DFT', build: panel }],
    }));
  },
};
