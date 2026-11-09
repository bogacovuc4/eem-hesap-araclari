import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import {
  standardValueAtLeast, voltageDivider, dividerR2, ledResistor,
  rcCutoff, rlCutoff, seriesRlc, nonInvertingGain, invertingGain, gainDb,
} from '../src/calc/circuit.js';

describe('E serisi', () => {
  it('bir üst standart değeri bulur', () => {
    assert.equal(standardValueAtLeast(350, 'E12'), 390);
    assert.equal(standardValueAtLeast(150, 'E12'), 150);
    assertClose(standardValueAtLeast(4.8e3, 'E24'), 5.1e3, 1e-12);
    assertClose(standardValueAtLeast(8.3, 'E12'), 10, 1e-12);
  });
});

describe('gerilim bölücü', () => {
  it('12 V, 10 kΩ / 10 kΩ → 6 V, 0,6 mA', () => {
    const d = voltageDivider({ vin: 12, r1: 10e3, r2: 10e3 });
    assertClose(d.vout, 6, 1e-12);
    assertClose(d.current, 0.6e-3, 1e-12);
    assertClose(d.p1, 3.6e-3, 1e-12);
  });

  it('5 V → 3,3 V, R1 = 10 kΩ → R2 ≈ 19,41 kΩ', () => {
    assertClose(dividerR2({ vin: 5, vout: 3.3, r1: 10e3 }), 19411.76, 1e-6);
  });

  it('Vout ≥ Vin için RangeError', () => {
    assert.throws(() => dividerR2({ vin: 5, vout: 5, r1: 1e3 }), RangeError);
  });
});

describe('LED seri direnci', () => {
  it('5 V, Vf = 2 V, 20 mA → 150 Ω, 60 mW', () => {
    const led = ledResistor({ vs: 5, vf: 2, current: 20e-3 });
    assertClose(led.r, 150, 1e-12);
    assertClose(led.power, 0.06, 1e-12);
    assert.equal(led.rStandard, 150);
  });

  it('9 V, Vf = 2 V, 20 mA → 350 Ω, E12 → 390 Ω, I ≈ 17,95 mA', () => {
    const led = ledResistor({ vs: 9, vf: 2, current: 20e-3 });
    assertClose(led.r, 350, 1e-12);
    assert.equal(led.rStandard, 390);
    assertClose(led.actualCurrent, 17.949e-3, 1e-4);
  });

  it('Vs ≤ Vf için RangeError', () => {
    assert.throws(() => ledResistor({ vs: 2, vf: 3, current: 0.01 }), RangeError);
  });
});

describe('filtreler ve rezonans', () => {
  it('RC: 1 kΩ, 1 µF → fc ≈ 159,15 Hz, τ = 1 ms', () => {
    const { fc, tau } = rcCutoff({ r: 1e3, c: 1e-6 });
    assertClose(fc, 159.155, 1e-5);
    assertClose(tau, 1e-3, 1e-12);
  });

  it('RL: 1 kΩ, 10 mH → fc ≈ 15,915 kHz', () => {
    assertClose(rlCutoff({ r: 1e3, l: 10e-3 }).fc, 15915.5, 1e-5);
  });

  it('seri RLC: 10 Ω, 10 mH, 1 µF → f0 ≈ 1591,5 Hz, Q = 10, BW ≈ 159,15 Hz', () => {
    const s = seriesRlc({ r: 10, l: 10e-3, c: 1e-6 });
    assertClose(s.f0, 1591.55, 1e-5);
    assertClose(s.q, 10, 1e-12);
    assertClose(s.bandwidth, 159.155, 1e-5);
    assertClose(s.zeta, 0.05, 1e-12);
  });

  it('geçersiz girdide RangeError', () => {
    assert.throws(() => rcCutoff({ r: 0, c: 1 }), RangeError);
    assert.throws(() => seriesRlc({ r: 1, l: -1, c: 1 }), RangeError);
  });
});

describe('op-amp', () => {
  it('evirmeyen: Rf = 10 kΩ, Rg = 1 kΩ → 11 (≈ 20,83 dB)', () => {
    const g = nonInvertingGain({ rf: 10e3, rg: 1e3 });
    assert.equal(g, 11);
    assertClose(gainDb(g), 20.828, 1e-4);
  });

  it('gerilim izleyici: Rf = 0 → 1', () => {
    assert.equal(nonInvertingGain({ rf: 0, rg: 1e3 }), 1);
  });

  it('eviren: Rf = 10 kΩ, Rin = 1 kΩ → −10 (20 dB)', () => {
    const g = invertingGain({ rf: 10e3, rin: 1e3 });
    assert.equal(g, -10);
    assertClose(gainDb(g), 20, 1e-12);
  });

  it('geçersiz girdide RangeError', () => {
    assert.throws(() => invertingGain({ rf: 1, rin: 0 }), RangeError);
  });
});
