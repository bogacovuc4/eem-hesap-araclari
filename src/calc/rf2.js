// İletim hatları, gürültü, anten ve radar hesapları.
import { C0, EPS0, MU0, ETA0 } from './constants.js';
import { assert } from './validate.js';
import { cx, cadd, csub, cmul, cdiv, cabs, cargDeg } from './math.js';

export const T0 = 290; // IEEE standart gürültü sıcaklığı, K
export const BOLTZMANN = 1.380649e-23; // J/K (tam, SI 2019)

const fromDb = (db) => 10 ** (db / 10);
const toDb = (x) => 10 * Math.log10(x);

// ---------------------------------------------------------------------------
// Çeyrek dalga empedans dönüştürücü (Pozar, Microwave Engineering, Böl. 2.5 ve 5.4)
// ---------------------------------------------------------------------------

/**
 * Gerçek (dirençsel) yükü Z0'a uyumlar: Z1 = √(Z0·ZL), uzunluk λg/4.
 * gammaMax verilirse kabul edilebilir |Γ| için kesirli bant genişliği (TEM hat):
 *   Δf/f0 = 2 − (4/π)·arccos[ Γm/√(1−Γm²) · 2√(Z0·ZL)/|ZL − Z0| ]
 */
export function quarterWaveTransformer({ z0, zl, f, eeff = 1, gammaMax = null }) {
  assert(z0 > 0 && zl > 0, 'Empedanslar sıfırdan büyük olmalı.');
  assert(f > 0, 'Frekans sıfırdan büyük olmalı.');
  assert(eeff >= 1, 'εeff en az 1 olmalı.');
  const z1 = Math.sqrt(z0 * zl);
  const lambdaG = C0 / (f * Math.sqrt(eeff));
  let bandwidth = null;
  if (gammaMax !== null) {
    assert(gammaMax > 0 && gammaMax < 1, '|Γ|max 0 ile 1 arasında olmalı.');
    if (zl === z0) {
      bandwidth = Infinity;
    } else {
      const arg = (gammaMax / Math.sqrt(1 - gammaMax ** 2)) * (2 * Math.sqrt(z0 * zl)) / Math.abs(zl - z0);
      bandwidth = arg >= 1 ? Infinity : 2 - (4 / Math.PI) * Math.acos(arg);
    }
  }
  return { z1, length: lambdaG / 4, lambdaG, bandwidth, gammaLoad: (zl - z0) / (zl + z0) };
}

// ---------------------------------------------------------------------------
// Kayıpsız hat üzerinde giriş empedansı
// ---------------------------------------------------------------------------

/**
 * Zin = Z0·(ZL + jZ0·tan βl)/(Z0 + jZL·tan βl).  ZL = rl + j·xl, electrical = l/λg.
 */
export function lineInputImpedance({ z0, rl, xl = 0, electrical }) {
  assert(z0 > 0, 'Z0 sıfırdan büyük olmalı.');
  assert(rl >= 0, 'Yük direnci negatif olamaz.');
  assert(electrical >= 0, 'Hat uzunluğu negatif olamaz.');
  const Z0 = cx(z0);
  const ZL = cx(rl, xl);
  const beta = 2 * Math.PI * electrical;
  const t = Math.tan(beta);

  let zin;
  if (!Number.isFinite(t) || Math.abs(t) > 1e15) {
    // βl = π/2 (+ kπ): Zin = Z0² / ZL
    assert(cabs(ZL) > 0, 'Kısa devre yük, çeyrek dalga hatta açık devre görünür (Zin → ∞).');
    zin = cdiv(cx(z0 * z0), ZL);
  } else {
    const jt = cx(0, t);
    const den = cadd(Z0, cmul(jt, ZL));
    assert(cabs(den) > 1e-12 * z0, 'Bu uzunlukta giriş empedansı sonsuz (açık devre görünümü).');
    zin = cmul(Z0, cdiv(cadd(ZL, cmul(jt, Z0)), den));
  }

  const gammaL = cdiv(csub(ZL, Z0), cadd(ZL, Z0));
  const g = cabs(gammaL);
  const gammaIn = cdiv(csub(zin, Z0), cadd(zin, Z0));
  return {
    zin,
    zinMag: cabs(zin),
    zinPhase: cargDeg(zin),
    gammaL,
    gammaLMag: g,
    gammaLPhase: cargDeg(gammaL),
    gammaIn,
    vswr: g >= 1 ? Infinity : (1 + g) / (1 - g),
    returnLoss: g === 0 ? Infinity : -20 * Math.log10(g),
  };
}

// ---------------------------------------------------------------------------
// Koaksiyel hat (TEM, kayıpsız)
// ---------------------------------------------------------------------------

/** D: dış iletkenin iç çapı, d: iç iletken çapı (aynı birimde ya da m). */
export function coaxAnalysis({ outer, inner, er = 1 }) {
  assert(outer > 0 && inner > 0, 'Çaplar sıfırdan büyük olmalı.');
  assert(outer > inner, 'Dış çap (D) iç çaptan (d) büyük olmalı.');
  assert(er >= 1, 'εr en az 1 olmalı.');
  const ln = Math.log(outer / inner);
  const z0 = (ETA0 / (2 * Math.PI * Math.sqrt(er))) * ln;
  const c = (2 * Math.PI * EPS0 * er) / ln;
  const l = (MU0 / (2 * Math.PI)) * ln;
  // TE11 kesim frekansı için yaygın yaklaşım: λc ≈ π·(a + b), a, b yarıçaplar
  const te11 = C0 / (Math.PI * ((outer + inner) / 2) * Math.sqrt(er));
  return { z0, c, l, velocityFactor: 1 / Math.sqrt(er), te11, ratio: outer / inner };
}

/** Hedef Z0 için D/d oranı: D/d = exp(2π√εr·Z0/η0) */
export function coaxRatioForZ0({ z0, er = 1 }) {
  assert(z0 > 0, 'Z0 sıfırdan büyük olmalı.');
  assert(er >= 1, 'εr en az 1 olmalı.');
  return Math.exp((2 * Math.PI * Math.sqrt(er) * z0) / ETA0);
}

// ---------------------------------------------------------------------------
// Deri derinliği
// ---------------------------------------------------------------------------

/** Pozar, Ek F tablosundaki iletkenlikler (S/m, 20 °C). */
export const CONDUCTIVITY = Object.freeze({
  'Gümüş': 6.173e7,
  'Bakır': 5.813e7,
  'Altın': 4.098e7,
  'Alüminyum': 3.816e7,
  'Pirinç': 2.564e7,
});

/**
 * δ = 1/√(π f μ σ), Rs = 1/(σδ). İsteğe bağlı tel çapı (d ≫ δ varsayımıyla) AC/DC direnç.
 */
export function skinDepth({ f, sigma, mur = 1, diameter = null }) {
  assert(f > 0, 'Frekans sıfırdan büyük olmalı.');
  assert(sigma > 0, 'İletkenlik sıfırdan büyük olmalı.');
  assert(mur >= 1, 'μr en az 1 olmalı.');
  const delta = 1 / Math.sqrt(Math.PI * f * MU0 * mur * sigma);
  const rs = 1 / (sigma * delta);
  const out = { delta, rs };
  if (diameter !== null) {
    assert(diameter > 0, 'Tel çapı sıfırdan büyük olmalı.');
    const rDc = 4 / (sigma * Math.PI * diameter ** 2);
    // d ≫ δ için akım yaklaşık δ kalınlığında bir halkada akar
    const rAc = diameter > 4 * delta ? 1 / (sigma * Math.PI * diameter * delta) : rDc;
    Object.assign(out, { rDc, rAc, ratio: rAc / rDc, validWire: diameter > 4 * delta });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Gürültü
// ---------------------------------------------------------------------------

/** Gürültü faktörü (dB) → eşdeğer gürültü sıcaklığı (K): Te = T0·(F − 1) */
export function noiseFigureToTemp(nfDb) {
  assert(nfDb >= 0, 'Gürültü faktörü negatif olamaz.');
  const f = fromDb(nfDb);
  return { factor: f, te: T0 * (f - 1) };
}

/** Te (K) → NF (dB): F = 1 + Te/T0 */
export function noiseTempToFigure(te) {
  assert(te >= 0, 'Gürültü sıcaklığı negatif olamaz.');
  const f = 1 + te / T0;
  return { factor: f, nf: toDb(f) };
}

/**
 * Kademeli bağlı katlar için Friis gürültü formülü:
 *   F = F1 + (F2 − 1)/G1 + (F3 − 1)/(G1·G2) + …
 * stages: [{ gainDb, nfDb }]
 */
export function cascadeNoise(stages) {
  assert(Array.isArray(stages) && stages.length > 0, 'En az bir kat gerekli.');
  let f = 0;
  let g = 1;
  stages.forEach((st, i) => {
    assert(st.nfDb >= 0, `${i + 1}. katın gürültü faktörü negatif olamaz.`);
    const fi = fromDb(st.nfDb);
    f += i === 0 ? fi : (fi - 1) / g;
    g *= fromDb(st.gainDb);
  });
  return { factor: f, nf: toDb(f), te: T0 * (f - 1), gain: g, gainDb: toDb(g) };
}

/**
 * Termal gürültü gücü ve alıcı duyarlılığı.
 *   N = k·T·B ;  S_min (dBm) = 10·log10(kT0/1 mW) + 10·log10 B + NF + SNR_min
 */
export function thermalNoise({ bandwidth, temperature = T0, nfDb = 0, snrDb = 0 }) {
  assert(bandwidth > 0, 'Bant genişliği sıfırdan büyük olmalı.');
  assert(temperature > 0, 'Sıcaklık sıfırdan büyük olmalı.');
  const noise = BOLTZMANN * temperature * bandwidth;
  const noiseDbm = toDb(noise / 1e-3);
  return { noise, noiseDbm, floorDbm: noiseDbm + nfDb, sensitivityDbm: noiseDbm + nfDb + snrDb };
}

// ---------------------------------------------------------------------------
// Anten temel büyüklükleri
// ---------------------------------------------------------------------------

/**
 * Kazanç ↔ etkin açıklık, dBi ↔ dBd, uzak alan sınırı, yarım dalga dipol.
 * size: antenin en büyük boyutu D (isteğe bağlı).
 */
export function antennaBasics({ f, gainDbi, size = null }) {
  assert(f > 0, 'Frekans sıfırdan büyük olmalı.');
  const lambda = C0 / f;
  const g = fromDb(gainDbi);
  const out = {
    lambda,
    gainLinear: g,
    gainDbd: gainDbi - 2.15,
    effectiveAperture: (g * lambda ** 2) / (4 * Math.PI),
    halfWave: lambda / 2,
  };
  if (size !== null) {
    assert(size > 0, 'Anten boyutu sıfırdan büyük olmalı.');
    // Balanis, Böl. 2.2.4: uzak alan r > 2D²/λ (ayrıca r ≫ D ve r ≫ λ olmalı),
    // reaktif yakın alan r < 0,62·√(D³/λ)
    out.fraunhofer = (2 * size ** 2) / lambda;
    out.reactiveNear = 0.62 * Math.sqrt(size ** 3 / lambda);
  }
  return out;
}

/** Etkin açıklıktan kazanç: G = 4π·Ae/λ² */
export function gainFromAperture({ f, aperture }) {
  assert(f > 0 && aperture > 0, 'Frekans ve açıklık sıfırdan büyük olmalı.');
  const lambda = C0 / f;
  const g = (4 * Math.PI * aperture) / lambda ** 2;
  return { gainLinear: g, gainDbi: toDb(g), lambda };
}

// ---------------------------------------------------------------------------
// Radar menzil denklemi (tek istasyonlu)
// ---------------------------------------------------------------------------

/** Pr = Pt·G²·λ²·σ / ((4π)³·R⁴·L) */
export function radarReceivedPower({ pt, gainDbi, f, rcs, range, lossDb = 0 }) {
  assert(pt > 0, 'Verici gücü sıfırdan büyük olmalı.');
  assert(f > 0 && rcs > 0 && range > 0, 'Frekans, RKA ve menzil sıfırdan büyük olmalı.');
  assert(lossDb >= 0, 'Kayıplar negatif olamaz.');
  const lambda = C0 / f;
  const g = fromDb(gainDbi);
  const pr = (pt * g ** 2 * lambda ** 2 * rcs) / ((4 * Math.PI) ** 3 * range ** 4 * fromDb(lossDb));
  return { pr, prDbm: toDb(pr / 1e-3), lambda };
}

/** Rmax = [Pt·G²·λ²·σ / ((4π)³·Pmin·L)]^(1/4) */
export function radarMaxRange({ pt, gainDbi, f, rcs, pminDbm, lossDb = 0 }) {
  assert(pt > 0, 'Verici gücü sıfırdan büyük olmalı.');
  assert(f > 0 && rcs > 0, 'Frekans ve RKA sıfırdan büyük olmalı.');
  assert(lossDb >= 0, 'Kayıplar negatif olamaz.');
  const lambda = C0 / f;
  const g = fromDb(gainDbi);
  const pmin = 1e-3 * 10 ** (pminDbm / 10);
  return { range: ((pt * g ** 2 * lambda ** 2 * rcs) / ((4 * Math.PI) ** 3 * pmin * fromDb(lossDb))) ** 0.25, lambda };
}
