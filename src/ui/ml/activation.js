import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatNumber } from '../../calc/units.js';
import { activation, ACTIVATIONS } from '../../calc/ml.js';
import { lineChart } from '../chart.js';

const FUNCS = {
  sigmoid: {
    label: 'Sigmoid',
    tex: String.raw`\sigma(x) = \frac{1}{1+e^{-x}},\qquad \sigma'(x) = \sigma(x)\,(1-\sigma(x))`,
    plain: 'σ(x) = 1/(1 + e^(−x)),  σ′(x) = σ(x)·(1 − σ(x))',
    note: 'Çıkışı olasılık gibi yorumlanır; ikili sınıflandırmanın çıkış katmanında kullanılır. Türevi en fazla 0,25’tir: derin ağlarda gradyan kaybolur.',
  },
  tanh: {
    label: 'Tanh',
    tex: String.raw`\tanh(x) = \frac{e^x - e^{-x}}{e^x + e^{-x}},\qquad \tanh'(x) = 1 - \tanh^2(x)`,
    plain: 'tanh(x) = (eˣ − e⁻ˣ)/(eˣ + e⁻ˣ),  tanh′(x) = 1 − tanh²(x)',
    note: 'Sıfır merkezlidir, sigmoid’den hızlı öğrenir; uçlarda yine doyar. RNN ve LSTM’lerde yaygındır.',
  },
  relu: {
    label: 'ReLU',
    tex: String.raw`\mathrm{ReLU}(x) = \max(0, x),\qquad \mathrm{ReLU}'(x) = \begin{cases}1 & x>0\\ 0 & x<0\end{cases}`,
    plain: 'ReLU(x) = max(0, x),  türev x > 0 için 1, x < 0 için 0',
    note: 'Gizli katmanlarda en yaygın seçim: hesaplaması ucuz, pozitif tarafta doymaz. Negatif girişte türev 0 olduğundan nöronlar “ölebilir”. x = 0’da türev tanımsızdır, burada 0 alınır.',
  },
  leaky: {
    label: 'Leaky ReLU',
    tex: String.raw`f(x) = \begin{cases}x & x>0\\ \alpha x & x\le 0\end{cases}`,
    plain: 'f(x) = x (x > 0), α·x (x ≤ 0)',
    note: 'Negatif tarafta küçük bir eğim (α) bırakarak ölü nöron sorununu azaltır.',
  },
  softplus: {
    label: 'Softplus',
    tex: String.raw`\mathrm{softplus}(x) = \ln(1+e^{x}),\qquad \mathrm{softplus}'(x) = \sigma(x)`,
    plain: 'softplus(x) = ln(1 + eˣ),  türevi σ(x)',
    note: 'ReLU’nun yumuşak, her yerde türevlenebilir hâli.',
  },
};

function panel(name) {
  const def = FUNCS[name];
  const fields = [{ key: 'x', label: 'Giriş x', name: 'x', value: '1', constraint: 'any', min: -50, max: 50 }];
  if (name === 'leaky') fields.push({ key: 'a', label: 'Negatif eğim α', name: 'α', value: '0.1', constraint: 'nonnegative', max: 1 });
  return calculatorPanel({
    fields,
    compute(v) {
      const r = activation(name, v.x, v.a);
      return {
        results: [
          { label: 'f(x)', value: formatNumber(r.y, 6) },
          { label: 'Türev f′(x)', value: formatNumber(r.dy, 6) },
          { label: 'Değer aralığı', value: r.range },
        ],
        warnings: Math.abs(r.dy) < 0.01 ? ['Türev çok küçük: bu bölgede gradyan neredeyse sıfır, ağırlıklar çok yavaş güncellenir (gradyan kaybolması).'] : [],
        raw: r,
      };
    },
    diagram: (v, out) => {
      const a = ACTIVATIONS[name];
      const pts = [];
      const der = [];
      for (let i = 0; i <= 240; i += 1) {
        const x = -6 + (12 * i) / 240;
        pts.push({ x, y: a.f(x, v.a) });
        der.push({ x, y: a.df(x, v.a) });
      }
      return lineChart({
        title: `${def.label} ve türevi`,
        points: pts,
        reference: der,
        labels: ['f(x)', 'f′(x)'],
        xLabel: 'x',
        yLabel: 'f(x)',
        xFormat: (x) => formatNumber(x, 2),
        yFormat: (y, precise) => formatNumber(y, precise ? 4 : 2),
        marker: out && v.x >= -6 && v.x <= 6 ? { x: v.x, y: out.raw.y } : null,
        yMinFixed: name === 'tanh' || name === 'leaky' ? -1 : null,
      });
    },
    diagramTitle: 'Grafik',
    formulas: [formula(def.tex, def.plain)],
    notes: [def.note, 'Doğrusal olmayan aktivasyonlar olmasaydı çok katmanlı bir ağ tek bir doğrusal dönüşüme indirgenirdi.'],
  });
}

export default {
  id: 'ml/activation',
  title: 'Aktivasyon fonksiyonları',
  render(container) {
    container.append(calculatorView({
      title: 'Yapay sinir ağı aktivasyon fonksiyonları',
      intro: 'Sigmoid, tanh, ReLU, Leaky ReLU ve softplus: değer, türev ve grafik.',
      modes: Object.entries(FUNCS).map(([id, f]) => ({ id, label: f.label, build: () => panel(id) })),
    }));
  },
};
