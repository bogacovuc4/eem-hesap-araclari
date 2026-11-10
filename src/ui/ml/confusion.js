import { el } from '../dom.js';
import { calculatorView, calculatorPanel } from '../form.js';
import { formula } from '../formula.js';
import { formatNumber } from '../../calc/units.js';
import { confusionMetrics } from '../../calc/ml.js';

const pct = (v) => (v === null ? '— (tanımsız)' : `%${formatNumber(v * 100, 4)}`);

function matrix(v) {
  const cell = (cls, name, value, hint) => el('td', { class: `cm-cell ${cls}`, title: hint },
    el('span', { class: 'cm-name' }, name),
    el('span', { class: 'cm-val' }, Number.isFinite(value) ? String(value) : '?'));
  return el('table', { class: 'cm', 'aria-label': 'Karışıklık matrisi' },
    el('thead', {},
      el('tr', {}, el('th', { class: 'cm-corner', rowspan: 2 }, 'Gerçek \\ Tahmin'), el('th', { colspan: 2 }, 'Tahmin')),
      el('tr', {}, el('th', {}, 'Pozitif'), el('th', {}, 'Negatif'))),
    el('tbody', {},
      el('tr', {}, el('th', {}, 'Pozitif'),
        cell('cm-good', 'TP', v.tp, 'Doğru pozitif: pozitif ve pozitif tahmin edildi'),
        cell('cm-bad', 'FN', v.fn, 'Yanlış negatif (II. tür hata): pozitifti, negatif tahmin edildi')),
      el('tr', {}, el('th', {}, 'Negatif'),
        cell('cm-bad', 'FP', v.fp, 'Yanlış pozitif (I. tür hata): negatifti, pozitif tahmin edildi'),
        cell('cm-good', 'TN', v.tn, 'Doğru negatif'))));
}

export default {
  id: 'ml/confusion',
  title: 'Karışıklık matrisi ve metrikler',
  render(container) {
    container.append(calculatorView({
      title: 'Karışıklık matrisi ve sınıflandırma metrikleri',
      intro: 'İkili sınıflandırıcının TP, FN, FP, TN sayılarından doğruluk, kesinlik, duyarlılık, F1 ve MCC.',
      modes: [{
        id: 'binary',
        label: 'İkili sınıflandırma',
        build: () => calculatorPanel({
          fields: [
            { key: 'tp', label: 'Doğru pozitif TP', name: 'TP', value: '40', constraint: 'nonnegative' },
            { key: 'fn', label: 'Yanlış negatif FN', name: 'FN', value: '10', constraint: 'nonnegative' },
            { key: 'fp', label: 'Yanlış pozitif FP', name: 'FP', value: '5', constraint: 'nonnegative' },
            { key: 'tn', label: 'Doğru negatif TN', name: 'TN', value: '45', constraint: 'nonnegative' },
          ],
          compute(v) {
            const m = confusionMetrics(v);
            const warnings = [];
            if (m.prevalence < 0.2 || m.prevalence > 0.8) warnings.push(`Sınıflar dengesiz (pozitif oranı ${pct(m.prevalence)}): doğruluk yanıltıcı olabilir; F1, MCC ya da dengeli doğruluğa bakın.`);
            return {
              results: [
                { label: 'F1 skoru', value: m.f1 === null ? '—' : formatNumber(m.f1, 4) },
                { label: 'Doğruluk (accuracy)', value: pct(m.accuracy) },
                { label: 'Kesinlik (precision)', value: pct(m.precision) },
                { label: 'Duyarlılık (recall, TPR)', value: pct(m.recall) },
                { label: 'Özgüllük (specificity, TNR)', value: pct(m.specificity) },
                { label: 'Yanlış pozitif oranı (FPR)', value: pct(m.fpr) },
                { label: 'Negatif kestirim değeri (NPV)', value: pct(m.npv) },
                { label: 'Dengeli doğruluk', value: pct(m.balancedAccuracy) },
                { label: 'Matthews katsayısı (MCC)', value: m.mcc === null ? '— (tanımsız)' : formatNumber(m.mcc, 4) },
                { label: 'Örnek sayısı / pozitif oranı', value: `${m.n} / ${pct(m.prevalence)}` },
              ],
              warnings,
            };
          },
          diagram: (v) => matrix(v),
          diagramTitle: 'Karışıklık matrisi',
          formulas: [
            formula(String.raw`P = \frac{TP}{TP+FP},\quad R = \frac{TP}{TP+FN},\quad F_1 = \frac{2PR}{P+R} = \frac{2TP}{2TP+FP+FN}`,
              'P = TP/(TP+FP),  R = TP/(TP+FN),  F1 = 2PR/(P+R)'),
            formula(String.raw`MCC = \frac{TP\cdot TN - FP\cdot FN}{\sqrt{(TP+FP)(TP+FN)(TN+FP)(TN+FN)}}`,
              'MCC = (TP·TN − FP·FN) / √((TP+FP)(TP+FN)(TN+FP)(TN+FN))'),
          ],
          notes: [
            'Kesinlik: “pozitif dediklerimin ne kadarı gerçekten pozitif?” Duyarlılık: “gerçek pozitiflerin ne kadarını yakaladım?”',
            'Hastalık taraması gibi kaçırmanın pahalı olduğu durumlarda duyarlılık, spam filtresi gibi yanlış alarmın pahalı olduğu durumlarda kesinlik öne çıkar.',
            'MCC −1 ile +1 arasındadır; 0 rastgele tahmine karşılık gelir. Dengesiz veri kümelerinde doğruluktan daha güvenilirdir.',
          ],
        }),
      }],
    }));
  },
};
