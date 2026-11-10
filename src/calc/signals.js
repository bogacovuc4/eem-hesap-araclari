// Sinyaller ve sistemler, kontrol: Fourier serisi, Bode diyagramı, ikinci derece sistem.
import { assert } from './validate.js';
import { cx, cmul, cdiv, cabs } from './math.js';

// ---------------------------------------------------------------------------
// Fourier serisi (tek fonksiyon, sıfır ortalamalı periyodik dalgalar)
// ---------------------------------------------------------------------------

/**
 * Sinüs katsayıları bn (genlik A için). Dalgalar t = 0'da tek simetrili tanımlıdır:
 *   kare:   bn = 4A/(nπ), yalnız tek n
 *   üçgen:  bn = 8A/(n²π²)·(−1)^((n−1)/2), yalnız tek n
 *   testere: bn = 2A/(nπ)·(−1)^(n+1)
 */
export function fourierCoefficient(wave, n, amplitude = 1) {
  assert(Number.isInteger(n) && n >= 1, 'Harmonik numarası pozitif tam sayı olmalı.');
  const A = amplitude;
  switch (wave) {
    case 'square': return n % 2 ? (4 * A) / (n * Math.PI) : 0;
    case 'triangle': return n % 2 ? ((8 * A) / (n * n * Math.PI ** 2)) * (((n - 1) / 2) % 2 ? -1 : 1) : 0;
    case 'sawtooth': return ((2 * A) / (n * Math.PI)) * (n % 2 ? 1 : -1);
    default: throw new RangeError('Dalga kare, üçgen ya da testere olmalı.');
  }
}

/** İdeal dalganın etkin (RMS) değeri */
export function idealRms(wave, amplitude = 1) {
  return wave === 'square' ? amplitude : amplitude / Math.sqrt(3);
}

/** İdeal dalganın t anındaki değeri (periyot T) */
export function idealWave(wave, t, period, amplitude = 1) {
  const x = ((t / period) % 1 + 1) % 1; // 0…1
  switch (wave) {
    case 'square': return x < 0.5 ? amplitude : -amplitude;
    case 'triangle': return amplitude * (x < 0.25 ? 4 * x : x < 0.75 ? 2 - 4 * x : 4 * x - 4);
    case 'sawtooth': return amplitude * (x < 0.5 ? 2 * x : 2 * x - 2);
    default: throw new RangeError('Bilinmeyen dalga.');
  }
}

/**
 * İlk N harmonik (1…N) ile kısmi toplam bilgileri.
 * @returns {{ harmonics: {n, f, b}[], rms, idealRms, thd, partial: (t)=>number }}
 */
export function fourierSeries({ wave, amplitude = 1, f, harmonics }) {
  assert(amplitude > 0, 'Genlik sıfırdan büyük olmalı.');
  assert(f > 0, 'Frekans sıfırdan büyük olmalı.');
  assert(Number.isInteger(harmonics) && harmonics >= 1 && harmonics <= 199, 'Harmonik sayısı 1 ile 199 arasında tam sayı olmalı.');
  const list = [];
  for (let n = 1; n <= harmonics; n += 1) {
    list.push({ n, f: n * f, b: fourierCoefficient(wave, n, amplitude) });
  }
  const nonZero = list.filter((h) => h.b !== 0);
  const rms = Math.sqrt(nonZero.reduce((s, h) => s + h.b ** 2, 0) / 2);
  const b1 = list[0].b;
  const thd = Math.sqrt(nonZero.filter((h) => h.n > 1).reduce((s, h) => s + h.b ** 2, 0)) / Math.abs(b1);
  const w = 2 * Math.PI * f;
  return {
    harmonics: list,
    rms,
    idealRms: idealRms(wave, amplitude),
    thd,
    partial: (t) => nonZero.reduce((s, h) => s + h.b * Math.sin(h.n * w * t), 0),
  };
}

// ---------------------------------------------------------------------------
// Bode diyagramı
// ---------------------------------------------------------------------------

/**
 * H(jω) = K · Π(1 + jf/zᵢ) / [ (jf/1 Hz)^m · Π(1 + jf/pᵢ) ]
 * Köşe frekansları Hz cinsindendir; m başlangıçtaki kutup (integratör) sayısı.
 */
export function transferAt(f, { k, zeros = [], poles = [], integrators = 0 }) {
  let h = cx(k, 0);
  for (const z of zeros) h = cmul(h, cx(1, f / z));
  for (const p of poles) h = cdiv(h, cx(1, f / p));
  for (let i = 0; i < integrators; i += 1) h = cdiv(h, cx(0, f));
  return h;
}

/** Sürekli (sarmalanmamış) faz: her terimin açısı ayrı toplanır */
export function phaseAt(f, { k, zeros = [], poles = [], integrators = 0 }) {
  let deg = k < 0 ? 180 : 0;
  for (const z of zeros) deg += (Math.atan2(f / z, 1) * 180) / Math.PI * Math.sign(z);
  for (const p of poles) deg -= (Math.atan2(f / p, 1) * 180) / Math.PI * Math.sign(p);
  deg -= 90 * integrators;
  return deg;
}

export function magnitudeDbAt(f, sys) {
  return 20 * Math.log10(cabs(transferAt(f, sys)));
}

/** Logaritmik taramada g(f) = 0 noktasını bulur (ilk işaret değişimi + ikiye bölme). */
function findCrossing(g, fMin, fMax, steps = 2000) {
  let prevF = fMin;
  let prev = g(fMin);
  for (let i = 1; i <= steps; i += 1) {
    const f = fMin * (fMax / fMin) ** (i / steps);
    const v = g(f);
    if (prev === 0) return prevF;
    if (Math.sign(v) !== Math.sign(prev)) {
      let lo = Math.log(prevF);
      let hi = Math.log(f);
      for (let j = 0; j < 80; j += 1) {
        const mid = (lo + hi) / 2;
        if (Math.sign(g(Math.exp(mid))) === Math.sign(prev)) lo = mid;
        else hi = mid;
      }
      return Math.exp((lo + hi) / 2);
    }
    prevF = f;
    prev = v;
  }
  return null;
}

/**
 * Bode verileri ve kararlılık payları.
 * @returns {{ points: {f, mag, phase}[], gainCrossover, phaseMargin, phaseCrossover, gainMargin, fMin, fMax }}
 */
export function bodeAnalysis(sys, { points = 300 } = {}) {
  assert(Number.isFinite(sys.k) && sys.k !== 0, 'Kazanç K sıfırdan farklı bir sayı olmalı.');
  for (const v of [...(sys.zeros ?? []), ...(sys.poles ?? [])]) {
    assert(Number.isFinite(v) && v > 0, 'Kutup ve sıfır frekansları sıfırdan büyük olmalı (sol yarı düzlem).');
  }
  assert(Number.isInteger(sys.integrators ?? 0) && (sys.integrators ?? 0) >= 0 && (sys.integrators ?? 0) <= 3, 'İntegratör sayısı 0–3 olmalı.');
  const corners = [...(sys.zeros ?? []), ...(sys.poles ?? [])];
  const lo = corners.length ? Math.min(...corners) : 1;
  const hi = corners.length ? Math.max(...corners) : 1;
  const fMin = 10 ** Math.floor(Math.log10(lo) - 2);
  const fMax = 10 ** Math.ceil(Math.log10(hi) + 2);

  const pts = [];
  for (let i = 0; i <= points; i += 1) {
    const f = fMin * (fMax / fMin) ** (i / points);
    pts.push({ f, mag: magnitudeDbAt(f, sys), phase: phaseAt(f, sys) });
  }
  const gainCrossover = findCrossing((f) => magnitudeDbAt(f, sys), fMin, fMax);
  const phaseCrossover = findCrossing((f) => phaseAt(f, sys) + 180, fMin, fMax);
  return {
    points: pts,
    fMin,
    fMax,
    gainCrossover,
    phaseMargin: gainCrossover === null ? null : 180 + phaseAt(gainCrossover, sys),
    phaseCrossover,
    gainMargin: phaseCrossover === null ? null : -magnitudeDbAt(phaseCrossover, sys),
    dcGainDb: (sys.integrators ?? 0) === 0 ? 20 * Math.log10(Math.abs(sys.k)) : Infinity,
  };
}

/**
 * "10; 100; 1e3", "10 100 1000" ya da "10, 100, 1000" biçimindeki listeyi sayılara çevirir.
 * Ayırıcı: noktalı virgül, boşluk ya da virgülden sonra boşluk. Boşluksuz virgül ondalık kabul edilir (2,5 = 2.5).
 */
export function parseList(text) {
  const raw = String(text ?? '').trim();
  if (raw === '') return [];
  return raw.split(/;|,\s+|\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const v = Number(s.replace(',', '.'));
      assert(Number.isFinite(v), `“${s}” geçerli bir sayı değil.`);
      return v;
    });
}

// ---------------------------------------------------------------------------
// İkinci derece sistem: G(s) = ωn² / (s² + 2ζωn·s + ωn²), birim basamak yanıtı
// ---------------------------------------------------------------------------

export function secondOrderStep(t, { zeta, wn }) {
  if (t <= 0) return 0;
  if (zeta < 1) {
    const wd = wn * Math.sqrt(1 - zeta ** 2);
    const phi = Math.acos(zeta);
    return 1 - (Math.exp(-zeta * wn * t) / Math.sqrt(1 - zeta ** 2)) * Math.sin(wd * t + phi);
  }
  if (zeta === 1) return 1 - Math.exp(-wn * t) * (1 + wn * t);
  const s = Math.sqrt(zeta ** 2 - 1);
  const p1 = wn * (zeta - s);
  const p2 = wn * (zeta + s);
  return 1 - (p2 * Math.exp(-p1 * t) - p1 * Math.exp(-p2 * t)) / (p2 - p1);
}

/**
 * Zaman tanım bölgesi ölçütleri. Aşım ve tepe zamanı analitik, yükselme (%10→%90) ve
 * yerleşme (bant ±%2) süreleri yanıt sayısal taranarak bulunur.
 */
export function secondOrderMetrics({ zeta, wn, band = 0.02 }) {
  assert(zeta >= 0, 'Sönüm oranı ζ negatif olamaz.');
  assert(wn > 0, 'Doğal frekans ωn sıfırdan büyük olmalı.');
  assert(zeta > 0, 'ζ = 0: sönümsüz sistem sürekli salınır, yerleşme olmaz.');
  const under = zeta < 1;
  const wd = under ? wn * Math.sqrt(1 - zeta ** 2) : 0;
  const overshoot = under ? Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta ** 2)) : 0;
  const tPeak = under ? Math.PI / wd : null;

  // Tarama süresi: yerleşmeyi kesin kapsayacak kadar uzun
  const tEnd = Math.max(12 / (zeta * wn), 12 / wn) * (zeta > 1 ? 2 * zeta : 1);
  const N = 20000;
  const dt = tEnd / N;
  let t10 = null;
  let t90 = null;
  let lastOut = 0;
  for (let i = 0; i <= N; i += 1) {
    const t = i * dt;
    const y = secondOrderStep(t, { zeta, wn });
    if (t10 === null && y >= 0.1) t10 = t;
    if (t90 === null && y >= 0.9) t90 = t;
    if (Math.abs(y - 1) > band) lastOut = t;
  }
  const poleRe = -zeta * wn;
  return {
    overshoot,
    tPeak,
    riseTime: t10 !== null && t90 !== null ? t90 - t10 : null,
    settlingTime: lastOut + dt,
    settlingApprox: 4 / (zeta * wn),
    wd,
    poles: under
      ? [{ re: poleRe, im: wd }, { re: poleRe, im: -wd }]
      : [{ re: -wn * (zeta - Math.sqrt(zeta ** 2 - 1)), im: 0 }, { re: -wn * (zeta + Math.sqrt(zeta ** 2 - 1)), im: 0 }],
    type: zeta < 1 ? 'underdamped' : zeta === 1 ? 'critical' : 'overdamped',
    tEnd,
  };
}
