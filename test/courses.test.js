import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import { bjtDividerBias } from '../src/calc/electronics.js';
import {
  fourierCoefficient, fourierSeries, idealWave, bodeAnalysis, magnitudeDbAt, phaseAt, parseList,
  secondOrderStep, secondOrderMetrics,
} from '../src/calc/signals.js';
import { transformerRatings, reflectImpedance, transformerPerformance, threePhaseFromLine, threePhaseFromImpedance } from '../src/calc/power.js';
import { besselJn, amModulation, fmModulation } from '../src/calc/comm.js';
import { minimizeSop, evaluateSop, parseTermList, karnaughLayout, termToText } from '../src/calc/logic.js';

describe('BJT gerilim bölücülü polarma', () => {
  // Boylestad, Örnek 4.7: VCC = 22 V, R1 = 39 k, R2 = 3,9 k, RC = 10 k, RE = 1,5 k, β = 140
  const r = bjtDividerBias({ vcc: 22, r1: 39e3, r2: 3.9e3, rc: 10e3, re: 1.5e3, beta: 140 });

  it('VTH = 2 V, RTH = 3,55 kΩ, IB ≈ 6,05 µA, IC ≈ 0,85 mA, VCE ≈ 12,2 V', () => {
    assertClose(r.vth, 2, 1e-12);
    assertClose(r.rth, 3545.45, 1e-5);
    assertClose(r.ib, 6.05e-6, 2e-3);
    assertClose(r.ic, 0.85e-3, 5e-3);
    assertClose(r.vce, 12.22, 5e-3);
    assert.equal(r.region, 'active');
  });

  it('VTH < VBE → kesim', () => {
    assert.equal(bjtDividerBias({ vcc: 5, r1: 100e3, r2: 10e3, rc: 1e3, re: 100, beta: 100 }).region, 'cutoff');
  });

  it('küçük RC/RE ve büyük taban akımı → doyma', () => {
    const s = bjtDividerBias({ vcc: 10, r1: 1e3, r2: 1e3, rc: 10e3, re: 10, beta: 200 });
    assert.equal(s.region, 'saturation');
    assertClose(s.ic, (10 - 0.2) / (10e3 + 10), 1e-12);
  });
});

describe('Fourier serisi', () => {
  it('kare dalga: b1 = 4/π, b2 = 0, b3 = 4/(3π)', () => {
    assertClose(fourierCoefficient('square', 1), 1.27324, 1e-5);
    assert.equal(fourierCoefficient('square', 2), 0);
    assertClose(fourierCoefficient('square', 3), 0.424413, 1e-5);
  });

  it('üçgen b1 = 8/π², b3 negatif; testere b1 = 2/π, b2 = −1/π', () => {
    assertClose(fourierCoefficient('triangle', 1), 0.810569, 1e-5);
    assert.ok(fourierCoefficient('triangle', 3) < 0);
    assertClose(fourierCoefficient('sawtooth', 1), 0.63662, 1e-5);
    assertClose(fourierCoefficient('sawtooth', 2), -0.31831, 1e-5);
  });

  it('kare dalga THD sınırı √(π²/8 − 1) ≈ %48,34; çok harmonikle yaklaşır', () => {
    assertClose(fourierSeries({ wave: 'square', f: 50, harmonics: 199 }).thd, 0.48334, 0.01);
  });

  it('kısmi toplam ideal dalgaya yakınsar (tepe köşesinde hata ≈ 8A/π²·1/(2N) ≈ %0,8)', () => {
    const s = fourierSeries({ wave: 'triangle', amplitude: 2, f: 1, harmonics: 51 });
    assertClose(s.partial(0.25), idealWave('triangle', 0.25, 1, 2), 1e-2);
    assertClose(s.partial(0.1), idealWave('triangle', 0.1, 1, 2), 1e-2);
    assertClose(s.rms, s.idealRms, 1e-3);
  });

  it('geçersiz harmonik sayısı RangeError', () => {
    assert.throws(() => fourierSeries({ wave: 'square', f: 1, harmonics: 0 }), RangeError);
  });
});

describe('Bode diyagramı', () => {
  it('tek kutup: köşede −3,01 dB ve −45°', () => {
    const sys = { k: 1, poles: [100] };
    assertClose(magnitudeDbAt(100, sys), -3.0103, 1e-4);
    assertClose(phaseAt(100, sys), -45, 1e-12);
  });

  it('K = 10, kutup 100 Hz → kazanç kesişimi ≈ 995 Hz, faz payı ≈ 95,74°', () => {
    const b = bodeAnalysis({ k: 10, poles: [100] });
    assertClose(b.gainCrossover, 994.96, 1e-4);
    assertClose(b.phaseMargin, 95.739, 1e-4);
    assert.equal(b.phaseCrossover, null);
  });

  it('K = 100, kutuplar 10/100/1000 Hz → FM ≈ 3,49°, KM ≈ 1,74 dB; K = 1000 kararsız', () => {
    const a = bodeAnalysis({ k: 100, poles: [10, 100, 1000] });
    assertClose(a.phaseMargin, 3.488, 2e-3);
    assertClose(a.gainMargin, 1.7415, 1e-3);
    assertClose(a.phaseCrossover, 333.154, 1e-4);
    const u = bodeAnalysis({ k: 1000, poles: [10, 100, 1000] });
    assert.ok(u.phaseMargin < 0 && u.gainMargin < 0);
  });

  it('liste ayrıştırma', () => {
    assert.deepEqual(parseList('10; 100 1e3'), [10, 100, 1000]);
    assert.deepEqual(parseList('10, 100, 2,5'), [10, 100, 2.5]);
    assert.deepEqual(parseList(''), []);
    assert.throws(() => parseList('abc'), RangeError);
  });
});

describe('ikinci derece sistem', () => {
  it('ζ = 0,5, ωn = 1 → aşım %16,30, tp ≈ 3,628 s, ts(%2) ≈ 8,08 s, tr ≈ 1,64 s', () => {
    const m = secondOrderMetrics({ zeta: 0.5, wn: 1 });
    assertClose(m.overshoot, 0.163034, 1e-5);
    assertClose(m.tPeak, 3.6276, 1e-4);
    assertClose(m.settlingTime, 8.0764, 2e-3);
    assertClose(m.riseTime, 1.6376, 2e-3);
  });

  it('kritik ve aşırı sönümde aşım yok, yanıt 1’e gider', () => {
    assert.equal(secondOrderMetrics({ zeta: 1, wn: 2 }).overshoot, 0);
    assertClose(secondOrderStep(50, { zeta: 2, wn: 1 }), 1, 1e-5); // yavaş kutup 0,268: e^(−13,4) ≈ 1,5·10⁻⁶
    assert.ok(secondOrderStep(1, { zeta: 2, wn: 1 }) < secondOrderStep(1, { zeta: 1, wn: 1 }));
  });

  it('ζ = 0 RangeError (yerleşme yok)', () => {
    assert.throws(() => secondOrderMetrics({ zeta: 0, wn: 1 }), RangeError);
  });
});

describe('transformatör', () => {
  it('2300/230 V, 50 kVA → a = 10, I1 ≈ 21,74 A, I2 ≈ 217,4 A; 8 Ω yük primerde 800 Ω', () => {
    const r = transformerRatings({ v1: 2300, v2: 230, s: 50e3 });
    assert.equal(r.a, 10);
    assertClose(r.i1, 21.7391, 1e-5);
    assertClose(r.i2, 217.391, 1e-5);
    assert.equal(reflectImpedance({ a: 10, z: 8 }).primary, 800);
  });

  it('100 kVA, Pfe 500 W, Pcu 1500 W, tam yük cos φ 0,8 → η ≈ %97,56, en yüksek verim %57,7 yükte', () => {
    const p = transformerPerformance({ s: 100e3, load: 1, pf: 0.8, pfe: 500, pcu: 1500, uk: 0.05 });
    assertClose(p.efficiency, 0.97561, 1e-5);
    assertClose(p.maxEffLoad, 0.57735, 1e-5);
    assertClose(p.regulation, 0.040618, 1e-4);
  });
});

describe('üç faz', () => {
  it('400 V, 10 A, cos φ 0,85 → P ≈ 5,889 kW; Y’de Vfaz ≈ 230,9 V; Δ’da Ifaz ≈ 5,774 A', () => {
    const y = threePhaseFromLine({ vll: 400, il: 10, pf: 0.85, connection: 'Y' });
    assertClose(y.p, 5888.97, 1e-5);
    assertClose(y.vph, 230.940, 1e-5);
    const d = threePhaseFromLine({ vll: 400, il: 10, pf: 0.85, connection: 'D' });
    assertClose(d.iph, 5.7735, 1e-5);
  });

  it('Z = 10 + j10 Ω: Y → 16,33 A, 8 kW; Δ → IL ≈ 48,99 A, 24 kW (Δ yük Y’nin 3 katı güç çeker)', () => {
    const y = threePhaseFromImpedance({ vll: 400, r: 10, x: 10, connection: 'Y' });
    assertClose(y.il, 16.3299, 1e-5);
    assertClose(y.p, 8000, 1e-9);
    const d = threePhaseFromImpedance({ vll: 400, r: 10, x: 10, connection: 'D' });
    assertClose(d.il, 48.9898, 1e-5);
    assertClose(d.p, 24000, 1e-9);
    assertClose(d.pf, Math.SQRT1_2, 1e-12);
  });
});

describe('AM / FM', () => {
  it('Bessel: J0(2,405) ≈ 0, J1(1) ≈ 0,4401, J0(5) ≈ −0,1776', () => {
    assert.ok(Math.abs(besselJn(0, 2.404826)) < 1e-6);
    assertClose(besselJn(1, 1), 0.440051, 1e-5);
    assertClose(besselJn(0, 5), -0.177597, 1e-4);
  });

  it('AM m = 0,5 → Pt = 1,125·Pc, verim %11,1, B = 2fm', () => {
    const a = amModulation({ pc: 100, m: 0.5, fc: 1e6, fm: 5e3 });
    assertClose(a.total, 112.5, 1e-12);
    assertClose(a.efficiency, 0.111111, 1e-5);
    assert.equal(a.bandwidth, 10e3);
    assert.equal(a.overmodulated, false);
    assert.equal(amModulation({ pc: 1, m: 1.2, fc: 1e6, fm: 1e3 }).overmodulated, true);
  });

  it('FM yayın: Δf = 75 kHz, fm = 15 kHz → β = 5, Carson 180 kHz', () => {
    const f = fmModulation({ deviation: 75e3, fm: 15e3 });
    assert.equal(f.beta, 5);
    assert.equal(f.carson, 180e3);
    assert.ok(f.sidebandPairs >= 6 && f.sidebandPairs <= 8);
    const total = f.lines.reduce((s, l) => s + (l.n === 0 ? 1 : 2) * l.j ** 2, 0);
    assertClose(total, 1, 2e-3);
  });
});

describe('mantık sadeleştirme', () => {
  const check = (v, mins, dcs = []) => {
    const r = minimizeSop({ variables: v, minterms: mins, dontCares: dcs });
    for (let m = 0; m < 2 ** v; m += 1) {
      if (dcs.includes(m)) continue;
      assert.equal(evaluateSop(r.terms, m, v), mins.includes(m), `minterm ${m}`);
    }
    return r;
  };

  it('Σm(1,3,5,7) → C', () => {
    assert.equal(check(3, [1, 3, 5, 7]).expression, 'C');
  });

  it('Σm(0,1,2,5,6,7) → 3 terim (döngüsel örtü)', () => {
    assert.equal(check(3, [0, 1, 2, 5, 6, 7]).terms.length, 3);
  });

  it('Σm(1,3,7,11,15) + d(0,2,5) → iki terim, 4 literal (A′B′ + CD ya da A′D + CD)', () => {
    const r = check(4, [1, 3, 7, 11, 15], [0, 2, 5]);
    assert.equal(r.terms.length, 2);
    assert.ok(r.expression.includes('CD'));
    assert.equal(r.terms.join('').replace(/-/g, '').length, 4);
  });

  it('Σm(0,2,5,7,8,10,13,15) → B′D′ + BD', () => {
    const r = check(4, [0, 2, 5, 7, 8, 10, 13, 15]);
    assert.deepEqual(r.expression.split(' + ').sort(), ['B′D′', 'BD'].sort());
  });

  it('boş fonksiyon 0, tümü 1', () => {
    assert.equal(minimizeSop({ variables: 3, minterms: [] }).expression, '0');
    assert.equal(minimizeSop({ variables: 2, minterms: [0, 1, 2, 3] }).expression, '1');
  });

  it('aralık dışı ve çakışan terim RangeError', () => {
    assert.throws(() => minimizeSop({ variables: 2, minterms: [4] }), RangeError);
    assert.throws(() => minimizeSop({ variables: 3, minterms: [1], dontCares: [1] }), RangeError);
  });

  it('liste ayrıştırma, harita düzeni ve terim yazımı', () => {
    assert.deepEqual(parseTermList('0-3, 8 10'), [0, 1, 2, 3, 8, 10]);
    const k = karnaughLayout(4);
    assert.deepEqual(k.cells[2], [12, 13, 15, 14]);
    assert.equal(termToText('01-1'), 'A′BD');
  });
});
