// src/utils/modalEscape.js
// Ferme au clavier (touche Escape) la première modale visible parmi celles
// listées — les boutons de fermeture ne géraient jusqu'ici que le clic.
export function setupEscapeToClose(modalIds) {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const id of modalIds) {
      const modal = document.getElementById(id);
      if (modal && !modal.classList.contains('hidden')) {
        modal.classList.add('hidden');
        break;
      }
    }
  });
}
