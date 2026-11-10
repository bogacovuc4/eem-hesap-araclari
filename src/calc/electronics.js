// Elektronik: BJT gerilim bölücülü polarma (Boylestad, Electronic Devices and Circuit Theory, Böl. 4).
import { assert } from './validate.js';

/**
 * Tam (Thevenin) analiz:
 *   VTH = VCC·R2/(R1+R2), RTH = R1∥R2
 *   IB = (VTH − VBE)/(RTH + (β+1)·RE), IC = β·IB, IE = (β+1)·IB
 *   VCE = VCC − IC·RC − IE·RE
 * Doyma: hesaplanan VCE ≤ VCE(sat) ise transistör doymadadır; o zaman IC ≈ (VCC − VCEsat)/(RC + RE).
 */
export function bjtDividerBias({ vcc, r1, r2, rc, re, beta, vbe = 0.7, vceSat = 0.2 }) {
  assert(vcc > 0, 'VCC sıfırdan büyük olmalı.');
  assert(r1 > 0 && r2 > 0 && rc >= 0 && re >= 0, 'Dirençler negatif olamaz (R1, R2 > 0).');
  assert(beta > 0, 'β sıfırdan büyük olmalı.');
  assert(vbe >= 0 && vceSat >= 0, 'VBE ve VCE(sat) negatif olamaz.');

  const vth = (vcc * r2) / (r1 + r2);
  const rth = (r1 * r2) / (r1 + r2);
  const icSat = (vcc - vceSat) / (rc + re || Number.MIN_VALUE);
  const base = { vth, rth, icSat, loadLineIc0: vcc / (rc + re || Number.MIN_VALUE) };

  if (vth <= vbe) {
    return { ...base, region: 'cutoff', ib: 0, ic: 0, ie: 0, vce: vcc, ve: 0, vc: vcc, vb: vth };
  }
  const ib = (vth - vbe) / (rth + (beta + 1) * re);
  const ic = beta * ib;
  const ie = (beta + 1) * ib;
  const vce = vcc - ic * rc - ie * re;
  if (vce <= vceSat) {
    // Doymada β ilişkisi geçersiz: akımı devre sınırlar
    return { ...base, region: 'saturation', ib, ic: icSat, ie: icSat, vce: vceSat, ve: icSat * re, vc: vceSat + icSat * re, vb: icSat * re + vbe };
  }
  return {
    ...base,
    region: 'active',
    ib, ic, ie, vce,
    ve: ie * re,
    vc: vcc - ic * rc,
    vb: ie * re + vbe,
    // Yaklaşık yöntemin geçerlilik koşulu: β·RE ≥ 10·R2
    approxValid: beta * re >= 10 * r2,
    power: vce * ic,
  };
}

// ---------------------------------------------------------------------------
// Doğrultucular (Boylestad, Böl. 2 ve 15)
// ---------------------------------------------------------------------------

/**
 * Yarım dalga, orta uçlu tam dalga ve köprü doğrultucu; isteğe bağlı kondansatör filtre.
 *   type: 'half' | 'center' | 'bridge'. vrms: sekonder (orta uçluda yarım sargı) RMS gerilimi.
 *   Filtresiz: Vdc = Vm/π (yarım), 2Vm/π (tam).
 *   Kondansatörlü (yaklaşık): Vr(pp) = Vdc/(fr·R·C), Vdc = Vm − Vr(pp)/2 → Vdc = Vm / (1 + 1/(2fr·R·C)).
 */
export function rectifier({ type, vrms, f, rl, c = null, vd = 0.7 }) {
  assert(['half', 'center', 'bridge'].includes(type), 'Bilinmeyen doğrultucu tipi.');
  assert(vrms > 0 && f > 0 && rl > 0, 'Gerilim, frekans ve yük sıfırdan büyük olmalı.');
  assert(vd >= 0, 'Diyot gerilimi negatif olamaz.');
  const vsm = Math.SQRT2 * vrms;
  const vm = vsm - (type === 'bridge' ? 2 : 1) * vd;
  assert(vm > 0, 'Tepe gerilimi diyot düşümlerinden küçük: çıkış yok.');
  const full = type !== 'half';
  const fr = full ? 2 * f : f;
  let vdc;
  let vrpp = null;
  let rippleFactor;
  if (c && c > 0) {
    vdc = vm / (1 + 1 / (2 * fr * rl * c));
    vrpp = vdc / (fr * rl * c);
    rippleFactor = vrpp / (2 * Math.sqrt(3)) / vdc;
  } else {
    vdc = full ? (2 * vm) / Math.PI : vm / Math.PI;
    rippleFactor = full ? 0.482 : 1.21;
  }
  const filtered = Boolean(c && c > 0);
  const piv = type === 'bridge' ? vsm - vd : type === 'center' ? 2 * vsm - vd : filtered ? 2 * vsm : vsm;
  return { vm, vdc, idc: vdc / rl, vrpp, rippleFactor, fr, piv, filtered };
}

// ---------------------------------------------------------------------------
// Zener regülatör
// ---------------------------------------------------------------------------

/**
 * Seri dirençli zener regülatör analizi.
 *   Zener iletimdeyse: VL = Vz, IR = (Vs − Vz)/Rs, IL = Vz/RL, IZ = IR − IL, PZ = Vz·IZ.
 *   Yük gerilimi Vz’ye ulaşmıyorsa (V = Vs·RL/(Rs+RL) < Vz) zener kesimdedir.
 */
export function zenerRegulator({ vs, rs, vz, rl }) {
  assert(vs > 0 && rs > 0 && vz > 0 && rl > 0, 'Tüm değerler sıfırdan büyük olmalı.');
  const vOpen = (vs * rl) / (rs + rl);
  if (vOpen < vz) {
    return { on: false, vl: vOpen, ir: vs / (rs + rl), il: vOpen / rl, iz: 0, pz: 0, vOpen };
  }
  const ir = (vs - vz) / rs;
  const il = vz / rl;
  const iz = ir - il;
  return { on: true, vl: vz, ir, il, iz, pz: vz * iz, vOpen };
}

/**
 * Seri direnç tasarımı: en kötü durumda (en düşük Vs, en büyük IL) zenerden IZmin geçmeli.
 *   Rs ≤ (Vs,min − Vz)/(IL,max + IZ,min). En kötü zener gücü: Vs,max ve IL = 0 iken.
 */
export function zenerDesign({ vsMin, vsMax, vz, ilMax, izMin }) {
  assert(vsMin > vz, 'En düşük besleme Vz’den büyük olmalı.');
  assert(vsMax >= vsMin, 'En yüksek besleme en düşükten küçük olamaz.');
  assert(ilMax >= 0 && izMin > 0, 'Akımlar geçerli değil.');
  const rsMax = (vsMin - vz) / (ilMax + izMin);
  const izWorst = (vsMax - vz) / rsMax;
  return { rsMax, izWorst, pzWorst: vz * izWorst, prs: (vsMax - vz) ** 2 / rsMax };
}

// ---------------------------------------------------------------------------
// Diyot (Shockley denklemi)
// ---------------------------------------------------------------------------
const Q_E = 1.602176634e-19;
const K_B = 1.380649e-23;

/** Isıl gerilim VT = kT/q (T kelvin). */
export function thermalVoltage(t = 300) {
  assert(t > 0, 'Sıcaklık 0 K’den büyük olmalı.');
  return (K_B * t) / Q_E;
}

/**
 * I = Is·(e^(V/nVT) − 1). v verilirse akım, i verilirse gerilim bulunur.
 * Küçük sinyal (dinamik) direnci rd = nVT / (I + Is).
 */
export function diodeShockley({ is, n = 1, t = 300, v = null, i = null }) {
  assert(is > 0, 'Doyma akımı Is sıfırdan büyük olmalı.');
  assert(n >= 1 && n <= 2.5, 'İdealite faktörü n genellikle 1–2 arasındadır.');
  const vt = thermalVoltage(t);
  if (v !== null) i = is * Math.expm1(v / (n * vt));
  else {
    assert(i > -is, 'Ters akım −Is’den büyük olmalı.');
    v = n * vt * Math.log1p(i / is);
  }
  return { v, i, vt, rd: (n * vt) / (i + is), p: v * i };
}

// ---------------------------------------------------------------------------
// BJT küçük sinyal modeli ve ortak emetörlü kuvvetlendirici
// ---------------------------------------------------------------------------

/**
 * gm = IC/VT, rπ = β/gm, re = VT/IE, ro = VA/IC.
 * Ortak emetör, RE köprülenmemiş (re_ext) kısmıyla:
 *   Av = −β·(RC∥RL∥ro) / (rπ + (β+1)·RE)    (RE = 0 ise −gm·(RC∥RL∥ro))
 *   Rin(baz) = rπ + (β+1)·RE,  Rin = RB ∥ Rin(baz)
 */
export function bjtSmallSignal({ ic, beta, va = 0, t = 300, rc, rl = Infinity, re = 0, rb = Infinity }) {
  assert(ic > 0 && beta > 0, 'IC ve β sıfırdan büyük olmalı.');
  const vt = thermalVoltage(t);
  const gm = ic / vt;
  const rpi = beta / gm;
  const ie = ic * (beta + 1) / beta;
  const reIntr = vt / ie;
  const ro = va > 0 ? va / ic : Infinity;
  const par = (...rs) => 1 / rs.reduce((s, r) => s + (Number.isFinite(r) ? 1 / r : 0), 0);
  const rLoad = par(rc, rl, ro);
  const rinBase = rpi + (beta + 1) * re;
  const av = (-beta * rLoad) / rinBase;
  return { vt, gm, rpi, reIntr, ro, rLoad, rinBase, rin: par(rb, rinBase), rout: par(rc, ro), av, avDb: 20 * Math.log10(Math.abs(av)) };
}

// ---------------------------------------------------------------------------
// Sallen–Key birim kazançlı alçak geçiren filtre (2. derece)
// ---------------------------------------------------------------------------

/** f0 = 1/(2π√(R1R2C1C2)), Q = √(R1R2C1C2) / (C2(R1+R2)); C1 geri besleme, C2 toprak kondansatörü. */
export function sallenKeyLowpass({ r1, r2, c1, c2 }) {
  assert(r1 > 0 && r2 > 0 && c1 > 0 && c2 > 0, 'Tüm elemanlar sıfırdan büyük olmalı.');
  const root = Math.sqrt(r1 * r2 * c1 * c2);
  return { f0: 1 / (2 * Math.PI * root), q: root / (c2 * (r1 + r2)) };
}

/** Eşit dirençli tasarım: C1 = 4Q²·C2, R = 1/(2π·f0·2Q·C2). */
export function sallenKeyDesign({ f0, q, c2 }) {
  assert(f0 > 0 && q > 0 && c2 > 0, 'f0, Q ve C2 sıfırdan büyük olmalı.');
  const c1 = 4 * q * q * c2;
  const r = 1 / (2 * Math.PI * f0 * 2 * q * c2);
  return { r, c1, c2 };
}

/** İkinci derece alçak geçirenin f frekansındaki kazancı (dB). */
export function secondOrderLowpassDb(f, f0, q) {
  const x = f / f0;
  return -10 * Math.log10((1 - x * x) ** 2 + (x / q) ** 2);
}
