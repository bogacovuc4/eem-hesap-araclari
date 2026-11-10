import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import {
  quarterWaveTransformer, lineInputImpedance, coaxAnalysis, coaxRatioForZ0, skinDepth, CONDUCTIVITY,
  noiseFigureToTemp, noiseTempToFigure, cascadeNoise, thermalNoise,
  antennaBasics, gainFromAperture, radarReceivedPower, radarMaxRange,
} from '../src/calc/rf2.js';

describe('çeyrek dalga dönüştürücü', () => {
  it('Pozar Örnek 5.5: Z0 = 50 Ω, ZL = 10 Ω, VSWR 1,5 → Z1 = 22,36 Ω, bant genişliği %29', () => {
    const r = quarterWaveTransformer({ z0: 50, zl: 10, f: 3e9, gammaMax: 0.2 });
    assertClose(r.z1, 22.3607, 1e-5);
    assertClose(r.bandwidth, 0.29316, 1e-4);
  });

  it('uzunluk λg/4: 3 GHz, εeff = 1 → 25 mm; εeff = 4 → 12,5 mm', () => {
    assertClose(quarterWaveTransformer({ z0: 50, zl: 100, f: 3e9 }).length, 0.0249827, 1e-5);
    assertClose(quarterWaveTransformer({ z0: 50, zl: 100, f: 3e9, eeff: 4 }).length, 0.0124913, 1e-5);
  });

  it('geçersiz girdide RangeError', () => {
    assert.throws(() => quarterWaveTransformer({ z0: 50, zl: 0, f: 1e9 }), RangeError);
    assert.throws(() => quarterWaveTransformer({ z0: 50, zl: 100, f: 1e9, gammaMax: 1 }), RangeError);
  });
});

describe('hat giriş empedansı', () => {
  it('uyumlu yük: Zin = Z0 her uzunlukta', () => {
    const r = lineInputImpedance({ z0: 50, rl: 50, electrical: 0.137 });
    assertClose(r.zin.re, 50, 1e-12);
    assert.ok(Math.abs(r.zin.im) < 1e-9);
  });

  it('çeyrek dalga: Zin = Z0²/ZL (100 Ω → 25 Ω)', () => {
    const r = lineInputImpedance({ z0: 50, rl: 100, electrical: 0.25 });
    assertClose(r.zin.re, 25, 1e-9);
    assert.ok(Math.abs(r.zin.im) < 1e-6);
  });

  it('kısa devre λ/8 → +j50 Ω (endüktif)', () => {
    const r = lineInputImpedance({ z0: 50, rl: 0, electrical: 0.125 });
    assert.ok(Math.abs(r.zin.re) < 1e-9);
    assertClose(r.zin.im, 50, 1e-9);
  });

  it('ZL = 30 − j20 Ω, l = 0,3λ → Zin ≈ 90,71 + j27,60 Ω; |Γ| ≈ 0,343, VSWR ≈ 2,044', () => {
    const r = lineInputImpedance({ z0: 50, rl: 30, xl: -20, electrical: 0.3 });
    assertClose(r.zin.re, 90.7107, 1e-5);
    assertClose(r.zin.im, 27.5970, 1e-5);
    assertClose(r.gammaLMag, 0.342997, 1e-5);
    assertClose(r.vswr, 2.04413, 1e-5);
  });

  it('yarım dalga hat yükü olduğu gibi gösterir', () => {
    const r = lineInputImpedance({ z0: 50, rl: 30, xl: -20, electrical: 0.5 });
    assertClose(r.zin.re, 30, 1e-9);
    assertClose(r.zin.im, -20, 1e-9);
  });

  it('kısa devre λ/4 → açık devre: RangeError', () => {
    assert.throws(() => lineInputImpedance({ z0: 50, rl: 0, electrical: 0.25 }), RangeError);
  });
});

describe('koaksiyel hat', () => {
  it('PE (εr = 2,25), D/d = 3,5 → ≈ 50,08 Ω, C ≈ 99,9 pF/m, L ≈ 250,6 nH/m', () => {
    const r = coaxAnalysis({ outer: 3.5, inner: 1, er: 2.25 });
    assertClose(r.z0, 50.0759, 1e-5);
    assertClose(r.c, 99.918e-12, 1e-4);
    assertClose(r.l, 250.553e-9, 1e-4);
    assertClose(r.velocityFactor, 2 / 3, 1e-12);
  });

  it('havada 50 Ω için D/d ≈ 2,302; analizle gidiş-dönüş', () => {
    const ratio = coaxRatioForZ0({ z0: 50, er: 1 });
    assertClose(ratio, 2.3023, 1e-4);
    assertClose(coaxAnalysis({ outer: ratio, inner: 1 }).z0, 50, 1e-12);
  });

  it('D ≤ d için RangeError', () => {
    assert.throws(() => coaxAnalysis({ outer: 1, inner: 1 }), RangeError);
  });
});

describe('deri derinliği', () => {
  it('bakır, 1 GHz → δ ≈ 2,09 µm, Rs ≈ 8,24 mΩ (Pozar)', () => {
    const r = skinDepth({ f: 1e9, sigma: CONDUCTIVITY['Bakır'] });
    assertClose(r.delta, 2.0875e-6, 1e-3);
    assertClose(r.rs, 8.241e-3, 1e-3);
  });

  it('bakır, 60 Hz → δ ≈ 8,5 mm', () => {
    assertClose(skinDepth({ f: 60, sigma: 5.8e7 }).delta, 8.5316e-3, 1e-4);
  });

  it('kalın telde AC direnç DC’den büyük; ince telde DC kabul edilir', () => {
    const thick = skinDepth({ f: 1e6, sigma: 5.8e7, diameter: 2e-3 });
    assert.ok(thick.validWire && thick.ratio > 1);
    const thin = skinDepth({ f: 50, sigma: 5.8e7, diameter: 1e-3 });
    assert.equal(thin.validWire, false);
    assert.equal(thin.ratio, 1);
  });
});

describe('gürültü', () => {
  it('NF 3 dB → Te ≈ 288,6 K; Te 290 K → NF ≈ 3,01 dB', () => {
    assertClose(noiseFigureToTemp(3).te, 288.626, 1e-5);
    assertClose(noiseTempToFigure(290).nf, 3.0103, 1e-4);
  });

  it('Friis kademe: LNA (10 dB, 2 dB) + karıştırıcı (NF 6 dB) → 2,75 dB', () => {
    const r = cascadeNoise([{ gainDb: 10, nfDb: 2 }, { gainDb: 0, nfDb: 6 }]);
    assertClose(r.nf, 2.7485, 1e-4);
    assertClose(r.te, 256.070, 1e-5);
    assertClose(r.gainDb, 10, 1e-12);
  });

  it('nötr kat (G = 0 dB, NF = 0 dB) sonucu değiştirmez', () => {
    const a = cascadeNoise([{ gainDb: 15, nfDb: 1.5 }]);
    const b = cascadeNoise([{ gainDb: 15, nfDb: 1.5 }, { gainDb: 0, nfDb: 0 }]);
    assertClose(b.nf, a.nf, 1e-12);
  });

  it('kT0B: 1 Hz → −174 dBm; 1 MHz → −114 dBm', () => {
    assertClose(thermalNoise({ bandwidth: 1 }).noiseDbm, -173.975, 1e-5);
    const r = thermalNoise({ bandwidth: 1e6, nfDb: 5, snrDb: 10 });
    assertClose(r.noiseDbm, -113.975, 1e-5);
    assertClose(r.sensitivityDbm, -98.975, 1e-5);
  });
});

describe('anten temel büyüklükleri', () => {
  it('yarım dalga dipol (2,15 dBi), λ = 1 m → Ae ≈ 0,1306 m², 0 dBd', () => {
    const r = antennaBasics({ f: 299792458, gainDbi: 2.15 });
    assertClose(r.effectiveAperture, 0.130554, 1e-5);
    assertClose(r.gainDbd, 0, 1e-12);
    assertClose(r.halfWave, 0.5, 1e-12);
  });

  it('uzak alan sınırı 2D²/λ: D = 1 m, λ = 0,125 m → 16 m', () => {
    const r = antennaBasics({ f: 299792458 / 0.125, gainDbi: 20, size: 1 });
    assertClose(r.fraunhofer, 16, 1e-12);
  });

  it('açıklıktan kazanca gidiş-dönüş', () => {
    const a = antennaBasics({ f: 10e9, gainDbi: 30 });
    assertClose(gainFromAperture({ f: 10e9, aperture: a.effectiveAperture }).gainDbi, 30, 1e-12);
  });
});

describe('radar menzil denklemi', () => {
  // Pt = 1 kW, G = 30 dBi, f = 10 GHz, σ = 1 m², R = 10 km
  it('alınan güç ≈ −103,44 dBm', () => {
    const r = radarReceivedPower({ pt: 1e3, gainDbi: 30, f: 10e9, rcs: 1, range: 10e3 });
    assertClose(r.prDbm, -103.4399, 1e-5);
  });

  it('menzil iki katına çıkınca güç 12,04 dB düşer (R⁴)', () => {
    const a = radarReceivedPower({ pt: 1e3, gainDbi: 30, f: 10e9, rcs: 1, range: 5e3 });
    const b = radarReceivedPower({ pt: 1e3, gainDbi: 30, f: 10e9, rcs: 1, range: 10e3 });
    assertClose(a.prDbm - b.prDbm, 12.0412, 1e-4);
  });

  it('Pmin = −100 dBm → Rmax ≈ 8,204 km; alınan güçle tutarlı', () => {
    const r = radarMaxRange({ pt: 1e3, gainDbi: 30, f: 10e9, rcs: 1, pminDbm: -100 });
    assertClose(r.range, 8203.57, 1e-5);
    assertClose(radarReceivedPower({ pt: 1e3, gainDbi: 30, f: 10e9, rcs: 1, range: r.range }).prDbm, -100, 1e-9);
  });
});
