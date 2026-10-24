// src/components/student/CustomThemeEditor.js
// Pop-up du thème "Personnalisé" : aperçu en direct, sauvegarde dans le
// profil (propriétaire uniquement), restauration du thème précédent si on
// ferme sans enregistrer.
import { db } from '../../services/SupabaseService.js';
import { showToast } from '../../utils/notify.js';
import {
  CUSTOM_FONTS,
  DEFAULT_CUSTOM_THEME,
  sanitizeCustomTheme,
  applyCustomTheme,
  clearCustomTheme,
  contrastRatio
} from '../../utils/customTheme.js';

const COLOR_INPUTS = {
  bg:      'ct-bg',
  surface: 'ct-surface',
  text:    'ct-text',
  accent:  'ct-accent',
  border:  'ct-border'
};
const FONT_SELECTS = {
  fontTitle: 'ct-font-title',
  fontMain:  'ct-font-main'
};

let session = null; // état de la pop-up ouverte

function readForm() {
  const cfg = {};
  for (const [key, id] of Object.entries(COLOR_INPUTS)) cfg[key] = document.getElementById(id).value;
  for (const [key, id] of Object.entries(FONT_SELECTS)) cfg[key] = document.getElementById(id).value;
  return sanitizeCustomTheme(cfg);
}

function fillForm(cfg) {
  for (const [key, id] of Object.entries(COLOR_INPUTS)) document.getElementById(id).value = cfg[key];
  for (const [key, id] of Object.entries(FONT_SELECTS)) document.getElementById(id).value = cfg[key];
}

function updateContrastHint(cfg) {
  const hint = document.getElementById('ct-contrast-hint');
  if (!hint) return;
  const issues = [];
  if (contrastRatio(cfg.text, cfg.bg) < 4.5 || contrastRatio(cfg.text, cfg.surface) < 4.5) {
    issues.push('le texte est peu lisible sur le fond ou les panneaux');
  }
  if (contrastRatio(cfg.accent, cfg.surface) < 3) {
    issues.push("l'accent ressort peu sur les panneaux");
  }
  hint.textContent = issues.length ? `⚠️ Attention : ${issues.join(' et ')}.` : '';
  hint.classList.toggle('hidden', issues.length === 0);
}

function preview() {
  const cfg = readForm();
  document.documentElement.dataset.theme = 'custom';
  applyCustomTheme(cfg);
  updateContrastHint(cfg);
  session?.onPreview?.();
}

function restorePrevious() {
  if (!session) return;
  const { prevTheme, prevCustom } = session;
  if (prevTheme === 'custom' && prevCustom) {
    applyCustomTheme(prevCustom);
  } else {
    clearCustomTheme();
  }
  if (prevTheme) document.documentElement.dataset.theme = prevTheme;
  session.onPreview?.();
}

function close(saved) {
  const modal = document.getElementById('custom-theme-modal');
  if (!saved) restorePrevious();
  session?.onClosed?.();
  session = null;
  modal?.classList.add('hidden');
}

let initialized = false;
function init() {
  if (initialized) return;
  initialized = true;

  for (const id of Object.values(FONT_SELECTS)) {
    const select = document.getElementById(id);
    select.innerHTML = Object.entries(CUSTOM_FONTS)
      .map(([key, font]) => `<option value="${key}" style="font-family: ${font.css.replace(/"/g, '&quot;')}">${font.label}</option>`)
      .join('');
  }

  const modal = document.getElementById('custom-theme-modal');
  modal.addEventListener('input', preview);
  modal.addEventListener('change', preview);

  modal.querySelector('.close-custom-theme-modal')?.addEventListener('click', () => close(false));

  // Escape : setupEscapeToClose masque déjà la modale, on restaure ici en
  // passant avant lui (phase de capture).
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && session && !modal.classList.contains('hidden')) close(false);
  }, true);

  document.getElementById('ct-reset-btn')?.addEventListener('click', () => {
    fillForm(DEFAULT_CUSTOM_THEME);
    preview();
  });

  document.getElementById('ct-save-btn')?.addEventListener('click', async () => {
    if (!session) return;
    const cfg = readForm();
    const { canSave, onSaved } = session;
    if (canSave) {
      try {
        await db.updateStudentProfile({ theme: 'custom', customTheme: cfg });
        showToast('Thème personnalisé enregistré.', 'success');
      } catch (err) {
        showToast("Erreur lors de l'enregistrement du thème : " + err.message, 'error');
        return;
      }
    }
    onSaved?.(cfg);
    close(true);
  });
}

/**
 * @param {object} opts
 * @param {object|null} opts.initial   config à afficher (déjà enregistrée ou null)
 * @param {boolean} opts.canSave       true si l'étudiant regarde sa propre fiche
 * @param {Function} [opts.onSaved]    appelé avec la config validée
 * @param {Function} [opts.onPreview]  appelé à chaque changement d'aperçu (ex. radar)
 * @param {Function} [opts.onClosed]   appelé à la fermeture
 */
export function openCustomThemeEditor({ initial, canSave, onSaved, onPreview, onClosed }) {
  const modal = document.getElementById('custom-theme-modal');
  if (!modal) return;
  init();

  const prevTheme = document.documentElement.dataset.theme;
  session = {
    prevTheme,
    prevCustom: prevTheme === 'custom' ? sanitizeCustomTheme(initial) : null,
    canSave,
    onSaved,
    onPreview,
    onClosed
  };

  document.getElementById('ct-visitor-note')?.classList.toggle('hidden', canSave);
  fillForm(sanitizeCustomTheme(initial));
  modal.classList.remove('hidden');
  preview();
}
