// Birim tabloları: her değer, birimin SI karşılığına çarpanıdır.
export const LENGTH_UNITS = {
  'µm': 1e-6,
  mm: 1e-3,
  cm: 1e-2,
  m: 1,
  mil: 25.4e-6,
};

export const FREQUENCY_UNITS = {
  Hz: 1,
  kHz: 1e3,
  MHz: 1e6,
  GHz: 1e9,
};

export const RESISTANCE_UNITS = {
  'Ω': 1,
  'kΩ': 1e3,
  'MΩ': 1e6,
};

const PREFIXES = [
  [-15, 'f'],
  [-12, 'p'],
  [-9, 'n'],
  [-6, 'µ'],
  [-3, 'm'],
  [0, ''],
  [3, 'k'],
  [6, 'M'],
  [9, 'G'],
  [12, 'T'],
];

/** Değeri birimden SI'ya çevirir. */
export function toSI(value, unit, table) {
  const factor = table[unit];
  if (factor === undefined) throw new RangeError(`Bilinmeyen birim: ${unit}`);
  return value * factor;
}

/** SI değeri verilen birime çevirir. */
export function fromSI(value, unit, table) {
  const factor = table[unit];
  if (factor === undefined) throw new RangeError(`Bilinmeyen birim: ${unit}`);
  return value / factor;
}

/**
 * Kullanıcı girdisini sayıya çevirir. Ondalık ayırıcı olarak virgül veya nokta kabul eder.
 * Boş girdi için null, geçersiz girdi için NaN döner.
 */
export function parseNumber(text) {
  if (text === null || text === undefined) return null;
  const trimmed = String(text).trim().replace(/\s+/g, '');
  if (trimmed === '') return null;
  const normalized = trimmed.replace(',', '.');
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(normalized)) return NaN;
  return Number(normalized);
}

function toLocale(str) {
  return str.replace('.', ',');
}

/**
 * Sayıyı belirtilen anlamlı basamakla, Türkçe ondalık virgülle yazar (ön ek yok).
 * Çok büyük/küçük değerlerde ×10ⁿ gösterimine geçer.
 */
export function formatNumber(value, digits = 4) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';
  const fixed = value.toPrecision(digits);
  if (!fixed.includes('e')) return toLocale(fixed);
  // toPrecision üstel gösterime geçtiyse: 1 ≤ |x| < 10⁶ aralığında tam sayı yazımı daha okunur
  const abs = Math.abs(value);
  if (abs >= 1 && abs < 1e6) return toLocale(String(Number(fixed)));
  const [mantissa, exponent] = value.toExponential(digits - 1).split('e');
  return `${toLocale(mantissa)}×10^${Number(exponent)}`;
}

/**
 * Sayıyı SI ön ekiyle biçimlendirir: formatSI(2.45e9, 'Hz') → "2,450 GHz".
 */
export function formatSI(value, unit, digits = 4) {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return `0 ${unit}`.trim();

  const abs = Math.abs(value);
  let exp3 = Math.floor(Math.log10(abs) / 3) * 3;
  exp3 = Math.min(12, Math.max(-15, exp3));

  let mantissa = Number((value / 10 ** exp3).toPrecision(digits));
  // Yuvarlama 1000'e taşırsa bir üst ön eke geç (ör. 999,96 → 1,000 k)
  if (Math.abs(mantissa) >= 1000 && exp3 < 12) {
    exp3 += 3;
    mantissa = Number((value / 10 ** exp3).toPrecision(digits));
  }

  const prefix = PREFIXES.find(([e]) => e === exp3)[1];
  return `${formatNumber(mantissa, digits)} ${prefix}${unit}`.trim();
}
