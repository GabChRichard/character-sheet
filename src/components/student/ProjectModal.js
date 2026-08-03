// src/components/student/ProjectModal.js
import { db } from '../../services/SupabaseService.js';
import { skillsIndex, getSkillId, getSkillHours, getSkillSelfAssessment } from '../../utils/skillsIndex.js';
import { resolveEndorsementPoints } from '../../utils/scoreCalculator.js';
import config from '../../data/config.json';
import { renderProjectForm } from './ProjectForm.js';
import { showToast, confirmDialog } from '../../utils/notify.js';

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

  const skillWeight = (project.skills || []).reduce((sum, s) => sum + getSkillHours(s), 0);
  // Un dot par catégorie de hard skills mobilisée par le projet (5 catégories = 5 dots max)
  const categoryCount = new Set(
    (project.skills || []).map(s => skillsIndex[getSkillId(s)]?.categoryId).filter(Boolean)
  ).size;
  const dots = "●".repeat(categoryCount);

  body.innerHTML = `
    <button type="button" class="close-modal" id="close-project-modal" aria-label="Fermer">&times;</button>
    <h2 style="font-family: var(--font-title); color: var(--accent-color); margin-bottom: 8px;">${project.name}</h2>
    <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px; display: flex; gap: 15px;">
      <span>🏫 ${project.course || 'Cours non spécifié'}</span>
      <span>📅 Semestre: ${project.semester || 'Non spécifié'}</span>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 0.95rem; margin-bottom: 5px; color: var(--text-main);">Description</h3>
      <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; white-space: pre-line;">${project.description || 'Aucune description fournie.'}</p>
    </div>

    <div style="margin-bottom: 20px;">
      <h3 style="font-size: 0.95rem; margin-bottom: 5px; color: var(--text-main);">Compétences mobilisées</h3>
      <div class="tags" style="justify-content: flex-start; gap: 6px;">
        ${(project.skills || []).map(entry => {
          const skillId = getSkillId(entry);
          const sk = skillsIndex[skillId];
          const hoursLabel = config.scoring.hoursTiers.find(t => t.hours === getSkillHours(entry))?.label || '';
          const hoursTag = hoursLabel ? ` · ${hoursLabel}` : '';
          const assessmentLabel = config.scoring.selfAssessmentTiers.find(t => t.value === getSkillSelfAssessment(entry))?.label || '';
          const assessmentTag = assessmentLabel ? ` · ${assessmentLabel}` : '';
          return sk ? `<span class="tag">${sk.icon} ${sk.label}${hoursTag}${assessmentTag}</span>` : `<span class="tag">${skillId}${hoursTag}${assessmentTag}</span>`;
        }).join('')}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.8rem; color: var(--text-muted); margin-top: 5px;" title="${categoryCount} catégorie(s) de compétences">
        <span>${dots}</span>
        <strong style="font-size: 0.8rem;">${skillWeight} pts</strong>
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
        <span style="font-size: 0.8rem; color: var(--text-muted);"> (+${resolveEndorsementPoints(projectEndorsements.length)} pts sur les compétences liées)</span>
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
        showToast("Erreur endossement : " + err.message, 'error');
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
      if (await confirmDialog('Supprimer définitivement ce projet ?', { confirmLabel: 'Supprimer' })) {
        try {
          await db.deleteProject(project.id);
          modal.classList.add('hidden');
          if (onActionCompleted) onActionCompleted();
        } catch (err) {
          showToast("Erreur lors de la suppression : " + err.message, 'error');
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
            showToast("Vous avez déjà épinglé le maximum de 3 projets.", 'info');
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
        showToast("Erreur d'épinglage : " + err.message, 'error');
      }
    });
  }
}
