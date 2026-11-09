// Girdi doğrulama yardımcıları. Her biri hata mesajı (string) ya da null döner.

/** Boş veya sayı olmayan girdiyi yakalar. */
export function checkNumber(label, value) {
  if (value === null || value === undefined) return `${label} boş bırakılamaz.`;
  if (!Number.isFinite(value)) return `${label} geçerli bir sayı değil.`;
  return null;
}

/** Değer sıfırdan büyük olmalı. */
export function checkPositive(label, value) {
  return checkNumber(label, value) ?? (value <= 0 ? `${label} sıfırdan büyük olmalı.` : null);
}

/** Değer negatif olamaz (sıfır serbest). */
export function checkNonNegative(label, value) {
  return checkNumber(label, value) ?? (value < 0 ? `${label} negatif olamaz.` : null);
}

/** Değer en az `min` olmalı (dahil). */
export function checkMin(label, value, min) {
  return checkNumber(label, value) ?? (value < min ? `${label} en az ${String(min).replace('.', ',')} olmalı.` : null);
}

/** Değer en fazla `max` olmalı (dahil). */
export function checkMax(label, value, max) {
  return checkNumber(label, value) ?? (value > max ? `${label} en fazla ${String(max).replace('.', ',')} olabilir.` : null);
}

/** Saf hesap fonksiyonlarında kullanmak için: koşul sağlanmazsa RangeError fırlatır. */
export function assert(condition, message) {
  if (!condition) throw new RangeError(message);
}
