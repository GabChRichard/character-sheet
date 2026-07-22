// src/components/student/ProjectModal.js
import { db } from '../../services/SupabaseService.js';
import skillsData from '../../data/skills.json';
import { renderProjectForm } from './ProjectForm.js';

export function openProjectModal(project, isOwner, visitorCode, currentStudentCode, onActionCompleted) {
  const modal = document.getElementById('project-detail-modal');
  const body = document.getElementById('project-modal-body');
  if (!modal || !body) return;

  // Récupérer les informations de l'endossement pour ce projet
  renderDetailsView(project, isOwner, visitorCode, currentStudentCode, onActionCompleted);
  modal.classList.remove('hidden');
}

async function renderDetailsView(project, isOwner, visitorCode, currentStudentCode, onActionCompleted) {
  const body = document.getElementById('project-modal-body');
  if (!body) return;

  // Charger tous les endossements reçus pour ce projet
  const allEndorsements = await db.getStudentEndorsements(project.student_code || currentStudentCode);
  const projectEndorsements = allEndorsements.filter(e => e.project_id === project.id);
  const hasEndorsed = visitorCode ? projectEndorsements.some(e => e.from_code === visitorCode) : false;

  const dots = "●".repeat(project.skills ? Math.min(5, project.skills.length) : 1);

  body.innerHTML = `
    <span class="close-modal" id="close-project-modal">&times;</span>
    <h2 style="font-family: var(--font-title); color: var(--accent-color); margin-bottom: 8px;">${project.name}</h2>
    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px; display: flex; gap: 15px;">
      <span>🏫 ${project.course || 'Cours non spécifié'}</span>
      <span>📅 Semestre: ${project.semester || 'Non spécifié'}</span>
      ${project.pinned ? '<span style="color: var(--gold-color);">📌 Épinglé</span>' : ''}
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 0.95rem; margin-bottom: 5px; color: var(--text-main);">Description</h3>
      <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; white-space: pre-line;">${project.description || 'Aucune description fournie.'}</p>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 0.95rem; margin-bottom: 5px; color: var(--text-main);">Compétences mobilisées</h3>
      <div class="tags" style="justify-content: flex-start; gap: 6px;">
        ${(project.skills || []).map(skillId => {
          const sk = skillsData[skillId];
          return sk ? `<span class="tag">${sk.icon} ${sk.label}</span>` : `<span class="tag">${skillId}</span>`;
        }).join('')}
      </div>
      <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;">
        Valeur additive pour chaque compétence : <strong>+${project.skills ? project.skills.length : 0}</strong> points ${dots}
      </div>
    </div>

    ${project.link ? `
      <div style="margin-bottom: 20px;">
        <a href="${project.link}" target="_blank" class="btn secondary small" style="text-decoration: none;">🔗 Visiter le lien du projet</a>
      </div>
    ` : ''}

    <div style="border-top: 1px solid var(--border-color); padding-top: 15px; margin-top: 15px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 1.1rem;">👍</span>
        <span style="font-size: 0.9rem; font-weight: 600;">${projectEndorsements.length} endossement(s)</span>
        <span style="font-size: 0.8rem; color: var(--text-muted);"> (+${projectEndorsements.length * 10} pts sur les compétences liées)</span>
      </div>

      <div style="display: flex; gap: 8px;">
        ${isOwner ? `
          <button id="pin-project-btn" class="btn secondary small">${project.pinned ? '📌 Désépingler' : '📌 Épingler (Max 3)'}</button>
          <button id="edit-project-btn" class="btn primary small">✏️ Éditer</button>
          <button id="delete-project-btn" class="btn icon-btn" style="font-size: 1rem;" title="Supprimer">🗑️</button>
        ` : ''}

        ${(visitorCode && !isOwner) ? `
          <button id="endorse-project-btn" class="btn ${hasEndorsed ? 'secondary' : 'primary'} small">
            ${hasEndorsed ? '✅ Retirer l\'endossement' : '👍 Endosser le projet'}
          </button>
        ` : ''}
      </div>
    </div>
  `;

  // Fermeture du modal
  const modal = document.getElementById('project-detail-modal');
  document.getElementById('close-project-modal')?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  // Action d'endossement
  if (visitorCode && !isOwner) {
    const endorseBtn = document.getElementById('endorse-project-btn');
    endorseBtn?.addEventListener('click', async () => {
      endorseBtn.disabled = true;
      try {
        if (hasEndorsed) {
          await db.removeEndorsement(visitorCode, project.id);
        } else {
          await db.addEndorsement(visitorCode, project.id);
        }
        await renderDetailsView(project, isOwner, visitorCode, currentStudentCode, onActionCompleted);
        if (onActionCompleted) onActionCompleted();
      } catch (err) {
        alert("Erreur endossement: " + err.message);
        endorseBtn.disabled = false;
      }
    });
  }

  // Actions Propriétaire
  if (isOwner) {
    const editBtn = document.getElementById('edit-project-btn');
    const deleteBtn = document.getElementById('delete-project-btn');
    const pinBtn = document.getElementById('pin-project-btn');

    editBtn?.addEventListener('click', () => {
      renderProjectForm(project, onActionCompleted);
    });

    deleteBtn?.addEventListener('click', async () => {
      if (confirm('Supprimer définitivement ce projet ?')) {
        try {
          await db.deleteProject(project.id);
          modal.classList.add('hidden');
          if (onActionCompleted) onActionCompleted();
        } catch (err) {
          alert("Erreur lors de la suppression: " + err.message);
        }
      }
    });

    pinBtn?.addEventListener('click', async () => {
      try {
        const newPinnedState = !project.pinned;
        // On cherche le pin_order suivant s'il s'agit d'épingler
        const activeProjects = await db.getProjects(currentStudentCode);
        const pinnedProjects = activeProjects.filter(p => p.pinned);
        let nextOrder = 1;
        if (newPinnedState) {
          if (pinnedProjects.length >= 3) {
            alert("Vous avez déjà épinglé le maximum de 3 projets.");
            return;
          }
          nextOrder = pinnedProjects.length + 1;
        }

        await db.togglePin(project.id, newPinnedState, nextOrder);
        // Mettre à jour le statut dans l'affichage
        project.pinned = newPinnedState;
        project.pin_order = nextOrder;
        await renderDetailsView(project, isOwner, visitorCode, currentStudentCode, onActionCompleted);
        if (onActionCompleted) onActionCompleted();
      } catch (err) {
        alert("Erreur d'épinglage : " + err.message);
      }
    });
  }
}
