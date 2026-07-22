// src/components/student/LevelBar.js
export function renderLevelBar(levelInfo, config) {
  const titleEl = document.getElementById('student-global-title');
  const scoreEl = document.getElementById('current-score');
  const fillEl = document.getElementById('score-fill');

  if (titleEl) titleEl.innerText = levelInfo.title;
  if (scoreEl) scoreEl.innerText = levelInfo.score;

  if (fillEl && config) {
    const titles = config.globalTitles;
    let maxScore = 1000;
    let minScore = 0;
    
    // Trouver la tranche courante
    for (let t of titles) {
      if (levelInfo.score >= t.minScore && levelInfo.score <= t.maxScore) {
        minScore = t.minScore;
        maxScore = t.maxScore === 99999 ? t.minScore + 200 : t.maxScore;
        break;
      }
    }
    
    // Calcul du pourcentage dans le titre courant
    const range = maxScore - minScore;
    const current = levelInfo.score - minScore;
    const percentage = Math.min(100, Math.max(0, (current / range) * 100));

    // Petite animation différée pour l'effet visuel
    setTimeout(() => {
      fillEl.style.width = `${percentage}%`;
    }, 100);
  }
}
