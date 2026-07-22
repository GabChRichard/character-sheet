// src/components/admin/BadgeToggle.js
import badgesData from '../../data/badges.json';

let localBadgesState = {};

export function renderBadgeToggles(studentBadges, adminRole) {
  const container = document.getElementById('badges-toggles');
  if (!container) return;

  container.innerHTML = '';
  localBadgesState = { ...studentBadges };

  // Regrouper les badges par catégorie pour un affichage structuré
  Object.keys(badgesData).forEach(categoryKey => {
    const categoryTitle = categoryKey === 'general' ? 'Général' : (categoryKey === 'tutorat' ? 'Tutorat' : 'Niveau d\'expérience');
    const categorySection = document.createElement('div');
    categorySection.style.marginBottom = '20px';
    categorySection.innerHTML = `<h4 style="font-size: 0.9rem; border-bottom: 1px solid var(--border-color); padding-bottom: 4px; margin-bottom: 10px;">${categoryTitle}</h4>`;

    const grid = document.createElement('div');
    grid.className = 'badges-toggles-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
    grid.style.gap = '10px';

    badgesData[categoryKey].forEach(badge => {
      const isUnlocked = localBadgesState[badge.id] && localBadgesState[badge.id].unlocked;
      const canGrant = badge.grantedBy === adminRole;

      const card = document.createElement('label');
      card.style.display = 'flex';
      card.style.alignItems = 'center';
      card.style.gap = '10px';
      card.style.padding = '8px 12px';
      card.style.background = 'rgba(0,0,0,0.02)';
      card.style.border = '1px solid var(--border-color)';
      card.style.borderRadius = 'var(--radius)';
      card.style.cursor = canGrant ? 'pointer' : 'not-allowed';
      if (!canGrant) card.style.opacity = '0.6';

      card.innerHTML = `
        <input type="checkbox" data-id="${badge.id}" ${isUnlocked ? 'checked' : ''} ${canGrant ? '' : 'disabled'} style="cursor: inherit;" />
        <span style="font-size: 1.3rem;">${badge.icon}</span>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 0.85rem; font-weight: 600;">${badge.name}</span>
          <span style="font-size: 0.72rem; color: var(--text-muted);">${badge.description}</span>
        </div>
      `;

      if (canGrant) {
        const checkbox = card.querySelector('input');
        checkbox.addEventListener('change', (e) => {
          const checked = e.target.checked;
          if (checked) {
            localBadgesState[badge.id] = {
              unlocked: true,
              date: new Date().toISOString(),
              grantedBy: adminRole
            };
          } else {
            delete localBadgesState[badge.id];
          }
        });
      }

      grid.appendChild(card);
    });

    categorySection.appendChild(grid);
    container.appendChild(categorySection);
  });
}

export function getEditedBadges() {
  return localBadgesState;
}
