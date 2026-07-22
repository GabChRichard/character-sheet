// src/components/student/ProjectForm.js
import { db } from '../../services/SupabaseService.js';
import skillsData from '../../data/skills.json';
import coursesData from '../../data/courses.json';

export function renderProjectForm(project = null, onActionCompleted = null) {
  const body = document.getElementById('project-modal-body');
  const modal = document.getElementById('project-detail-modal');
  if (!body || !modal) return;

  const isEdit = !!project;
  const allCourses = [];
  coursesData.forEach(y => y.courses.forEach(c => allCourses.push(c.name)));

  // Récupérer la liste des semestres suggérés (ex: H2026, A2025, etc.)
  const semesters = ["A2024", "H2025", "A2025", "H2026", "A2026", "H2027"];

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
        <label for="form-proj-semester">Semestre</label>
        <select id="form-proj-semester">
          <option value="">-- Sélectionner un semestre --</option>
          ${semesters.map(s => `<option value="${s}" ${isEdit && project.semester === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </div>

      <div class="form-group">
        <label>Compétences mobilisées <small>(Valeur additive basées sur la sélection)</small></label>
        <div class="skills-checkboxes" style="margin-top: 8px;">
          ${Object.keys(skillsData).map(skillId => {
            const checked = isEdit && project.skills && project.skills.includes(skillId) ? 'checked' : '';
            return `
              <label>
                <input type="checkbox" name="form-proj-skills" value="${skillId}" ${checked}>
                <span>${skillsData[skillId].icon} ${skillsData[skillId].label}</span>
              </label>
            `;
          }).join('')}
        </div>
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

    const selectedSkills = Array.from(document.querySelectorAll('input[name="form-proj-skills"]:checked')).map(cb => cb.value);

    const projectData = {
      name: document.getElementById('form-proj-name').value.trim(),
      description: document.getElementById('form-proj-desc').value.trim(),
      course: finalCourse,
      semester: document.getElementById('form-proj-semester').value,
      skills: selectedSkills,
      link: document.getElementById('form-proj-link').value.trim()
    };

    try {
      if (isEdit) {
        await db.updateProject(project.id, projectData);
      } else {
        await db.addProject(projectData);
      }
      closeForm();
      if (onActionCompleted) onActionCompleted();
    } catch (err) {
      alert("Erreur lors de la sauvegarde: " + err.message);
    }
  });
}
