// node:assert/strict için testlerde kullanılan alt küme.
class AssertionError extends Error {}

function fail(message) {
  throw new AssertionError(message);
}

function assert(value, message) {
  if (!value) fail(message ?? `Beklenen doğru değer, bulunan ${value}`);
}

assert.ok = assert;

assert.equal = (actual, expected, message) => {
  if (!Object.is(actual, expected)) fail(message ?? `${actual} !== ${expected}`);
};

assert.notEqual = (actual, expected, message) => {
  if (Object.is(actual, expected)) fail(message ?? `${actual} === ${expected}`);
};

assert.deepEqual = (actual, expected, message) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(message ?? `${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`);
  }
};

assert.match = (string, regexp, message) => {
  if (typeof string !== 'string' || !regexp.test(string)) fail(message ?? `"${string}" ${regexp} ile eşleşmiyor`);
};

assert.throws = (fn, expected, message) => {
  try {
    fn();
  } catch (err) {
    if (typeof expected === 'function' && !(err instanceof expected)) {
      fail(message ?? `Beklenen ${expected.name}, fırlatılan ${err?.constructor?.name}`);
    }
    return;
  }
  fail(message ?? 'Hata fırlatılması bekleniyordu');
};

export default assert;
export { AssertionError };
