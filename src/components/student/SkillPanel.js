// src/components/student/SkillPanel.js
import skillCategories from '../../data/skills.json';
import config from '../../data/config.json';
import { computeSkillScores } from '../../utils/scoreCalculator.js';
import { resolveLevel } from '../../utils/titleResolver.js';

const allSkills = skillCategories.flatMap(cat =>
  cat.items.map(item => ({ ...item, categoryId: cat.id, categoryLabel: cat.label }))
);

export function renderSkillPanel(projects, endorsements) {
  const container = document.getElementById('skills-list-container');
  if (!container) return;
  container.innerHTML = '';

  const scores = computeSkillScores(projects, endorsements);

  // Tri par score décroissant
  const sortedSkills = allSkills
    .map(skill => ({ ...skill, score: scores[skill.id] || 0 }))
    .sort((a, b) => b.score - a.score);

  // Séparer les 4 principales des autres
  const topSkills = sortedSkills.slice(0, 4);
  const otherSkills = sortedSkills.slice(4);

  // Déterminer le score max pour l'affichage proportionnel
  const maxScore = Math.max(...sortedSkills.map(s => s.score), 1);

  // Rendu des 4 principales
  topSkills.forEach(skill => {
    const row = createSkillRow(skill, maxScore);
    container.appendChild(row);
  });

  // Rendu de l'accordéon pour les autres compétences
  if (otherSkills.length > 0) {
    const accordion = document.createElement('div');
    accordion.className = 'other-skills-accordion';
    accordion.style.marginTop = '15px';
    accordion.innerHTML = `
      <div class="accordion-header" id="other-skills-accordion-btn" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.01); border: 1px solid var(--border-color); border-radius: var(--radius); cursor: pointer; user-select: none;">
        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-muted);">▼ Autres compétences (${otherSkills.length})</span>
        <span class="skills-chevron" style="font-size: 0.8rem; transition: transform 0.2s;">▼</span>
      </div>
      <div class="accordion-content hidden" id="other-skills-accordion-content" style="padding-top: 10px; display: flex; flex-direction: column; gap: 8px;">
        <!-- Rempli dynamiquement -->
      </div>
    `;
    container.appendChild(accordion);

    const accordionBtn = document.getElementById('other-skills-accordion-btn');
    const accordionContent = document.getElementById('other-skills-accordion-content');
    const chevron = accordionBtn.querySelector('.skills-chevron');

    accordionBtn.addEventListener('click', () => {
      const isHidden = accordionContent.classList.toggle('hidden');
      chevron.style.transform = isHidden ? 'rotate(0deg)' : 'rotate(180deg)';
    });

    otherSkills.forEach(skill => {
      const row = createSkillRow(skill, maxScore);
      accordionContent.appendChild(row);
    });
  }
}

function createSkillRow(skill, maxScore) {
  const row = document.createElement('div');
  row.className = 'skill-item';
  if (skill.score === 0) row.style.opacity = '0.45';

  const percentage = Math.min(100, Math.round((skill.score / maxScore) * 100));

  // Générer des blocs visuels proportionnels au score (ex: 80% = 8 blocs pleins, 2 vides)
  const totalBlocks = 10;
  const filledBlocksCount = Math.round((percentage / 100) * totalBlocks);
  const filledChars = "█".repeat(filledBlocksCount);
  const emptyChars = "░".repeat(totalBlocks - filledBlocksCount);
  const blocksHtml = `${filledChars}<span class="empty">${emptyChars}</span>`;

  const level = resolveLevel(skill.score, config.skillLevels);

  row.innerHTML = `
    <div class="skill-name" style="font-weight: 600;">${skill.label}</div>
    <div class="skill-level" style="font-weight: 500; font-size: 0.78rem; text-align: right; color: var(--text-muted);">${level.title}</div>
    <div class="skill-blocks" style="font-family: monospace; font-size: 1.05rem; letter-spacing: 1px;">${blocksHtml}</div>
    <div class="skill-score-val" style="font-weight: bold; text-align: right; color: var(--accent-color);">${skill.score} pts</div>
    <div class="skill-desc-preview" style="grid-column: 1 / -1; font-size: 0.78rem; color: var(--text-muted); padding-top: 2px;">${skill.categoryLabel}</div>
  `;

  row.style.display = 'grid';
  row.style.gridTemplateColumns = '1fr 90px 120px 80px';
  row.style.alignItems = 'center';
  row.style.padding = '10px 0';
  row.style.borderBottom = '1px solid var(--border-color)';

  return row;
}
