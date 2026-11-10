// Devre hesapları (ikinci grup): paralel RLC, empedans, AC güç, 555, Wheatstone,
// Thevenin/Norton, yıldız–üçgen, iletken kesiti.
import { assert } from './validate.js';
import { cx, cadd, cdiv, cabs, cargDeg } from './math.js';

const TWO_PI = 2 * Math.PI;

// ---------------------------------------------------------------------------
// Paralel RLC
// ---------------------------------------------------------------------------

/** f0 = 1/(2π√LC), Q = R·√(C/L), BW = f0/Q */
export function parallelRlc({ r, l, c }) {
  assert(r > 0 && l > 0 && c > 0, 'R, L ve C sıfırdan büyük olmalı.');
  const omega0 = 1 / Math.sqrt(l * c);
  const f0 = omega0 / TWO_PI;
  const q = r * Math.sqrt(c / l);
  return { f0, omega0, q, bandwidth: f0 / q, zeta: 1 / (2 * q), zRes: r, characteristic: Math.sqrt(l / c) };
}

// ---------------------------------------------------------------------------
// Empedans: seri ya da paralel R, L, C
// ---------------------------------------------------------------------------

/**
 * Seri: Z = R + j(ωL − 1/ωC); C = 0 → kondansatör yok (kısa devre), L = 0 → bobin yok.
 * Paralel: Y = 1/R + j(ωC − 1/ωL); 0 girilen eleman yok sayılır (açık devre).
 * vrms verilirse akım ve güçler de hesaplanır.
 */
export function impedance({ connection, r = 0, l = 0, c = 0, f, vrms = null }) {
  assert(f > 0, 'Frekans sıfırdan büyük olmalı.');
  assert(r >= 0 && l >= 0 && c >= 0, 'R, L ve C negatif olamaz.');
  const w = TWO_PI * f;
  const xl = w * l;
  const xc = c > 0 ? 1 / (w * c) : Infinity;

  let z;
  if (connection === 'series') {
    const x = xl - (c > 0 ? xc : 0);
    z = cx(r, x);
    // Rezonansta XL − XC kayan nokta artığı bırakır; reaktanslara göre göreli tolerans
    assert(cabs(z) > 1e-9 * Math.max(xl, c > 0 ? xc : 0, Number.MIN_VALUE),
      'Toplam empedans sıfır: tam rezonansta R = 0 olan seri devre kısa devredir.');
  } else if (connection === 'parallel') {
    assert(r > 0 || l > 0 || c > 0, 'Paralel devrede en az bir eleman olmalı.');
    let y = cx(0, 0);
    if (r > 0) y = cadd(y, cx(1 / r, 0));
    if (c > 0) y = cadd(y, cx(0, w * c));
    if (l > 0) y = cadd(y, cx(0, -1 / (w * l)));
    const yScale = Math.max(r > 0 ? 1 / r : 0, c > 0 ? w * c : 0, l > 0 ? 1 / (w * l) : 0);
    assert(cabs(y) > 1e-9 * yScale, 'Toplam admitans sıfır: rezonanstaki kayıpsız paralel LC açık devredir (Z → ∞).');
    z = cdiv(cx(1, 0), y);
  } else {
    throw new RangeError('Bağlantı seri ya da paralel olmalı.');
  }

  const mag = cabs(z);
  const phase = cargDeg(z);
  const out = { z, mag, phase, xl, xc, pf: Math.cos((phase * Math.PI) / 180) };
  if (vrms !== null) {
    assert(vrms > 0, 'Gerilim sıfırdan büyük olmalı.');
    const i = vrms / mag;
    Object.assign(out, { irms: i, p: i ** 2 * z.re, q: i ** 2 * z.im, s: vrms * i });
  }
  return out;
}

// ---------------------------------------------------------------------------
// AC güç ve güç faktörü düzeltmesi
// ---------------------------------------------------------------------------

/** Güç üçgeni: V, I (rms), PF (geri ya da ileri) → P, Q, S */
export function powerTriangle({ vrms, irms, pf, leading = false }) {
  assert(vrms > 0 && irms > 0, 'Gerilim ve akım sıfırdan büyük olmalı.');
  assert(pf > 0 && pf <= 1, 'Güç faktörü 0 ile 1 arasında olmalı.');
  const s = vrms * irms;
  const p = s * pf;
  const q = s * Math.sin(Math.acos(pf)) * (leading ? -1 : 1);
  return { s, p, q, phi: (Math.acos(pf) * 180) / Math.PI * (leading ? -1 : 1) };
}

/**
 * Endüktif yükü pf1'den pf2'ye çıkarmak için gereken kondansatör.
 * Tek faz: C = Qc/(ω·V²). Üç faz (üçgen bağlı kondansatörler): C_faz = Qc/(3·ω·V_LL²).
 * Akım: tek faz I = P/(V·PF), üç faz I = P/(√3·V_LL·PF).
 */
export function pfCorrection({ p, pf1, pf2, vrms, f, phases = 1 }) {
  assert(p > 0, 'Aktif güç sıfırdan büyük olmalı.');
  assert(pf1 > 0 && pf1 <= 1 && pf2 > 0 && pf2 <= 1, 'Güç faktörleri 0 ile 1 arasında olmalı.');
  assert(pf2 > pf1, 'Hedef güç faktörü mevcut güç faktöründen büyük olmalı.');
  assert(vrms > 0 && f > 0, 'Gerilim ve frekans sıfırdan büyük olmalı.');
  assert(phases === 1 || phases === 3, 'Faz sayısı 1 ya da 3 olmalı.');
  const q1 = p * Math.tan(Math.acos(pf1));
  const q2 = p * Math.tan(Math.acos(pf2));
  const qc = q1 - q2;
  const w = TWO_PI * f;
  const current = (pf) => (phases === 1 ? p / (vrms * pf) : p / (Math.sqrt(3) * vrms * pf));
  return {
    q1, q2, qc,
    s1: p / pf1,
    s2: p / pf2,
    capacitance: phases === 1 ? qc / (w * vrms ** 2) : qc / (3 * w * vrms ** 2),
    i1: current(pf1),
    i2: current(pf2),
  };
}

// ---------------------------------------------------------------------------
// 555 zamanlayıcı
// ---------------------------------------------------------------------------

/** Astable: tH = ln2·(R1+R2)·C, tL = ln2·R2·C */
export function timer555Astable({ r1, r2, c }) {
  assert(r1 > 0 && r2 > 0 && c > 0, 'R1, R2 ve C sıfırdan büyük olmalı.');
  const tHigh = Math.LN2 * (r1 + r2) * c;
  const tLow = Math.LN2 * r2 * c;
  const period = tHigh + tLow;
  return { tHigh, tLow, period, f: 1 / period, duty: tHigh / period };
}

/** Monostable: t = ln3·R·C ≈ 1,1·R·C */
export function timer555Monostable({ r, c }) {
  assert(r > 0 && c > 0, 'R ve C sıfırdan büyük olmalı.');
  return { width: Math.log(3) * r * c };
}

// ---------------------------------------------------------------------------
// Wheatstone köprüsü
// ---------------------------------------------------------------------------

/**
 * Sol kol: R1 (üst) – R2 (alt); sağ kol: R3 (üst) – Rx (alt). Besleme Vs üstte.
 * Vout = V_sol − V_sağ = Vs·(R2/(R1+R2) − Rx/(R3+Rx)). Denge: Rx = R3·R2/R1.
 */
export function wheatstoneBalance({ r1, r2, r3 }) {
  assert(r1 > 0 && r2 > 0 && r3 > 0, 'Dirençler sıfırdan büyük olmalı.');
  return { rx: (r3 * r2) / r1 };
}

export function wheatstoneOutput({ vs, r1, r2, r3, rx }) {
  assert(r1 > 0 && r2 > 0 && r3 > 0 && rx > 0, 'Dirençler sıfırdan büyük olmalı.');
  const left = vs * (r2 / (r1 + r2));
  const right = vs * (rx / (r3 + rx));
  return { vout: left - right, left, right, balanced: Math.abs(left - right) < 1e-12 * Math.max(1, Math.abs(vs)) };
}

// ---------------------------------------------------------------------------
// Thevenin ↔ Norton
// ---------------------------------------------------------------------------

/** Yük bağlıyken akım, gerilim ve güç; en büyük güç aktarımı RL = Rth. */
function withLoad(vth, rth, rl) {
  if (rl === null) return {};
  assert(rl >= 0, 'Yük direnci negatif olamaz.');
  const il = vth / (rth + rl);
  return { il, vl: il * rl, pl: il ** 2 * rl, pmax: vth ** 2 / (4 * rth) };
}

export function theveninToNorton({ vth, rth, rl = null }) {
  assert(rth > 0, 'Thevenin direnci sıfırdan büyük olmalı.');
  return { in: vth / rth, rn: rth, ...withLoad(vth, rth, rl) };
}

export function nortonToThevenin({ in: iN, rn, rl = null }) {
  assert(rn > 0, 'Norton direnci sıfırdan büyük olmalı.');
  const vth = iN * rn;
  return { vth, rth: rn, ...withLoad(vth, rn, rl) };
}

// ---------------------------------------------------------------------------
// Yıldız (Y) ↔ üçgen (Δ)
// ---------------------------------------------------------------------------

/** Δ → Y: Ra = Rab·Rca/ΣR, Rb = Rab·Rbc/ΣR, Rc = Rbc·Rca/ΣR */
export function deltaToWye({ rab, rbc, rca }) {
  assert(rab > 0 && rbc > 0 && rca > 0, 'Dirençler sıfırdan büyük olmalı.');
  const sum = rab + rbc + rca;
  return { ra: (rab * rca) / sum, rb: (rab * rbc) / sum, rc: (rbc * rca) / sum };
}

/** Y → Δ: Rab = N/Rc, Rbc = N/Ra, Rca = N/Rb; N = RaRb + RbRc + RcRa */
export function wyeToDelta({ ra, rb, rc }) {
  assert(ra > 0 && rb > 0 && rc > 0, 'Dirençler sıfırdan büyük olmalı.');
  const n = ra * rb + rb * rc + rc * ra;
  return { rab: n / rc, rbc: n / ra, rca: n / rb };
}

// ---------------------------------------------------------------------------
// İletken kesiti (gerilim düşümüne göre)
// ---------------------------------------------------------------------------

/** 20 °C özdirenç (Ω·mm²/m) */
export const RESISTIVITY = Object.freeze({ 'Bakır': 0.0175, 'Alüminyum': 0.0282 });

/** IEC 60228 standart kesitler (mm²) */
export const STANDARD_SECTIONS = Object.freeze([
  0.5, 0.75, 1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500, 630,
]);

/**
 * Gerilim düşümüne göre en küçük kesit.
 * system: 'dc' | '1ph' (gidiş-dönüş: k = 2) | '3ph' (k = √3).
 * ΔV ≈ k·I·(ρL/A)·cosφ (DC'de cosφ = 1; hat reaktansı ihmal).
 * @returns {{ area, standard, dropV, dropPct, lossW }}
 */
export function cableSection({ current, length, voltage, dropPct, rho, system = '1ph', pf = 1 }) {
  assert(current > 0 && length > 0 && voltage > 0, 'Akım, uzunluk ve gerilim sıfırdan büyük olmalı.');
  assert(dropPct > 0 && dropPct < 100, 'İzin verilen düşüm 0 ile 100 arasında olmalı.');
  assert(rho > 0, 'Özdirenç sıfırdan büyük olmalı.');
  assert(pf > 0 && pf <= 1, 'Güç faktörü 0 ile 1 arasında olmalı.');
  const k = system === '3ph' ? Math.sqrt(3) : 2;
  const cos = system === 'dc' ? 1 : pf;
  const allowed = (voltage * dropPct) / 100;
  const area = (k * rho * length * current * cos) / allowed;
  const standard = STANDARD_SECTIONS.find((a) => a >= area * (1 - 1e-12)) ?? null;
  const out = { area, standard, allowedV: allowed };
  if (standard !== null) {
    const rLine = (rho * length) / standard; // tek iletken
    const dropV = k * current * rLine * cos;
    const conductors = system === '3ph' ? 3 : 2;
    Object.assign(out, { dropV, dropPct: (dropV / voltage) * 100, lossW: conductors * current ** 2 * rLine });
  }
  return out;
}
