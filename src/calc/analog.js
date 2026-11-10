// Analog tümdevre tasarımı: MOSFET kare yasası modeli, ortak kaynaklı kuvvetlendirici, akım aynası.
// Uzun kanal (kare yasası) modeli; alt eşik iletimi, hız doygunluğu ve gövde etkisi ihmal.
// PMOS için tüm gerilim ve akımlar mutlak değerle girilir.
import { assert } from './validate.js';

function checkDevice({ k, wl, vth, lambda }) {
  assert(k > 0, 'μCox sıfırdan büyük olmalı.');
  assert(wl > 0, 'W/L sıfırdan büyük olmalı.');
  assert(vth >= 0, 'Eşik gerilimi negatif olamaz (PMOS için mutlak değer girin).');
  assert(lambda >= 0, 'λ negatif olamaz.');
}

/**
 * MOSFET çalışma noktası ve küçük işaret parametreleri.
 *   Doyma (VDS ≥ VOV):  ID = ½·μCox·(W/L)·VOV²·(1 + λVDS)
 *   Doğrusal (VDS < VOV): ID = μCox·(W/L)·(VOV·VDS − VDS²/2)
 *   gm = ∂ID/∂VGS,  ro = 1/(∂ID/∂VDS)
 * k: μCox (A/V²), wl: W/L.
 */
export function mosfet({ k, wl, vgs, vth, vds, lambda = 0 }) {
  checkDevice({ k, wl, vth, lambda });
  assert(vgs >= 0 && vds >= 0, 'VGS ve VDS negatif olamaz (PMOS için mutlak değer girin).');
  const beta = k * wl;
  const vov = vgs - vth;
  if (vov <= 0) {
    return { region: 'cutoff', vov, id: 0, gm: 0, ro: Infinity, intrinsicGain: 0, vdsat: 0 };
  }
  if (vds >= vov) {
    const id0 = 0.5 * beta * vov ** 2;
    const id = id0 * (1 + lambda * vds);
    const gm = beta * vov * (1 + lambda * vds); // = 2·ID/VOV
    const ro = lambda > 0 ? 1 / (lambda * id0) : Infinity;
    return { region: 'saturation', vov, id, id0, gm, ro, intrinsicGain: gm * ro, vdsat: vov };
  }
  const id = beta * (vov * vds - vds ** 2 / 2);
  const gm = beta * vds;
  const ro = 1 / (beta * (vov - vds));
  return { region: 'triode', vov, id, gm, ro, intrinsicGain: gm * ro, vdsat: vov };
}

/** Tasarım: istenen ID ve VOV için W/L (doymada, λ ihmal). */
export function sizeForCurrent({ k, id, vov }) {
  assert(k > 0, 'μCox sıfırdan büyük olmalı.');
  assert(id > 0, 'Akım sıfırdan büyük olmalı.');
  assert(vov > 0, 'Aşırı sürüm gerilimi VOV sıfırdan büyük olmalı.');
  const wl = (2 * id) / (k * vov ** 2);
  return { wl, gm: (2 * id) / vov, gmOverId: 2 / vov };
}

/** VDS'ye göre ID eğrisi (çıkış karakteristiği) için örnekler. */
export function outputCurve({ k, wl, vgs, vth, lambda = 0, vdsMax, steps = 200 }) {
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const vds = (vdsMax * i) / steps;
    pts.push({ x: vds, y: mosfet({ k, wl, vgs, vth, vds, lambda }).id });
  }
  return pts;
}

/**
 * Direnç yüklü ortak kaynaklı (CS) kuvvetlendirici. Kaynak toprakta, VGS DC polarma.
 *   Doymada: ID = k′(1 + λVDS), VDS = VDD − ID·RD → ID = k′(1 + λVDD)/(1 + λk′RD)
 *   Av = −gm·(RD ∥ ro),  Rout = RD ∥ ro,  f−3dB = 1/(2π·Rout·CL)
 */
export function commonSource({ vdd, rd, k, wl, vgs, vth, lambda = 0, cl = 0 }) {
  checkDevice({ k, wl, vth, lambda });
  assert(vdd > 0, 'Besleme gerilimi sıfırdan büyük olmalı.');
  assert(rd > 0, 'RD sıfırdan büyük olmalı.');
  assert(vgs >= 0 && vgs <= vdd, 'VGS 0 ile VDD arasında olmalı.');
  assert(cl >= 0, 'Yük kapasitesi negatif olamaz.');
  const beta = k * wl;
  const vov = vgs - vth;
  if (vov <= 0) return { region: 'cutoff', id: 0, vout: vdd, gain: 0, vov };
  const kp = 0.5 * beta * vov ** 2;
  let id = (kp * (1 + lambda * vdd)) / (1 + lambda * kp * rd);
  let vds = vdd - id * rd;
  let region = 'saturation';
  if (vds < vov) {
    // Doğrusal bölge: (RD·β/2)·VDS² − (1 + RD·β·VOV)·VDS + VDD = 0, küçük kök
    region = 'triode';
    const a = (rd * beta) / 2;
    const b = 1 + rd * beta * vov;
    vds = (b - Math.sqrt(b ** 2 - 4 * a * vdd)) / (2 * a);
    id = (vdd - vds) / rd;
  }
  const dev = mosfet({ k, wl, vgs, vth, vds, lambda });
  const rout = Number.isFinite(dev.ro) ? (rd * dev.ro) / (rd + dev.ro) : rd;
  const gain = -dev.gm * rout;
  const out = {
    region, vov, id, vout: vds, gm: dev.gm, ro: dev.ro, rout, gain,
    gainDb: 20 * Math.log10(Math.abs(gain)),
    swingMin: vov, swingMax: vdd, power: vdd * id,
  };
  if (cl > 0) {
    out.f3db = 1 / (2 * Math.PI * rout * cl);
    out.gbw = Math.abs(gain) * out.f3db;
  }
  return out;
}

/**
 * Basit (iki transistörlü) akım aynası. M1 diyot bağlı (VDS1 = VGS1).
 *   Iref = ½k(W/L)₁·VOV²·(1 + λVGS) → VGS sayısal çözülür
 *   Iout = ½k(W/L)₂·VOV²·(1 + λVout) = Iref·[(W/L)₂/(W/L)₁]·(1 + λVout)/(1 + λVGS)
 *   Rout = ro₂ = 1/(λ·Iout0),  en küçük çıkış gerilimi VOV
 */
export function currentMirror({ iref, k, wl1, wl2, vth, lambda = 0, vout }) {
  checkDevice({ k, wl: wl1, vth, lambda });
  assert(wl2 > 0, '(W/L)₂ sıfırdan büyük olmalı.');
  assert(iref > 0, 'Referans akımı sıfırdan büyük olmalı.');
  assert(vout >= 0, 'Çıkış gerilimi negatif olamaz.');
  // VGS: f(v) = ½k(W/L)₁(v − VTH)²(1 + λv) − Iref = 0, v > VTH (monoton artan) → ikiye bölme
  const f = (v) => 0.5 * k * wl1 * (v - vth) ** 2 * (1 + lambda * v) - iref;
  let lo = vth;
  let hi = vth + Math.sqrt((2 * iref) / (k * wl1)) + 1e-9;
  while (f(hi) < 0) hi = vth + 2 * (hi - vth);
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid; else hi = mid;
  }
  const vgs = (lo + hi) / 2;
  const vov = vgs - vth;
  const ratio = wl2 / wl1;
  const iout0 = 0.5 * k * wl2 * vov ** 2;
  const m2 = mosfet({ k, wl: wl2, vgs, vth, vds: vout, lambda });
  return {
    vgs,
    vov,
    ratio,
    iout: m2.id,
    idealIout: iref * ratio,
    error: m2.id / (iref * ratio) - 1,
    rout: m2.ro,
    region: m2.region,
    compliance: vov,
    iout0,
  };
}
