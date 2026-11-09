// Bileşen kodları: direnç/bobin renk kodu (IEC 60062), SMD direnç kodları
// (3 haneli, 4 haneli, EIA-96), kondansatör ve bobin yazılı kodları.
import { assert } from './validate.js';

/** Kayan nokta artıklarını temizler (ör. 4,7·1000 = 4700,000000000001). */
const clean = (x) => Number(x.toPrecision(12));

// ---------------------------------------------------------------------------
// Renk kodu
// ---------------------------------------------------------------------------

/**
 * Renk tablosu. digit: rakam bandı, exp: çarpan üssü (10^exp), tol: tolerans (%),
 * tcr: sıcaklık katsayısı (ppm/K). Tanımsız alan o renk o bantta kullanılmaz demektir.
 */
export const COLORS = Object.freeze([
  { key: 'black', name: 'Siyah', hex: '#111111', digit: 0, exp: 0 },
  { key: 'brown', name: 'Kahverengi', hex: '#7a4a24', digit: 1, exp: 1, tol: 1, tcr: 100 },
  { key: 'red', name: 'Kırmızı', hex: '#d32f2f', digit: 2, exp: 2, tol: 2, tcr: 50 },
  { key: 'orange', name: 'Turuncu', hex: '#f57c00', digit: 3, exp: 3, tcr: 15 },
  { key: 'yellow', name: 'Sarı', hex: '#fbc02d', digit: 4, exp: 4, tcr: 25 },
  { key: 'green', name: 'Yeşil', hex: '#2e7d32', digit: 5, exp: 5, tol: 0.5 },
  { key: 'blue', name: 'Mavi', hex: '#1565c0', digit: 6, exp: 6, tol: 0.25, tcr: 10 },
  { key: 'violet', name: 'Mor', hex: '#7b1fa2', digit: 7, exp: 7, tol: 0.1, tcr: 5 },
  { key: 'grey', name: 'Gri', hex: '#8a8a8a', digit: 8, exp: 8, tol: 0.05 },
  { key: 'white', name: 'Beyaz', hex: '#f5f5f5', digit: 9, exp: 9 },
  { key: 'gold', name: 'Altın', hex: '#c9a227', exp: -1, tol: 5 },
  { key: 'silver', name: 'Gümüş', hex: '#b8b8b8', exp: -2, tol: 10 },
  { key: 'none', name: 'Bant yok', hex: null, tol: 20 },
]);

const byKey = Object.fromEntries(COLORS.map((c) => [c.key, c]));
export const colorByKey = (key) => byKey[key];

/** Bant sayısına göre her bandın rolü. */
export function bandRoles(count) {
  switch (count) {
    case 3: return ['digit', 'digit', 'exp'];
    case 4: return ['digit', 'digit', 'exp', 'tol'];
    case 5: return ['digit', 'digit', 'digit', 'exp', 'tol'];
    case 6: return ['digit', 'digit', 'digit', 'exp', 'tol', 'tcr'];
    default: throw new RangeError('Bant sayısı 3, 4, 5 veya 6 olmalı.');
  }
}

/** Belirli bir rol için kullanılabilen renkler. "none" yalnızca tolerans bandında. */
export function colorsForRole(role, { first = false } = {}) {
  return COLORS.filter((c) => {
    if (role === 'digit') return c.digit !== undefined && !(first && c.digit === 0);
    if (role === 'exp') return c.exp !== undefined;
    if (role === 'tol') return c.tol !== undefined;
    if (role === 'tcr') return c.tcr !== undefined;
    return false;
  });
}

/**
 * Renk bantlarından değer. Değer, taban birim cinsindendir (direnç için Ω, bobin için µH).
 * @param {string[]} bands renk anahtarları, soldan sağa
 * @returns {{ value, tolerance, tcr, min, max }}
 */
export function decodeColorBands(bands) {
  const roles = bandRoles(bands.length);
  let digits = 0;
  let exp = 0;
  let tolerance = 20; // 3 bantlı kodda tolerans bandı yoktur → %20
  let tcr = null;
  roles.forEach((role, i) => {
    const c = byKey[bands[i]];
    assert(c, `${i + 1}. bant için bilinmeyen renk.`);
    if (role === 'digit') {
      assert(c.digit !== undefined, `${i + 1}. bant (rakam) için ${c.name} kullanılamaz.`);
      digits = digits * 10 + c.digit;
    } else if (role === 'exp') {
      assert(c.exp !== undefined, `${i + 1}. bant (çarpan) için ${c.name} kullanılamaz.`);
      exp = c.exp;
    } else if (role === 'tol') {
      assert(c.tol !== undefined, `${i + 1}. bant (tolerans) için ${c.name} kullanılamaz.`);
      tolerance = c.tol;
    } else if (role === 'tcr') {
      assert(c.tcr !== undefined, `${i + 1}. bant (sıcaklık katsayısı) için ${c.name} kullanılamaz.`);
      tcr = c.tcr;
    }
  });
  const value = clean(digits * 10 ** exp);
  return {
    value,
    tolerance,
    tcr,
    min: clean(value * (1 - tolerance / 100)),
    max: clean(value * (1 + tolerance / 100)),
  };
}

/**
 * Değeri n anlamlı basamağa ve 10'un kuvvetine ayırır: value = mantissa · 10^exp.
 * Değer n basamakla tam gösterilemiyorsa null döner.
 */
export function splitSignificant(value, n) {
  assert(value > 0 && Number.isFinite(value), 'Değer sıfırdan büyük olmalı.');
  let exp = Math.floor(Math.log10(value)) - (n - 1);
  let mantissa = Math.round(value / 10 ** exp);
  if (mantissa >= 10 ** n) { exp += 1; mantissa = Math.round(value / 10 ** exp); }
  if (mantissa < 10 ** (n - 1)) { exp -= 1; mantissa = Math.round(value / 10 ** exp); }
  const back = mantissa * 10 ** exp;
  if (Math.abs(back - value) > 1e-9 * value) return null;
  return { mantissa, exp };
}

/**
 * Değerden renk bantları (tolerans bandı hariç). digitCount: 2 (4 bant) veya 3 (5/6 bant).
 * @returns {string[]} rakam + çarpan renk anahtarları
 */
export function encodeColorBands(value, digitCount = 2) {
  assert(digitCount === 2 || digitCount === 3, 'Rakam bandı sayısı 2 veya 3 olmalı.');
  const split = splitSignificant(value, digitCount);
  assert(split, `Bu değer ${digitCount} anlamlı basamakla tam gösterilemiyor${digitCount === 2 ? '; 5 bantlı kodu deneyin' : ''}.`);
  const { mantissa, exp } = split;
  const mult = COLORS.find((c) => c.exp === exp);
  assert(mult, 'Değer renk kodunun çarpan aralığının dışında (en küçük çarpan ×0,01, en büyük ×10⁹).');
  const digits = String(mantissa).split('').map((d) => COLORS.find((c) => c.digit === Number(d)).key);
  return [...digits, mult.key];
}

// ---------------------------------------------------------------------------
// SMD direnç kodları
// ---------------------------------------------------------------------------

/** E96 serisi (IEC 60063); EIA-96 kodunda 01…96 indeksleri bu değerlere karşılık gelir. */
export const E96 = Object.freeze([
  100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143,
  147, 150, 154, 158, 162, 165, 169, 174, 178, 182, 187, 191, 196, 200, 205, 210,
  215, 221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309,
  316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453,
  464, 475, 487, 499, 511, 523, 536, 549, 562, 576, 590, 604, 619, 634, 649, 665,
  681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976,
]);

/** EIA-96 çarpan harfleri (10'un üssü). R ve S, Y ve X'in eş anlamlısı olarak da görülür. */
export const EIA96_MULTIPLIERS = Object.freeze({
  Z: -3, Y: -2, R: -2, X: -1, S: -1, A: 0, B: 1, H: 1, C: 2, D: 3, E: 4, F: 5,
});
const EIA96_PREFERRED = { '-3': 'Z', '-2': 'Y', '-1': 'X', 0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F' };

/** "R" ondalık gösterimi: "4R7" → 4,7 ; "R47" → 0,47 */
function parseDecimalLetter(code, letter) {
  const re = new RegExp(`^(\\d*)${letter}(\\d*)$`, 'i');
  const m = code.match(re);
  if (!m || (m[1] === '' && m[2] === '')) return null;
  return Number(`${m[1] || '0'}.${m[2] || '0'}`);
}

/**
 * SMD direnç kodunu çözer.
 * @returns {{ value: number, format: string, note?: string }} value Ω cinsinden
 */
export function decodeSmdResistor(input) {
  const code = String(input ?? '').trim().replace(/\s+/g, '').toUpperCase();
  assert(code !== '', 'Kod boş bırakılamaz.');

  if (/^0+$/.test(code)) return { value: 0, format: 'Sıfır ohm (köprü/jumper)' };

  // R ondalık gösterimi önce denenir: "47R" pratikte çoğunlukla 47 Ω demektir.
  if (/^\d*R\d*$/.test(code) && code.length >= 2 && code.length <= 4) {
    const value = parseDecimalLetter(code, 'R');
    assert(value !== null, 'Geçersiz R gösterimi.');
    const eia = code.match(/^(\d{2})R$/);
    const eiaIndex = eia ? Number(eia[1]) : 0;
    const note = eiaIndex >= 1 && eiaIndex <= 96
      ? `Bu kod EIA-96 olarak da okunabilir (R = ×0,01): ${String(clean(E96[eiaIndex - 1] * 0.01)).replace('.', ',')} Ω. Bileşen çok küçük (0603 ve altı) bir hassas dirençse bu okumayı değerlendirin.`
      : undefined;
    return { value, format: 'R ondalık gösterimi (R = ondalık virgül)', note };
  }

  let m = code.match(/^(\d{2})([ZYXSABHCDEF])$/);
  if (m) {
    const index = Number(m[1]);
    assert(index >= 1 && index <= 96, 'EIA-96 kodunda ilk iki hane 01 ile 96 arasında olmalı.');
    const exp = EIA96_MULTIPLIERS[m[2]];
    const note = m[2] === 'S'
      ? '“S” burada EIA-96 çarpanı (X ile aynı, ×0,1) olarak okundu.'
      : undefined;
    return { value: clean(E96[index - 1] * 10 ** exp), format: 'EIA-96 (%1, E96 serisi)', note };
  }

  m = code.match(/^(\d{2})(\d)$/);
  if (m) return { value: clean(Number(m[1]) * 10 ** Number(m[2])), format: '3 haneli (genellikle %2–%5, E24)' };

  m = code.match(/^(\d{3})(\d)$/);
  if (m) return { value: clean(Number(m[1]) * 10 ** Number(m[2])), format: '4 haneli (genellikle %1, E96)' };

  throw new RangeError('Kod tanınmadı. Örnek biçimler: 472, 4R7, R47, 1002, 01C.');
}

/** "R" gösterimiyle n anlamlı basamak, toplam uzunluk n + 1 (ör. 4,7 → "4R7"). */
function rNotation(value, n, letter = 'R') {
  const text = value.toPrecision(n);
  if (text.includes('e') || Math.abs(Number(text) - value) > 1e-9 * value) return null;
  const code = text.replace(/^0\./, '.').replace('.', letter);
  return code.length === n + 1 ? code : null;
}

/**
 * Değerden SMD direnç kodları. Gösterilemeyen biçim için null döner.
 * @returns {{ three: string|null, four: string|null, eia96: string|null }}
 */
export function encodeSmdResistor(value) {
  assert(value >= 0 && Number.isFinite(value), 'Direnç negatif olamaz.');
  if (value === 0) return { three: '000', four: '0000', eia96: null };

  const three = value < 10 ? rNotation(value, 2) : (() => {
    const s = splitSignificant(value, 2);
    return s && s.exp >= 0 && s.exp <= 9 ? `${s.mantissa}${s.exp}` : null;
  })();

  const four = value < 100 ? rNotation(value, 3) : (() => {
    const s = splitSignificant(value, 3);
    return s && s.exp >= 0 && s.exp <= 9 ? `${s.mantissa}${s.exp}` : null;
  })();

  let eia96 = null;
  const s3 = splitSignificant(value, 3);
  if (s3) {
    const index = E96.indexOf(s3.mantissa);
    const letter = EIA96_PREFERRED[s3.exp];
    if (index >= 0 && letter) eia96 = `${String(index + 1).padStart(2, '0')}${letter}`;
  }
  return { three, four, eia96 };
}

// ---------------------------------------------------------------------------
// Kondansatör kodları
// ---------------------------------------------------------------------------

export const CAP_TOLERANCES = Object.freeze({
  B: '±0,1 pF', C: '±0,25 pF', D: '±0,5 pF', F: '±%1', G: '±%2',
  J: '±%5', K: '±%10', M: '±%20', Z: '+%80 / −%20',
});

/** Sondaki tolerans harfini ayırır (yalnızca harften önce rakam varsa). */
function splitTolerance(code, table) {
  const m = code.match(/^(.*\d)([A-Za-z])$/);
  if (m && table[m[2].toUpperCase()]) {
    return { body: m[1], tolerance: { letter: m[2].toUpperCase(), text: table[m[2].toUpperCase()] } };
  }
  return { body: code, tolerance: null };
}

/**
 * Kondansatör kodunu çözer.
 * Desteklenen biçimler: "104", "104K", "47", "4R7", "4p7", "2n2", "2u2", "0.1" (µF).
 * @returns {{ pF: number, format: string, tolerance: {letter, text}|null }}
 */
export function decodeCapacitorCode(input) {
  const raw = String(input ?? '').trim().replace(/\s+/g, '').replace(/[µμ]/g, 'u').replace(',', '.');
  assert(raw !== '', 'Kod boş bırakılamaz.');
  const { body, tolerance } = splitTolerance(raw, CAP_TOLERANCES);

  let m = body.match(/^(\d*)([pnu])(\d*)$/i);
  if (m && (m[1] || m[3])) {
    const factor = { p: 1, n: 1e3, u: 1e6 }[m[2].toLowerCase()];
    return { pF: clean(Number(`${m[1] || '0'}.${m[3] || '0'}`) * factor), format: 'Harf ondalık gösterimi (p/n/µ)', tolerance };
  }

  if (/^\d*R\d*$/i.test(body)) {
    const value = parseDecimalLetter(body, 'R');
    assert(value !== null, 'Geçersiz R gösterimi.');
    return { pF: value, format: 'R ondalık gösterimi (pF)', tolerance };
  }

  m = body.match(/^(\d{2})(\d)$/);
  if (m) {
    const d = Number(m[2]);
    const factor = d <= 7 ? 10 ** d : d === 8 ? 0.01 : 0.1;
    return { pF: clean(Number(m[1]) * factor), format: '3 haneli kod (pF)', tolerance };
  }

  if (/^\d{1,2}$/.test(body)) return { pF: Number(body), format: 'Doğrudan pF değeri', tolerance };

  if (/^\d*\.\d+$/.test(body)) return { pF: clean(Number(body) * 1e6), format: 'Ondalık değer (µF)', tolerance };

  throw new RangeError('Kod tanınmadı. Örnek biçimler: 104, 104K, 4R7, 2n2, 47.');
}

/** Değeri p/n/u harfli kısa gösterime çevirir: 4700 pF → "4n7", 100 000 pF → "100n". */
function letterNotation(valuePf) {
  const units = [['p', 1], ['n', 1e3], ['u', 1e6], ['m', 1e9]];
  let [letter, factor] = units[0];
  for (const u of units) if (valuePf >= u[1]) [letter, factor] = u;
  const v = Number((valuePf / factor).toPrecision(3));
  const text = String(v);
  return text.includes('.') ? text.replace('.', letter) : `${text}${letter}`;
}

/**
 * Değerden kondansatör kodları.
 * @returns {{ three: string|null, letter: string }}
 */
export function encodeCapacitorCode(pF) {
  assert(pF > 0 && Number.isFinite(pF), 'Kapasite sıfırdan büyük olmalı.');
  let three = null;
  if (pF < 10) {
    three = rNotation(pF, 2);
  } else {
    const s = splitSignificant(pF, 2);
    if (s && s.exp >= 0 && s.exp <= 6) three = `${s.mantissa}${s.exp}`;
  }
  return { three, letter: letterNotation(pF).replace('u', 'µ') };
}

// ---------------------------------------------------------------------------
// Bobin yazılı kodları (SMD ve küçük bobinler)
// ---------------------------------------------------------------------------

export const INDUCTOR_TOLERANCES = Object.freeze({
  F: '±%1', G: '±%2', J: '±%5', K: '±%10', M: '±%20',
});

/**
 * Bobin kodunu çözer. Taban birim µH.
 * Biçimler: "101" (100 µH), "4R7" (4,7 µH), "R10" (0,1 µH), "3N3" (3,3 nH), "100K".
 * @returns {{ uH: number, format: string, tolerance }}
 */
export function decodeInductorCode(input) {
  const raw = String(input ?? '').trim().replace(/\s+/g, '');
  assert(raw !== '', 'Kod boş bırakılamaz.');
  const { body, tolerance } = splitTolerance(raw, INDUCTOR_TOLERANCES);
  const upper = body.toUpperCase();

  if (/^\d*R\d*$/.test(upper)) {
    const value = parseDecimalLetter(upper, 'R');
    assert(value !== null, 'Geçersiz R gösterimi.');
    return { uH: value, format: 'R ondalık gösterimi (µH)', tolerance };
  }
  if (/^\d*N\d*$/.test(upper)) {
    const value = parseDecimalLetter(upper, 'N');
    assert(value !== null, 'Geçersiz N gösterimi.');
    return { uH: clean(value / 1000), format: 'N ondalık gösterimi (nH)', tolerance };
  }
  const m = upper.match(/^(\d{2})(\d)$/);
  if (m) return { uH: clean(Number(m[1]) * 10 ** Number(m[2])), format: '3 haneli kod (µH)', tolerance };

  throw new RangeError('Kod tanınmadı. Örnek biçimler: 101, 4R7, R47, 3N3.');
}

/**
 * Değerden bobin kodu (µH). 10 nH altı N gösterimi, 10 µH altı R gösterimi, üstü 3 hane.
 * @returns {string|null}
 */
export function encodeInductorCode(uH) {
  assert(uH > 0 && Number.isFinite(uH), 'Endüktans sıfırdan büyük olmalı.');
  if (uH < 0.01) return rNotation(clean(uH * 1000), 2, 'N');
  if (uH < 10) return rNotation(uH, 2);
  const s = splitSignificant(uH, 2);
  return s && s.exp >= 0 && s.exp <= 9 ? `${s.mantissa}${s.exp}` : null;
}
