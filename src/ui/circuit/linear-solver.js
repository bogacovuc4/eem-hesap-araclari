import { el } from '../dom.js';
import { calculatorView } from '../form.js';
import { formula } from '../formula.js';
import { formatNumber } from '../../calc/units.js';
import { linearSolve, parseMatrix } from '../../calc/circuit3.js';
import { parseList } from '../../calc/signals.js';
import { textField, selectField, outputCard, codeLayout, wideCard, notesCard } from '../codes/common.js';

const KINDS = {
  node: { sym: 'V', unit: 'V', name: 'Düğüm gerilimleri', aName: 'iletkenlik matrisi G (S)', bName: 'akım kaynakları vektörü I (A)', eq: 'G·V = I' },
  mesh: { sym: 'I', unit: 'A', name: 'Çevre akımları', aName: 'direnç matrisi R (Ω)', bName: 'gerilim kaynakları vektörü V (V)', eq: 'R·I = V' },
  plain: { sym: 'x', unit: '', name: 'Genel', aName: 'katsayı matrisi A', bName: 'sağ taraf b', eq: 'A·x = b' },
};

const tex = (x) => String(Number(x.toPrecision(6))).replace('.', '{,}');

function panel() {
  const kind = selectField({
    label: 'Analiz türü',
    options: [{ value: 'node', text: 'Düğüm gerilimi (G·V = I)' }, { value: 'mesh', text: 'Çevre akımı (R·I = V)' }, { value: 'plain', text: 'Genel (A·x = b)' }],
    value: 'node',
    param: 'k',
  });
  const matrix = textField({
    label: 'Katsayı matrisi (satırlar ; ile)',
    value: '0.3 -0.1 0; -0.1 0.35 -0.05; 0 -0.05 0.25',
    placeholder: 'ör. 2 -1; -1 3',
    hint: 'Her satırdaki katsayıları boşlukla, satırları noktalı virgülle ayırın. Ondalık için nokta ya da virgül.',
    param: 'a',
  });
  const rhs = textField({ label: 'Sağ taraf', value: '1; 0; 0.5', placeholder: 'ör. 1; 0', hint: 'Her denklem için bir değer', param: 'b' });
  const output = outputCard('Çözüm');
  const system = el('div');

  function update() {
    const k = KINDS[kind.value];
    try {
      const A = parseMatrix(matrix.value);
      matrix.setInvalid(false);
      const b = parseList(rhs.value.replace(/−/g, '-'));
      if (b.length !== A.length) throw new RangeError(`Sağ tarafta ${A.length} değer olmalı (şu an ${b.length}).`);
      rhs.setInvalid(false);
      const { x, det } = linearSolve(A, b);
      output.show({
        rows: [
          ...x.map((v, i) => ({ label: `${k.sym}${i + 1}`, value: `${formatNumber(v, 6)} ${k.unit}`.trim() })),
          { label: 'Determinant', value: formatNumber(det, 6) },
        ],
      });
      const mat = A.map((r) => r.map(tex).join(' & ')).join(String.raw`\\`);
      const vars = x.map((_, i) => `${k.sym}_{${i + 1}}`).join(String.raw`\\`);
      const rh = b.map(tex).join(String.raw`\\`);
      system.replaceChildren(formula(String.raw`\begin{bmatrix}${mat}\end{bmatrix}\begin{bmatrix}${vars}\end{bmatrix}=\begin{bmatrix}${rh}\end{bmatrix}`, `${k.eq}`));
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      output.show({ errors: [err.message] });
      system.replaceChildren();
    }
  }
  for (const f of [kind, matrix, rhs]) f.onChange(update);
  update();

  return codeLayout({
    visual: system,
    visualTitle: 'Denklem sistemi',
    inputs: [kind.element, matrix.element, rhs.element],
    output,
    extra: [
      wideCard('Nasıl kurulur?', el('ul', { class: 'notes' },
        el('li', {}, 'Düğüm analizi: G matrisinin köşegeni, düğüme bağlı tüm iletkenliklerin (1/R) toplamı; köşegen dışı, iki düğüm arasındaki iletkenliğin eksi işaretlisi. Sağ taraf, düğüme giren kaynak akımları.'),
        el('li', {}, 'Çevre analizi: R matrisinin köşegeni, çevredeki dirençlerin toplamı; köşegen dışı, iki çevrenin ortak direncinin eksi işaretlisi. Sağ taraf, çevre yönündeki kaynak gerilimlerinin toplamı.'),
        el('li', {}, 'Örnek (varsayılan): 3 düğümlü direnç devresi; G siemens, I amper cinsinden.'))),
      notesCard([
        'Çözüm kısmi pivotlamalı Gauss eliminasyonuyla bulunur; determinant sıfıra çok yakınsa sistemin tek çözümü yoktur.',
        'Bağımlı kaynak varsa matris simetrik olmayabilir; yöntem yine çalışır. En çok 10 denklem.',
      ]),
    ],
  });
}

export default {
  id: 'circuit/linear-solver',
  title: 'Düğüm / çevre denklem çözücü',
  render(container) {
    container.append(calculatorView({
      title: 'Düğüm ve çevre analizi denklem çözücü',
      intro: 'G·V = I ya da R·I = V biçimindeki doğrusal denklem sistemini çözer (en çok 10 bilinmeyen).',
      modes: [{ id: 'solve', label: 'Çöz', build: panel }],
    }));
  },
};
