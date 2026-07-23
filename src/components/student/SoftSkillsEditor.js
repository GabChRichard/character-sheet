// src/components/student/SoftSkillsEditor.js
import { db } from '../../services/SupabaseService.js';

export function renderSoftSkillsEditor(profile, isOwner, onUpdate) {
  const container = document.getElementById('soft-skills-container');
  if (!container) return;

  const softSkills = profile.softSkills || [];

  container.innerHTML = `
    <div class="section-header" style="margin-bottom: 12px; border-bottom: 2px solid var(--border-color); padding-bottom: 8px;">
      <h2 style="border: none; margin: 0;">🤝 Savoir-être</h2>
    </div>
    <div id="soft-skills-list" style="display: flex; flex-direction: column; gap: 8px;">
      ${softSkills.map((skill, index) => `
        <div class="soft-skill-item" style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: var(--bg-card, rgba(255,255,255,0.02)); border: 1px solid var(--border-color); border-radius: var(--radius);">
          <span class="soft-skill-text">${skill}</span>
          ${isOwner ? `
            <div style="display: flex; gap: 4px;">
              <button class="btn icon-btn edit-soft-skill" data-index="${index}" title="Modifier" style="font-size: 0.85rem; padding: 2px;">✏️</button>
              <button class="btn icon-btn delete-soft-skill" data-index="${index}" title="Supprimer" style="font-size: 0.85rem; padding: 2px;">×</button>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
    ${isOwner ? `
      <button id="add-soft-skill-btn" class="btn secondary small" style="width: 100%; margin-top: 10px; font-size: 0.8rem; padding: 6px;">+ Ajouter un savoir-être</button>
      <div id="soft-skill-input-container" class="hidden" style="margin-top: 10px; display: flex; gap: 8px;">
        <input type="text" id="new-soft-skill-input" placeholder="Ex: Travail en équipe" style="flex: 1; padding: 6px; border: 1px solid var(--border-color); border-radius: var(--radius); font-size: 0.85rem; background: var(--bg-card); color: var(--text-main);" />
        <button id="save-soft-skill-btn" class="btn primary small" style="padding: 6px 12px; font-size: 0.85rem;">Ajouter</button>
      </div>
    ` : ''}
  `;

  if (!isOwner) return;

  const addBtn = document.getElementById('add-soft-skill-btn');
  const inputContainer = document.getElementById('soft-skill-input-container');
  const newFieldName = document.getElementById('new-soft-skill-input');
  const saveBtn = document.getElementById('save-soft-skill-btn');

  addBtn?.addEventListener('click', () => {
    addBtn.classList.add('hidden');
    inputContainer.classList.remove('hidden');
    newFieldName.focus();
  });

  const saveAction = async () => {
    const text = newFieldName.value.trim();
    if (!text) return;
    const updatedSkills = [...softSkills, text];
    try {
      await db.updateStudentProfile({ softSkills: updatedSkills });
      if (onUpdate) onUpdate();
    } catch (err) {
      alert("Erreur lors de l'ajout: " + err.message);
    }
  };

  saveBtn?.addEventListener('click', saveAction);
  newFieldName?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveAction();
  });

  // Suppression
  container.querySelectorAll('.delete-soft-skill').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      const updatedSkills = softSkills.filter((_, idx) => idx !== index);
      try {
        await db.updateStudentProfile({ softSkills: updatedSkills });
        if (onUpdate) onUpdate();
      } catch (err) {
        alert("Erreur lors de la suppression: " + err.message);
      }
    });
  });

  // Édition
  container.querySelectorAll('.edit-soft-skill').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(e.currentTarget.dataset.index, 10);
      const currentText = softSkills[index];
      const newText = prompt("Modifier le savoir-être :", currentText);
      if (newText === null) return;
      const text = newText.trim();
      if (!text) return;

      const updatedSkills = [...softSkills];
      updatedSkills[index] = text;

      try {
        await db.updateStudentProfile({ softSkills: updatedSkills });
        if (onUpdate) onUpdate();
      } catch (err) {
        alert("Erreur lors de la modification: " + err.message);
      }
    });
  });
}
