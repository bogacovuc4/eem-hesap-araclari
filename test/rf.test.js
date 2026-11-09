import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertClose } from './helpers.js';
import {
  microstripAnalysis,
  microstripSynthesis,
  microstripWidthEstimate,
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
