// src/components/student/ProjectGrid.js
import { openProjectModal } from './ProjectModal.js';
import { renderProjectForm } from './ProjectForm.js';
import { skillsIndex, getSkillId, getSkillHours } from '../../utils/skillsIndex.js';
import { EndorsementService } from '../../services/EndorsementService.js';
import { showToast } from '../../utils/notify.js';

export function renderProjectGrid(projects, isOwner, visitorCode, currentStudentCode, onUpdate, endorsements = []) {
  const root = document.getElementById('project-grid-root');
  if (!root) return;

  root.innerHTML = '';

  // Séparer les projets épinglés des autres
  const pinnedProjects = projects.filter(p => p.pinned).sort((a, b) => a.pin_order - b.pin_order);
  const otherProjects = projects.filter(p => !p.pinned).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  // 1. Zone des projets épinglés (Max 3)
  const pinnedSection = document.createElement('div');
  pinnedSection.className = 'pinned-projects-section';
  pinnedSection.innerHTML = `
    <h3 style="font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
      Projets Épinglés (${pinnedProjects.length}/3)
    </h3>
    <div class="pinned-projects-grid">
      <!-- Inséré dynamiquement -->
    </div>
  `;
  root.appendChild(pinnedSection);

  const pinnedGrid = pinnedSection.querySelector('.pinned-projects-grid');

  if (pinnedProjects.length === 0) {
    pinnedGrid.innerHTML = `
      <div style="grid-column: 1/-1; padding: 25px; border: 2px dashed var(--border-color); border-radius: var(--radius); text-align: center; color: var(--text-muted); font-size: 0.9rem;">
        Aucun projet épinglé pour le moment.
      </div>
    `;
  } else {
    pinnedProjects.forEach(proj => {
      const card = createProjectCard(proj, true, visitorCode, isOwner, endorsements, onUpdate);
      card.addEventListener('click', () => {
        openProjectModal(proj, isOwner, visitorCode, currentStudentCode, onUpdate);
      });
      pinnedGrid.appendChild(card);
    });
  }

  // 2. Zone accordéon pour le reste des projets
  const otherSection = document.createElement('div');
  otherSection.className = 'other-projects-section';
  otherSection.innerHTML = `
    <div class="accordion-header" id="other-projects-accordion-btn" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius); cursor: pointer; user-select: none;">
      <span style="font-weight: 600; font-size: 0.95rem;">📂 Tous les projets (${projects.length})</span>
      <span class="chevron" style="transition: transform 0.2s;">▼</span>
    </div>
    <div class="accordion-content hidden" id="other-projects-accordion-content" style="padding-top: 15px;">
      <div class="projects-list-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px;">
        <!-- Rempli dynamiquement -->
      </div>
    </div>
  `;
  root.appendChild(otherSection);

  const accordionBtn = document.getElementById('other-projects-accordion-btn');
  const accordionContent = document.getElementById('other-projects-accordion-content');
  const chevron = accordionBtn.querySelector('.chevron');

  accordionBtn.addEventListener('click', () => {
    const isHidden = accordionContent.classList.toggle('hidden');
    chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
  });

  const listGrid = accordionContent.querySelector('.projects-list-grid');

  if (otherProjects.length === 0) {
    listGrid.innerHTML = `
      <div style="grid-column: 1/-1; padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        Aucun autre projet dans l'inventaire.
      </div>
    `;
  } else {
    otherProjects.forEach(proj => {
      const card = createProjectCard(proj, false, visitorCode, isOwner, endorsements, onUpdate);
      card.addEventListener('click', () => {
        openProjectModal(proj, isOwner, visitorCode, currentStudentCode, onUpdate);
      });
      listGrid.appendChild(card);
    });
  }

  // Si propriétaire, configurer le bouton général d'ajout de projet
  if (isOwner) {
    const addProjectBtn = document.getElementById('add-project-btn');
    if (addProjectBtn) {
      // Nettoyer les anciens event listeners
      const newBtn = addProjectBtn.cloneNode(true);
      addProjectBtn.parentNode.replaceChild(newBtn, addProjectBtn);
      newBtn.addEventListener('click', () => {
        renderProjectForm(null, onUpdate);
      });
    }
  } else {
    const addProjectBtn = document.getElementById('add-project-btn');
    if (addProjectBtn) addProjectBtn.style.display = 'none';
  }
}

function createProjectCard(proj, isPinned, visitorCode, isOwner, endorsements, onUpdate) {
  const card = document.createElement('div');
  card.className = `project-card filled ${isPinned ? 'pinned-card' : ''}`;
  card.style.position = 'relative';

  const weight = (proj.skills || []).reduce((sum, s) => sum + getSkillHours(s), 0);
  // Un dot par catégorie de hard skills mobilisée par le projet (5 catégories = 5 dots max)
  const categoryCount = new Set(
    (proj.skills || []).map(s => skillsIndex[getSkillId(s)]?.categoryId).filter(Boolean)
  ).size;
  const dots = "●".repeat(categoryCount);

  const thumbnail = proj.thumbnail_url
    ? `<div class="project-thumbnail" style="background-image: url('${proj.thumbnail_url}');"></div>`
    : `<div class="project-thumbnail project-thumbnail-placeholder"></div>`;

  card.innerHTML = `
    ${thumbnail}
    <div class="project-name">${proj.name}</div>
    <div class="project-course">${proj.course || 'Projet'} ${proj.team ? '· 👥 Équipe' : '· 🧍 Solo'}</div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
      <div class="project-value" title="${categoryCount} catégorie(s) de compétences">${dots}</div>
      <span class="project-points" style="font-size: 0.8rem; color: var(--text-muted);">${weight} pts</span>
    </div>
  `;

  if (visitorCode && !isOwner) {
    const hasEndorsed = (endorsements || []).some(e => e.project_id === proj.id && e.from_code === visitorCode);
    const endorseBtn = document.createElement('button');
    endorseBtn.type = 'button';
    endorseBtn.className = 'btn icon-btn quick-endorse-btn';
    endorseBtn.title = hasEndorsed ? "Retirer l'endossement" : 'Endosser ce projet';
    endorseBtn.style.position = 'absolute';
    endorseBtn.style.top = '8px';
    endorseBtn.style.right = '8px';
    endorseBtn.innerText = hasEndorsed ? '✅' : '👍';

    endorseBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      endorseBtn.disabled = true;
      const result = hasEndorsed
        ? await EndorsementService.unendorseProject(visitorCode, proj.id)
        : await EndorsementService.endorseProject(visitorCode, proj.id);
      if (result !== null) {
        if (onUpdate) onUpdate();
      } else {
        endorseBtn.disabled = false;
        showToast("Erreur lors de l'endossement.", 'error');
      }
    });

    card.appendChild(endorseBtn);
  }

  return card;
}
