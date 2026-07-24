// src/utils/idleLogout.js

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'];

// Déconnecte automatiquement après une période d'inactivité — complète le
// passage à sessionStorage pour les postes partagés (labo) : couvre le cas
// où l'étudiant part sans fermer l'onglet.
export function startIdleLogout(db, timeoutMs) {
  let timer = null;

  const resetTimer = () => {
    if (timer) clearTimeout(timer);
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
