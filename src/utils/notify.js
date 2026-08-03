// src/utils/notify.js
// Utilitaire de notification autonome (toast + confirm), partagé par les deux
// pages (étudiant/admin) qui ont chacune leur propre feuille de style avec des
// noms de variables différents — ce module injecte son propre CSS une seule
// fois plutôt que de dépendre de l'une ou l'autre.

let stylesInjected = false;

function ensureStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
.app-toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: min(360px, calc(100vw - 32px));
}
.app-toast {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #1f2430;
  color: #f2f2f5;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 0.85rem;
  line-height: 1.4;
  border-left: 4px solid #6b7280;
  animation: app-toast-in 0.2s ease-out;
}
.app-toast.success { border-left-color: #22c55e; }
.app-toast.error   { border-left-color: #ef4444; }
.app-toast.info    { border-left-color: #3b82f6; }
.app-toast-message { flex: 1; white-space: pre-line; }
.app-toast-close {
  background: none;
  border: none;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
}
.app-toast-close:hover { opacity: 1; }
@keyframes app-toast-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.app-confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}
.app-confirm-box {
  background: #1f2430;
  color: #f2f2f5;
  border-radius: 10px;
  padding: 20px;
  max-width: min(340px, calc(100vw - 40px));
  font-family: 'Inter', system-ui, sans-serif;
  box-shadow: 0 8px 30px rgba(0,0,0,0.35);
}
.app-confirm-message { font-size: 0.9rem; line-height: 1.5; margin-bottom: 16px; white-space: pre-line; }
.app-confirm-actions { display: flex; gap: 8px; justify-content: flex-end; }
.app-confirm-actions button {
  padding: 7px 14px;
  border-radius: 6px;
  border: none;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
}
.app-confirm-cancel { background: #3a3f4b; color: #f2f2f5; }
.app-confirm-cancel:hover { background: #464c59; }
.app-confirm-ok { background: #ef4444; color: white; }
.app-confirm-ok:hover { background: #dc2626; }
`;
  document.head.appendChild(style);
}

function getToastContainer() {
  let container = document.querySelector('.app-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'app-toast-container';
    document.body.appendChild(container);
  }
  return container;
}

// Remplace alert(message) : bandeau flottant auto-disparaissant.
export function showToast(message, type = 'info', durationMs = 5000) {
  ensureStyles();
  const container = getToastContainer();

  const toast = document.createElement('div');
  toast.className = `app-toast ${type}`;
  toast.innerHTML = `
    <span class="app-toast-message"></span>
    <button type="button" class="app-toast-close" aria-label="Fermer">&times;</button>
  `;
  toast.querySelector('.app-toast-message').textContent = message;

  const remove = () => toast.remove();
  toast.querySelector('.app-toast-close').addEventListener('click', remove);
  container.appendChild(toast);

  if (durationMs > 0) setTimeout(remove, durationMs);

  return toast;
}

// Remplace confirm(message) : retourne une Promise<boolean>.
export function confirmDialog(message, { confirmLabel = 'Confirmer', cancelLabel = 'Annuler' } = {}) {
  ensureStyles();
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'app-confirm-backdrop';
    backdrop.innerHTML = `
      <div class="app-confirm-box" role="alertdialog" aria-modal="true">
        <div class="app-confirm-message"></div>
        <div class="app-confirm-actions">
          <button type="button" class="app-confirm-cancel"></button>
          <button type="button" class="app-confirm-ok"></button>
        </div>
      </div>
    `;
    backdrop.querySelector('.app-confirm-message').textContent = message;
    backdrop.querySelector('.app-confirm-cancel').textContent = cancelLabel;
    backdrop.querySelector('.app-confirm-ok').textContent = confirmLabel;

    const cleanup = (result) => {
      document.removeEventListener('keydown', onKeydown);
      backdrop.remove();
      resolve(result);
    };
    const onKeydown = (e) => {
      if (e.key === 'Escape') cleanup(false);
    };

    backdrop.querySelector('.app-confirm-cancel').addEventListener('click', () => cleanup(false));
    backdrop.querySelector('.app-confirm-ok').addEventListener('click', () => cleanup(true));
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) cleanup(false);
    });
    document.addEventListener('keydown', onKeydown);

    document.body.appendChild(backdrop);
    backdrop.querySelector('.app-confirm-ok').focus();
  });
}
