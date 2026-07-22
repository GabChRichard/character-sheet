// src/components/admin/StudentList.js
import { computeSkillScores, calculateGlobalScore } from '../../utils/scoreCalculator.js';

export function renderStudentList(students, projectsMap = {}, endorsementsMap = {}, onSelectStudent) {
  const ul = document.getElementById('student-list');
  if (!ul) return;

  ul.innerHTML = '';

  if (students.length === 0) {
    ul.innerHTML = '<li style="padding: 10px; color: var(--text-muted); font-size: 0.85rem; text-align: center;">Aucun étudiant trouvé.</li>';
    return;
  }

  students.forEach(student => {
    const li = document.createElement('li');
    li.className = 'student-list-item';
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';
    li.style.padding = '8px 12px';
    li.style.cursor = 'pointer';
    li.style.borderBottom = '1px solid var(--border-color)';

    // Calculer le score global à la volée pour l'admin
    const studentProjects = projectsMap[student.code] || [];
    const studentEndorsements = endorsementsMap[student.code] || [];
    const skillScores = computeSkillScores(studentProjects, studentEndorsements);
    const score = calculateGlobalScore(skillScores);

    li.innerHTML = `
      <div style="display: flex; flex-direction: column;">
        <span style="font-weight: 600; font-size: 0.9rem;">${student.profile.alias || 'Anonyme'}</span>
        <code style="font-size: 0.75rem; color: var(--text-muted);">${student.code}</code>
      </div>
      <span class="score-badge" style="background: var(--primary-color); color: white; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: bold;">
        ${score} pts
      </span>
    `;

    li.addEventListener('click', () => {
      // Retirer la classe active de tous les items
      ul.querySelectorAll('li').forEach(item => item.classList.remove('active'));
      li.classList.add('active');
      onSelectStudent(student);
    });

    ul.appendChild(li);
  });
}
