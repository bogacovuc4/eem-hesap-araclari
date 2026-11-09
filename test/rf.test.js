import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import {
  microstripAnalysis,
  microstripSynthesis,
  microstripWidthEstimate,
  wavelengthFromFrequency,
  frequencyFromWavelength,
  spiralBand,
  dbmToWatt,
  wattToDbm,
  dbToPowerRatio,
  dbToVoltageRatio,
  powerRatioToDb,
  voltageRatioToDb,
  mismatchFromVswr,
  mismatchFromGamma,
  mismatchFromReturnLoss,
} from '../src/calc/rf.js';

describe('mikroşerit analiz (Hammerstad-Jensen)', () => {
  it('FR-4, h = 1,6 mm, W = 3,06 mm → yaklaşık 50 Ω', () => {
    // Yaygın tasarım değeri: FR-4 (εr = 4,4) üzerinde 50 Ω ≈ 3,06 mm
    const { z0, eeff } = microstripAnalysis({ w: 3.06e-3, h: 1.6e-3, er: 4.4 });
    assertClose(z0, 50, 0.005, 'Z0');
    assertClose(eeff, 3.33, 0.005, 'εeff');
  });

  it('alümina, εr = 9,8, h = 0,635 mm, W ≈ 0,617 mm → yaklaşık 50 Ω', () => {
    const { z0 } = microstripAnalysis({ w: 0.617e-3, h: 0.635e-3, er: 9.8 });
    assertClose(z0, 50, 0.005, 'Z0');
  });

  it('hava (εr = 1) için εeff tam olarak 1', () => {
    const { eeff } = microstripAnalysis({ w: 1, h: 1, er: 1 });
    assert.equal(eeff, 1);
  });

  it('W arttıkça Z0 azalır, εeff εr değerine yaklaşır', () => {
    const narrow = microstripAnalysis({ w: 0.1, h: 1, er: 4.4 });
    const wide = microstripAnalysis({ w: 20, h: 1, er: 4.4 });
    assert.ok(narrow.z0 > wide.z0);
    assert.ok(wide.eeff > narrow.eeff);
    assert.ok(wide.eeff < 4.4 && narrow.eeff > (4.4 + 1) / 2);
  });

  it('birimden bağımsızdır (yalnızca W/h önemlidir)', () => {
    const a = microstripAnalysis({ w: 3.06, h: 1.6, er: 4.4 });
    const b = microstripAnalysis({ w: 3.06e-3, h: 1.6e-3, er: 4.4 });
    assertClose(a.z0, b.z0, 1e-12);
  });

  it('geçersiz girdide RangeError fırlatır', () => {
    assert.throws(() => microstripAnalysis({ w: 0, h: 1, er: 4 }), RangeError);
    assert.throws(() => microstripAnalysis({ w: 1, h: -1, er: 4 }), RangeError);
    assert.throws(() => microstripAnalysis({ w: 1, h: 1, er: 0.5 }), RangeError);
  });
});

describe('mikroşerit sentez', () => {
  it('Pozar Örnek 3.7: εr = 2,20, 50 Ω → W/h ≈ 3,081, εeff ≈ 1,87', () => {
    // Pozar kitabındaki sonuç kapalı-form formülle bulunmuştur, H-J tersine çevirme ile %0,5 içinde uyuşmalı.
    const { u, eeff, uEstimate } = microstripSynthesis({ z0: 50, h: 1.27e-3, er: 2.2 });
    assertClose(u, 3.081, 0.005, 'W/h');
    assertClose(eeff, 1.87, 0.01, 'εeff');
    assertClose(uEstimate, 3.081, 0.001, 'kapalı form W/h');
  });

  it('FR-4, h = 1,6 mm, 50 Ω → W ≈ 3,06 mm', () => {
    const { w } = microstripSynthesis({ z0: 50, h: 1.6e-3, er: 4.4 });
    assertClose(w, 3.06e-3, 0.005, 'W');
  });

  it('analiz ile gidiş-dönüş tutarlıdır', () => {
    for (const z0 of [20, 50, 75, 100, 150]) {
      for (const er of [1, 2.2, 4.4, 10.2]) {
        const { w } = microstripSynthesis({ z0, h: 1e-3, er });
        const back = microstripAnalysis({ w, h: 1e-3, er });
        assertClose(back.z0, z0, 1e-9, `Z0=${z0}, εr=${er}`);
      }
    }
  });

  it('kapalı form tahmini dar hat bölgesinde de çalışır (W/h < 2)', () => {
    const u = microstripWidthEstimate({ z0: 100, er: 4.4 });
    assert.ok(u > 0 && u < 2);
  });

  it('gerçeklenemeyen Z0 için RangeError fırlatır', () => {
    assert.throws(() => microstripSynthesis({ z0: 2000, h: 1, er: 4.4 }), RangeError);
    assert.throws(() => microstripSynthesis({ z0: 0, h: 1, er: 4.4 }), RangeError);
  });
});

describe('dalga boyu ↔ frekans', () => {
  it('2,45 GHz boşlukta ≈ 12,24 cm', () => {
    assertClose(wavelengthFromFrequency({ f: 2.45e9 }), 0.122364, 1e-5);
  });

  it('εr = 4 ortamında dalga boyu yarıya iner', () => {
    const free = wavelengthFromFrequency({ f: 1e9 });
    assertClose(wavelengthFromFrequency({ f: 1e9, er: 4 }), free / 2, 1e-12);
  });

  it('1 m dalga boyu ≈ 299,79 MHz; gidiş-dönüş tutarlı', () => {
    assertClose(frequencyFromWavelength({ wavelength: 1 }), 299_792_458, 1e-12);
    const f = frequencyFromWavelength({ wavelength: wavelengthFromFrequency({ f: 5.8e9, er: 2.2 }), er: 2.2 });
    assertClose(f, 5.8e9, 1e-12);
  });

  it('geçersiz girdide RangeError', () => {
    assert.throws(() => wavelengthFromFrequency({ f: 0 }), RangeError);
    assert.throws(() => wavelengthFromFrequency({ f: 1e9, er: 0.5 }), RangeError);
  });
});

describe('Arşimet spiral bant tahmini', () => {
  it('havada r_dış = 75 mm → f_alt ≈ 636,2 MHz; r_iç = 5 mm → f_üst ≈ 9,543 GHz', () => {
    const { fLow, fHigh, ratio, eeff } = spiralBand({ rInner: 5e-3, rOuter: 75e-3, er: 1 });
    assertClose(fLow, 636.18e6, 1e-4);
    assertClose(fHigh, 9.5427e9, 1e-4);
    assertClose(ratio, 15, 1e-12);
    assert.equal(eeff, 1);
  });

  it('alt tabaka frekansları √εeff kadar düşürür', () => {
    const air = spiralBand({ rInner: 5e-3, rOuter: 75e-3, er: 1 });
    const sub = spiralBand({ rInner: 5e-3, rOuter: 75e-3, er: 3 }); // εeff = 2
    assertClose(sub.fLow, air.fLow / Math.SQRT2, 1e-12);
  });

  it('r_iç ≥ r_dış için RangeError', () => {
    assert.throws(() => spiralBand({ rInner: 75e-3, rOuter: 5e-3 }), RangeError);
  });
});

describe('dB dönüşümleri', () => {
  it('dBm ↔ W', () => {
    assertClose(dbmToWatt(0), 1e-3, 1e-12);
    assertClose(dbmToWatt(30), 1, 1e-12);
    assertClose(dbmToWatt(-30), 1e-6, 1e-12);
    assertClose(wattToDbm(0.1), 20, 1e-12);
    assert.throws(() => wattToDbm(0), RangeError);
  });

  it('dB ↔ oran', () => {
    assertClose(dbToPowerRatio(3), 1.99526, 1e-5);
    assertClose(dbToVoltageRatio(6.0206), 2, 1e-5);
    assertClose(powerRatioToDb(10), 10, 1e-12);
    assertClose(voltageRatioToDb(10), 20, 1e-12);
    assertClose(powerRatioToDb(0.5), -3.0103, 1e-5);
    assert.throws(() => voltageRatioToDb(-1), RangeError);
  });
});

describe('VSWR ↔ |Γ| ↔ RL', () => {
  it('VSWR 2 → |Γ| = 1/3, RL ≈ 9,542 dB, ML ≈ 0,5115 dB', () => {
    const m = mismatchFromVswr(2);
    assertClose(m.gamma, 1 / 3, 1e-12);
    assertClose(m.returnLoss, 9.5424, 1e-4);
    assertClose(m.mismatchLoss, 0.51153, 1e-4);
    assertClose(m.reflectedPower, 1 / 9, 1e-12);
  });

  it('VSWR 1,5 → |Γ| = 0,2, RL ≈ 13,98 dB', () => {
    const m = mismatchFromVswr(1.5);
    assertClose(m.gamma, 0.2, 1e-12);
    assertClose(m.returnLoss, 13.979, 1e-4);
  });

  it('RL 10 dB → |Γ| ≈ 0,3162, VSWR ≈ 1,925', () => {
    const m = mismatchFromReturnLoss(10);
    assertClose(m.gamma, 0.316228, 1e-5);
    assertClose(m.vswr, 1.9249, 1e-4);
  });

  it('uyumlu yük: |Γ| = 0 → VSWR 1, RL ∞', () => {
    const m = mismatchFromGamma(0);
    assert.equal(m.vswr, 1);
    assert.equal(m.returnLoss, Infinity);
  });

  it('geçersiz girdide RangeError', () => {
    assert.throws(() => mismatchFromVswr(0.9), RangeError);
    assert.throws(() => mismatchFromGamma(1), RangeError);
    assert.throws(() => mismatchFromReturnLoss(-3), RangeError);
  });
});
