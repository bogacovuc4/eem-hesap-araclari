import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { categories, allCalculators, relatedCalculators, findCalculator } from '../src/registry.js';

describe('hesaplayıcı kaydı', () => {
  const src = readFileSync(new URL('../src/registry.js', import.meta.url), 'utf8');
  const paths = [...src.matchAll(/calc\('([^']+)', '((?:[^'\\]|\\.)*)', \(\) => import\('\.\/([^']+)'\)\)/g)];

  it('her girdinin modülü var; id ve başlık modüldekiyle aynı', () => {
    assert.equal(paths.length, allCalculators().length);
    for (const [, id, title, path] of paths) {
      const file = new URL(`../src/${path}`, import.meta.url);
      assert.ok(existsSync(file), `${path} yok`);
      const text = readFileSync(file, 'utf8');
      const m = text.match(/^ {2}id: '([^']+)',\n {2}title: '([^']+)'/m);
      assert.ok(m, `${path}: export default { id, title } bulunamadı`);
      assert.equal(m[1], id, `${path} id`);
      assert.equal(m[2], title.replace(/\\'/g, "'"), `${path} başlık`);
    }
  });

  it('id’ler benzersiz, her hesaplayıcının özeti var', () => {
    const ids = allCalculators().map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const c of allCalculators()) assert.ok(c.summary, `${c.id} için özet (META) yok`);
  });

  it('ilgili hesaplayıcılar geçerli ve kendini içermez', () => {
    for (const c of allCalculators()) {
      const rel = relatedCalculators(c.id);
      assert.ok(rel.length > 0 || categories.find((k) => k.calculators.includes(c)).calculators.length === 1, c.id);
      for (const r of rel) {
        assert.ok(findCalculator(r.id));
        assert.notEqual(r.id, c.id);
      }
    }
  });
});

describe('formül özeti', () => {
  it('her formülün başlığı, LaTeX’i ve düz metni var; hesaplayıcı bağlantıları geçerli', async () => {
    const { FORMULA_SECTIONS } = await import('../src/ui/reference/formula-data.js');
    let n = 0;
    for (const sec of FORMULA_SECTIONS) {
      for (const [title, tex, plain, , calcId] of sec.items) {
        n += 1;
        assert.ok(title && tex && plain, `${sec.id}: eksik alan`);
        if (calcId) assert.ok(findCalculator(calcId), `${title}: ${calcId} yok`);
      }
    }
    assert.ok(n >= 140, `formül sayısı ${n}`);
  });
});
