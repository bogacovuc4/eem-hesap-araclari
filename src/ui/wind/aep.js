import { calculatorView, calculatorPanel, verifyNote } from '../form.js';
import { formula } from '../formula.js';
import { POWER_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { annualEnergy, weibullScaleFromMean } from '../../calc/wind.js';
import { barChart } from '../chart.js';

const turbineFields = [
  { key: 'rated', label: 'Nominal güç Pr', name: 'Nominal güç', value: '2', units: POWER_UNITS, unit: 'MW' },
  { key: 'vci', label: 'Devreye girme hızı (m/s)', name: 'Devreye girme hızı', value: '3', constraint: 'nonnegative' },
  { key: 'vr', label: 'Nominal hız (m/s)', name: 'Nominal hız', value: '12' },
  { key: 'vco', label: 'Durma (cut-out) hızı (m/s)', name: 'Durma hızı', value: '25' },
  { key: 'avail', label: 'Kullanılabilirlik (%)', name: 'Kullanılabilirlik', value: '97', max: 100, hint: 'Bakım ve arızalar dışında çalışılan zaman oranı' },
];

function compute(v, c) {
  const r = annualEnergy({
    k: v.k, c, rated: v.rated, cutIn: v.vci, ratedSpeed: v.vr, cutOut: v.vco, availability: v.avail / 100,
  });
  const warnings = [];
  if (v.k < 1 || v.k > 4) warnings.push(`k = ${formatNumber(v.k, 3)}: rüzgâr ölçümlerinde k genellikle 1,5–3 arasındadır; değeri kontrol edin.`);
  if (r.meanSpeed < v.vci) warnings.push('Ortalama hız devreye girme hızından düşük: türbin yılın çoğunda üretim yapmaz.');
  return {
    results: [
      { label: 'Yıllık enerji üretimi (AEP)', value: formatSI(r.aep, 'Wh') },
      { label: 'Kapasite faktörü', value: `%${formatNumber(r.capacityFactor * 100, 3)}` },
      { label: 'Ortalama güç', value: formatSI(r.meanPower, 'W') },
      { label: 'Ortalama rüzgâr hızı', value: `${formatNumber(r.meanSpeed)} m/s` },
      { label: 'Ölçek parametresi c', value: `${formatNumber(c)} m/s` },
      { label: 'Üretim yapılan süre', value: `${formatNumber(r.hoursProducing, 4)} saat/yıl` },
      { label: 'Nominal güçte geçen süre', value: `${formatNumber(r.hoursAtRated, 4)} saat/yıl` },
      { label: 'Ortalama güç yoğunluğu (ρ = 1,225)', value: `${formatSI(r.powerDensity, 'W')}/m²` },
    ],
    warnings,
    raw: r,
  };
}

function energyChart(out) {
  if (!out) return [];
  const bins = out.raw.bins;
  return barChart({
    title: 'Hız aralıklarına göre yıllık enerji',
    bars: bins.map((b) => ({
      label: String(b.from),
      value: b.energy / 1e6,
      tip: `${formatNumber(b.from, 3)}–${formatNumber(b.to, 3)} m/s: ${formatSI(b.energy, 'Wh', 3)} · ${formatNumber(b.hours, 3)} saat`,
    })),
    xLabel: 'Rüzgâr hızı (m/s, aralığın başı)',
    yLabel: 'Enerji (MWh)',
    yFormat: (y) => formatNumber(y, 3),
    tableHeaders: ['Hız aralığı (m/s)', 'Saat/yıl', 'Enerji'],
    tableRows: bins.map((b) => [`${formatNumber(b.from, 3)}–${formatNumber(b.to, 3)}`, formatNumber(b.hours, 3), formatSI(b.energy, 'Wh', 3)]),
  });
}

const formulas = () => [
  formula(String.raw`f(v) = \frac{k}{c}\left(\frac{v}{c}\right)^{k-1} e^{-(v/c)^k},\qquad \bar v = c\,\Gamma\!\left(1+\frac1k\right)`,
    'f(v) = (k/c)(v/c)^(k−1)·e^(−(v/c)^k),  v̄ = c·Γ(1 + 1/k)'),
  formula(String.raw`\text{AEP} = 8760\ \text{h} \cdot \eta_{\text{kull}} \int_{v_{ci}}^{v_{co}} P(v)\,f(v)\,dv,\qquad \text{KF} = \frac{\text{AEP}}{8760\,P_r}`,
    'AEP = 8760 h · η · ∫ P(v)·f(v) dv,  KF = AEP / (8760·Pr)'),
  formula(String.raw`P(v) = P_r\,\frac{v^3 - v_{ci}^3}{v_r^3 - v_{ci}^3}\ \ (v_{ci} \le v < v_r),\qquad P(v) = P_r\ \ (v_r \le v < v_{co})`,
    'P(v) = Pr·(v³ − vci³)/(vr³ − vci³) (vci ≤ v < vr),  P(v) = Pr (vr ≤ v < vco)'),
];

const notes = [
  'Rüzgâr hızının göbek yüksekliğinde Weibull dağılımına uyduğu varsayılır. Ölçüm başka yükseklikteyse önce “Rüzgâr hız profili” ile taşıyın.',
  verifyNote('Güç eğrisi devreye girme ile nominal hız arasında kübik kabul edilmiştir; gerçek türbinler için üreticinin güç eğrisi kullanılmalıdır. Bu model genellikle AEP’yi birkaç % farkla verir.'),
  'İz (wake) kayıpları, elektriksel kayıplar ve hava yoğunluğu farkı hesaba katılmaz; yalnızca kullanılabilirlik oranı uygulanır.',
  'k = 2 özel durumu Rayleigh dağılımıdır; yalnızca ortalama hız bilindiğinde sık kullanılır.',
  'İntegral nominal hız bölgesinde analitik (Weibull CDF farkı), kübik bölgede Simpson yöntemiyle sayısal hesaplanır.',
];

export default {
  id: 'wind/aep',
  title: 'Yıllık enerji (Weibull)',
  render(container) {
    container.append(calculatorView({
      title: 'Yıllık enerji üretimi (Weibull)',
      intro: 'Rüzgâr hızı dağılımı ve türbin güç eğrisinden yıllık enerji, kapasite faktörü ve hız aralıklarına göre üretim.',
      modes: [
        {
          id: 'kc',
          label: 'Weibull k ve c',
          build: () => calculatorPanel({
            fields: [
              { key: 'k', label: 'Şekil parametresi k', name: 'k', value: '2', hint: 'k = 2: Rayleigh dağılımı' },
              { key: 'c', label: 'Ölçek parametresi c (m/s)', name: 'c', value: '8' },
              ...turbineFields,
            ],
            compute: (v) => compute(v, v.c),
            diagram: (v, out) => energyChart(out),
            diagramTitle: 'Enerji dağılımı',
            formulas: formulas(),
            notes,
          }),
        },
        {
          id: 'mean',
          label: 'Ortalama hız ve k',
          build: () => calculatorPanel({
            fields: [
              { key: 'k', label: 'Şekil parametresi k', name: 'k', value: '2', hint: 'Bilinmiyorsa 2 (Rayleigh) alın' },
              { key: 'vmean', label: 'Ortalama rüzgâr hızı (m/s)', name: 'Ortalama hız', value: '7' },
              ...turbineFields,
            ],
            compute: (v) => compute(v, weibullScaleFromMean(v.vmean, v.k)),
            diagram: (v, out) => energyChart(out),
            diagramTitle: 'Enerji dağılımı',
            formulas: [...formulas(), formula(String.raw`c = \frac{\bar v}{\Gamma(1 + 1/k)}`, 'c = v̄ / Γ(1 + 1/k)')],
            notes,
          }),
        },
      ],
    }));
  },
};
