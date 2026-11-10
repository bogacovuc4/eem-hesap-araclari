// Enerji dağıtımı: gerilim düşümü, çok yüklü dağıtım hattı, kısa devre akımı, topraklama direnci.
import { assert } from './validate.js';
import { STANDARD_SECTIONS } from './circuit2.js';

/** İletkenlik k (m/(Ω·mm²)), Türkçe ders kitaplarındaki yuvarlak değerler. */
export const CONDUCTIVITY = Object.freeze({ 'Bakır': 56, 'Alüminyum': 35 });

const SQRT3 = Math.sqrt(3);
const factor = (system) => (system === '3ph' ? SQRT3 : 2);

function checkCommon({ system, u, pf, k, x }) {
  assert(system === '1ph' || system === '3ph', 'Sistem tek faz ya da üç faz olmalı.');
  assert(u > 0, 'Gerilim sıfırdan büyük olmalı.');
  assert(pf > 0 && pf <= 1, 'Güç faktörü 0 ile 1 arasında olmalı.');
  assert(k > 0, 'İletkenlik sıfırdan büyük olmalı.');
  assert(x >= 0, 'Hat reaktansı negatif olamaz.');
}

/** Hat akımı: tek faz I = P/(U·cosφ), üç faz I = P/(√3·U·cosφ). */
export function lineCurrent({ system, p, u, pf }) {
  return system === '3ph' ? p / (SQRT3 * u * pf) : p / (u * pf);
}

const standardFor = (area) => STANDARD_SECTIONS.find((a) => a >= area * (1 - 1e-12)) ?? null;

/**
 * Tek yüklü hatta gerilim düşümü.
 *   R′ = 1/(k·S) Ω/m,  X′ = x/1000 Ω/m (x: Ω/km)
 *   ΔU = c·I·L·(R′·cosφ + X′·sinφ),  c = 2 (tek faz, gidiş-dönüş), √3 (üç faz)
 *   Reaktans ihmal: %e = 100·L·P/(k·S·U²) (üç faz), 200·L·P/(k·S·U²) (tek faz)
 * allowedPct verilirse bu düşümü sağlayan en küçük kesit de bulunur.
 */
export function voltageDrop({ system, p, u, pf, length, area, k, x = 0, allowedPct = null }) {
  checkCommon({ system, u, pf, k, x });
  assert(p > 0, 'Güç sıfırdan büyük olmalı.');
  assert(length > 0, 'Hat uzunluğu sıfırdan büyük olmalı.');
  assert(area > 0, 'Kesit sıfırdan büyük olmalı.');
  const c = factor(system);
  const sin = Math.sqrt(1 - pf ** 2);
  const i = lineCurrent({ system, p, u, pf });
  const r1 = 1 / (k * area);
  const x1 = x / 1000;
  const dropV = c * i * length * (r1 * pf + x1 * sin);
  const simplePct = ((system === '3ph' ? 100 : 200) * length * p) / (k * area * u ** 2);
  const conductors = system === '3ph' ? 3 : 2;
  const loss = conductors * i ** 2 * r1 * length;
  const out = {
    current: i,
    dropV,
    dropPct: (dropV / u) * 100,
    simplePct,
    endVoltage: u - dropV,
    loss,
    lossPct: (loss / p) * 100,
    r: r1 * length,
    x: x1 * length,
    moment: length * p,
  };
  if (allowedPct !== null) {
    assert(allowedPct > 0 && allowedPct < 100, 'İzin verilen düşüm 0 ile 100 arasında olmalı.');
    const allowedV = (u * allowedPct) / 100;
    const reactive = c * i * length * x1 * sin;
    out.allowedV = allowedV;
    out.requiredArea = allowedV > reactive ? (c * i * length * pf) / (k * (allowedV - reactive)) : null;
    out.standard = out.requiredArea !== null ? standardFor(out.requiredArea) : null;
  }
  return out;
}

/**
 * "mesafe:güç" listesini okur. Mesafe metre, güç kW. Ayırıcı ; ya da satır sonu.
 * Ör. "20:5; 45:3,5; 80:4"
 */
export function parseLoads(text) {
  const items = String(text).split(/[;\n]+/).map((t) => t.trim()).filter(Boolean);
  assert(items.length > 0, 'En az bir yük girin (mesafe:güç).');
  assert(items.length <= 50, 'En fazla 50 yük girilebilir.');
  return items.map((item) => {
    const m = item.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(?:m)?\s*[:=/]\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:kw)?$/i);
    assert(m, `“${item}” okunamadı: mesafe:güç biçiminde yazın (ör. 40:5).`);
    const d = Number(m[1].replace(',', '.'));
    const pKw = Number(m[2].replace(',', '.'));
    assert(d > 0, 'Yük mesafeleri sıfırdan büyük olmalı.');
    assert(pKw > 0, 'Yük güçleri sıfırdan büyük olmalı.');
    return { d, p: pKw * 1000 };
  });
}

/**
 * Tek uçtan beslenen, sabit kesitli, çok yüklü dağıtım hattı (dal hattı).
 * Her yük kaynağa olan mesafesiyle verilir; tüm yüklerde aynı cos φ varsayılır.
 * Bölüm akımı, o bölümden sonraki yüklerin toplamıdır. Uç noktadaki düşüm yük momentleriyle:
 *   %e = 100·Σ(Li·Pi)/(k·S·U²) (üç faz, reaktans ihmal)
 */
export function distributedLine({ system, u, pf, area, k, x = 0, loads, allowedPct = null }) {
  checkCommon({ system, u, pf, k, x });
  assert(area > 0, 'Kesit sıfırdan büyük olmalı.');
  assert(Array.isArray(loads) && loads.length > 0, 'En az bir yük gerekli.');
  const sorted = [...loads].sort((a, b) => a.d - b.d);
  const c = factor(system);
  const sin = Math.sqrt(1 - pf ** 2);
  const r1 = 1 / (k * area);
  const x1 = x / 1000;
  const totalP = sorted.reduce((sum, l) => sum + l.p, 0);
  const conductors = system === '3ph' ? 3 : 2;

  let prev = 0;
  let downstream = totalP;
  let resistive = 0; // Σ c·I·L·cosφ  (1/S ile çarpılacak kısım için)
  let reactive = 0; // Σ c·I·L·X′·sinφ
  let loss = 0;
  const points = [{ d: 0, dropV: 0, dropPct: 0, p: 0 }];
  const segments = [];
  for (const load of sorted) {
    const len = load.d - prev;
    const i = lineCurrent({ system, p: downstream, u, pf });
    resistive += (c * i * len * pf) / k;
    reactive += c * i * len * x1 * sin;
    loss += conductors * i ** 2 * r1 * len;
    segments.push({ from: prev, to: load.d, current: i, power: downstream });
    const dropV = resistive / area + reactive;
    points.push({ d: load.d, dropV, dropPct: (dropV / u) * 100, p: load.p });
    downstream -= load.p;
    prev = load.d;
  }
  const end = points[points.length - 1];
  const moment = sorted.reduce((sum, l) => sum + l.d * l.p, 0);
  const out = {
    points,
    segments,
    totalP,
    moment,
    feederCurrent: segments[0].current,
    maxDropV: end.dropV,
    maxDropPct: end.dropPct,
    simplePct: ((system === '3ph' ? 100 : 200) * moment) / (k * area * u ** 2),
    loss,
    lossPct: (loss / totalP) * 100,
    length: end.d,
  };
  if (allowedPct !== null) {
    assert(allowedPct > 0 && allowedPct < 100, 'İzin verilen düşüm 0 ile 100 arasında olmalı.');
    const allowedV = (u * allowedPct) / 100;
    out.requiredArea = allowedV > reactive ? resistive / (allowedV - reactive) : null;
    out.standard = out.requiredArea !== null ? standardFor(out.requiredArea) : null;
  }
  return out;
}

/**
 * Alçak gerilim barasında ve kablo sonunda üç fazlı simetrik kısa devre akımı
 * (IEC 60909 yaklaşımıyla, empedanslar AG tarafına indirgenmiş).
 *   Şebeke: Zq = c·U²/S″kQ,  Xq = 0,995·Zq,  Rq = 0,1·Xq
 *   Trafo:  ZT = uk·U²/Sn,  RT = Pcu·U²/Sn²,  XT = √(ZT² − RT²)
 *   Kablo:  R = L/(k·S),  X = x·L
 *   I″k3 = c·U/(√3·|Z|),  ip = κ·√2·I″k3,  κ = 1,02 + 0,98·e^(−3R/X)
 * skq = null → sonsuz güçlü şebeke.
 */
export function shortCircuit({ u, c = 1.05, skq = null, sn, uk, pcu = 0, length = 0, area = null, k = 56, x = 0.08 }) {
  assert(u > 0, 'Gerilim sıfırdan büyük olmalı.');
  assert(c >= 0.9 && c <= 1.2, 'Gerilim katsayısı c 0,9 ile 1,2 arasında olmalı.');
  assert(skq === null || skq > 0, 'Şebeke kısa devre gücü sıfırdan büyük olmalı.');
  assert(sn > 0, 'Trafo gücü sıfırdan büyük olmalı.');
  assert(uk > 0 && uk < 0.5, 'uk %0 ile %50 arasında olmalı.');
  assert(pcu >= 0, 'Bakır kaybı negatif olamaz.');
  const zt = (uk * u ** 2) / sn;
  const rt = (pcu * u ** 2) / sn ** 2;
  assert(rt < zt, 'Bakır kaybı çok büyük: RT, ZT’den küçük olmalı (Pcu < uk·Sn).');
  const xt = Math.sqrt(zt ** 2 - rt ** 2);
  let rq = 0;
  let xq = 0;
  if (skq !== null) {
    const zq = (c * u ** 2) / skq;
    xq = 0.995 * zq;
    rq = 0.1 * xq;
  }
  const at = (r, xx) => {
    const z = Math.hypot(r, xx);
    const ik = (c * u) / (SQRT3 * z);
    const kappa = xx > 0 ? 1.02 + 0.98 * Math.exp((-3 * r) / xx) : 1;
    return { r, x: xx, z, ik, kappa, ip: kappa * Math.SQRT2 * ik, sk: SQRT3 * u * ik };
  };
  const bus = at(rq + rt, xq + xt);
  const out = { grid: { r: rq, x: xq }, transformer: { r: rt, x: xt, z: zt }, bus, ratedCurrent: sn / (SQRT3 * u) };
  if (length > 0) {
    assert(area > 0, 'Kablo kesiti sıfırdan büyük olmalı.');
    assert(k > 0, 'İletkenlik sıfırdan büyük olmalı.');
    assert(x >= 0, 'Kablo reaktansı negatif olamaz.');
    const rc = length / (k * area);
    const xc = (x / 1000) * length;
    out.cable = { r: rc, x: xc };
    out.end = at(bus.r + rc, bus.x + xc);
  }
  return out;
}

/**
 * Topraklama direnci.
 *   Çubuk (düşey): Dwight  R = ρ/(2πL)·(ln(8L/d) − 1);  yaklaşık R ≈ ρ/L
 *   Şerit (yatay, yüzeye yakın): yaklaşık R ≈ 2ρ/L
 *   Levha (kare, kenar a): yaklaşık R ≈ ρ/(4,5·a)
 * n paralel çubuk: birbirini etkilemeyecek kadar uzaksa R/n (alt sınır).
 */
export function groundRod({ rho, length, diameter, count = 1 }) {
  assert(rho > 0, 'Toprak özdirenci sıfırdan büyük olmalı.');
  assert(length > 0 && diameter > 0, 'Uzunluk ve çap sıfırdan büyük olmalı.');
  assert(length > 5 * diameter, 'Çubuk boyu çapın en az 5 katı olmalı (formül ince uzun çubuk içindir).');
  assert(Number.isInteger(count) && count >= 1 && count <= 100, 'Çubuk sayısı 1 ile 100 arasında tam sayı olmalı.');
  const r = (rho / (2 * Math.PI * length)) * (Math.log((8 * length) / diameter) - 1);
  return { r, approx: rho / length, parallel: r / count };
}

export function groundStrip({ rho, length }) {
  assert(rho > 0 && length > 0, 'Özdirenç ve uzunluk sıfırdan büyük olmalı.');
  return { r: (2 * rho) / length };
}

export function groundPlate({ rho, side }) {
  assert(rho > 0 && side > 0, 'Özdirenç ve kenar sıfırdan büyük olmalı.');
  return { r: rho / (4.5 * side) };
}

/** Toprak cinsine göre tipik özdirençler (Ω·m). */
export const SOIL_RESISTIVITY = Object.freeze([
  ['Bataklık', 30],
  ['Killi toprak, balçık', 100],
  ['Nemli kum', 200],
  ['Nemli çakıl', 500],
  ['Kuru kum ya da çakıl', 1000],
  ['Taşlı zemin', 3000],
]);
