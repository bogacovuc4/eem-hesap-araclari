import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatNumber } from '../../calc/units.js';
import { mismatchFromVswr, mismatchFromGamma, mismatchFromReturnLoss } from '../../calc/rf.js';

function results(m) {
  return [
    { label: 'VSWR', value: `${formatNumber(m.vswr)} : 1` },
    { label: 'Yansıma katsayısı |Γ|', value: formatNumber(m.gamma) },
    { label: 'Geri dönüş kaybı RL', value: Number.isFinite(m.returnLoss) ? `${formatNumber(m.returnLoss)} dB` : '∞ dB' },
    { label: 'Uyumsuzluk kaybı', value: `${formatNumber(m.mismatchLoss)} dB` },
    { label: 'Yansıyan güç', value: `%${formatNumber(m.reflectedPower * 100, 3)}` },
    { label: 'İletilen güç', value: `%${formatNumber((1 - m.reflectedPower) * 100, 4)}` },
  ];
}

const formulas = () => [
  formula(String.raw`|\Gamma|=\frac{\text{VSWR}-1}{\text{VSWR}+1},\qquad \text{RL}=-20\log_{10}|\Gamma|,\qquad \text{ML}=-10\log_{10}\!\left(1-|\Gamma|^2\right)`,
    '|Γ| = (VSWR − 1)/(VSWR + 1),  RL = −20·log10|Γ|,  ML = −10·log10(1 − |Γ|²)'),
];

const notes = [
  'Geri dönüş kaybı pozitif dB olarak verilir (RL = 10 dB ⇔ S11 = −10 dB).',
  'Kayıpsız hat varsayılır; kayıplı hatta ölçülen VSWR, yük ucundakinden daha iyi görünür.',
  'Uyumsuzluk kaybı, kaynağın uyumlu olduğu (yalnızca yük tarafında yansıma olan) durum içindir.',
];

const panel = (field, convert) => () => calculatorPanel({
  fields: [field],
  compute: (v) => ({ results: results(convert(v[field.key])) }),
  formulas: formulas(),
  notes,
});

export default {
  id: 'rf/vswr',
  title: 'VSWR ↔ |Γ| ↔ geri dönüş kaybı',
  render(container) {
    container.append(calculatorView({
      title: 'VSWR ↔ |Γ| ↔ geri dönüş kaybı',
      intro: 'Herhangi birini girin, diğer uyumsuzluk büyüklüklerini görün.',
      modes: [
        { id: 'vswr', label: 'VSWR', build: panel({ key: 'vswr', label: 'VSWR', name: 'VSWR', value: '2', min: 1 }, mismatchFromVswr) },
        { id: 'gamma', label: '|Γ|', build: panel({ key: 'gamma', label: 'Yansıma katsayısı |Γ|', name: '|Γ|', value: '0.2', constraint: 'nonnegative', max: 0.999999 }, mismatchFromGamma) },
        { id: 'rl', label: 'RL (dB)', build: panel({ key: 'rl', label: 'Geri dönüş kaybı RL (dB)', name: 'RL', value: '10' }, mismatchFromReturnLoss) },
      ],
    }));
  },
};
