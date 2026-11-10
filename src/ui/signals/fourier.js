import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { FREQUENCY_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { fourierSeries, idealWave } from '../../calc/signals.js';
import { lineChart, barChart } from '../chart.js';

const WAVES = {
  square: {
    label: 'Kare',
    tex: String.raw`x(t) = \frac{4A}{\pi}\sum_{n=1,3,5,\dots}\frac{1}{n}\sin(n\omega_0 t)`,
    plain: 'x(t) = (4A/π)·Σ (1/n)·sin(nω0t), n tek',
    note: 'Yalnız tek harmonikler vardır, genlik 1/n ile azalır. Süreksizlikte kısmi toplam ≈ %9 aşar (Gibbs olayı); harmonik sayısı artınca aşım daralır ama kaybolmaz.',
  },
  triangle: {
    label: 'Üçgen',
    tex: String.raw`x(t) = \frac{8A}{\pi^2}\sum_{n=1,3,5,\dots}\frac{(-1)^{(n-1)/2}}{n^2}\sin(n\omega_0 t)`,
    plain: 'x(t) = (8A/π²)·Σ (−1)^((n−1)/2)/n²·sin(nω0t), n tek',
    note: 'Yalnız tek harmonikler; genlik 1/n² ile azaldığı için az harmonikle bile ideal dalgaya çok yakındır (Gibbs aşımı yok).',
  },
  sawtooth: {
    label: 'Testere',
    tex: String.raw`x(t) = \frac{2A}{\pi}\sum_{n=1}^{\infty}\frac{(-1)^{n+1}}{n}\sin(n\omega_0 t)`,
    plain: 'x(t) = (2A/π)·Σ (−1)^(n+1)/n·sin(nω0t)',
    note: 'Tek ve çift tüm harmonikler vardır, genlik 1/n ile azalır; sıçramada Gibbs aşımı görülür.',
  },
};

function panel(wave) {
  const w = WAVES[wave];
  return calculatorPanel({
    fields: [
      { key: 'a', label: 'Genlik A', name: 'A', value: '1' },
      { key: 'f', label: 'Temel frekans f0', name: 'f0', value: '50', units: FREQUENCY_UNITS, unit: 'Hz' },
      { key: 'n', label: 'Harmonik sayısı N', name: 'N', value: '9', hint: '1–199 arası tam sayı; N’i artırıp dalganın nasıl oluştuğunu izleyin' },
    ],
    compute(v) {
      const r = fourierSeries({ wave, amplitude: v.a, f: v.f, harmonics: v.n });
      const shown = r.harmonics.filter((h) => h.b !== 0).slice(0, 6);
      return {
        results: [
          { label: 'Temel bileşen genliği b1', value: formatNumber(r.harmonics[0].b) },
          ...shown.slice(1).map((h) => ({ label: `${h.n}. harmonik (${formatSI(h.f, 'Hz', 3)})`, value: formatNumber(h.b) })),
          { label: `THD (ilk ${v.n} harmonik)`, value: `%${formatNumber(r.thd * 100, 4)}` },
          { label: 'Kısmi toplamın etkin değeri', value: formatNumber(r.rms) },
          { label: 'İdeal dalganın etkin değeri', value: formatNumber(r.idealRms) },
        ],
        raw: r,
      };
    },
    diagram: (v, out) => {
      if (!out) return [];
      const T = 1 / v.f;
      const pts = [];
      const ref = [];
      for (let i = 0; i <= 600; i += 1) {
        const t = (2 * T * i) / 600;
        pts.push({ x: t, y: out.raw.partial(t) });
        ref.push({ x: t, y: idealWave(wave, t, T, v.a) });
      }
      const bars = out.raw.harmonics.slice(0, 25);
      return [
        lineChart({
          title: `${w.label} dalga: ilk ${v.n} harmoniğin toplamı`,
          points: pts,
          reference: ref,
          labels: [`${v.n} harmonikli toplam`, 'ideal dalga'],
          xLabel: 'Zaman (s)',
          yLabel: 'x(t)',
          xFormat: (x) => formatSI(x, 's', 2),
          yFormat: (y, precise) => formatNumber(y, precise ? 4 : 2),
          yMinFixed: -1.25 * v.a,
        }),
        barChart({
          title: 'Harmonik genlikleri |bn|',
          bars: bars.map((h) => ({ label: String(h.n), value: Math.abs(h.b), tip: `n = ${h.n} · ${formatSI(h.f, 'Hz', 3)} · bn = ${formatNumber(h.b)}` })),
          xLabel: 'Harmonik numarası n',
          yLabel: '|bn|',
          yFormat: (y) => formatNumber(y, 2),
        }),
      ];
    },
    diagramTitle: 'Zaman ve frekans',
    formulas: [formula(w.tex, w.plain)],
    notes: [w.note, 'Dalga sıfır ortalamalı ve t = 0’da tek simetrili alınmıştır; bu yüzden yalnız sinüs terimleri vardır. THD = √(Σ bn², n ≥ 2) / |b1|.'],
  });
}

export default {
  id: 'signals/fourier',
  title: 'Fourier serisi',
  render(container) {
    container.append(calculatorView({
      title: 'Fourier serisi',
      intro: 'Kare, üçgen ve testere dalgalarının harmonikleri; ilk N harmoniğin toplamının ideal dalgaya yakınsaması.',
      modes: Object.entries(WAVES).map(([id, w]) => ({ id, label: w.label, build: () => panel(id) })),
    }));
  },
};
