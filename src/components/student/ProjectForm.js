// src/components/student/ProjectForm.js
import { db } from '../../services/SupabaseService.js';
import skillCategories from '../../data/skills.json';
import coursesData from '../../data/courses.json';
import { getSkillId, getSkillComplexity } from '../../utils/skillsIndex.js';

export function renderProjectForm(project = null, onActionCompleted = null) {
  const body = document.getElementById('project-modal-body');
  const modal = document.getElementById('project-detail-modal');
  if (!body || !modal) return;

  const isEdit = !!project;
  const allCourses = coursesData;

  const sessions = ["Automne", "Hiver", "Été"];
  const years = Array.from({ length: 11 }, (_, i) => 2020 + i); // 2020 à 2030

  // Reconstituer la session/année depuis le semestre existant (ex: "Automne 2026")
  let currentSession = '';
  let currentYear = '';
  if (isEdit && project.semester) {
    const match = project.semester.match(/^(Automne|Hiver|Été)\s+(\d{4})$/);
    if (match) {
      currentSession = match[1];
      currentYear = match[2];
    }
  }

  body.innerHTML = `
    <span class="close-modal" id="close-project-form-modal">&times;</span>
    <h2 style="font-family: var(--font-title); color: var(--accent-color); margin-bottom: 15px;">
      ${isEdit ? 'Éditer le projet' : 'Ajouter un projet'}
    </h2>
    <form id="project-edit-form">
      <div class="form-group">
        <label for="form-proj-name">Nom du projet</label>
        <input type="text" id="form-proj-name" value="${isEdit ? project.name : ''}" required />
      </div>

      <div class="form-group">
        <label for="form-proj-desc">Description courte</label>
        <textarea id="form-proj-desc" rows="3" required>${isEdit ? project.description || '' : ''}</textarea>
      </div>

      <div class="form-group">
        <label for="form-proj-course">Cours associé</label>
        <select id="form-proj-course">
          <option value="">-- Sélectionner un cours --</option>
          ${allCourses.map(c => `<option value="${c}" ${isEdit && project.course === c ? 'selected' : ''}>${c}</option>`).join('')}
          <option value="Autre" ${isEdit && !allCourses.includes(project.course) && project.course ? 'selected' : ''}>Autre / Projet personnel</option>
        </select>
        <input type="text" id="form-proj-course-custom" class="hidden" placeholder="Entrez le nom du cours" style="margin-top: 5px;" value="${isEdit && !allCourses.includes(project.course) ? project.course || '' : ''}" />
      </div>

      <div class="form-group">
        <label>Session et année</label>
        <div style="display: flex; gap: 10px;">
          <select id="form-proj-session" style="flex: 1;">
            <option value="">-- Session --</option>
            ${sessions.map(s => `<option value="${s}" ${currentSession === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <select id="form-proj-year" style="flex: 1;">
            <option value="">-- Année --</option>
            ${years.map(y => `<option value="${y}" ${currentYear === String(y) ? 'selected' : ''}>${y}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Miniature du projet</label>
        <div style="display: flex; align-items: center; gap: 14px;">
          <div id="form-proj-thumbnail-preview" style="width: 64px; height: 48px; border-radius: var(--radius); border: 1px solid var(--border-color); background: rgba(0,0,0,0.03); background-size: cover; background-position: center; flex-shrink: 0;"></div>
          <label for="form-proj-thumbnail-input" class="btn secondary" style="cursor: pointer;">Choisir une image</label>
          <input type="file" id="form-proj-thumbnail-input" accept="image/*" class="hidden" />
        </div>
      </div>

      <div class="form-group">
        <label>Compétences mobilisées <small>(cochez une compétence, puis ajustez sa complexité)</small></label>
        ${skillCategories.map(cat => `
          <fieldset class="skills-fieldset">
            <legend>${cat.icon} ${cat.label}</legend>
            <div class="skills-checkboxes">
              ${cat.items.map(item => {
                const existing = isEdit && project.skills
                  ? project.skills.find(s => getSkillId(s) === item.id)
                  : null;
                const checked = existing ? 'checked' : '';
                const complexity = existing ? getSkillComplexity(existing) : 1;
                return `
                  <div class="skill-checkbox-row">
                    <label>
                      <input type="checkbox" name="form-proj-skills" value="${item.id}" ${checked}>
                      <span>${item.label}</span>
                    </label>
                    <div class="complexity-toggle ${checked ? '' : 'hidden'}" data-skill-id="${item.id}" data-value="${complexity}">
                      <button type="button" class="btn small complexity-btn ${complexity === 1 ? 'active' : ''}" data-complexity="1">Simple</button>
                      <button type="button" class="btn small complexity-btn ${complexity === 2 ? 'active' : ''}" data-complexity="2">Complexe</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </fieldset>
        `).join('')}
      </div>

      <div class="form-group">
        <label for="form-proj-link">Lien du projet (URL)</label>
        <input type="url" id="form-proj-link" placeholder="https://" value="${isEdit ? project.link || '' : ''}" />
      </div>

      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button type="submit" class="btn primary">Enregistrer</button>
        <button type="button" id="cancel-project-form" class="btn secondary">Annuler</button>
      </div>
    </form>
  `;

  modal.classList.remove('hidden');

  // Aperçu de la miniature existante + sélection d'une nouvelle image
  const thumbnailPreview = document.getElementById('form-proj-thumbnail-preview');
  const thumbnailInput = document.getElementById('form-proj-thumbnail-input');
  if (thumbnailPreview && isEdit && project.thumbnail_url) {
    thumbnailPreview.style.backgroundImage = `url("${project.thumbnail_url}")`;
  }
  thumbnailInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !thumbnailPreview) return;
    thumbnailPreview.style.backgroundImage = `url("${URL.createObjectURL(file)}")`;
  });

  // Afficher/masquer le toggle de complexité selon l'état de la case à cocher
  document.querySelectorAll('input[name="form-proj-skills"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const toggle = document.querySelector(`.complexity-toggle[data-skill-id="${cb.value}"]`);
      if (toggle) toggle.classList.toggle('hidden', !cb.checked);
    });
  });

  // Sélection Simple / Complexe pour chaque compétence cochée
  document.querySelectorAll('.complexity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const toggle = btn.closest('.complexity-toggle');
      if (!toggle) return;
      toggle.dataset.value = btn.dataset.complexity;
      toggle.querySelectorAll('.complexity-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Afficher / masquer le champ personnalisé si "Autre" est sélectionné
  const courseSelect = document.getElementById('form-proj-course');
  const courseCustomInput = document.getElementById('form-proj-course-custom');
  if (courseSelect && courseCustomInput) {
    if (courseSelect.value === 'Autre') {
      courseCustomInput.classList.remove('hidden');
    }
    courseSelect.addEventListener('change', (e) => {
      if (e.target.value === 'Autre') {
        courseCustomInput.classList.remove('hidden');
        courseCustomInput.focus();
      } else {
        courseCustomInput.classList.add('hidden');
      }
    });
  }

  // Fermetures et Annulations
  const closeForm = () => {
    modal.classList.add('hidden');
  };
  document.getElementById('close-project-form-modal')?.addEventListener('click', closeForm);
  document.getElementById('cancel-project-form')?.addEventListener('click', closeForm);

  // Soumission du formulaire
  document.getElementById('project-edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    let finalCourse = courseSelect.value;
    if (finalCourse === 'Autre') {
      finalCourse = courseCustomInput.value.trim() || 'Projet libre';
    }

    const selectedSkills = Array.from(document.querySelectorAll('input[name="form-proj-skills"]:checked')).map(cb => {
      const toggle = document.querySelector(`.complexity-toggle[data-skill-id="${cb.value}"]`);
      const complexity = toggle && toggle.dataset.value === '2' ? 2 : 1;
      return { id: cb.value, complexity };
    });
    const session = document.getElementById('form-proj-session').value;
    const year = document.getElementById('form-proj-year').value;

    const projectData = {
      name: document.getElementById('form-proj-name').value.trim(),
      description: document.getElementById('form-proj-desc').value.trim(),
      course: finalCourse,
      semester: session && year ? `${session} ${year}` : '',
      skills: selectedSkills,
      link: document.getElementById('form-proj-link').value.trim()
    };

    const studentCode = document.getElementById('student-code-input').value;
    const thumbnailFile = thumbnailInput?.files[0];

    try {
      let savedProject;
      if (isEdit) {
        savedProject = await db.updateProject(project.id, projectData);
      } else {
        savedProject = await db.addProject({ ...projectData, studentCode });
      }

      if (thumbnailFile) {
        const thumbnailUrl = await db.uploadProjectThumbnail(studentCode, savedProject.id, thumbnailFile);
        await db.updateProject(savedProject.id, { ...projectData, thumbnailUrl });
      }

      closeForm();
      if (onActionCompleted) onActionCompleted();
    } catch (err) {
      alert("Erreur lors de la sauvegarde: " + err.message);
    }
  });
}
