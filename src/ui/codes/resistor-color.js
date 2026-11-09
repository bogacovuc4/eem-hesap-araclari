import { calculatorView } from '../form.js';
import { RESISTANCE_UNITS } from '../../calc/units.js';
import { colorDecodePanel, colorEncodePanel } from './colorcode.js';

const cfg = {
  kind: 'resistor',
  unit: 'Ω',
  scale: 1,
  units: RESISTANCE_UNITS,
  bandCounts: [3, 4, 5, 6],
  defaultCount: 4,
  defaults: {
    3: ['brown', 'black', 'orange'],
    4: ['yellow', 'violet', 'red', 'gold'],
    5: ['brown', 'black', 'black', 'red', 'brown'],
    6: ['brown', 'black', 'black', 'red', 'brown', 'brown'],
  },
  encodeDefault: { value: '4.7', unit: 'kΩ' },
};

const notes = [
  '4 bant: 2 rakam + çarpan + tolerans (genellikle E24, ±%5). 5 bant: 3 rakam + çarpan + tolerans (genellikle E96, ±%1). 6 bant: 5 banda sıcaklık katsayısı (TCR) eklenir.',
  'Değer = (rakamlar) × çarpan. Altın çarpan ×0,1, gümüş ×0,01 demektir (10 Ω altı değerler).',
  'Tek siyah bant 0 Ω köprü (jumper) direncini gösterir.',
];

export default {
  id: 'codes/resistor-color',
  title: 'Direnç renk kodu',
  render(container) {
    container.append(calculatorView({
      title: 'Direnç renk kodu',
      intro: 'Renk bantlarından direnç değeri ya da değerden renk bantları.',
      modes: [
        { id: 'decode', label: 'Renkten değere', build: () => colorDecodePanel({ ...cfg, notes }) },
        { id: 'encode', label: 'Değerden renge', build: () => colorEncodePanel({ ...cfg, notes }) },
      ],
    }));
  },
};
