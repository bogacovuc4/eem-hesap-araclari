import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import { linearSolve, parseMatrix, waveformStats } from '../src/calc/circuit3.js';
import { thermalVoltage, diodeShockley, bjtSmallSignal, sallenKeyLowpass, sallenKeyDesign, secondOrderLowpassDb } from '../src/calc/electronics.js';
import { dft, steadyStateError } from '../src/calc/signals.js';
import { erfc, qFunc, shannonCapacity, nyquistRate, bitErrorRate } from '../src/calc/comm.js';
import { dcMotor, perUnitBase, perUnitChangeBase } from '../src/calc/power.js';
import { planeWave, normalIncidence } from '../src/calc/em.js';

describe('doğrusal denklem çözücü', () => {
  it('3×3 düğüm denklemi', () => {
    // 2x − y = 1, −x + 3y − z = 0, −y + 2z = 1 → x = 0,75, y = 0,5, z = 0,75
    const { x, det } = linearSolve(parseMatrix('2 -1 0; -1 3 -1; 0 -1 2'), [1, 0, 1]);
    assertClose(x[0], 0.75, 1e-12);
    assertClose(x[1], 0.5, 1e-12);
    assertClose(x[2], 0.75, 1e-12);
    assertClose(det, 8, 1e-12);
  });

  it('pivot gerektiren sistem ve tekil matris', () => {
    const { x } = linearSolve([[0, 1], [1, 0]], [2, 3]);
    assert.deepEqual(x, [3, 2]);
    assert.throws(() => linearSolve([[1, 2], [2, 4]], [1, 2]), RangeError);
  });

  it('virgüllü ve unicode eksi işaretli girdiyi okur', () => {
    assert.deepEqual(parseMatrix('1,5 −2\n3 4'), [[1.5, -2], [3, 4]]);
  });
});

describe('dalga şekli değerleri', () => {
  it('sinüs: Vrms = Vp/√2, |V|ort = 2Vp/π, tepe faktörü √2, biçim faktörü 1,111', () => {
    const r = waveformStats({ shape: 'sine', vp: 10 });
    assertClose(r.rms, 7.0711, 1e-4);
    assertClose(r.absAvg, 6.3662, 1e-4);
    assertClose(r.crest, Math.SQRT2, 1e-12);
    assertClose(r.form, 1.1107, 1e-4);
  });

  it('yarım dalga: Vrms = Vp/2, Vdc = Vp/π, dalgalanma 1,21', () => {
    const r = waveformStats({ shape: 'half', vp: 1 });
    assertClose(r.rms, 0.5, 1e-12);
    assertClose(r.avg, 1 / Math.PI, 1e-12);
    assertClose(r.ripple, 1.211, 1e-3);
  });

  it('tam dalga dalgalanma 0,483; üçgen Vp/√3; darbe Vp√D', () => {
    assertClose(waveformStats({ shape: 'full', vp: 1 }).ripple, 0.4834, 1e-3);
    assertClose(waveformStats({ shape: 'triangle', vp: 3 }).rms, Math.sqrt(3), 1e-12);
    const p = waveformStats({ shape: 'pulse', vp: 5, duty: 0.25 });
    assertClose(p.rms, 2.5, 1e-12);
    assertClose(p.avg, 1.25, 1e-12);
  });
});

describe('diyot ve BJT', () => {
  it('VT(300 K) ≈ 25,85 mV', () => {
    assertClose(thermalVoltage(300), 0.025852, 1e-4);
  });

  it('Shockley: gerilimden akım ve akımdan gerilim birbirinin tersi', () => {
    const a = diodeShockley({ is: 1e-14, n: 1, t: 300, v: 0.7 });
    const b = diodeShockley({ is: 1e-14, n: 1, t: 300, i: a.i });
    assertClose(b.v, 0.7, 1e-10);
    // 1 mA'de rd = VT/I ≈ 25,85 Ω
    assertClose(diodeShockley({ is: 1e-14, i: 1e-3 }).rd, 25.852, 1e-3);
  });

  it('BJT: IC = 1 mA, β = 100 → gm ≈ 38,7 mS, rπ ≈ 2,585 kΩ; RE köprülü Av = −gm·RC', () => {
    const r = bjtSmallSignal({ ic: 1e-3, beta: 100, rc: 5e3 });
    assertClose(r.gm, 0.038682, 1e-4);
    assertClose(r.rpi, 2585.2, 1e-4);
    assertClose(r.av, -r.gm * 5e3, 1e-9);
  });

  it('BJT: köprülenmemiş RE ile Av ≈ −RC/RE’ye yaklaşır', () => {
    const r = bjtSmallSignal({ ic: 1e-3, beta: 200, rc: 10e3, re: 1e3 });
    assertClose(r.av, (-200 * 10e3) / (r.rpi + 201 * 1e3), 1e-12);
    assert.ok(Math.abs(r.av) < 10 && Math.abs(r.av) > 9.5);
  });
});

describe('Sallen–Key', () => {
  it('eşit R ve C: Q = 0,5; f0 = 1/(2πRC)', () => {
    const r = sallenKeyLowpass({ r1: 10e3, r2: 10e3, c1: 10e-9, c2: 10e-9 });
    assertClose(r.q, 0.5, 1e-12);
    assertClose(r.f0, 1 / (2 * Math.PI * 1e-4), 1e-12);
  });

  it('tasarım → analiz aynı f0 ve Q’yu verir (Butterworth)', () => {
    const d = sallenKeyDesign({ f0: 1e3, q: Math.SQRT1_2, c2: 10e-9 });
    const r = sallenKeyLowpass({ r1: d.r, r2: d.r, c1: d.c1, c2: d.c2 });
    assertClose(r.f0, 1e3, 1e-10);
    assertClose(r.q, Math.SQRT1_2, 1e-10);
    // Butterworth: f0'da −3 dB
    assertClose(secondOrderLowpassDb(1e3, 1e3, Math.SQRT1_2), -3.0103, 1e-4);
  });
});

describe('DFT', () => {
  it('[1, 0, 0, 0] → düz spektrum; [1, 1, 1, 1] → yalnız DC', () => {
    assert.ok(dft([1, 0, 0, 0]).every((b) => Math.abs(b.mag - 1) < 1e-12));
    const d = dft([1, 1, 1, 1]);
    assert.equal(d[0].mag, 4);
    assert.ok(d.slice(1).every((b) => b.mag === 0));
  });

  it('cos(2πn/8) 8 örnek → X[1] = X[7] = 4', () => {
    const x = Array.from({ length: 8 }, (_, n) => Math.cos((2 * Math.PI * n) / 8));
    const d = dft(x);
    assertClose(d[1].mag, 4, 1e-12);
    assertClose(d[7].mag, 4, 1e-12);
    assert.ok(Math.abs(d[2].mag) < 1e-9);
  });
});

describe('kararlı hal hatası', () => {
  it('tip 0: G = 10/(s+2) → Kp = 5, basamak hatası 1/6', () => {
    const r = steadyStateError([10], [1, 2]);
    assert.equal(r.type, 0);
    assertClose(r.kp, 5, 1e-12);
    assertClose(r.eStep, 1 / 6, 1e-12);
    assert.equal(r.eRamp, Infinity);
    assert.equal(r.stable, true);
  });

  it('tip 1: G = 100(s+2)/(s(s+5)(s+10)) → Kv = 4, rampa hatası 0,25', () => {
    // payda s³ + 15s² + 50s
    const r = steadyStateError([100, 200], [1, 15, 50, 0]);
    assert.equal(r.type, 1);
    assert.equal(r.kp, Infinity);
    assertClose(r.kv, 4, 1e-12);
    assertClose(r.eRamp, 0.25, 1e-12);
    assert.equal(r.eStep, 0);
  });

  it('kararsız kapalı çevrimi işaretler', () => {
    // G = 10/(s(s−1)) → D + N = s² − s + 10
    assert.equal(steadyStateError([10], [1, -1, 0]).stable, false);
  });
});

describe('haberleşme', () => {
  it('erfc ve Q fonksiyonu', () => {
    assertClose(erfc(1), 0.157299, 1e-5);
    assertClose(qFunc(3), 1.3499e-3, 1e-3);
  });

  it('Shannon: 3 kHz, 30 dB → ≈ 29,9 kb/s; Nyquist 2B·log2 M', () => {
    assertClose(shannonCapacity({ b: 3e3, snr: 1000 }).c, 29901.7, 1e-5);
    assert.equal(nyquistRate({ b: 3e3, m: 4 }), 12e3);
  });

  it('BPSK, Eb/N0 = 9,6 dB → BER ≈ 1×10⁻⁵', () => {
    const ebn0 = 10 ** (9.6 / 10);
    const ber = bitErrorRate('bpsk', ebn0);
    assert.ok(ber > 0.9e-5 && ber < 1.1e-5, String(ber));
    assertClose(bitErrorRate('dbpsk', 1), 0.5 * Math.exp(-1), 1e-12);
  });
});

describe('güç sistemleri', () => {
  it('DC motor: 220 V, Ra = 0,5 Ω, Ia = 20 A, 1500 d/dk', () => {
    const r = dcMotor({ v: 220, ra: 0.5, ia: 20, n: 1500, ia2: 40 });
    assert.equal(r.ea, 210);
    assertClose(r.kphi, 210 / (2 * Math.PI * 25), 1e-12);
    assertClose(r.torque, r.kphi * 20, 1e-12);
    assertClose(r.n2, (200 / 210) * 1500, 1e-12);
    assertClose(r.n0, (220 / 210) * 1500, 1e-12);
  });

  it('pu: 100 MVA, 154 kV → Zb = 237,16 Ω; baz değiştirme', () => {
    const b = perUnitBase({ sb: 100e6, vb: 154e3 });
    assertClose(b.zb, 237.16, 1e-12);
    assertClose(b.ib, 374.9, 1e-4);
    // %10 (50 MVA bazında) → 100 MVA bazında 0,2 pu
    assertClose(perUnitChangeBase({ zpu: 0.1, sOld: 50e6, vOld: 154e3, sNew: 100e6, vNew: 154e3 }), 0.2, 1e-12);
  });
});

describe('düzlem dalga', () => {
  it('kayıpsız εr = 4: η ≈ 188,4 Ω, λ = λ0/2, α = 0', () => {
    const r = planeWave({ f: 1e9, epsR: 4 });
    assertClose(r.etaMag, 188.365, 1e-4);
    assertClose(r.lambda, 0.149896, 1e-5);
    assert.equal(r.alpha, 0);
  });

  it('bakır 1 MHz: δ ≈ 66,1 µm, η açısı 45°', () => {
    const r = planeWave({ f: 1e6, sigma: 5.8e7 });
    assertClose(r.delta, 66.09e-6, 1e-3);
    assertClose(r.etaDeg, 45, 1e-6);
  });

  it('hava → cam (εr = 4): Γ = −1/3, iletilen güç %88,9', () => {
    const r = normalIncidence({ epsR2: 4 });
    assertClose(r.gamma, -1 / 3, 1e-12);
    assertClose(r.transmitted, 8 / 9, 1e-12);
    assertClose(r.swr, 2, 1e-12);
  });
});
