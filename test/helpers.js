import assert from 'node:assert/strict';

/** Göreli toleransla yaklaşık eşitlik: |actual − expected| ≤ rel·|expected| */
export function assertClose(actual, expected, rel = 1e-3, message = '') {
  const tol = rel * Math.abs(expected);
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${message} beklenen ${expected} (±%${rel * 100}), bulunan ${actual}`.trim(),
  );
}
