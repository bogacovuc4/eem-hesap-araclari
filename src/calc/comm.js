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
