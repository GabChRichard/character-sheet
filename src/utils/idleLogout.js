// src/utils/idleLogout.js
import { showToast } from './notify.js';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];
const WARNING_BEFORE_MS = 60000;

// Déconnecte automatiquement après une période d'inactivité — complète le
// passage à sessionStorage pour les postes partagés (labo) : couvre le cas
// où l'étudiant part sans fermer l'onglet. Affiche un avertissement 60s avant
// la déconnexion réelle pour éviter une perte de travail silencieuse.
export function startIdleLogout(db, timeoutMs) {
  let timer = null;
  let warningTimer = null;

  const resetTimer = () => {
    if (timer) clearTimeout(timer);
    if (warningTimer) clearTimeout(warningTimer);

    const warningDelay = Math.max(timeoutMs - WARNING_BEFORE_MS, 0);
    warningTimer = setTimeout(() => {
      showToast("Vous serez déconnecté dans 60s pour inactivité — bougez la souris ou appuyez sur une touche pour rester connecté.", 'info', WARNING_BEFORE_MS);
    }, warningDelay);

    timer = setTimeout(async () => {
      const { data: { session } } = await db.getAuthSession();
      if (session) {
        await db.signOut();
        window.location.reload();
      }
    }, timeoutMs);
  };

  ACTIVITY_EVENTS.forEach((evt) => document.addEventListener(evt, resetTimer, { passive: true }));
  resetTimer();
}
