import { calculatorView, calculatorPanel, verifyNote } from '../form.js';
import { formula } from '../formula.js';
import { LENGTH_UNITS, DISTANCE_UNITS, formatSI, formatNumber } from '../../calc/units.js';
import { groundRod, groundStrip, groundPlate, SOIL_RESISTIVITY } from '../../calc/distribution.js';
import { svg, figure, label, s, fmt } from '../schematic.js';

const soilHint = `Tipik: ${SOIL_RESISTIVITY.map(([n, v]) => `${n.toLowerCase()} ${v}`).join(' · ')}`;
const rhoField = { key: 'rho', label: 'Toprak özdirenci ρ (Ω·m)', name: 'ρ', value: '100', hint: soilHint };

function ground(...children) {
  return s('g', {},
    s('rect', { x: 0, y: 40, width: 300, height: 130, fill: 'var(--surface-2)' }),
    s('line', { x1: 0, y1: 40, x2: 300, y2: 40, class: 'sch-line' }),
    ...children);
}

const pictures = {
  rod: (v) => figure(svg([0, 0, 300, 175], 'Düşey topraklama çubuğu',
    ground(
      s('line', { x1: 150, y1: 20, x2: 150, y2: 150, class: 'sch-line', 'stroke-width': 4 }),
      label(162, 100, 'L', fmt(v.len, 'm')),
      label(162, 30, 'd', fmt(v.d, 'm')),
    ))),
  strip: (v) => figure(svg([0, 0, 300, 175], 'Yatay topraklama şeridi',
    ground(
      s('line', { x1: 150, y1: 20, x2: 150, y2: 80, class: 'sch-line' }),
      s('line', { x1: 30, y1: 80, x2: 270, y2: 80, class: 'sch-line', 'stroke-width': 4 }),
      label(150, 104, 'L', fmt(v.len, 'm'), { anchor: 'middle' }),
      label(162, 62, 'gömme ≈ 0,5–1 m', ''),
    ))),
  plate: (v) => figure(svg([0, 0, 300, 175], 'Düşey topraklama levhası',
    ground(
      s('line', { x1: 150, y1: 20, x2: 150, y2: 80, class: 'sch-line' }),
      s('rect', { x: 110, y: 80, width: 80, height: 80, class: 'sch-line', fill: 'none', 'stroke-width': 3 }),
      label(200, 124, 'a', fmt(v.a, 'm')),
    ))),
};

const commonNotes = [
  verifyNote('Şerit ve levha formülleri ile tipik özdirençler Topraklamalar Yönetmeliği’ndeki yaklaşık bağıntılardır; tasarımda zemin özdirenci ölçülmeli (Wenner yöntemi) ve güncel yönetmelik kontrol edilmelidir.'),
  'Toprak özdirenci nem ve sıcaklıkla büyük ölçüde değişir; kuru ve donmuş toprakta katlarca artar. Hesap homojen toprak varsayar.',
];

export default {
  id: 'distribution/grounding',
  title: 'Topraklama direnci',
  render(container) {
    container.append(calculatorView({
      title: 'Topraklama direnci',
      intro: 'Çubuk, şerit ve levha topraklayıcıların yaklaşık yayılma direnci.',
      modes: [
        {
          id: 'rod',
          label: 'Çubuk',
          build: () => calculatorPanel({
            fields: [
              rhoField,
              { key: 'len', label: 'Çubuk boyu L', name: 'L', value: '2', units: DISTANCE_UNITS, unit: 'm' },
              { key: 'd', label: 'Çubuk çapı d', name: 'd', value: '20', units: LENGTH_UNITS, unit: 'mm' },
              { key: 'n', label: 'Paralel çubuk sayısı', name: 'n', value: '1', min: 1, max: 100 },
            ],
            compute(v) {
              const r = groundRod({ rho: v.rho, length: v.len, diameter: v.d, count: v.n });
              return {
                results: [
                  { label: 'Tek çubuk direnci (Dwight)', value: formatSI(r.r, 'Ω') },
                  { label: 'Yaklaşık R ≈ ρ/L', value: formatSI(r.approx, 'Ω') },
                  ...(v.n > 1 ? [{ label: `${v.n} paralel çubuk (en iyi durum)`, value: formatSI(r.parallel, 'Ω') }] : []),
                ],
                warnings: v.n > 1 ? ['Paralel çubuklar birbirini etkiler: aralık çubuk boyunun en az 2 katı değilse gerçek direnç R/n’den belirgin şekilde büyüktür.'] : [],
              };
            },
            diagram: (v) => pictures.rod(v),
            diagramTitle: 'Topraklayıcı',
            formulas: [formula(String.raw`R = \frac{\rho}{2\pi L}\left(\ln\frac{8L}{d} - 1\right)\ \approx\ \frac{\rho}{L}`, 'R = ρ/(2πL)·(ln(8L/d) − 1) ≈ ρ/L')],
            notes: ['Dwight formülü, toprak yüzeyinden başlayan ince düşey çubuk içindir.', ...commonNotes],
          }),
        },
        {
          id: 'strip',
          label: 'Şerit',
          build: () => calculatorPanel({
            fields: [rhoField, { key: 'len', label: 'Şerit uzunluğu L', name: 'L', value: '10', units: DISTANCE_UNITS, unit: 'm' }],
            compute(v) {
              const r = groundStrip({ rho: v.rho, length: v.len });
              return { results: [{ label: 'Yaklaşık direnç R ≈ 2ρ/L', value: formatSI(r.r, 'Ω') }] };
            },
            diagram: (v) => pictures.strip(v),
            diagramTitle: 'Topraklayıcı',
            formulas: [formula(String.raw`R \approx \frac{2\rho}{L}`, 'R ≈ 2ρ/L')],
            notes: ['Toprağa yatay gömülü şerit ya da örgülü iletken.', ...commonNotes],
          }),
        },
        {
          id: 'plate',
          label: 'Levha',
          build: () => calculatorPanel({
            fields: [rhoField, { key: 'a', label: 'Kare levha kenarı a', name: 'a', value: '1', units: DISTANCE_UNITS, unit: 'm' }],
            compute(v) {
              const r = groundPlate({ rho: v.rho, side: v.a });
              return { results: [{ label: 'Yaklaşık direnç R ≈ ρ/(4,5a)', value: formatSI(r.r, 'Ω') }] };
            },
            diagram: (v) => pictures.plate(v),
            diagramTitle: 'Topraklayıcı',
            formulas: [formula(String.raw`R \approx \frac{\rho}{4{,}5\,a}`, 'R ≈ ρ/(4,5·a)')],
            notes: ['Üst kenarı toprak yüzeyinden en az 1 m derinde, düşey gömülü levha.', ...commonNotes],
          }),
        },
      ],
    }));
  },
};
