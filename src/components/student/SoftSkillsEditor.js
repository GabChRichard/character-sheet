// src/components/student/SoftSkillsEditor.js
import { db } from '../../services/SupabaseService.js';
import softSkillCategories from '../../data/softSkills.json';
import { showToast } from '../../utils/notify.js';

export function renderSoftSkillsEditor(profile, isOwner, onUpdate) {
  const container = document.getElementById('soft-skills-container');
  if (!container) return;

  const selected = profile.softSkills || [];

  container.innerHTML = `
    <div class="section-header" style="margin-bottom: 12px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">
      <h2 style="border: none; margin: 0;">Savoir-être</h2>
    </div>
    <div class="tags" id="soft-skills-tags" style="justify-content: flex-start;">
      ${selected.length === 0 ? '<span style="font-size: 0.8rem; color: var(--text-muted);">Aucun savoir-être sélectionné</span>' : ''}
    </div>
    ${isOwner ? '<button type="button" id="add-soft-skill-btn" class="btn secondary small" style="width: 100%; margin-top: 10px; font-size: 0.8rem; padding: 6px;">+ Ajouter</button>' : ''}
  `;

  const tagsEl = document.getElementById('soft-skills-tags');
  if (tagsEl) {
    selected.forEach(skill => {
      const span = document.createElement('span');
      span.className = 'tag';
      span.innerText = skill;
      tagsEl.appendChild(span);
    });
  }

  if (!isOwner) return;

  document.getElementById('add-soft-skill-btn')?.addEventListener('click', () => {
    openCatalogModal(selected, onUpdate);
  });
}

function openCatalogModal(selected, onUpdate) {
  const modal = document.getElementById('soft-skills-modal');
  const catalog = document.getElementById('soft-skills-catalog');
  if (!modal || !catalog) return;

  const selectedSet = new Set(selected);

  catalog.innerHTML = `
    <div class="soft-skills-list">
      ${softSkillCategories.map(cat => `
        <div class="soft-skills-category">
          <div class="soft-skills-category-title">${cat.label}</div>
          ${cat.items.map(item => `
            <label class="soft-skill-item">
              <input type="checkbox" name="soft-skill-catalog" value="${item}" ${selectedSet.has(item) ? 'checked' : ''}>
              <span>${item}</span>
            </label>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;

  modal.classList.remove('hidden');

  const countEl = document.getElementById('soft-skills-count');
  const updateCount = () => {
    if (!countEl) return;
    const count = catalog.querySelectorAll('input[name="soft-skill-catalog"]:checked').length;
    countEl.textContent = `${count}/10 sélectionné${count > 1 ? 's' : ''}`;
  };
  updateCount();
  catalog.querySelectorAll('input[name="soft-skill-catalog"]').forEach(cb => {
    cb.addEventListener('change', updateCount);
  });

  // Remplacer les boutons statiques (clonage) pour éviter d'empiler des
  // listeners à chaque ouverture du modal (le modal reste dans le DOM entre
  // deux rendus de SoftSkillsEditor, contrairement au reste du panneau).
  const closeBtn = document.querySelector('.close-soft-skills-modal');
  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
  newCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));

  const saveBtn = document.getElementById('save-soft-skills-btn');
  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
  newSaveBtn.addEventListener('click', async () => {
    const updated = Array.from(catalog.querySelectorAll('input[name="soft-skill-catalog"]:checked')).map(cb => cb.value);
    if (updated.length > 10) {
      showToast("Vous ne pouvez sélectionner que 10 savoir-être maximum.", 'info');
      return;
    }
    try {
      await db.updateStudentProfile({ softSkills: updated });
      modal.classList.add('hidden');
      if (onUpdate) onUpdate();
    } catch (err) {
      showToast("Erreur lors de la mise à jour : " + err.message, 'error');
    }
  });
}
