// Makine öğrenmesi: sınıflandırma metrikleri, doğrusal regresyon, aktivasyon fonksiyonları.
import { assert } from './validate.js';

/**
 * İkili sınıflandırma karışıklık matrisinden metrikler.
 * tp: doğru pozitif, fn: yanlış negatif, fp: yanlış pozitif, tn: doğru negatif.
 * Tanımsız oranlar (0/0) null döner.
 */
export function confusionMetrics({ tp, fn, fp, tn }) {
  for (const [name, v] of [['TP', tp], ['FN', fn], ['FP', fp], ['TN', tn]]) {
    assert(Number.isInteger(v) && v >= 0, `${name} sıfır ya da pozitif tam sayı olmalı.`);
  }
  const n = tp + fn + fp + tn;
  assert(n > 0, 'Toplam örnek sayısı sıfır olamaz.');
  const ratio = (a, b) => (b > 0 ? a / b : null);
  const precision = ratio(tp, tp + fp);
  const recall = ratio(tp, tp + fn);
  const specificity = ratio(tn, tn + fp);
  const mccDen = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  return {
    n,
    accuracy: (tp + tn) / n,
    precision,
    recall,
    specificity,
    npv: ratio(tn, tn + fn),
    f1: ratio(2 * tp, 2 * tp + fp + fn),
    balancedAccuracy: recall !== null && specificity !== null ? (recall + specificity) / 2 : null,
    mcc: mccDen > 0 ? (tp * tn - fp * fn) / mccDen : null,
    prevalence: (tp + fn) / n,
    fpr: specificity !== null ? 1 - specificity : null,
  };
}

/**
 * "x, y" çiftleri: her satır ya da ; ile ayrılmış parça bir nokta.
 * Ayırıcı: virgül+boşluk, boşluk, sekme. Ondalık için nokta ya da (boşluklu biçimde) virgül.
 */
export function parsePairs(text) {
  const rows = String(text).split(/[;\n]+/).map((r) => r.trim()).filter(Boolean);
  assert(rows.length > 0, 'Veri girin: her satıra bir “x, y” çifti.');
  assert(rows.length <= 1000, 'En fazla 1000 nokta girilebilir.');
  return rows.map((row) => {
    // Boşluk varsa ayırıcı boşluktur (yanındaki virgül de ayırıcı sayılır): "1.5, 2" · "1,5 2,5"
    // Boşluk yoksa ayırıcı virgüldür: "1.5,2"
    const parts = /\s/.test(row) ? row.split(/[\s,]*\s[\s,]*/) : row.split(',');
    assert(parts.length === 2, `“${row}” okunamadı: “x, y” biçiminde yazın.`);
    const [x, y] = parts.map((p) => Number(p.replace(',', '.')));
    assert(Number.isFinite(x) && Number.isFinite(y), `“${row}” sayı değil.`);
    return { x, y };
  });
}

/** En küçük kareler doğrusu y = a + b·x ve uyum ölçütleri. */
export function linearRegression(points) {
  assert(points.length >= 2, 'En az iki nokta gerekli.');
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const p of points) {
    sxx += (p.x - mx) ** 2;
    sxy += (p.x - mx) * (p.y - my);
    syy += (p.y - my) ** 2;
  }
  assert(sxx > 0, 'Tüm x değerleri aynı: doğru bulunamaz.');
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let sse = 0;
  for (const p of points) sse += (p.y - (intercept + slope * p.x)) ** 2;
  return {
    n,
    slope,
    intercept,
    r: syy > 0 ? sxy / Math.sqrt(sxx * syy) : null,
    r2: syy > 0 ? 1 - sse / syy : null,
    rmse: Math.sqrt(sse / n),
    mae: points.reduce((s, p) => s + Math.abs(p.y - (intercept + slope * p.x)), 0) / n,
    sse,
    predict: (x) => intercept + slope * x,
  };
}

/** Aktivasyon fonksiyonları: f(x) ve türevi f′(x). */
export const ACTIVATIONS = {
  sigmoid: {
    f: (x) => 1 / (1 + Math.exp(-x)),
    df: (x) => {
      const s = 1 / (1 + Math.exp(-x));
      return s * (1 - s);
    },
    range: '(0, 1)',
  },
  tanh: {
    f: (x) => Math.tanh(x),
    df: (x) => 1 - Math.tanh(x) ** 2,
    range: '(−1, 1)',
  },
  relu: {
    f: (x) => Math.max(0, x),
    df: (x) => (x > 0 ? 1 : 0),
    range: '[0, ∞)',
  },
  leaky: {
    f: (x, a = 0.01) => (x > 0 ? x : a * x),
    df: (x, a = 0.01) => (x > 0 ? 1 : a),
    range: '(−∞, ∞)',
  },
  softplus: {
    // Büyük x'te taşmayı önleyen kararlı biçim
    f: (x) => Math.max(x, 0) + Math.log1p(Math.exp(-Math.abs(x))),
    df: (x) => 1 / (1 + Math.exp(-x)),
    range: '(0, ∞)',
  },
};

export function activation(name, x, alpha) {
  const a = ACTIVATIONS[name];
  assert(a, 'Bilinmeyen aktivasyon fonksiyonu.');
  assert(Number.isFinite(x), 'x bir sayı olmalı.');
  return { y: a.f(x, alpha), dy: a.df(x, alpha), range: a.range };
}
