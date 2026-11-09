import { icon } from './icons.js';

const STORAGE_KEY = 'eem-theme';

function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function store(value) {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // localStorage kapalıysa tema yalnızca bu oturumda geçerli olur.
  }
}

function currentTheme() {
  const explicit = document.documentElement.getAttribute('data-theme');
  if (explicit === 'light' || explicit === 'dark') return explicit;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function updateButton(button) {
  const dark = currentTheme() === 'dark';
  const next = dark ? 'açık' : 'koyu';
  button.title = `Temayı ${next} yap`;
  button.setAttribute('aria-label', `Temayı ${next} yap`);
  // Simge, geçilecek temayı gösterir: koyu temadayken güneş, açıkta ay.
  button.replaceChildren(icon(dark ? 'sun' : 'moon', { size: 18 }));
}

export function initTheme(button) {
  const stored = readStored();
  if (stored) document.documentElement.setAttribute('data-theme', stored);
  updateButton(button);
  button.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    store(next);
    updateButton(button);
  });
}
