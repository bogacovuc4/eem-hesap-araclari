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
  freeSpacePathLoss,
  linkBudget,
  linkRange,
  patchAntenna,
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

describe('Friis / link bütçesi', () => {
  it('serbest uzay yol kaybı: 1 km, 2,4 GHz → 100,05 dB; 1 m, 1 GHz → 32,45 dB', () => {
    assertClose(freeSpacePathLoss({ d: 1000, f: 2.4e9 }), 100.052, 1e-5);
    assertClose(freeSpacePathLoss({ d: 1, f: 1e9 }), 32.4478, 1e-5);
  });

  it('mesafe iki katına çıkınca kayıp 6,02 dB artar', () => {
    const a = freeSpacePathLoss({ d: 500, f: 5.8e9 });
    const b = freeSpacePathLoss({ d: 1000, f: 5.8e9 });
    assertClose(b - a, 6.0206, 1e-4);
  });

  it('Pr = Pt + Gt + Gr − FSPL − L; pay = Pr − duyarlılık', () => {
    const r = linkBudget({ pt: 20, gt: 6, gr: 3, f: 2.4e9, d: 1000, losses: 2, sensitivity: -90 });
    assertClose(r.pr, 20 + 6 + 3 - 100.052 - 2, 1e-5);
    assertClose(r.margin, r.pr + 90, 1e-12);
    assert.equal(r.eirp, 26);
  });

  it('menzil hesabı link bütçesiyle tutarlı (gidiş-dönüş)', () => {
    const { distance } = linkRange({ pt: 20, gt: 6, gr: 3, f: 2.4e9, losses: 2, sensitivity: -90, margin: 10 });
    const back = linkBudget({ pt: 20, gt: 6, gr: 3, f: 2.4e9, d: distance, losses: 2, sensitivity: -90 });
    assertClose(back.margin, 10, 1e-9);
  });

  it('geçersiz girdide RangeError', () => {
    assert.throws(() => freeSpacePathLoss({ d: 0, f: 1e9 }), RangeError);
    assert.throws(() => linkBudget({ pt: 0, gt: 0, gr: 0, f: 1e9, d: 1, losses: -1 }), RangeError);
  });
});

describe('yama (patch) anten', () => {
  // Balanis, Antenna Theory, Örnek 14.1–14.3: f = 10 GHz, εr = 2,2, h = 0,1588 cm
  const p = patchAntenna({ f: 10e9, er: 2.2, h: 0.1588e-2 });

  it('W ≈ 1,186 cm, εeff ≈ 1,972, ΔL ≈ 0,081 cm, L ≈ 0,906 cm', () => {
    assertClose(p.w, 1.186e-2, 1e-3);
    assertClose(p.eeff, 1.972, 1e-3);
    assertClose(p.dl, 0.081e-2, 5e-3);
    assertClose(p.l, 0.906e-2, 1e-3);
  });

  it('kenar direnci ≈ 228 Ω (G1 + G12), 50 Ω girintisi y0 ≈ 0,3126 cm', () => {
    assertClose(p.g1, 0.00157, 0.01);
    assertClose(p.rEdge, 228.3, 0.005);
    assertClose(p.inset, 0.3126e-2, 0.005);
  });

  it('hedef empedans kenar direncinden büyükse girinti yok', () => {
    assert.equal(patchAntenna({ f: 10e9, er: 2.2, h: 0.1588e-2, z0: 300 }).inset, null);
  });

  it('geçersiz girdide RangeError', () => {
    assert.throws(() => patchAntenna({ f: 10e9, er: 1, h: 1e-3 }), RangeError);
    assert.throws(() => patchAntenna({ f: 0, er: 4.4, h: 1e-3 }), RangeError);
  });
});
