// Haberleşme: genlik (AM) ve frekans (FM) modülasyonu.
import { assert } from './validate.js';
import { simpson } from './math.js';

/** n. mertebeden birinci tür Bessel fonksiyonu: Jn(x) = (1/π)∫₀^π cos(nτ − x·sin τ) dτ */
export function besselJn(n, x) {
  assert(Number.isInteger(n) && n >= 0, 'Mertebe negatif olmayan tam sayı olmalı.');
  const steps = Math.max(400, 40 * Math.ceil(Math.abs(x) + n));
  return simpson((t) => Math.cos(n * t - x * Math.sin(t)), 0, Math.PI, steps) / Math.PI;
}

/**
 * Çift yan bantlı, taşıyıcılı AM (DSB-FC), tek ton modülasyon.
 *   Pt = Pc·(1 + m²/2), yan bant gücü = Pc·m²/2 (her biri Pc·m²/4), verim η = m²/(2 + m²), B = 2fm
 */
export function amModulation({ pc, m, fc, fm }) {
  assert(pc > 0, 'Taşıyıcı gücü sıfırdan büyük olmalı.');
  assert(m >= 0, 'Modülasyon indeksi negatif olamaz.');
  assert(fc > 0 && fm > 0, 'Frekanslar sıfırdan büyük olmalı.');
  assert(fm < fc, 'Mesaj frekansı taşıyıcı frekansından küçük olmalı.');
  const sideband = (pc * m ** 2) / 2;
  return {
    total: pc + sideband,
    sideband,
    eachSideband: sideband / 2,
    efficiency: m ** 2 / (2 + m ** 2),
    bandwidth: 2 * fm,
    lower: fc - fm,
    upper: fc + fm,
    overmodulated: m > 1,
    // Spektrum çizgileri: taşıyıcı genliği 1'e göre yan bant genlikleri m/2
    spectrum: [
      { f: fc - fm, amp: m / 2 },
      { f: fc, amp: 1 },
      { f: fc + fm, amp: m / 2 },
    ],
  };
}

/**
 * Tek ton FM: β = Δf/fm, Carson bant genişliği B ≈ 2(Δf + fm).
 * Anlamlı yan bantlar: |Jn(β)| ≥ eşik (varsayılan %1).
 */
export function fmModulation({ deviation, fm, fc = null, threshold = 0.01 }) {
  assert(deviation >= 0, 'Frekans sapması negatif olamaz.');
  assert(fm > 0, 'Mesaj frekansı sıfırdan büyük olmalı.');
  const beta = deviation / fm;
  const nMax = Math.ceil(beta + 10);
  const lines = [];
  for (let n = 0; n <= nMax; n += 1) lines.push({ n, j: besselJn(n, beta) });
  const significant = lines.filter((l) => Math.abs(l.j) >= threshold);
  const nSig = significant.length ? Math.max(...significant.map((l) => l.n)) : 0;
  return {
    beta,
    carson: 2 * (deviation + fm),
    sidebandPairs: nSig,
    bandwidth1pct: 2 * nSig * fm,
    lines: lines.filter((l) => l.n <= Math.max(nSig, 1)),
    carrierPower: lines[0].j ** 2, // toplam güce oranla
    narrowband: beta < 0.3,
    fc,
  };
}

// ---------------------------------------------------------------------------
// Kanal kapasitesi ve bit hata oranı
// ---------------------------------------------------------------------------

/** Tamamlayıcı hata fonksiyonu erfc(x) (Numerical Recipes, göreli hata < 1,2×10⁻⁷). */
export function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418
    + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587
    + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

/** Gauss Q fonksiyonu Q(x) = ½·erfc(x/√2). */
export const qFunc = (x) => 0.5 * erfc(x / Math.SQRT2);

/** Shannon–Hartley: C = B·log2(1 + SNR). SNR doğrusal. */
export function shannonCapacity({ b, snr }) {
  assert(b > 0, 'Bant genişliği sıfırdan büyük olmalı.');
  assert(snr >= 0, 'SNR negatif olamaz.');
  const c = b * Math.log2(1 + snr);
  return { c, spectralEff: c / b, snrDb: 10 * Math.log10(snr) };
}

/** Gürültüsüz kanalda Nyquist en büyük bit hızı: R = 2B·log2(M). */
export function nyquistRate({ b, m }) {
  assert(b > 0 && m >= 2, 'B > 0 ve M ≥ 2 olmalı.');
  return 2 * b * Math.log2(m);
}

/**
 * AWGN kanalda bit hata olasılığı (Eb/N0 doğrusal).
 *   bpsk/qpsk: Q(√(2Eb/N0)); bfsk (eş fazlı): Q(√(Eb/N0));
 *   dbpsk: ½e^(−Eb/N0); ncfsk (eş fazsız FSK): ½e^(−Eb/2N0)
 */
export function bitErrorRate(scheme, ebn0) {
  assert(ebn0 >= 0, 'Eb/N0 negatif olamaz.');
  switch (scheme) {
    case 'bpsk':
    case 'qpsk': return qFunc(Math.sqrt(2 * ebn0));
    case 'bfsk': return qFunc(Math.sqrt(ebn0));
    case 'dbpsk': return 0.5 * Math.exp(-ebn0);
    case 'ncfsk': return 0.5 * Math.exp(-ebn0 / 2);
    default: throw new RangeError(`Bilinmeyen modülasyon: ${scheme}`);
  }
}
