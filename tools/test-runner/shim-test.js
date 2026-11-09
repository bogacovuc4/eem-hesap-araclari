// node:test için yalnızca describe/it alt kümesini sağlayan küçük tarayıcı sarmalayıcısı.
const queue = [];
let currentSuite = null;

export function describe(name, fn) {
  const parent = currentSuite;
  currentSuite = parent ? `${parent} › ${name}` : name;
  queue.push({ suite: currentSuite });
  fn();
  currentSuite = parent;
}

export function it(name, fn) {
  queue.push({ name, fn });
}

export const test = it;

export async function run() {
  const results = [];
  for (const item of queue) {
    if (item.suite) { results.push(item); continue; }
    try {
      await item.fn();
      results.push({ name: item.name, ok: true });
    } catch (err) {
      results.push({ name: item.name, ok: false, error: err?.message ?? String(err) });
    }
  }
  return results;
}
