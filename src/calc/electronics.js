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
