// src/components/student/BadgeWall.js
import badgesData from '../../data/badges.json';

export function renderBadgeWall(studentBadges) {
  const grid = document.getElementById('badges-grid');
  if (!grid) return;

  grid.innerHTML = '';

  // Aplatir toutes les catégories de badges
  const allBadges = [];
  Object.keys(badgesData).forEach(category => {
    badgesData[category].forEach(badge => {
      allBadges.push({ ...badge, category });
    });
  });

  allBadges.forEach(badge => {
    const earnedInfo = studentBadges[badge.id];
    const isUnlocked = earnedInfo && earnedInfo.unlocked;
    
    const div = document.createElement('div');
    div.className = `badge-item ${isUnlocked ? 'unlocked anim-badge-unlock' : ''}`;
    
    // Contenu informatif amélioré au survol
    let tooltip = `${badge.name}\n${badge.description}`;
    if (isUnlocked) {
      const dateStr = earnedInfo.date ? new Date(earnedInfo.date).toLocaleDateString('fr-CA') : 'Récemment';
      tooltip += `\n\nAttribué le : ${dateStr}\nPar : ${earnedInfo.grantedBy || 'Administration'}`;
    } else {
      tooltip += `\n\n[Requis : Octroyé par le/la ${badge.grantedBy || 'prof'}]`;
    }
    
    div.title = tooltip;
    div.innerHTML = badge.icon;
    
    grid.appendChild(div);
  });
}
