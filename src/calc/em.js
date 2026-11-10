// Elektromanyetik alan teorisi: durgun elektrik ve manyetik alan, kapasitans, endüktans.
// Tüm girdiler SI birimindedir. Formüller ideal geometriler içindir (kenar etkisi yok).
import { EPS0, MU0 } from './constants.js';
import { assert } from './validate.js';

const K = 1 / (4 * Math.PI * EPS0); // Coulomb sabiti ≈ 8,988×10⁹ N·m²/C²

/** Noktasal yükün r uzaklığındaki alanı ve potansiyeli; q2 verilirse Coulomb kuvveti. */
export function pointCharge({ q, r, epsR = 1, q2 = null }) {
  assert(r > 0, 'Uzaklık sıfırdan büyük olmalı.');
  assert(epsR >= 1, 'Bağıl geçirgenlik en az 1 olmalı.');
  const k = K / epsR;
  const e = (k * q) / r ** 2;
  const v = (k * q) / r;
  const force = q2 === null ? null : (k * q * q2) / r ** 2;
  return { e, v, force, k };
}

/** Paralel levha kondansatör: C = εA/d. V verilirse yük, alan ve enerji. */
export function parallelPlateCapacitance({ area, d, epsR = 1, v = null }) {
  assert(area > 0 && d > 0, 'Alan ve aralık sıfırdan büyük olmalı.');
  const c = (EPS0 * epsR * area) / d;
  return withVoltage(c, v, v === null ? null : v / d);
}

/** Koaksiyel (silindirik) kondansatör: C = 2πεℓ / ln(b/a). */
export function coaxialCapacitance({ a, b, length, epsR = 1, v = null }) {
  assert(b > a && a > 0, 'Dış yarıçap b, iç yarıçap a’dan büyük olmalı.');
  const perLength = (2 * Math.PI * EPS0 * epsR) / Math.log(b / a);
  return { ...withVoltage(perLength * length, v, null), perLength };
}

/** Küresel kondansatör: C = 4πε·ab/(b−a); b = ∞ için yalıtılmış küre 4πεa. */
export function sphericalCapacitance({ a, b = Infinity, epsR = 1, v = null }) {
  assert(a > 0 && b > a, 'Dış yarıçap b, iç yarıçap a’dan büyük olmalı.');
  const c = Number.isFinite(b)
    ? (4 * Math.PI * EPS0 * epsR * a * b) / (b - a)
    : 4 * Math.PI * EPS0 * epsR * a;
  return withVoltage(c, v, null);
}

function withVoltage(c, v, e) {
  if (v === null) return { c, q: null, energy: null, e: null };
  return { c, q: c * v, energy: 0.5 * c * v * v, e };
}

/**
 * Manyetik akı yoğunluğu B (T) ve alan şiddeti H (A/m).
 * shape: 'wire' (sonsuz düz tel, r uzaklıkta), 'loop' (halka merkezi, R yarıçap),
 *        'solenoid' (uzun ideal solenoid içi), 'toroid' (r ortalama yarıçapta)
 */
export function magneticField({ shape, i, r = null, n = 1, length = null, muR = 1 }) {
  const mu = MU0 * muR;
  let h;
  switch (shape) {
    case 'wire':
      assert(r > 0, 'Uzaklık sıfırdan büyük olmalı.');
      h = i / (2 * Math.PI * r);
      break;
    case 'loop':
      assert(r > 0, 'Halka yarıçapı sıfırdan büyük olmalı.');
      h = (n * i) / (2 * r);
      break;
    case 'solenoid':
      assert(length > 0, 'Solenoid uzunluğu sıfırdan büyük olmalı.');
      h = (n * i) / length;
      break;
    case 'toroid':
      assert(r > 0, 'Ortalama yarıçap sıfırdan büyük olmalı.');
      h = (n * i) / (2 * Math.PI * r);
      break;
    default:
      throw new RangeError(`Bilinmeyen geometri: ${shape}`);
  }
  return { h, b: mu * h };
}

/** Uzun solenoid endüktansı: L = μN²A/ℓ (ℓ ≫ çap varsayımı). */
export function solenoidInductance({ n, diameter, length, muR = 1 }) {
  assert(n > 0 && diameter > 0 && length > 0, 'Sarım, çap ve uzunluk sıfırdan büyük olmalı.');
  const area = (Math.PI * diameter ** 2) / 4;
  return { l: (MU0 * muR * n * n * area) / length, area, ratio: length / diameter };
}

/** Dikdörtgen kesitli toroid: L = μN²h·ln(b/a) / 2π. */
export function toroidInductance({ n, a, b, h, muR = 1 }) {
  assert(b > a && a > 0, 'Dış yarıçap b, iç yarıçap a’dan büyük olmalı.');
  assert(n > 0 && h > 0, 'Sarım ve yükseklik sıfırdan büyük olmalı.');
  return { l: (MU0 * muR * n * n * h * Math.log(b / a)) / (2 * Math.PI) };
}

/** Koaksiyel hattın dış endüktansı: L = μℓ/(2π)·ln(b/a). */
export function coaxialInductance({ a, b, length, muR = 1 }) {
  assert(b > a && a > 0, 'Dış yarıçap b, iç yarıçap a’dan büyük olmalı.');
  const perLength = ((MU0 * muR) / (2 * Math.PI)) * Math.log(b / a);
  return { l: perLength * length, perLength };
}

/** Bobinde depolanan enerji ½LI². */
export function inductorEnergy(l, i) {
  return 0.5 * l * i * i;
}
