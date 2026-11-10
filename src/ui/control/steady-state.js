import { calculatorView } from '../form.js';
import { formula } from '../formula.js';
import { formatNumber } from '../../calc/units.js';
import { steadyStateError, parseList } from '../../calc/signals.js';
import { textField, outputCard, codeLayout, wideCard, notesCard } from '../codes/common.js';

const fmt = (x) => (x === Infinity ? '∞' : formatNumber(x, 5));

function panel() {
  const num = textField({ label: 'Pay N(s) katsayıları', value: '100; 200', placeholder: 'ör. 100; 200', hint: 'En yüksek dereceden: 100(s+2) → 100; 200', param: 'n' });
  const den = textField({ label: 'Payda D(s) katsayıları', value: '1; 15; 50; 0', placeholder: 'ör. 1; 15; 50; 0', hint: 's(s+5)(s+10) = s³ + 15s² + 50s → 1; 15; 50; 0', param: 'd' });
  const output = outputCard();
  const tfBox = wideCard('Kapalı çevrim karakteristik denklemi');

  function update() {
    try {
      const n = parseList(num.value.replace(/−/g, '-'));
      const d = parseList(den.value.replace(/−/g, '-'));
      if (!n.length || !d.length) throw new RangeError('Pay ve payda katsayılarını girin.');
      const r = steadyStateError(n, d);
      num.setInvalid(false);
      den.setInvalid(false);
      const warnings = [];
      if (r.stable === false) warnings.push('Kapalı çevrim kararsız (Routh): kararlı hal hatası tanımsızdır, aşağıdaki değerler geçersizdir.');
      if (r.type < 0) warnings.push('G(s)’nin orijinde sıfırı var: basamak girişte bile çıkış sıfıra gider.');
      output.show({
        rows: [
          { label: 'Sistem tipi', value: String(Math.max(0, r.type)) },
          { label: 'Kapalı çevrim kararlılığı', value: r.stable === null ? '—' : r.stable ? 'kararlı' : 'kararsız' },
          { label: 'Konum hata sabiti Kp', value: fmt(r.kp) },
          { label: 'Hız hata sabiti Kv', value: fmt(r.kv) },
          { label: 'İvme hata sabiti Ka', value: fmt(r.ka) },
          { label: 'Birim basamak hatası', value: fmt(r.eStep) },
          { label: 'Birim rampa hatası', value: fmt(r.eRamp) },
          { label: 'Birim parabol hatası', value: fmt(r.eParabola) },
        ],
        warnings,
      });
      const poly = r.charPoly.map((c, k) => {
        const p = r.charPoly.length - 1 - k;
        if (c === 0) return '';
        const coef = Math.abs(c) === 1 && p ? '' : String(Number(Math.abs(c).toPrecision(6))).replace('.', '{,}');
        return `${c < 0 ? '-' : '+'}${coef}${p ? (p === 1 ? 's' : `s^{${p}}`) : ''}`;
      }).join('').replace(/^\+/, '');
      tfBox.replaceChildren(tfBox.firstChild, formula(String.raw`1+G(s)=0\ \Rightarrow\ ${poly}=0`, `D(s) + N(s) = 0`));
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      output.show({ errors: [err.message] });
    }
  }
  num.onChange(update);
  den.onChange(update);
  update();

  return codeLayout({
    visual: formula(String.raw`e_{ss}^{\text{basamak}}=\frac{1}{1+K_p},\quad e_{ss}^{\text{rampa}}=\frac{1}{K_v},\quad e_{ss}^{\text{parabol}}=\frac{1}{K_a}`, 'ess: basamak 1/(1+Kp), rampa 1/Kv, parabol 1/Ka'),
    visualTitle: 'Kararlı hal hatası',
    inputs: [num.element, den.element],
    output,
    extra: [
      tfBox,
      wideCard('Hata sabitleri', formula(String.raw`K_p=\lim_{s\to0}G(s),\qquad K_v=\lim_{s\to0}sG(s),\qquad K_a=\lim_{s\to0}s^2G(s)`, 'Kp = lim G(s), Kv = lim s·G(s), Ka = lim s²·G(s) (s → 0)')),
      notesCard([
        'Birim negatif geri beslemeli sistem: G(s) açık çevrim transfer fonksiyonudur. Geri besleme H(s) ≠ 1 ise önce eşdeğer birim geri beslemeli sisteme dönüştürün.',
        'Sistem tipi, G(s)’nin orijindeki kutup (integratör) sayısıdır. Tip 0: basamakta sonlu hata; tip 1: basamakta sıfır, rampada sonlu; tip 2: parabolde sonlu.',
        'Hata formülleri yalnızca kapalı çevrim kararlıysa geçerlidir; kararlılık Routh–Hurwitz ile denetlenir.',
      ]),
    ],
  });
}

export default {
  id: 'control/steady-state',
  title: 'Kararlı hal hatası',
  render(container) {
    container.append(calculatorView({
      title: 'Kararlı hal hatası ve sistem tipi',
      intro: 'Açık çevrim G(s)’den sistem tipi, Kp, Kv, Ka ve basamak/rampa/parabol girişlerdeki kalıcı hata.',
      modes: [{ id: 'ess', label: 'Hata', build: panel }],
    }));
  },
};
