import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import {
  pointCharge, parallelPlateCapacitance, coaxialCapacitance, sphericalCapacitance,
  magneticField, solenoidInductance, toroidInductance, coaxialInductance,
} from '../src/calc/em.js';
import { ohmsLaw, fromPolar, toPolar, complexOp } from '../src/calc/basics.js';
import { rectifier, zenerRegulator, zenerDesign } from '../src/calc/electronics.js';
import { adcAnalysis, toBinary, routhTable } from '../src/calc/signals.js';
import { inductionMotor } from '../src/calc/power.js';

describe('elektromanyetik', () => {
  it('1 nC yük, 1 m: E ≈ 8,988 V/m, V ≈ 8,988 V', () => {
    const r = pointCharge({ q: 1e-9, r: 1 });
    assertClose(r.e, 8.98755, 1e-5);
    assertClose(r.v, 8.98755, 1e-5);
    assert.equal(r.force, null);
  });

  it('Coulomb: 1 µC ve 1 µC, 1 m → 8,988 mN; εr = 4 → dörtte biri', () => {
    assertClose(pointCharge({ q: 1e-6, q2: 1e-6, r: 1 }).force, 8.98755e-3, 1e-5);
    assertClose(pointCharge({ q: 1e-6, q2: 1e-6, r: 1, epsR: 4 }).force, 8.98755e-3 / 4, 1e-5);
  });

  it('paralel levha: 100 cm², 1 mm hava → 88,54 pF; 10 V → 0,885 nC, E = 10 kV/m', () => {
    const r = parallelPlateCapacitance({ area: 1e-2, d: 1e-3, v: 10 });
    assertClose(r.c, 88.5419e-12, 1e-5);
    assertClose(r.q, 885.419e-12, 1e-5);
    assertClose(r.e, 1e4, 1e-12);
    assertClose(r.energy, 0.5 * 88.5419e-12 * 100, 1e-5);
  });

  it('koaksiyel: b/a = e ise C′ = 2πε0 ≈ 55,63 pF/m', () => {
    const r = coaxialCapacitance({ a: 1e-3, b: Math.E * 1e-3, length: 2 });
    assertClose(r.perLength, 55.6325e-12, 1e-5);
    assertClose(r.c, 2 * 55.6325e-12, 1e-5);
  });

  it('küre: Dünya boyutunda yalıtılmış küre ≈ 709 µF', () => {
    assertClose(sphericalCapacitance({ a: 6.371e6 }).c, 708.9e-6, 1e-3);
    // a = 1 cm, b = 2 cm → 4πε0·0,02/0,01·0,01 = 2,2253 pF
    assertClose(sphericalCapacitance({ a: 0.01, b: 0.02 }).c, 2.2253e-12, 1e-4);
  });

  it('manyetik alan: tel, halka, solenoid, toroid', () => {
    assertClose(magneticField({ shape: 'wire', i: 1, r: 1 }).b, 2e-7, 1e-6);
    assertClose(magneticField({ shape: 'loop', i: 1, r: 0.1 }).b, 2 * Math.PI * 1e-6, 1e-6);
    const sol = magneticField({ shape: 'solenoid', i: 2, n: 1000, length: 0.5 });
    assertClose(sol.h, 4000, 1e-12);
    assertClose(sol.b, 4 * Math.PI * 1e-7 * 4000, 1e-6);
    assertClose(magneticField({ shape: 'toroid', i: 1, n: 100, r: 0.05 }).b, 4e-4, 1e-6);
  });

  it('endüktans: solenoid, toroid, koaksiyel', () => {
    // N = 100, d = 1 cm, ℓ = 10 cm → μ0·10⁴·7,854e−5/0,1 ≈ 9,87 µH
    assertClose(solenoidInductance({ n: 100, diameter: 0.01, length: 0.1 }).l, 9.8696e-6, 1e-4);
    // b/a = e, N = 10, h = 1 cm → μ0·100·0,01/(2π) = 0,2 µH
    assertClose(toroidInductance({ n: 10, a: 0.01, b: 0.01 * Math.E, h: 0.01 }).l, 2e-7, 1e-6);
    assertClose(coaxialInductance({ a: 1, b: Math.E, length: 1 }).perLength, 2e-7, 1e-6);
  });

  it('geçersiz geometriyi reddeder', () => {
    assert.throws(() => coaxialCapacitance({ a: 2, b: 1, length: 1 }), RangeError);
    assert.throws(() => pointCharge({ q: 1, r: 0 }), RangeError);
  });
});

describe('Ohm yasası', () => {
  it('her iki değer çiftinden aynı sonucu bulur (12 V, 2 A, 6 Ω, 24 W)', () => {
    const want = { v: 12, i: 2, r: 6, p: 24 };
    const pairs = [['v', 'i'], ['v', 'r'], ['i', 'r'], ['p', 'v'], ['p', 'i'], ['p', 'r']];
    for (const [a, b] of pairs) {
      const out = ohmsLaw({ [a]: want[a], [b]: want[b] });
      for (const k of Object.keys(want)) assertClose(out[k], want[k], 1e-12, `${a},${b} → ${k}`);
    }
  });

  it('iki değerden farklı sayıda girdiyi reddeder', () => {
    assert.throws(() => ohmsLaw({ v: 1 }), RangeError);
    assert.throws(() => ohmsLaw({ v: 1, i: 1, r: 1 }), RangeError);
  });
});

describe('karmaşık sayılar', () => {
  it('kutupsal ↔ dikdörtgen', () => {
    const z = fromPolar(10, 36.8699);
    assertClose(z.re, 8, 1e-5);
    assertClose(z.im, 6, 1e-5);
    const p = toPolar({ re: -1, im: -1 });
    assertClose(p.mag, Math.SQRT2, 1e-12);
    assertClose(p.deg, -135, 1e-12);
  });

  it('dört işlem ve paralel bağlama', () => {
    const a = { re: 3, im: 4 };
    const b = { re: 1, im: -2 };
    assert.deepEqual(complexOp(a, b, 'add'), { re: 4, im: 2 });
    assert.deepEqual(complexOp(a, b, 'sub'), { re: 2, im: 6 });
    assert.deepEqual(complexOp(a, b, 'mul'), { re: 11, im: -2 });
    const q = complexOp(a, b, 'div'); // (3+4j)/(1−2j) = −1 + 2j
    assertClose(q.re, -1, 1e-12);
    assertClose(q.im, 2, 1e-12);
    // 10 Ω ∥ 10 Ω = 5 Ω
    assertClose(complexOp({ re: 10, im: 0 }, { re: 10, im: 0 }, 'par').re, 5, 1e-12);
    assert.throws(() => complexOp(a, { re: 0, im: 0 }, 'div'), RangeError);
  });
});

describe('doğrultucu', () => {
  it('filtresiz köprü: 12 V RMS → Vm = 15,57 V, Vdc = 2Vm/π', () => {
    const r = rectifier({ type: 'bridge', vrms: 12, f: 50, rl: 1e3 });
    assertClose(r.vm, 12 * Math.SQRT2 - 1.4, 1e-12);
    assertClose(r.vdc, (2 * r.vm) / Math.PI, 1e-12);
    assert.equal(r.fr, 100);
    assert.equal(r.vrpp, null);
  });

  it('filtresiz yarım dalga, ideal diyot: Vdc = 0,318·Vm', () => {
    const r = rectifier({ type: 'half', vrms: 10, f: 50, rl: 1e3, vd: 0 });
    assertClose(r.vdc, (10 * Math.SQRT2) / Math.PI, 1e-12);
    assertClose(r.piv, 10 * Math.SQRT2, 1e-12);
  });

  it('kondansatörlü tam dalga: Vr(pp) = Vdc/(2fRC) ve Vdc = Vm − Vr/2', () => {
    const r = rectifier({ type: 'center', vrms: 12, f: 50, rl: 100, c: 2200e-6 });
    assertClose(r.vdc, r.vm - r.vrpp / 2, 1e-12);
    assertClose(r.vrpp, r.vdc / (100 * 100 * 2200e-6), 1e-12);
    assertClose(r.rippleFactor, r.vrpp / (2 * Math.sqrt(3)) / r.vdc, 1e-12);
  });
});

describe('zener regülatör', () => {
  // Boylestad Örnek 2.26 benzeri: Vi = 16 V, R = 1 kΩ, Vz = 10 V, RL = 3 kΩ → V = 12 V > 10 V
  it('iletimde: IR = 6 mA, IL = 3,33 mA, IZ = 2,67 mA, PZ = 26,7 mW', () => {
    const r = zenerRegulator({ vs: 16, rs: 1e3, vz: 10, rl: 3e3 });
    assert.equal(r.on, true);
    assertClose(r.ir, 6e-3, 1e-12);
    assertClose(r.il, 10 / 3e3, 1e-12);
    assertClose(r.iz, 6e-3 - 10 / 3e3, 1e-12);
    assertClose(r.pz, 10 * (6e-3 - 10 / 3e3), 1e-12);
  });

  it('RL = 1,2 kΩ ile kesimde: VL = 8,73 V', () => {
    const r = zenerRegulator({ vs: 16, rs: 1e3, vz: 10, rl: 1.2e3 });
    assert.equal(r.on, false);
    assertClose(r.vl, (16 * 1.2) / 2.2, 1e-12);
  });

  it('tasarım: Rs,max = (Vs,min − Vz)/(IL,max + IZ,min)', () => {
    const d = zenerDesign({ vsMin: 12, vsMax: 15, vz: 5.1, ilMax: 50e-3, izMin: 5e-3 });
    assertClose(d.rsMax, 6.9 / 55e-3, 1e-12);
    assertClose(d.izWorst, 9.9 / d.rsMax, 1e-12);
  });
});

describe('ADC', () => {
  it('10 bit, 5 V: LSB = 4,883 mV, SQNR = 61,96 dB', () => {
    const r = adcAnalysis({ bits: 10, vref: 5, vin: 2.5 });
    assertClose(r.lsb, 5 / 1024, 1e-12);
    assertClose(r.sqnr, 61.96, 1e-12);
    assert.equal(r.code, 512);
    assert.equal(toBinary(r.code, 10), '1000000000');
  });

  it('girdi Vref’i aşarsa en büyük koda kırpılır', () => {
    assert.equal(adcAnalysis({ bits: 8, vref: 3.3, vin: 5 }).code, 255);
  });

  it('Nyquist ve örtüşme: fs = 8 kHz, f = 5 kHz → 3 kHz’e katlanır', () => {
    const r = adcAnalysis({ bits: 12, vref: 3.3, fs: 8e3, fmax: 5e3 });
    assert.equal(r.aliasOk, false);
    assertClose(r.alias, 3e3, 1e-12);
    assert.equal(adcAnalysis({ bits: 12, vref: 3.3, fs: 44.1e3, fmax: 20e3 }).aliasOk, true);
  });
});

describe('Routh–Hurwitz', () => {
  it('s³ + s² + 2s + 8 → 2 sağ yarı düzlem kökü', () => {
    const r = routhTable([1, 1, 2, 8]);
    assert.deepEqual(r.firstColumn, [1, 1, -6, 8]);
    assert.equal(r.signChanges, 2);
    assert.equal(r.stable, false);
  });

  it('s⁴ + 2s³ + 3s² + 4s + 5 → 2 sağ yarı düzlem kökü', () => {
    const r = routhTable([1, 2, 3, 4, 5]);
    assert.deepEqual(r.firstColumn, [1, 2, 1, -6, 5]);
    assert.equal(r.signChanges, 2);
  });

  it('s³ + 6s² + 11s + 6 = (s+1)(s+2)(s+3) kararlı', () => {
    const r = routhTable([1, 6, 11, 6]);
    assert.equal(r.signChanges, 0);
    assert.equal(r.stable, true);
  });

  it('sıfır satır: s⁵ + 2s⁴ + 24s³ + 48s² − 25s − 50 → yardımcı polinom, 1 işaret değişimi', () => {
    // Kökler: ±1, ±5j, −2 (Nise, Örnek 6.5 benzeri)
    const r = routhTable([1, 2, 24, 48, -25, -50]);
    assert.equal(r.special, 'zero-row');
    assert.equal(r.signChanges, 1);
    assert.deepEqual(r.rows[2].values.slice(0, 2), [8, 96]);
  });

  it('ilk sütunda sıfır: s³ + 2s² + s + 2 → ε yöntemi (s = ±j)', () => {
    const r = routhTable([1, 2, 1, 2]);
    assert.ok(r.special);
    assert.equal(r.stable, false);
  });
});

describe('asenkron motor', () => {
  it('50 Hz, 4 kutup, 1440 d/dk, 7,5 kW → ns = 1500, s = %4, fr = 2 Hz, T ≈ 49,74 N·m', () => {
    const r = inductionMotor({ f: 50, poles: 4, nr: 1440, pout: 7500, pin: 8500 });
    assert.equal(r.ns, 1500);
    assertClose(r.slip, 0.04, 1e-12);
    assertClose(r.fr, 2, 1e-12);
    assertClose(r.torque, 49.736, 1e-4);
    assertClose(r.efficiency, 7500 / 8500, 1e-12);
  });

  it('senkron hızın üstünü ve tek kutup sayısını reddeder', () => {
    assert.throws(() => inductionMotor({ f: 50, poles: 4, nr: 1600 }), RangeError);
    assert.throws(() => inductionMotor({ f: 50, poles: 3, nr: 900 }), RangeError);
  });
});

describe('AWG tablosu', () => {
  it('AWG 36 = 0,127 mm, AWG 0000 = 11,684 mm, AWG 12 ≈ 2,053 mm', async () => {
    const { awgDiameter, awgWire, awgName } = await import('../src/calc/reference.js');
    assertClose(awgDiameter(36), 0.127e-3, 1e-12);
    assertClose(awgDiameter(-3), 11.684e-3, 1e-4);
    assertClose(awgDiameter(12), 2.0525e-3, 1e-3);
    // AWG 10 bakır ≈ 3,277 Ω/km
    assertClose(awgWire(10).rPerM * 1e3, 3.277, 2e-3);
    assert.equal(awgName(-1), '2/0');
    assert.equal(awgName(-3), '4/0');
  });
});
