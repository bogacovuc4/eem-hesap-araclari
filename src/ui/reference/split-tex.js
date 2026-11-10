// Yan yana yazılmış formül gruplarını parçalara ayırır (DOM'suz; testte KaTeX ile denetlenir).
// Ayırıcılar yalnızca üst düzeyde (süslü parantez ve \left…\right dışında) dikkate alınır:
//   \qquad, \quad ve ",\ " (virgül + boşluk komutu). Sondaki virgüller atılır.

const SEPARATORS = ['\\qquad', '\\quad', ',\\ '];

export function splitTex(tex) {
  const parts = [];
  let brace = 0;
  let lr = 0;
  let start = 0;
  let i = 0;
  while (i < tex.length) {
    if (tex[i] === '\\' && tex[i + 1] === '\\') { i += 2; continue; }
    if (tex[i] === '{') brace += 1;
    else if (tex[i] === '}') brace -= 1;
    else if (tex.startsWith('\\left', i) && !/[a-z]/i.test(tex[i + 5] ?? '')) lr += 1;
    else if (tex.startsWith('\\right', i) && !/[a-z]/i.test(tex[i + 6] ?? '')) lr -= 1;
    if (brace === 0 && lr === 0) {
      const sep = SEPARATORS.find((s) => tex.startsWith(s, i) && !/[a-z]/i.test(tex[i + s.length] ?? ''));
      if (sep) {
        parts.push(tex.slice(start, i));
        i += sep.length;
        start = i;
        continue;
      }
    }
    i += 1;
  }
  parts.push(tex.slice(start));
  return parts.map((t) => t.trim().replace(/,$/, '').trim()).filter(Boolean);
}
