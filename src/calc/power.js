// Elektrik makineleri ve güç sistemleri: transformatör, üç fazlı dengeli sistem.
import { assert } from './validate.js';

// ---------------------------------------------------------------------------
// Transformatör
// ---------------------------------------------------------------------------

/** Dönüştürme oranı a = V1/V2 = N1/N2; anma akımları I = S/V (tek faz). */
export function transformerRatings({ v1, v2, s }) {
  assert(v1 > 0 && v2 > 0, 'Gerilimler sıfırdan büyük olmalı.');
  assert(s > 0, 'Anma gücü sıfırdan büyük olmalı.');
  const a = v1 / v2;
  return { a, i1: s / v1, i2: s / v2 };
}

/** Sekonderdeki yük empedansının primere yansıması: Z′ = a²·Z */
export function reflectImpedance({ a, z }) {
  assert(a > 0 && z > 0, 'Oran ve empedans sıfırdan büyük olmalı.');
  return { primary: a ** 2 * z };
}

/**
 * Verim ve gerilim regülasyonu (yük oranı x, güç faktörü cos φ, endüktif yük).
 *   η = x·S·cosφ / (x·S·cosφ + Pfe + x²·Pcu)
 *   en yüksek verim x = √(Pfe/Pcu)
 *   ε_r = Pcu/S, ε_x = √(uk² − ε_r²)
 *   regülasyon ≈ x·(ε_r·cosφ + ε_x·sinφ)  (ikinci derece terim ihmal)
 */
export function transformerPerformance({ s, load, pf, pfe, pcu, uk }) {
  assert(s > 0, 'Anma gücü sıfırdan büyük olmalı.');
  assert(load > 0, 'Yük oranı sıfırdan büyük olmalı.');
  assert(pf > 0 && pf <= 1, 'Güç faktörü 0 ile 1 arasında olmalı.');
  assert(pfe >= 0 && pcu >= 0, 'Kayıplar negatif olamaz.');
  assert(uk > 0 && uk < 1, 'Kısa devre gerilimi uk %0 ile %100 arasında olmalı.');
  const er = pcu / s;
  assert(er < uk, 'Bakır kaybı oranı (Pcu/S) uk’dan küçük olmalı.');
  const ex = Math.sqrt(uk ** 2 - er ** 2);
  const sin = Math.sqrt(1 - pf ** 2);
  const pOut = load * s * pf;
  const losses = pfe + load ** 2 * pcu;
  return {
    pOut,
    losses,
    efficiency: pOut / (pOut + losses),
    maxEffLoad: pcu > 0 ? Math.sqrt(pfe / pcu) : Infinity,
    er,
    ex,
    regulation: load * (er * pf + ex * sin),
  };
}

// ---------------------------------------------------------------------------
// Üç fazlı dengeli sistem
// ---------------------------------------------------------------------------

/**
 * Hat gerilimi, hat akımı ve güç faktöründen güçler; bağlantıya göre faz büyüklükleri.
 * Y: V_faz = V_LL/√3, I_faz = I_L.  Δ: V_faz = V_LL, I_faz = I_L/√3.
 */
export function threePhaseFromLine({ vll, il, pf, connection }) {
  assert(vll > 0 && il > 0, 'Gerilim ve akım sıfırdan büyük olmalı.');
  assert(pf > 0 && pf <= 1, 'Güç faktörü 0 ile 1 arasında olmalı.');
  assert(connection === 'Y' || connection === 'D', 'Bağlantı Y ya da Δ olmalı.');
  const s = Math.sqrt(3) * vll * il;
  return {
    s,
    p: s * pf,
    q: s * Math.sqrt(1 - pf ** 2),
    vph: connection === 'Y' ? vll / Math.sqrt(3) : vll,
    iph: connection === 'Y' ? il : il / Math.sqrt(3),
  };
}

/** Faz empedansı Z = R + jX olan dengeli yük. */
export function threePhaseFromImpedance({ vll, r, x, connection }) {
  assert(vll > 0, 'Gerilim sıfırdan büyük olmalı.');
  assert(r >= 0, 'Direnç negatif olamaz.');
  const zMag = Math.hypot(r, x);
  assert(zMag > 0, 'Faz empedansı sıfır olamaz.');
  assert(connection === 'Y' || connection === 'D', 'Bağlantı Y ya da Δ olmalı.');
  const vph = connection === 'Y' ? vll / Math.sqrt(3) : vll;
  const iph = vph / zMag;
  const il = connection === 'Y' ? iph : Math.sqrt(3) * iph;
  return {
    vph, iph, il,
    p: 3 * iph ** 2 * r,
    q: 3 * iph ** 2 * x,
    s: 3 * vph * iph,
    pf: r / zMag,
    phaseDeg: (Math.atan2(x, r) * 180) / Math.PI,
  };
}

// ---------------------------------------------------------------------------
// Asenkron (indüksiyon) motor
// ---------------------------------------------------------------------------

/**
 * ns = 120·f/p (d/dk), kayma s = (ns − nr)/ns, rotor frekansı fr = s·f.
 * Pout verilirse mil momenti T = Pout/ωr; Pin verilirse verim η = Pout/Pin.
 */
export function inductionMotor({ f, poles, nr, pout = null, pin = null }) {
  assert(f > 0, 'Frekans sıfırdan büyük olmalı.');
  assert(Number.isInteger(poles) && poles >= 2 && poles % 2 === 0, 'Kutup sayısı 2, 4, 6… gibi çift tam sayı olmalı.');
  const ns = (120 * f) / poles;
  assert(nr >= 0, 'Rotor hızı negatif olamaz.');
  assert(nr < ns, `Motor çalışmasında rotor hızı senkron hızdan (${ns} d/dk) küçük olmalı.`);
  const slip = (ns - nr) / ns;
  const wr = (2 * Math.PI * nr) / 60;
  const torque = pout !== null && wr > 0 ? pout / wr : null;
  const efficiency = pout !== null && pin !== null ? pout / pin : null;
  // Hava aralığı gücü ve rotor bakır kaybı (mekanik kayıplar ihmal: Pmek ≈ Pout)
  const pag = pout !== null && slip < 1 ? pout / (1 - slip) : null;
  const pcuRotor = pag !== null ? slip * pag : null;
  return { ns, slip, fr: slip * f, wr, torque, efficiency, pag, pcuRotor };
}

// ---------------------------------------------------------------------------
// DC motor (serbest uyarmalı / şönt, sabit akı)
// ---------------------------------------------------------------------------

/**
 * Ea = V − Ia·Ra, KΦ = Ea/ω, T = KΦ·Ia, Pgel = Ea·Ia.
 * ia2 verilirse yeni yükte hız: n2 = (V − Ia2·Ra)/KΦ (akı sabit).
 */
export function dcMotor({ v, ra, ia, n, ia2 = null }) {
  assert(v > 0 && ra >= 0 && ia >= 0 && n > 0, 'V, n > 0; Ra, Ia ≥ 0 olmalı.');
  const ea = v - ia * ra;
  assert(ea > 0, 'Zıt EMK pozitif olmalı (Ia·Ra < V).');
  const w = (2 * Math.PI * n) / 60;
  const kphi = ea / w;
  const n0 = (v / kphi) * (60 / (2 * Math.PI));
  let n2 = null;
  let t2 = null;
  if (ia2 !== null) {
    const ea2 = v - ia2 * ra;
    n2 = (ea2 / kphi) * (60 / (2 * Math.PI));
    t2 = kphi * ia2;
  }
  return {
    ea, w, kphi, torque: kphi * ia, pdev: ea * ia, pin: v * ia, pcu: ia * ia * ra,
    n0, regulation: (n0 - n) / n, n2, t2,
  };
}

// ---------------------------------------------------------------------------
// Birim değer (per-unit) sistemi
// ---------------------------------------------------------------------------

/** Üç fazlı baz değerler: Zb = Vb²/Sb, Ib = Sb/(√3·Vb). Vb hat gerilimi. */
export function perUnitBase({ sb, vb }) {
  assert(sb > 0 && vb > 0, 'Baz güç ve gerilim sıfırdan büyük olmalı.');
  return { zb: (vb * vb) / sb, ib: sb / (Math.sqrt(3) * vb), yb: sb / (vb * vb) };
}

/** Baz değiştirme: Zpu,yeni = Zpu,eski·(Vb,eski/Vb,yeni)²·(Sb,yeni/Sb,eski). */
export function perUnitChangeBase({ zpu, sOld, vOld, sNew, vNew }) {
  assert(sOld > 0 && vOld > 0 && sNew > 0 && vNew > 0, 'Baz değerler sıfırdan büyük olmalı.');
  return zpu * (vOld / vNew) ** 2 * (sNew / sOld);
}
