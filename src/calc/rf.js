import { ETA0 } from './constants.js';
import { assert } from './validate.js';

// ---------------------------------------------------------------------------
// Mikroşerit hat — Hammerstad & Jensen (1980), "Accurate Models for Microstrip
// Computer-Aided Design", IEEE MTT-S. Sıfır iletken kalınlığı, statik (quasi-TEM).
// ---------------------------------------------------------------------------

/** Hammerstad-Jensen formüllerinin geçerlilik aralığı (W/h ve εr). */
export const MICROSTRIP_LIMITS = Object.freeze({ uMin: 0.01, uMax: 100, erMax: 128 });

/** Havadaki (εr = 1) hattın empedansı, u = W/h. */
function z0Air(u) {
  const f = 6 + (2 * Math.PI - 6) * Math.exp(-((30.666 / u) ** 0.7528));
  return (ETA0 / (2 * Math.PI)) * Math.log(f / u + Math.sqrt(1 + (2 / u) ** 2));
}

/** Etkin dielektrik sabiti, u = W/h. */
function effectivePermittivity(u, er) {
  const a = 1
    + Math.log((u ** 4 + (u / 52) ** 2) / (u ** 4 + 0.432)) / 49
    + Math.log(1 + (u / 18.1) ** 3) / 18.7;
  const b = 0.564 * ((er - 0.9) / (er + 3)) ** 0.053;
  return (er + 1) / 2 + ((er - 1) / 2) * (1 + 10 / u) ** (-a * b);
}

/**
 * Mikroşerit hat analizi: W, h (aynı birimde ya da metre), εr → Z0, εeff.
 * @returns {{ z0: number, eeff: number, u: number, z0Air: number }}
 */
export function microstripAnalysis({ w, h, er }) {
  assert(w > 0, 'Şerit genişliği W sıfırdan büyük olmalı.');
  assert(h > 0, 'Alt tabaka kalınlığı h sıfırdan büyük olmalı.');
  assert(er >= 1, 'εr en az 1 olmalı.');
  const u = w / h;
  const eeff = effectivePermittivity(u, er);
  const za = z0Air(u);
  return { z0: za / Math.sqrt(eeff), eeff, u, z0Air: za };
}

/**
 * Wheeler/Hammerstad kapalı-form sentez tahmini (Pozar, Microwave Engineering, denk. 3.197).
 * Hızlı ama analiz formülüyle birebir tutarlı değildir; yalnızca karşılaştırma için.
 */
export function microstripWidthEstimate({ z0, er }) {
  assert(z0 > 0, 'Z0 sıfırdan büyük olmalı.');
  assert(er >= 1, 'εr en az 1 olmalı.');
  const A = (z0 / 60) * Math.sqrt((er + 1) / 2) + ((er - 1) / (er + 1)) * (0.23 + 0.11 / er);
  const narrow = (8 * Math.exp(A)) / (Math.exp(2 * A) - 2);
  if (narrow < 2) return narrow;
  const B = (377 * Math.PI) / (2 * z0 * Math.sqrt(er));
  return (2 / Math.PI) * (
    B - 1 - Math.log(2 * B - 1)
    + ((er - 1) / (2 * er)) * (Math.log(B - 1) + 0.39 - 0.61 / er)
  );
}

/**
 * Mikroşerit hat sentezi: Z0, h, εr → W.
 * Hammerstad-Jensen analizini sayısal olarak (logaritmik ikiye bölme) tersine çevirir;
 * böylece bulunan W, analiz formülüne geri konunca Z0'ı tam olarak verir.
 * @returns {{ w: number, u: number, eeff: number, uEstimate: number }}
 */
export function microstripSynthesis({ z0, h, er }) {
  assert(z0 > 0, 'Z0 sıfırdan büyük olmalı.');
  assert(h > 0, 'Alt tabaka kalınlığı h sıfırdan büyük olmalı.');
  assert(er >= 1, 'εr en az 1 olmalı.');

  // Z0, u arttıkça monoton azalır. Arama aralığı geçerlilik aralığından geniş tutulur,
  // aralık dışı sonuç arayüzde uyarıyla gösterilir.
  let lo = Math.log(1e-4);
  let hi = Math.log(1e4);
  const zAt = (logU) => microstripAnalysis({ w: Math.exp(logU), h: 1, er }).z0;
  assert(z0 <= zAt(lo) && z0 >= zAt(hi), 'Bu Z0 değeri bu alt tabakada gerçeklenemez (W/h 10⁻⁴…10⁴ aralığının dışında).');

  for (let i = 0; i < 100; i += 1) {
    const mid = (lo + hi) / 2;
    if (zAt(mid) > z0) lo = mid;
    else hi = mid;
  }
  const u = Math.exp((lo + hi) / 2);
  return {
    w: u * h,
    u,
    eeff: microstripAnalysis({ w: u, h: 1, er }).eeff,
    uEstimate: microstripWidthEstimate({ z0, er }),
  };
}
