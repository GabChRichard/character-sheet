// src/components/student/SkillRadar.js
import {
  Chart,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Legend,
  Tooltip
} from 'chart.js';
import skillCategories from '../../data/skills.json';
import { computeSkillScores } from '../../utils/scoreCalculator.js';

Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Legend, Tooltip);

let radarInstance = null;

const THEME_COLORS = {
  'dark-minimal': { text: '#a1a1aa', grid: 'rgba(255,255,255,0.08)' },
  cyber:          { text: '#9fb3c8', grid: 'rgba(102,252,241,0.15)' },
  parchment:      { text: '#6b5c53', grid: 'rgba(0,0,0,0.08)' },
  minimal:        { text: '#6b5c53', grid: 'rgba(0,0,0,0.08)' }
};

export function renderSkillRadar(projects, endorsements) {
  const ctx = document.getElementById('skillsRadar');
  if (!ctx) return;

  const scores = computeSkillScores(projects, endorsements);

  const categoryScores = skillCategories.map(cat => {
    const total = cat.items.reduce((sum, item) => sum + (scores[item.id] || 0), 0);
    return { label: cat.shortLabel || cat.label, score: Math.round(total / cat.items.length) };
  });

  const radarSummary = categoryScores.map(c => `${c.label} ${c.score} points`).join(', ');
  ctx.setAttribute('role', 'img');
  ctx.setAttribute('aria-label', `Radar des compétences : ${radarSummary}`);

  if (radarInstance) radarInstance.destroy();

  const theme = document.documentElement.dataset.theme || 'parchment';
  const { text: textColor, grid: gridColor } = THEME_COLORS[theme] || THEME_COLORS.parchment;

  radarInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: categoryScores.map(c => c.label),
      datasets: [{
        label: 'Points',
        data: categoryScores.map(c => c.score),
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderColor: '#8b5cf6',
        pointBackgroundColor: '#6366f1',
        borderWidth: 2,
      }]
    },
    options: {
      maintainAspectRatio: true,
      aspectRatio: 1,
      layout: { padding: 4 },
      scales: {
        r: {
          beginAtZero: true,
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
