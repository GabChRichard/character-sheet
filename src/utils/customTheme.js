// src/utils/customTheme.js
// Thème "Personnalisé" : les couleurs/polices choisies par l'étudiant sont
// posées en variables CSS inline sur <html>. Les valeurs viennent du profil
// (donc potentiellement d'un autre étudiant en mode visiteur) : toujours
// passer par sanitizeCustomTheme avant de les appliquer.

export const CUSTOM_FONTS = {
  inter:     { label: 'Inter',            css: "'Inter', sans-serif" },
  georgia:   { label: 'Georgia',          css: "'Georgia', serif" },
  orbitron:  { label: 'Orbitron',         css: "'Orbitron', sans-serif" },
  fredoka:   { label: 'Fredoka',          css: "'Fredoka', sans-serif" },
  teko:      { label: 'Teko',             css: "'Teko', sans-serif" },
  playfair:  { label: 'Playfair Display', css: "'Playfair Display', serif" },
  spacemono: { label: 'Space Mono',       css: "'Space Mono', monospace" },
  pixel:     { label: 'Press Start 2P',   css: "'Press Start 2P', monospace" }
};

export const DEFAULT_CUSTOM_THEME = {
  bg:        '#121212',
  surface:   '#1e1e1e',
  text:      '#e0e0e0',
  accent:    '#dda93f',
  border:    '#333333',
  fontTitle: 'inter',
  fontMain:  'inter'
};

const COLOR_KEYS = ['bg', 'surface', 'text', 'accent', 'border'];
const HEX_RE = /^#[0-9a-f]{6}$/i;

const CSS_VARS = [
  '--bg-color', '--surface-color', '--text-main', '--text-muted', '--accent-color',
  '--accent-hover', '--border-color', '--tag-bg', '--font-title', '--font-main'
];

export function sanitizeCustomTheme(cfg) {
  const clean = { ...DEFAULT_CUSTOM_THEME };
  if (!cfg || typeof cfg !== 'object') return clean;
  for (const key of COLOR_KEYS) {
    if (typeof cfg[key] === 'string' && HEX_RE.test(cfg[key])) clean[key] = cfg[key].toLowerCase();
  }
  for (const key of ['fontTitle', 'fontMain']) {
    if (Object.hasOwn(CUSTOM_FONTS, cfg[key])) clean[key] = cfg[key];
  }
  return clean;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb) {
  return '#' + rgb.map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

// Mélange a vers b selon le ratio t (0 = a, 1 = b)
function mix(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(ca.map((c, i) => c + (cb[i] - c) * t));
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function applyCustomTheme(cfg) {
  const t = sanitizeCustomTheme(cfg);
  const darkAccent = luminance(t.accent) < 0.2;
  const vars = {
    '--bg-color':      t.bg,
    '--surface-color': t.surface,
    '--text-main':     t.text,
    '--text-muted':    mix(t.text, t.bg, 0.35),
    '--accent-color':  t.accent,
    '--accent-hover':  mix(t.accent, darkAccent ? '#ffffff' : '#000000', 0.12),
    '--border-color':  t.border,
    '--tag-bg':        mix(t.surface, t.accent, 0.12),
    '--font-title':    CUSTOM_FONTS[t.fontTitle].css,
    '--font-main':     CUSTOM_FONTS[t.fontMain].css
  };
  const style = document.documentElement.style;
  for (const [name, value] of Object.entries(vars)) style.setProperty(name, value);
}

export function clearCustomTheme() {
  const style = document.documentElement.style;
  for (const name of CSS_VARS) style.removeProperty(name);
}
