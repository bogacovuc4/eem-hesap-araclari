import { el } from '../dom.js';
import { calculatorView, numberField } from '../form.js';
import { formula } from '../formula.js';
import { formatNumber } from '../../calc/units.js';
import { parsePairs, linearRegression } from '../../calc/ml.js';
import { textField, outputCard, codeLayout, wideCard, notesCard } from '../codes/common.js';
import { lineChart } from '../chart.js';

function panel() {
  const data = el('div', {});
  const input = textField({
    label: 'Veri (her satırda x, y)',
    value: '1, 2.1; 2, 3.9; 3, 6.2; 4, 7.8; 5, 10.1; 6, 12.2; 7, 13.8',
    placeholder: '1, 2; 2, 4; 3, 5',
    hint: 'Noktaları ; ile ayırın. x ile y arasına virgül ya da boşluk koyun.',
    param: 'd',
  });
  const x0 = numberField({ key: 'x0', label: 'Tahmin için x', name: 'x', value: '8', constraint: 'any' });
  const output = outputCard();

  function update() {
    try {
      const pts = parsePairs(input.value);
      input.setInvalid(false);
      const r = linearRegression(pts);
      const xv = x0.read();
      const rows = [
        { label: 'Doğru denklemi', value: `y = ${formatNumber(r.intercept, 5)} ${r.slope < 0 ? '−' : '+'} ${formatNumber(Math.abs(r.slope), 5)}·x` },
        { label: 'Belirleme katsayısı R²', value: r.r2 === null ? '—' : formatNumber(r.r2, 5) },
        { label: 'Korelasyon katsayısı r', value: r.r === null ? '—' : formatNumber(r.r, 5) },
        { label: 'Eğim / kesişim', value: `${formatNumber(r.slope, 5)} / ${formatNumber(r.intercept, 5)}` },
        { label: 'RMSE / MAE', value: `${formatNumber(r.rmse, 4)} / ${formatNumber(r.mae, 4)}` },
        { label: 'Nokta sayısı', value: String(r.n) },
      ];
      if (!xv.error) rows.splice(1, 0, { label: `x = ${formatNumber(xv.value, 4)} için tahmin`, value: formatNumber(r.predict(xv.value), 5) });
      const xs = pts.map((p) => p.x);
      const lo = Math.min(...xs, xv.error ? Infinity : xv.value);
      const hi = Math.max(...xs, xv.error ? -Infinity : xv.value);
      const line = Array.from({ length: 61 }, (_, i) => {
        const x = lo + ((hi - lo) * i) / 60;
        return { x, y: r.predict(x) };
      });
      output.show({
        rows,
        warnings: [
          ...(r.n < 5 ? ['Nokta sayısı az: eğim ve R² güvenilir değil.'] : []),
          ...(!xv.error && (xv.value < Math.min(...xs) || xv.value > Math.max(...xs)) ? ['Tahmin edilen x veri aralığının dışında (dışdeğerleme): sonuç güvenilir olmayabilir.'] : []),
        ],
      });
      data.replaceChildren(lineChart({
        title: 'Veri noktaları ve en küçük kareler doğrusu',
        points: line,
        dots: pts,
        xLabel: 'x',
        yLabel: 'y',
        xFormat: (x) => formatNumber(x, 3),
        yFormat: (y, precise) => formatNumber(y, precise ? 5 : 3),
        marker: xv.error ? null : { x: xv.value, y: r.predict(xv.value) },
      }));
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      input.setInvalid(true, err.message);
      output.show({ errors: [err.message] });
      data.replaceChildren();
    }
  }
  input.onChange(update);
  x0.onChange(update);
  update();

  return codeLayout({
    visual: data,
    visualTitle: 'Saçılım grafiği',
    inputs: [input.element, x0.element],
    output,
    extra: [
      wideCard('Formül', formula(String.raw`b = \frac{\sum (x_i-\bar x)(y_i-\bar y)}{\sum (x_i-\bar x)^2},\quad a = \bar y - b\bar x,\quad R^2 = 1 - \frac{\sum (y_i - \hat y_i)^2}{\sum (y_i-\bar y)^2}`,
        'b = Σ(xi − x̄)(yi − ȳ) / Σ(xi − x̄)²,  a = ȳ − b·x̄,  R² = 1 − SSE/SST')),
      notesCard([
        'En küçük kareler yöntemi, tahmin hatalarının karelerinin toplamını en küçük yapan doğruyu bulur. Makine öğrenmesindeki en basit denetimli öğrenme modelidir.',
        'R² modelin y’deki değişimin ne kadarını açıkladığını gösterir (1 = mükemmel uyum). Yüksek R² nedensellik göstermez.',
        'Aykırı değerler doğruyu güçlü biçimde çeker; önce grafiğe bakın.',
      ]),
    ],
  });
}

export default {
  id: 'ml/regression',
  title: 'Doğrusal regresyon',
  render(container) {
    container.append(calculatorView({
      title: 'Doğrusal regresyon (en küçük kareler)',
      intro: 'Veri noktalarına en iyi uyan doğru, R², hata ölçütleri ve yeni x için tahmin.',
      modes: [{ id: 'ols', label: 'Basit doğrusal', build: panel }],
    }));
  },
};
