import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import {
  parallelRlc, impedance, powerTriangle, pfCorrection, timer555Astable, timer555Monostable,
  wheatstoneBalance, wheatstoneOutput, theveninToNorton, nortonToThevenin, deltaToWye, wyeToDelta,
  cableSection, RESISTIVITY,
} from '../src/calc/circuit2.js';

describe('paralel RLC', () => {
  it('1 kΩ, 10 mH, 1 µF → f0 ≈ 1591,5 Hz, Q = 10, BW ≈ 159,15 Hz', () => {
    const r = parallelRlc({ r: 1e3, l: 10e-3, c: 1e-6 });
    assertClose(r.f0, 1591.549, 1e-6);
    assertClose(r.q, 10, 1e-12);
    assertClose(r.bandwidth, 159.155, 1e-5);
    assert.equal(r.zRes, 1e3);
  });

  it('seri RLC’nin tersine: R büyüdükçe Q artar', () => {
    assert.ok(parallelRlc({ r: 10e3, l: 1e-3, c: 1e-9 }).q > parallelRlc({ r: 1e3, l: 1e-3, c: 1e-9 }).q);
  });
});

describe('empedans', () => {
  it('seri 100 Ω, 10 mH, 1 µF, 1 kHz → 100 − j96,32 Ω, −43,93°', () => {
    const r = impedance({ connection: 'series', r: 100, l: 10e-3, c: 1e-6, f: 1e3 });
    assertClose(r.z.re, 100, 1e-12);
    assertClose(r.z.im, -96.3231, 1e-5);
    assertClose(r.phase, -43.9270, 1e-5);
  });

  it('paralel aynı elemanlar → 51,87 + j49,96 Ω', () => {
    const r = impedance({ connection: 'parallel', r: 100, l: 10e-3, c: 1e-6, f: 1e3 });
    assertClose(r.z.re, 51.8722, 1e-5);
    assertClose(r.z.im, 49.9649, 1e-5);
  });

  it('seri devrede C = 0 kondansatörsüz (yalnız RL) demektir', () => {
    const r = impedance({ connection: 'series', r: 3, l: 4 / (2 * Math.PI * 50), c: 0, f: 50 });
    assertClose(r.mag, 5, 1e-12);
  });

  it('gerilim verilince akım ve güçler: P = I²R', () => {
    const r = impedance({ connection: 'series', r: 3, l: 4 / (2 * Math.PI * 50), f: 50, vrms: 10 });
    assertClose(r.irms, 2, 1e-12);
    assertClose(r.p, 12, 1e-12);
    assertClose(r.q, 16, 1e-12);
    assertClose(r.s, 20, 1e-12);
  });

  it('rezonansta R = 0 seri devre: RangeError', () => {
    const f = 1 / (2 * Math.PI * Math.sqrt(1e-3 * 1e-6));
    assert.throws(() => impedance({ connection: 'series', r: 0, l: 1e-3, c: 1e-6, f }), RangeError);
  });

  it('rezonansta kayıpsız paralel LC: RangeError (Z → ∞)', () => {
    const f = 1 / (2 * Math.PI * Math.sqrt(1e-3 * 1e-6));
    assert.throws(() => impedance({ connection: 'parallel', r: 0, l: 1e-3, c: 1e-6, f }), RangeError);
  });
});

describe('AC güç', () => {
  it('güç üçgeni: 230 V, 10 A, PF 0,8 → S = 2300 VA, P = 1840 W, Q = 1380 VAr', () => {
    const r = powerTriangle({ vrms: 230, irms: 10, pf: 0.8 });
    assertClose(r.s, 2300, 1e-12);
    assertClose(r.p, 1840, 1e-12);
    assertClose(r.q, 1380, 1e-9);
  });

  it('PF düzeltme (tek faz): 10 kW, 0,7 → 0,95, 230 V, 50 Hz → Qc ≈ 6,915 kVAr, C ≈ 416 µF', () => {
    const r = pfCorrection({ p: 10e3, pf1: 0.7, pf2: 0.95, vrms: 230, f: 50 });
    assertClose(r.qc, 6915.20, 1e-5);
    assertClose(r.capacitance, 416.101e-6, 1e-5);
    assertClose(r.i1, 62.1118, 1e-5);
    assertClose(r.i2, 45.7666, 1e-5);
  });

  it('PF düzeltme (üç faz, üçgen bağlı): 400 V → faz başına ≈ 45,86 µF', () => {
    const r = pfCorrection({ p: 10e3, pf1: 0.7, pf2: 0.95, vrms: 400, f: 50, phases: 3 });
    assertClose(r.capacitance, 45.8578e-6, 1e-5);
    assertClose(r.i1, 20.6197, 1e-5);
  });

  it('hedef PF mevcut PF’den küçükse RangeError', () => {
    assert.throws(() => pfCorrection({ p: 1, pf1: 0.9, pf2: 0.8, vrms: 230, f: 50 }), RangeError);
  });
});

describe('555 zamanlayıcı', () => {
  it('astable: R1 = 1 k, R2 = 10 k, C = 10 µF → f ≈ 6,870 Hz, görev ≈ %52,4', () => {
    const r = timer555Astable({ r1: 1e3, r2: 10e3, c: 10e-6 });
    assertClose(r.f, 6.86998, 1e-5);
    assertClose(r.duty, 0.523810, 1e-5);
    assertClose(r.tHigh, 0.0762462, 1e-5);
  });

  it('monostable: 10 kΩ, 100 µF → ≈ 1,099 s (≈ 1,1RC)', () => {
    assertClose(timer555Monostable({ r: 10e3, c: 100e-6 }).width, 1.09861, 1e-5);
  });
});

describe('Wheatstone köprüsü', () => {
  it('denge: Rx = R3·R2/R1', () => {
    assertClose(wheatstoneBalance({ r1: 1e3, r2: 2e3, r3: 500 }).rx, 1e3, 1e-12);
  });

  it('dengesiz: 10 V, 1 k / 1 k / 1 k / 1,1 k → Vout ≈ −0,2381 V', () => {
    const r = wheatstoneOutput({ vs: 10, r1: 1e3, r2: 1e3, r3: 1e3, rx: 1.1e3 });
    assertClose(r.vout, -0.238095, 1e-5);
    assert.equal(r.balanced, false);
  });

  it('denge değerinde çıkış sıfır', () => {
    const { rx } = wheatstoneBalance({ r1: 470, r2: 1e3, r3: 330 });
    assert.ok(wheatstoneOutput({ vs: 5, r1: 470, r2: 1e3, r3: 330, rx }).balanced);
  });
});

describe('Thevenin ↔ Norton', () => {
  it('12 V, 4 Ω → 3 A, 4 Ω; ters dönüşüm tutarlı', () => {
    const n = theveninToNorton({ vth: 12, rth: 4 });
    assert.equal(n.in, 3);
    assert.equal(n.rn, 4);
    const t = nortonToThevenin({ in: 3, rn: 4 });
    assert.equal(t.vth, 12);
  });

  it('yük: RL = Rth’de güç en büyük (Vth²/4Rth = 9 W)', () => {
    const r = theveninToNorton({ vth: 12, rth: 4, rl: 4 });
    assertClose(r.pl, 9, 1e-12);
    assertClose(r.pmax, 9, 1e-12);
    assert.ok(theveninToNorton({ vth: 12, rth: 4, rl: 8 }).pl < 9);
  });
});

describe('yıldız ↔ üçgen', () => {
  it('dengeli: Δ 30 Ω → Y 10 Ω', () => {
    const y = deltaToWye({ rab: 30, rbc: 30, rca: 30 });
    assertClose(y.ra, 10, 1e-12);
    assertClose(y.rc, 10, 1e-12);
  });

  it('Y 10/20/30 Ω → Δ: Rab = 36,67, Rbc = 110, Rca = 55 Ω', () => {
    const d = wyeToDelta({ ra: 10, rb: 20, rc: 30 });
    assertClose(d.rab, 36.6667, 1e-5);
    assertClose(d.rbc, 110, 1e-12);
    assertClose(d.rca, 55, 1e-12);
  });

  it('gidiş-dönüş tutarlı', () => {
    const y = deltaToWye({ rab: 12, rbc: 47, rca: 33 });
    const d = wyeToDelta(y);
    assertClose(d.rab, 12, 1e-12);
    assertClose(d.rbc, 47, 1e-12);
    assertClose(d.rca, 33, 1e-12);
  });
});

describe('iletken kesiti', () => {
  it('tek faz 230 V, 16 A, 30 m, %3 → 2,43 mm² → 2,5 mm², düşüm ≈ %2,92', () => {
    const r = cableSection({ current: 16, length: 30, voltage: 230, dropPct: 3, rho: RESISTIVITY['Bakır'] });
    assertClose(r.area, 2.43478, 1e-5);
    assert.equal(r.standard, 2.5);
    assertClose(r.dropPct, 2.92174, 1e-5);
  });

  it('üç faz √3 katsayısı kullanır; DC gidiş-dönüş 2 katsayısı', () => {
    const tri = cableSection({ current: 50, length: 100, voltage: 400, dropPct: 3, rho: 0.0175, system: '3ph', pf: 0.85 });
    assertClose(tri.area, (Math.sqrt(3) * 0.0175 * 100 * 50 * 0.85) / 12, 1e-12);
    const dc = cableSection({ current: 10, length: 10, voltage: 12, dropPct: 3, rho: 0.0175, system: 'dc', pf: 0.5 });
    assertClose(dc.area, (2 * 0.0175 * 10 * 10) / 0.36, 1e-12);
  });

  it('çok büyük kesit gerekiyorsa standart değer yok', () => {
    assert.equal(cableSection({ current: 2000, length: 1000, voltage: 230, dropPct: 1, rho: 0.0175 }).standard, null);
  });
});
