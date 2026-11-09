import { assert } from './validate.js';

// ---------------------------------------------------------------------------
// Standart direnç serileri (IEC 60063)
// ---------------------------------------------------------------------------

export const E_SERIES = Object.freeze({
  E12: [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2],
  E24: [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0,
    3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1],
});

/** Verilen değere eşit ya da ondan büyük ilk standart değer. */
export function standardValueAtLeast(value, series = 'E12') {
  assert(value > 0, 'Değer sıfırdan büyük olmalı.');
  const base = E_SERIES[series];
  assert(base, `Bilinmeyen seri: ${series}`);
  const decade = 10 ** Math.floor(Math.log10(value));
  // toPrecision(3): 3,9·100 gibi çarpımlardaki kayan nokta artıklarını temizler
  const candidates = [...base.map((v) => Number((v * decade).toPrecision(3))), 10 * decade];
  // Kayan nokta hatası için küçük pay (ör. 150 = 1,5·100)
  return candidates.find((c) => c >= value * (1 - 1e-9));
}

// ---------------------------------------------------------------------------
// Gerilim bölücü
// ---------------------------------------------------------------------------

/** Yüksüz gerilim bölücü: Vout = Vin·R2/(R1 + R2) */
export function voltageDivider({ vin, r1, r2 }) {
  assert(r1 > 0 && r2 > 0, 'Dirençler sıfırdan büyük olmalı.');
  const current = vin / (r1 + r2);
  return {
    vout: vin * (r2 / (r1 + r2)),
    current,
    p1: current ** 2 * r1,
    p2: current ** 2 * r2,
    ratio: r2 / (r1 + r2),
  };
}

/** İstenen çıkış için R2: R2 = R1·Vout/(Vin − Vout) */
export function dividerR2({ vin, vout, r1 }) {
  assert(r1 > 0, 'R1 sıfırdan büyük olmalı.');
  assert(vin > 0, 'Giriş gerilimi sıfırdan büyük olmalı.');
  assert(vout > 0 && vout < vin, 'Çıkış gerilimi 0 ile giriş gerilimi arasında olmalı.');
  return r1 * vout / (vin - vout);
}

// ---------------------------------------------------------------------------
// LED seri direnci
// ---------------------------------------------------------------------------

/**
 * R = (Vs − Vf)/I. Standart değer, akımı aşmamak için bir üst E serisi değeridir.
 */
export function ledResistor({ vs, vf, current, series = 'E12' }) {
  assert(current > 0, 'LED akımı sıfırdan büyük olmalı.');
  assert(vf > 0, 'LED ileri gerilimi sıfırdan büyük olmalı.');
  assert(vs > vf, 'Besleme gerilimi LED ileri geriliminden büyük olmalı.');
  const r = (vs - vf) / current;
  const rStandard = standardValueAtLeast(r, series);
  const actualCurrent = (vs - vf) / rStandard;
  return {
    r,
    power: current ** 2 * r,
    rStandard,
    actualCurrent,
    standardPower: actualCurrent ** 2 * rStandard,
    ledPower: vf * actualCurrent,
  };
}

// ---------------------------------------------------------------------------
// Birinci derece filtreler ve seri RLC
// ---------------------------------------------------------------------------

/** RC filtre: fc = 1/(2πRC), τ = RC (alçak ve yüksek geçiren için aynı) */
export function rcCutoff({ r, c }) {
  assert(r > 0 && c > 0, 'R ve C sıfırdan büyük olmalı.');
  const tau = r * c;
  return { fc: 1 / (2 * Math.PI * tau), tau, omega: 1 / tau };
}

/** RL filtre: fc = R/(2πL), τ = L/R */
export function rlCutoff({ r, l }) {
  assert(r > 0 && l > 0, 'R ve L sıfırdan büyük olmalı.');
  const tau = l / r;
  return { fc: 1 / (2 * Math.PI * tau), tau, omega: 1 / tau };
}

/** Seri RLC: f0 = 1/(2π√LC), Q = (1/R)·√(L/C), BW = f0/Q */
export function seriesRlc({ r, l, c }) {
  assert(r > 0 && l > 0 && c > 0, 'R, L ve C sıfırdan büyük olmalı.');
  const omega0 = 1 / Math.sqrt(l * c);
  const f0 = omega0 / (2 * Math.PI);
  const q = Math.sqrt(l / c) / r;
  return {
    f0,
    omega0,
    q,
    bandwidth: f0 / q,
    zeta: 1 / (2 * q),
    characteristicImpedance: Math.sqrt(l / c),
  };
}

// ---------------------------------------------------------------------------
// İdeal op-amp kuvvetlendiriciler
// ---------------------------------------------------------------------------

/** Evirmeyen: G = 1 + Rf/Rg */
export function nonInvertingGain({ rf, rg }) {
  assert(rf >= 0, 'Rf negatif olamaz.');
  assert(rg > 0, 'Rg sıfırdan büyük olmalı.');
  return 1 + rf / rg;
}

/** Eviren: G = −Rf/Rin */
export function invertingGain({ rf, rin }) {
  assert(rf >= 0, 'Rf negatif olamaz.');
  assert(rin > 0, 'Rin sıfırdan büyük olmalı.');
  return -rf / rin;
}

/** Gerilim kazancının dB karşılığı (işaret yok sayılır). Kazanç 0 ise −∞. */
export function gainDb(gain) {
  return 20 * Math.log10(Math.abs(gain));
}

// ---------------------------------------------------------------------------
// Seri / paralel birleştirme
// ---------------------------------------------------------------------------

/**
 * Bileşenleri birleştirir. kind: 'R' | 'L' | 'C', connection: 'series' | 'parallel'.
 * Direnç ve bobin seri bağlıda toplanır; kondansatör paralel bağlıda toplanır.
 * (Bobinler arasında karşılıklı endüktans olmadığı varsayılır.)
 */
export function combineComponents({ kind, connection, values }) {
  assert(['R', 'L', 'C'].includes(kind), 'Bileşen türü R, L ya da C olmalı.');
  assert(connection === 'series' || connection === 'parallel', 'Bağlantı seri ya da paralel olmalı.');
  assert(Array.isArray(values) && values.length >= 1, 'En az bir değer gerekli.');
  values.forEach((v, i) => assert(v > 0 && Number.isFinite(v), `${i + 1}. değer sıfırdan büyük olmalı.`));

  const additive = (kind === 'C') === (connection === 'parallel');
  const total = additive
    ? values.reduce((sum, v) => sum + v, 0)
    : 1 / values.reduce((sum, v) => sum + 1 / v, 0);
  return { total, additive };
}

// ---------------------------------------------------------------------------
// Birinci derece geçici yanıt (basamak girişi)
// ---------------------------------------------------------------------------

/**
 * Genel birinci derece yanıt: x(t) = x∞ + (x0 − x∞)·e^(−t/τ)
 */
export function firstOrderResponse({ initial, final, tau, t }) {
  assert(tau > 0, 'Zaman sabiti sıfırdan büyük olmalı.');
  assert(t >= 0, 'Zaman negatif olamaz.');
  return final + (initial - final) * Math.exp(-t / tau);
}

/** %10 → %90 yükselme süresi: τ·ln 9 ≈ 2,197τ */
export const riseTime = (tau) => tau * Math.log(9);

/**
 * RC devresi, t = 0'da Vs basamağı uygulanır. Kondansatör başlangıç gerilimi v0.
 * vC(t) = Vs + (v0 − Vs)·e^(−t/RC), i(t) = (Vs − vC)/R
 */
export function rcTransient({ r, c, vs, v0 = 0, t }) {
  assert(r > 0 && c > 0, 'R ve C sıfırdan büyük olmalı.');
  const tau = r * c;
  const vc = firstOrderResponse({ initial: v0, final: vs, tau, t });
  const progress = vs === v0 ? 1 : (vc - v0) / (vs - v0);
  return { tau, vc, i: (vs - vc) / r, vr: vs - vc, progress, riseTime: riseTime(tau), settle5tau: 5 * tau };
}

/**
 * RL devresi, t = 0'da Vs basamağı uygulanır. Bobin başlangıç akımı i0.
 * iL(t) = Vs/R + (i0 − Vs/R)·e^(−tR/L), vL(t) = Vs − R·iL
 */
export function rlTransient({ r, l, vs, i0 = 0, t }) {
  assert(r > 0 && l > 0, 'R ve L sıfırdan büyük olmalı.');
  const tau = l / r;
  const iFinal = vs / r;
  const il = firstOrderResponse({ initial: i0, final: iFinal, tau, t });
  const progress = iFinal === i0 ? 1 : (il - i0) / (iFinal - i0);
  return { tau, il, iFinal, vl: vs - r * il, vr: r * il, progress, riseTime: riseTime(tau), settle5tau: 5 * tau };
}
