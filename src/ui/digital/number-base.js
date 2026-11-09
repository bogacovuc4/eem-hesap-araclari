import { el } from '../dom.js';
import { calculatorView } from '../form.js';
import { BASES, parseInteger, convertInteger } from '../../calc/digital.js';
import { textField, selectField, outputCard, codeLayout, notesCard } from '../codes/common.js';

/** Bit ızgarası: en anlamlı bit solda, satırda 16 bit, 4'lü gruplar, bit numaraları. */
function bitGrid(bits) {
  const width = bits.length;
  const rows = [];
  for (let start = 0; start < width; start += 16) {
    const chunk = bits.slice(start, start + 16);
    const cells = [...chunk].map((b, i) => {
      const index = width - 1 - (start + i);
      return el('div', { class: `bit ${b === '1' ? 'bit-on' : 'bit-off'}${index % 4 === 0 ? ' bit-nibble-end' : ''}`, title: `bit ${index}` },
        el('span', { class: 'bit-value' }, b),
        el('span', { class: 'bit-index' }, String(index)));
    });
    rows.push(el('div', { class: 'bit-row' }, ...cells));
  }
  return el('div', { class: 'bit-grid', role: 'img', 'aria-label': `${width} bitlik desen: ${bits}` }, ...rows);
}

function panel() {
  const base = selectField({
    label: 'Girilen sayının tabanı',
    options: Object.entries(BASES).map(([b, name]) => ({ value: b, text: `${name} (${b})` })),
    value: '10',
    param: 'base',
  });
  const width = selectField({
    label: 'Bit genişliği',
    options: [8, 16, 32, 64].map((w) => ({ value: String(w), text: `${w} bit` })),
    value: '8',
    param: 'w',
  });
  const input = textField({
    label: 'Sayı',
    value: '-42',
    placeholder: 'ör. 255, 0xFF, 1010 1010',
    hint: 'Onluk tabanda negatif sayı girilebilir (ikinin tümleyeni gösterilir). Boşluk ve _ yok sayılır.',
    param: 'n',
  });
  const output = outputCard();
  const visual = el('div', { class: 'bit-box' });

  function update() {
    try {
      const value = parseInteger(input.value, Number(base.value));
      const r = convertInteger({ value, width: Number(width.value) });
      input.setInvalid(false);
      visual.replaceChildren(bitGrid(r.bits));
      output.show({
        rows: [
          { label: 'İkili (2)', value: r.bin },
          { label: 'Sekizli (8)', value: r.oct },
          { label: 'Onluk, işaretsiz', value: r.unsigned.toString() },
          { label: 'Onluk, işaretli (ikinin tümleyeni)', value: r.signed.toString() },
          { label: 'Onaltılı (16)', value: `0x${r.hex}` },
          { label: 'Anlamlı bit sayısı', value: String(r.bitLength) },
          { label: '1 olan bit sayısı', value: String(r.ones) },
        ],
      });
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      input.setInvalid(true, err.message);
      visual.replaceChildren();
      output.show({ errors: [err.message] });
    }
  }

  base.onChange(update);
  width.onChange(update);
  input.onChange(update);
  update();

  return codeLayout({
    visual,
    visualTitle: 'Bit deseni',
    inputs: [input.element, base.element, width.element],
    output,
    extra: [notesCard([
      'İşaretli değer ikinin tümleyeni gösterimiyle yorumlanır: en anlamlı bit 1 ise sayı negatiftir (8 bitte 0x80 = −128).',
      'Negatif onluk sayı girildiğinde, seçilen bit genişliğindeki ikinin tümleyeni bit deseni gösterilir (−1 → 8 bitte 1111 1111).',
      '0b, 0o ve 0x önekleri kabul edilir. 64 bite kadar tam sayılar BigInt ile kesin olarak hesaplanır.',
    ])],
  });
}

export default {
  id: 'digital/number-base',
  title: 'Sayı tabanı dönüştürücü',
  render(container) {
    container.append(calculatorView({
      title: 'Sayı tabanı dönüştürücü',
      intro: 'İkili, sekizli, onluk ve onaltılı tabanlar arasında dönüşüm; işaretli sayılar için ikinin tümleyeni.',
      modes: [{ id: 'convert', label: 'Dönüştür', build: panel }],
    }));
  },
};
