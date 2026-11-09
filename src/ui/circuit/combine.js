import { el } from '../dom.js';
import { calculatorView, numberField } from '../form.js';
import { formula } from '../formula.js';
import { RESISTANCE_UNITS, CAPACITANCE_UNITS, INDUCTANCE_UNITS, formatSI } from '../../calc/units.js';
import { combineComponents } from '../../calc/circuit.js';
import { selectField, outputCard, codeLayout, wideCard, notesCard } from '../codes/common.js';
import { svg, figure, twoTerminal, wire, dot, terminal, label, fmt } from '../schematic.js';
import { getParam, setParams } from '../urlstate.js';

const KINDS = {
  R: { name: 'Direnç', symbol: 'R', unit: 'Ω', units: RESISTANCE_UNITS, unitDefault: 'Ω', drawing: 'resistor', defaults: ['100', '220', '330'] },
  C: { name: 'Kondansatör', symbol: 'C', unit: 'F', units: CAPACITANCE_UNITS, unitDefault: 'µF', drawing: 'capacitor', defaults: ['10', '22', '4.7'] },
  L: { name: 'Bobin', symbol: 'L', unit: 'H', units: INDUCTANCE_UNITS, unitDefault: 'mH', drawing: 'inductor', defaults: ['1', '2.2', '4.7'] },
};
const MIN_ROWS = 2;
const MAX_ROWS = 8;

/** Seri: yatay zincir; paralel: iki ray arasında dikey basamaklar. */
function combineDiagram(kind, connection, values, total) {
  const k = KINDS[kind];
  const n = values.length;
  const totalText = Number.isFinite(total) ? fmt(total, k.unit) : '?';

  if (connection === 'series') {
    const step = 96;
    const width = 60 + n * step + 60;
    const y = 70;
    const parts = values.map((v, i) => {
      const x1 = 40 + i * step;
      return [
        twoTerminal(k.drawing, [x1, y], [x1 + step, y]),
        label(x1 + step / 2, y - 30, `${k.symbol}${i + 1}`, fmt(v, k.unit), { anchor: 'middle' }),
      ];
    }).flat();
    return figure(svg([0, 10, width, 110], `${n} adet seri bağlı ${k.name.toLocaleLowerCase('tr')}`,
      wire([20, y], [40, y]),
      wire([40 + n * step, y], [60 + n * step, y]),
      terminal(20, y), terminal(60 + n * step, y),
      ...parts,
      label(width / 2, y + 36, `Toplam ${k.symbol}`, totalText, { anchor: 'middle' }),
    ));
  }

  const step = 92;
  const width = 80 + n * step;
  const top = 40;
  const bottom = 150;
  const parts = values.map((v, i) => {
    const x = 70 + i * step;
    return [
      twoTerminal(k.drawing, [x, top], [x, bottom]),
      dot(x, top), dot(x, bottom),
      label(x + 16, (top + bottom) / 2 - 4, `${k.symbol}${i + 1}`, fmt(v, k.unit)),
    ];
  }).flat();
  return figure(svg([0, 0, Math.max(width + 40, 260), 205], `${n} adet paralel bağlı ${k.name.toLocaleLowerCase('tr')}`,
    wire([20, top], [70 + (n - 1) * step, top]),
    wire([20, bottom], [70 + (n - 1) * step, bottom]),
    terminal(20, top), terminal(20, bottom),
    ...parts,
    label(20, bottom + 32, `Toplam ${k.symbol}`, totalText),
  ));
}

function panel() {
  const kindSelect = selectField({
    label: 'Bileşen türü',
    options: Object.entries(KINDS).map(([key, k]) => ({ value: key, text: k.name })),
    value: 'R',
    param: 'type',
  });
  const connSelect = selectField({
    label: 'Bağlantı',
    options: [{ value: 'series', text: 'Seri' }, { value: 'parallel', text: 'Paralel' }],
    value: 'series',
    param: 'conn',
  });

  const rowsBox = el('div', { class: 'combine-rows' });
  const addButton = el('button', { type: 'button', class: 'btn-secondary' }, '+ Değer ekle');
  const output = outputCard();
  const visual = el('div', { class: 'schematic' });

  const urlCount = Number(getParam('n'));
  let count = Number.isInteger(urlCount) && urlCount >= MIN_ROWS && urlCount <= MAX_ROWS ? urlCount : 3;
  let fields = [];

  function buildRows() {
    const k = KINDS[kindSelect.value];
    // Tür değişince eski alan değerleri korunur, birimler yeni türün varsayılanına döner.
    const previous = fields.map((f) => f.element.querySelector('input').value);
    fields = Array.from({ length: count }, (_, i) => {
      const field = numberField({
        key: `v${i + 1}`,
        label: `${k.symbol}${i + 1}`,
        name: `${k.symbol}${i + 1}`,
        value: previous[i] ?? k.defaults[i] ?? k.defaults[0],
        units: k.units,
        unit: k.unitDefault,
      });
      field.onChange(update);
      const remove = el('button', {
        type: 'button', class: 'btn-icon', 'aria-label': `${k.symbol}${i + 1} değerini kaldır`, title: 'Kaldır',
        disabled: count <= MIN_ROWS,
      }, '×');
      remove.addEventListener('click', () => {
        // Bu satırı çıkar, sonrakileri (değer + birim) bir yukarı kaydır; URL de aynı sırayla güncellenir.
        const rows = fields.map((f) => ({
          value: f.element.querySelector('input').value,
          unit: f.element.querySelector('select')?.value ?? null,
        }));
        rows.splice(i, 1);
        count -= 1;
        const params = { n: count, [`v${count + 1}`]: null, [`v${count + 1}_u`]: null };
        rows.forEach((row, j) => { params[`v${j + 1}`] = row.value; params[`v${j + 1}_u`] = row.unit; });
        setParams(params);
        fields = [];
        buildRows();
      });
      field.element.querySelector('.field-row').append(remove);
      return field;
    });
    rowsBox.replaceChildren(...fields.map((f) => f.element));
    addButton.disabled = count >= MAX_ROWS;
    update();
  }

  function update() {
    const k = KINDS[kindSelect.value];
    const values = [];
    const errors = [];
    for (const f of fields) {
      const { value, error } = f.read();
      values.push(value);
      if (error) errors.push(error);
    }
    let total = NaN;
    if (errors.length) {
      output.show({ errors });
    } else {
      const r = combineComponents({ kind: kindSelect.value, connection: connSelect.value, values });
      total = r.total;
      const rule = r.additive ? 'değerler toplanır' : 'terslerinin toplamının tersi alınır';
      output.show({
        rows: [
          { label: `Toplam ${k.name.toLocaleLowerCase('tr')}`, value: formatSI(total, k.unit) },
          { label: 'Kural', value: rule },
          { label: 'En küçük / en büyük değer', value: `${formatSI(Math.min(...values), k.unit, 3)} / ${formatSI(Math.max(...values), k.unit, 3)}` },
        ],
        warnings: !r.additive && total > Math.min(...values) * (1 + 1e-12) ? ['Beklenmeyen sonuç: paralel dirençte toplam en küçük değerden küçük olmalı.'] : [],
      });
    }
    visual.replaceChildren(combineDiagram(kindSelect.value, connSelect.value, values, total));
  }

  addButton.addEventListener('click', () => {
    if (count >= MAX_ROWS) return;
    count += 1;
    setParams({ n: count });
    buildRows();
  });
  kindSelect.onChange(buildRows);
  connSelect.onChange(update);
  buildRows();

  return codeLayout({
    visual,
    visualTitle: 'Devre şeması',
    inputs: [kindSelect.element, connSelect.element, rowsBox, addButton],
    output,
    extra: [
      wideCard('Formül',
        formula(String.raw`\text{Seri: } R = \sum R_i,\ \ L = \sum L_i,\ \ \frac{1}{C} = \sum \frac{1}{C_i}`, 'Seri: R = ΣRi, L = ΣLi, 1/C = Σ(1/Ci)'),
        formula(String.raw`\text{Paralel: } \frac{1}{R} = \sum \frac{1}{R_i},\ \ \frac{1}{L} = \sum \frac{1}{L_i},\ \ C = \sum C_i`, 'Paralel: 1/R = Σ(1/Ri), 1/L = Σ(1/Li), C = ΣCi')),
      notesCard([
        'Kondansatör, dirence göre ters davranır: paralel bağlıda toplanır, seri bağlıda tersleri toplanır.',
        'Bobinler arasında manyetik kuplaj (karşılıklı endüktans) olmadığı varsayılır.',
        'Gerçek bileşenlerin toleransı ve parazitik etkileri (ESR, ESL) hesaba katılmaz.',
        `En az ${MIN_ROWS}, en çok ${MAX_ROWS} değer girilebilir.`,
      ]),
    ],
  });
}

export default {
  id: 'circuit/combine',
  title: 'Seri / paralel birleştirici',
  render(container) {
    container.append(calculatorView({
      title: 'Seri / paralel birleştirici',
      intro: 'Direnç, kondansatör ya da bobinlerin seri veya paralel bağlantısında toplam değer.',
      modes: [{ id: 'combine', label: 'Birleştir', build: panel }],
    }));
  },
};
