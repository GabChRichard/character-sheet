// src/components/student/ProjectGrid.js
import { openProjectModal } from './ProjectModal.js';
import { renderProjectForm } from './ProjectForm.js';
import skillsData from '../../data/skills.json';

export function renderProjectGrid(projects, isOwner, visitorCode, currentStudentCode, onUpdate) {
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
      📌 Projets Épinglés (${pinnedProjects.length}/3)
    </h3>
    <div class="pinned-projects-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 25px;">
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
      const card = createProjectCard(proj, true);
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
      const card = createProjectCard(proj, false);
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

function createProjectCard(proj, isPinned) {
  const card = document.createElement('div');
  card.className = `project-card filled ${isPinned ? 'pinned-card' : ''}`;
  card.style.position = 'relative';

  const weight = proj.skills ? proj.skills.length : 0;
  const dots = "●".repeat(Math.min(5, weight));

  // Afficher les 3 premières icônes de compétences
  const skillIcons = (proj.skills || []).slice(0, 3).map(skillId => {
    const sk = skillsData[skillId];
    return sk ? `<span title="${sk.label}">${sk.icon}</span>` : '';
  }).join(' ');

  card.innerHTML = `
    ${isPinned ? '<div class="project-valid-icon" style="background: rgba(251, 191, 36, 0.1); color: var(--gold-color); border: 1px solid var(--gold-color);">📌 Épinglé</div>' : ''}
    <div class="project-name" style="margin-top: ${isPinned ? '15px' : '0'};">${proj.name}</div>
    <div class="project-course">${proj.course || 'Projet'}</div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
      <div class="project-value" title="Valeur : ${weight} compétences">${dots}</div>
      <div class="project-skills-icons" style="font-size: 0.95rem; display: flex; gap: 4px;">${skillIcons}</div>
    </div>
  `;

  return card;
}
