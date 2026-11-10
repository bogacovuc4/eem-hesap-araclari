import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { FREQUENCY_UNITS, LENGTH_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { skinDepth, CONDUCTIVITY } from '../../calc/rf2.js';

const materials = Object.entries(CONDUCTIVITY)
  .map(([name, sigma]) => `${name} ${formatNumber(sigma / 1e7, 4)}×10⁷`).join(' · ');

const fields = [
  { key: 'f', label: 'Frekans f', name: 'f', value: '1', units: FREQUENCY_UNITS, unit: 'GHz' },
  { key: 'sigma', label: 'İletkenlik σ (S/m)', name: 'σ', value: '5.813e7', hint: materials },
  { key: 'mur', label: 'Bağıl manyetik geçirgenlik μr', name: 'μr', value: '1', min: 1, hint: 'Bakır, alüminyum, altın, gümüş için 1' },
];

const notes = [
  'Düzlem iyi iletken varsayımı (σ ≫ ωε). İletkenlik değerleri Pozar, Microwave Engineering, Ek F’den (20 °C).',
  'Alan, yüzeyden δ derinliğinde 1/e’ye (≈ %37) düşer; akımın büyük kısmı ilk 3–5δ içinde akar.',
  'Yüzey pürüzlülüğü yüksek frekansta ek kayıp getirir; bu hesap pürüzsüz yüzey içindir.',
];

const formulas = () => [
  formula(String.raw`\delta = \frac{1}{\sqrt{\pi f \mu_0 \mu_r \sigma}},\qquad R_s = \frac{1}{\sigma\delta} = \sqrt{\frac{\pi f \mu}{\sigma}}`,
    'δ = 1/√(π·f·μ0·μr·σ),  Rs = 1/(σ·δ) = √(π·f·μ/σ)'),
];

export default {
  id: 'rf/skin-depth',
  title: 'Deri derinliği',
  render(container) {
    container.append(calculatorView({
      title: 'Deri derinliği (skin depth)',
      intro: 'İletkende akımın yoğunlaştığı derinlik, yüzey direnci ve tel için AC/DC direnç oranı.',
      modes: [
        {
          id: 'depth',
          label: 'Deri derinliği',
          build: () => calculatorPanel({
            fields,
            compute(v) {
              const r = skinDepth(v);
              return {
                results: [
                  { label: 'Deri derinliği δ', value: formatSI(r.delta, 'm') },
                  { label: 'Yüzey direnci Rs', value: `${formatSI(r.rs, 'Ω')}/□` },
                  { label: '%99 akım derinliği (≈ 4,6δ)', value: formatSI(4.6 * r.delta, 'm') },
                ],
              };
            },
            formulas: formulas(),
            notes,
          }),
        },
        {
          id: 'wire',
          label: 'Tel direnci',
          build: () => calculatorPanel({
            fields: [
              ...fields,
              { key: 'diameter', label: 'Tel çapı', name: 'Tel çapı', value: '1', units: LENGTH_UNITS, unit: 'mm' },
            ],
            compute(v) {
              const r = skinDepth(v);
              return {
                results: [
                  { label: 'Deri derinliği δ', value: formatSI(r.delta, 'm') },
                  { label: 'DC direnç', value: `${formatSI(r.rDc, 'Ω')}/m` },
                  { label: 'AC direnç (yaklaşık)', value: `${formatSI(r.rAc, 'Ω')}/m` },
                  { label: 'R_AC / R_DC', value: formatNumber(r.ratio) },
                  { label: 'Çap / δ', value: formatNumber(v.diameter / r.delta, 3) },
                ],
                warnings: r.validWire ? [] : ['Tel çapı 4δ’dan küçük: akım kesite neredeyse düzgün yayılır, AC direnç ≈ DC direnç alındı.'],
              };
            },
            formulas: [
              ...formulas(),
              formula(String.raw`R'_{DC} = \frac{4}{\sigma\pi d^2},\qquad R'_{AC} \approx \frac{1}{\sigma\,\pi d\,\delta}\ \ (d \gg \delta)`,
                'R′DC = 4/(σ·π·d²),  R′AC ≈ 1/(σ·π·d·δ)  (d ≫ δ)'),
            ],
            notes: [...notes, 'AC direnç, akımın yüzeyde δ kalınlığında bir halkada aktığı yaklaşımıyla hesaplanır (d > 4δ için). Yakınlık etkisi (proximity) dahil değildir.'],
          }),
        },
      ],
    }));
  },
};
