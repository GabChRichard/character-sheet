// src/components/student/SkillPanel.js
import Chart from 'chart.js/auto';
import skillsData from '../../data/skills.json';

let radarInstance = null;

export function renderSkillPanel(projects, endorsements) {
  const container = document.getElementById('skills-list-container');
  if (!container) return;
  container.innerHTML = '';

  // 1. Calculer les scores par compétence
  const scores = {};
  Object.keys(skillsData).forEach(id => {
    scores[id] = 0;
  });

  projects.forEach(project => {
    const projectEndorsements = endorsements.filter(e => e.project_id === project.id).length;
    const projectValue = project.skills ? project.skills.length : 0;
    const endorsementBoost = projectEndorsements * 10;

    if (project.skills) {
      project.skills.forEach(skillId => {
        if (scores[skillId] !== undefined) {
          scores[skillId] += projectValue + endorsementBoost;
        }
      });
    }
  });

  // Tri par score décroissant
  const sortedSkills = Object.keys(skillsData)
    .map(id => ({ id, score: scores[id], ...skillsData[id] }))
    .sort((a, b) => b.score - a.score);

  // Séparer les 6 principales des autres
  const topSkills = sortedSkills.slice(0, 6);
  const otherSkills = sortedSkills.slice(6);

  // Déterminer le score max pour l'affichage proportionnel
  const maxScore = Math.max(...sortedSkills.map(s => s.score), 1);

  // Rendu des 6 principales
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

  // Rendu du Radar Chart sur les 6 compétences principales
  const labels = topSkills.map(s => s.label);
  const dataPoints = topSkills.map(s => s.score);
  renderRadarChart(labels, dataPoints);
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
  const blocksHtml = `${filledChars}<span class="empty" style="color: var(--border-color);">${emptyChars}</span>`;

  row.innerHTML = `
    <div class="skill-icon">${skill.icon}</div>
    <div class="skill-name" style="font-weight: 600;">${skill.label}</div>
    <div class="skill-blocks" style="font-family: monospace; font-size: 1.05rem; letter-spacing: 1px;">${blocksHtml}</div>
    <div class="skill-score-val" style="font-weight: bold; text-align: right; color: var(--accent-color);">${skill.score} pts</div>
    <div class="skill-desc-preview" style="grid-column: 2 / -1; font-size: 0.78rem; color: var(--text-muted); padding-top: 2px;">${skill.description}</div>
  `;

  // Ajustement de la structure grille CSS du skill-item pour la v5
  row.style.display = 'grid';
  row.style.gridTemplateColumns = '30px 1fr 120px 80px';
  row.style.alignItems = 'center';
  row.style.padding = '10px 0';
  row.style.borderBottom = '1px solid var(--border-color)';

  return row;
}

function renderRadarChart(labels, dataPoints) {
  const ctx = document.getElementById('skillsRadar');
  if (!ctx) return;

  if (radarInstance) radarInstance.destroy();

  const isDark = document.documentElement.dataset.theme === 'dark-minimal';
  const textColor = isDark ? '#a1a1aa' : '#6b5c53';
  const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  radarInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Points',
        data: dataPoints,
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderColor: '#8b5cf6',
        pointBackgroundColor: '#6366f1',
        borderWidth: 2,
      }]
    },
    options: {
      scales: {
        r: {
          angleLines: { color: gridColor },
          grid: { color: gridColor },
          pointLabels: {
            font: { family: 'Inter', size: 9, weight: 'bold' },
            color: textColor
          },
          ticks: { display: false }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}
