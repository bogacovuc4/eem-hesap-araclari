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

// ---------------------------------------------------------------------------
// Düzgün düzlem dalga
// ---------------------------------------------------------------------------
const csqrt = ({ re, im }) => {
  const r = Math.hypot(re, im);
  const a = Math.sqrt((r + re) / 2);
  const b = Math.sign(im || 1) * Math.sqrt(Math.max(0, (r - re) / 2));
  return { re: a, im: b };
};
const cmulx = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const cdivx = (a, b) => { const d = b.re ** 2 + b.im ** 2; return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }; };

/**
 * Kayıplı ortamda düzlem dalga: γ = √(jωμ(σ + jωε)) = α + jβ, η = √(jωμ / (σ + jωε)).
 * Dönüş: α (Np/m), β (rad/m), λ, vp, η (karmaşık), kayıp tanjantı, deri derinliği δ = 1/α.
 */
export function planeWave({ f, sigma = 0, epsR = 1, muR = 1 }) {
  assert(f > 0, 'Frekans sıfırdan büyük olmalı.');
  assert(sigma >= 0 && epsR >= 1 && muR >= 1, 'σ ≥ 0, εr ≥ 1, μr ≥ 1 olmalı.');
  const w = 2 * Math.PI * f;
  const jwmu = { re: 0, im: w * MU0 * muR };
  const y = { re: sigma, im: w * EPS0 * epsR };
  const gamma = csqrt(cmulx(jwmu, y));
  const eta = csqrt(cdivx(jwmu, y));
  const alpha = gamma.re;
  const beta = gamma.im;
  return {
    alpha, beta,
    alphaDb: 8.685889638 * alpha,
    lambda: (2 * Math.PI) / beta,
    vp: w / beta,
    eta,
    etaMag: Math.hypot(eta.re, eta.im),
    etaDeg: (Math.atan2(eta.im, eta.re) * 180) / Math.PI,
    lossTangent: sigma / (w * EPS0 * epsR),
    delta: alpha > 0 ? 1 / alpha : Infinity,
  };
}

/** Kayıpsız iki ortam arasında dik geliş: Γ = (η2 − η1)/(η2 + η1), τ = 1 + Γ. */
export function normalIncidence({ epsR1 = 1, muR1 = 1, epsR2, muR2 = 1 }) {
  assert(epsR1 >= 1 && epsR2 >= 1 && muR1 >= 1 && muR2 >= 1, 'εr ve μr en az 1 olmalı.');
  const eta0 = Math.sqrt(MU0 / EPS0);
  const eta1 = eta0 * Math.sqrt(muR1 / epsR1);
  const eta2 = eta0 * Math.sqrt(muR2 / epsR2);
  const g = (eta2 - eta1) / (eta2 + eta1);
  const tau = 1 + g;
  return {
    eta1, eta2, gamma: g, tau,
    reflected: g * g,
    transmitted: 1 - g * g,
    swr: (1 + Math.abs(g)) / (1 - Math.abs(g)),
    n1: Math.sqrt(epsR1 * muR1),
    n2: Math.sqrt(epsR2 * muR2),
  };
}
