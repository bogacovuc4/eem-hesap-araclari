import { el } from '../dom.js';
import { calculatorView, numberField, verifyNote } from '../form.js';
import { INDUCTANCE_UNITS, formatSI } from '../../calc/units.js';
import {
  decodeInductorCode, encodeInductorCode, encodeColorBands, colorByKey, INDUCTOR_TOLERANCES,
} from '../../calc/codes.js';
import { textField, outputCard, codeLayout, notesCard } from './common.js';
import { smdChip, bandedComponent, visualFigure } from './visuals.js';
import { colorDecodePanel } from './colorcode.js';

const UH = 1e-6;

const notes = [
  'Bobin kodlarında taban birim mikrohenridir (µH). Renk kodu dirençle aynı şekilde okunur, sonuç µH çıkar (kahverengi-siyah-siyah = 10 µH).',
  'Yazılı kod: 101 = 10 × 10¹ µH = 100 µH. R ondalık virgüldür (4R7 = 4,7 µH, R47 = 0,47 µH); N ise nanohenri için ondalık virgüldür (3N3 = 3,3 nH).',
  'Sondaki harf toleransı gösterir: J ±%5, K ±%10, M ±%20.',
  verifyNote('Askerî standartta (MIL) ilk bant geniş gümüş, ondalık nokta için altın bant kullanılır; bu gösterim desteklenmez.'),
  verifyNote('Bobin renk kodunda tolerans renkleri dirençle aynı varsayıldı; bazı üreticiler siyahı ±%20 için kullanır.'),
];

const colorCfg = {
  kind: 'inductor',
  unit: 'H',
  scale: UH,
  units: INDUCTANCE_UNITS,
  bandCounts: [4, 5],
  defaultCount: 4,
  defaults: {
    4: ['brown', 'black', 'black', 'silver'],
    5: ['brown', 'black', 'black', 'black', 'brown'],
  },
  notes,
};

function decodeTextPanel() {
  const code = textField({ label: 'Bobin üzerindeki kod', value: '4R7', placeholder: 'ör. 101, 4R7, 3N3, 100K' });
  const output = outputCard();
  const visual = el('div', { class: 'component-row' });

  function update() {
    visual.replaceChildren(visualFigure(smdChip(code.value.trim().toUpperCase(), { kind: 'inductor', title: 'SMD bobin' })));
    try {
      const l = decodeInductorCode(code.value);
      code.setInvalid(false);
      output.show({
        rows: [
          { label: 'Endüktans', value: formatSI(l.uH * UH, 'H') },
          { label: 'Tolerans', value: l.tolerance ? `${l.tolerance.text} (${l.tolerance.letter})` : 'Belirtilmemiş' },
          { label: 'Kod biçimi', value: l.format },
        ],
      });
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      code.setInvalid(true, err.message);
      output.show({ errors: [err.message] });
    }
  }
  code.onChange(update);
  update();
  return codeLayout({ visual, visualTitle: 'SMD bobin', inputs: [code.element], output, extra: [notesCard(notes)] });
}

function encodePanel() {
  const value = numberField({ key: 'l', label: 'Endüktans', name: 'Endüktans', value: '4.7', units: INDUCTANCE_UNITS, unit: 'µH' });
  const output = outputCard();
  const visual = el('div', { class: 'component-row' });

  function update() {
    const { value: l, error } = value.read();
    if (error) {
      visual.replaceChildren();
      output.show({ errors: [error] });
      return;
    }
    const uH = Number((l / UH).toPrecision(12));
    const text = encodeInductorCode(uH);
    let bands = null;
    try {
      bands = [...encodeColorBands(uH, 2), 'silver'];
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
    }
    visual.replaceChildren(...[
      text && visualFigure(smdChip(text, { kind: 'inductor', title: 'Yazılı kod' }), 'Yazılı kod'),
      bands && visualFigure(bandedComponent(bands, { kind: 'inductor', title: 'Renk kodu' }), 'Renk kodu (±%10)'),
    ].filter(Boolean));
    output.show({
      rows: [
        { label: 'Endüktans', value: formatSI(l, 'H') },
        { label: 'Yazılı kod', value: text ?? '— (2 anlamlı basamağa sığmıyor)' },
        { label: 'Renk kodu (4 bant)', value: bands ? bands.map((k) => colorByKey(k).name).join(' – ') : '— (gösterilemiyor)' },
      ],
    });
  }
  value.onChange(update);
  update();
  return codeLayout({ visual, visualTitle: 'Olası işaretlemeler', inputs: [value.element], output, extra: [notesCard(notes)] });
}

export default {
  id: 'codes/inductor',
  title: 'Bobin kodu',
  render(container) {
    container.append(calculatorView({
      title: 'Bobin kodu',
      intro: `Renk bantlı ve yazılı (SMD) bobin kodları. Tolerans harfleri: ${Object.entries(INDUCTOR_TOLERANCES).map(([k, v]) => `${k} ${v}`).join(', ')}.`,
      modes: [
        { id: 'color', label: 'Renk kodu', build: () => colorDecodePanel(colorCfg) },
        { id: 'text', label: 'Yazılı kod', build: decodeTextPanel },
        { id: 'encode', label: 'Değerden koda', build: encodePanel },
      ],
    }));
  },
};
