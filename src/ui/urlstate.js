// Hesaplayıcı durumunu adres çubuğunda tutar, böylece bağlantı paylaşılabilir:
//   #/rf/microstrip?mode=synthesis&z0=75&h=1,6&h_u=mm
// history.replaceState kullanılır: her tuş vuruşu geri düğmesi geçmişine eklenmez.

/** Hash'ten yol ve sorgu parametrelerini ayırır. */
export function currentRoute() {
  const hash = location.hash.replace(/^#\/?/, '');
  const q = hash.indexOf('?');
  const path = q === -1 ? hash : hash.slice(0, q);
  const query = q === -1 ? '' : hash.slice(q + 1);
  return { path: decodeURIComponent(path), params: new URLSearchParams(query) };
}

export function getParam(key) {
  return currentRoute().params.get(key);
}

/** Parametreleri günceller; null/undefined/'' değerler silinir. */
export function setParams(entries) {
  const { path, params } = currentRoute();
  if (!path) return;
  for (const [key, value] of Object.entries(entries)) {
    if (value === null || value === undefined || value === '') params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  history.replaceState(history.state, '', `#/${path}${query ? `?${query}` : ''}`);
}
