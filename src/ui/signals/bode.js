import { el } from '../dom.js';
import { calculatorView, numberField } from '../form.js';
import { formula } from '../formula.js';
import { formatSI, formatNumber } from '../../calc/units.js';
import { bodeAnalysis, parseList } from '../../calc/signals.js';
import { textField, selectField, outputCard, codeLayout, wideCard, notesCard } from '../codes/common.js';
import { lineChart } from '../chart.js';

const hz = (x) => formatSI(10 ** x, 'Hz', 2);

function panel() {
  const k = numberField({ key: 'k', label: 'Kazanç K (doğrusal)', name: 'K', value: '100', constraint: 'any', hint: 'DC kazancı; dB ise 10^(dB/20) girin' });
  const zeros = textField({ label: 'Sıfırlar (Hz)', value: '', placeholder: 'ör. 50; 2000', hint: 'Köşe frekansları; noktalı virgül ya da boşlukla ayırın', param: 'z' });
  const poles = textField({ label: 'Kutuplar (Hz)', value: '10; 100; 1000', placeholder: 'ör. 10; 100; 1000', param: 'p' });
  const integ = selectField({
    label: 'Başlangıçtaki kutup (integratör) sayısı',
    options: [0, 1, 2, 3].map((n) => ({ value: String(n), text: n === 0 ? 'Yok (tip 0)' : `${n} (tip ${n})` })),
    value: '0',
    param: 'i',
  });
  const output = outputCard();
  const charts = el('div', { class: 'chart-pair' });
  const tfBox = el('div', { class: 'formula' });

  function update() {
    const kv = k.read();
    let sys;
    try {
      if (kv.error) throw new RangeError(kv.error);
      sys = { k: kv.value, zeros: parseList(zeros.value), poles: parseList(poles.value), integrators: Number(integ.value) };
      zeros.setInvalid(false);
      poles.setInvalid(false);
      const b = bodeAnalysis(sys);
      const stable = b.phaseMargin !== null && b.phaseMargin > 0 && (b.gainMargin === null || b.gainMargin > 0);
      output.show({
        rows: [
          { label: 'Faz payı (PM)', value: b.phaseMargin !== null ? `${formatNumber(b.phaseMargin, 4)}°` : '— (0 dB kesişimi yok)' },
          { label: 'Kazanç payı (GM)', value: b.gainMargin !== null ? `${formatNumber(b.gainMargin, 4)} dB` : '∞ (faz −180°’ye ulaşmıyor)' },
          { label: 'Kazanç kesişim frekansı', value: b.gainCrossover !== null ? formatSI(b.gainCrossover, 'Hz') : '—' },
          { label: 'Faz kesişim frekansı (−180°)', value: b.phaseCrossover !== null ? formatSI(b.phaseCrossover, 'Hz') : '—' },
          { label: 'DC kazancı', value: Number.isFinite(b.dcGainDb) ? `${formatNumber(b.dcGainDb, 4)} dB` : '∞ (integratör var)' },
          { label: 'Kapalı çevrim (birim geri besleme)', value: b.phaseMargin === null ? 'belirsiz' : stable ? 'kararlı' : 'kararsız' },
        ],
        warnings: b.phaseMargin !== null && b.phaseMargin > 0 && b.phaseMargin < 30 ? ['Faz payı 30°’den küçük: kapalı çevrim yanıtta büyük aşım ve salınım beklenir (tasarımda genellikle 45–60° hedeflenir).'] : [],
      });
      const x = b.points.map((p) => Math.log10(p.f));
      const refs = [];
      if (b.gainCrossover) refs.push({ x: Math.log10(b.gainCrossover), label: 'ωgc' });
      if (b.phaseCrossover) refs.push({ x: Math.log10(b.phaseCrossover), label: 'ωpc' });
      charts.replaceChildren(
        lineChart({
          title: 'Genlik |H(jω)|',
          points: b.points.map((p, i) => ({ x: x[i], y: p.mag })),
          xLabel: 'Frekans (Hz, logaritmik)',
          yLabel: 'Genlik (dB)',
          xFormat: hz,
          yFormat: (y, precise) => `${formatNumber(y, precise ? 4 : 3)}`,
          refs,
          yMinFixed: Math.max(-200, Math.min(...b.points.map((p) => p.mag))),
        }),
        lineChart({
          title: 'Faz ∠H(jω)',
          points: b.points.map((p, i) => ({ x: x[i], y: p.phase })),
          xLabel: 'Frekans (Hz, logaritmik)',
          yLabel: 'Faz (°)',
          xFormat: hz,
          yFormat: (y, precise) => `${formatNumber(y, precise ? 4 : 3)}°`,
          refs,
          yMinFixed: Math.min(-180, ...b.points.map((p) => p.phase)),
        }),
      );
      const num = sys.zeros.map((z) => String.raw`\left(1+\frac{jf}{${z}}\right)`).join('') || '1';
      const den = [
        sys.integrators ? String.raw`(jf)^{${sys.integrators}}` : '',
        ...sys.poles.map((p) => String.raw`\left(1+\frac{jf}{${p}}\right)`),
      ].join('') || '1';
      tfBox.replaceChildren(formula(String.raw`H(jf) = ${sys.k}\,\frac{${num}}{${den}}`, `H(jf) = ${sys.k} · Π(1 + jf/z) / Π(1 + jf/p)`));
    } catch (err) {
      if (!(err instanceof RangeError)) throw err;
      output.show({ errors: [err.message] });
      charts.replaceChildren();
    }
  }

  k.onChange(update);
  zeros.onChange(update);
  poles.onChange(update);
  integ.onChange(update);
  update();

  return codeLayout({
    visual: charts,
    visualTitle: 'Bode diyagramı',
    inputs: [k.element, zeros.element, poles.element, integ.element],
    output,
    extra: [
      wideCard('Transfer fonksiyonu', tfBox),
      notesCard([
        'Gerçek, sol yarı düzlem kutup ve sıfırlar (minimum faz) varsayılır; çizim asimptot değil tam (gerçek) eğridir.',
        'Faz ve kazanç payı açık çevrim fonksiyonundan hesaplanır; kararlılık yorumu birim negatif geri beslemeli kapalı çevrim içindir.',
        'Faz payı > 0 ve kazanç payı > 0 ise (minimum faz sistemde) kapalı çevrim kararlıdır.',
        'Karmaşık eşlenik kutup çiftleri bu sürümde desteklenmez; ikinci derece sistem için “İkinci derece sistem” sayfasını kullanın.',
      ]),
    ],
  });
}

export default {
  id: 'signals/bode',
  title: 'Bode diyagramı',
  render(container) {
    container.append(calculatorView({
      title: 'Bode diyagramı',
      intro: 'Kutup ve sıfırlardan genlik ve faz eğrileri, kazanç ve faz payı.',
      modes: [{ id: 'bode', label: 'Bode', build: panel }],
    }));
  },
};
