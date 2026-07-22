// src/components/student/InventoryGrid.js

export function renderInventoryGrid(projects, claims = []) {
  const grid = document.getElementById('inventory-grid');
  const countEl = document.getElementById('project-count');
  if (!grid) return;

  grid.innerHTML = '';
  if (countEl) countEl.innerText = projects.length;

  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('div');
    slot.className = 'project-card';
    
    if (i < projects.length) {
      const proj = projects[i];
      slot.classList.add('filled');
      
      // Construire les points de valeur
      const weight = proj.skill_weight || (proj.skills ? proj.skills.length : 1);
      const dots = "●".repeat(Math.min(5, weight));

      // Vérifier si ce projet sert de preuve à un claim validé
      const isProof = claims.some(c => c.project_id === proj.id && c.validated);

      slot.innerHTML = `
        ${isProof ? '<div class="project-valid-icon" title="Sert de preuve pour un claim">✅ Preuve</div>' : ''}
        <button class="btn icon-btn delete-proj-btn" data-id="${proj.id}" style="position:absolute; bottom:5px; right:5px; color:var(--text-muted); font-size:1rem;" title="Supprimer">🗑️</button>
        <div class="project-name">${proj.name}</div>
        <div class="project-course">${proj.course || 'Projet'}</div>
        <div class="project-value" title="Valeur additive : ${weight} compétences">${dots}</div>
      `;
      
      slot.addEventListener('click', async (e) => {
        if(e.target.closest('.delete-proj-btn')) {
          e.stopPropagation();
          if(confirm('Supprimer ce projet ?')) {
            const { db } = await import('../../services/SupabaseService.js');
            await db.deleteProject(proj.id);
            document.getElementById('login-btn').click(); // refresh
          }
          return;
        }
        alert(`Détails du projet: ${proj.name}\n${proj.description}\nCompétences: ${proj.skills?.join(', ')}`);
      });
    } else {
      slot.style.border = "2px dashed var(--border-color)";
      slot.style.background = "transparent";
      slot.style.display = "flex";
      slot.style.alignItems = "center";
      slot.style.justifyContent = "center";
      slot.style.color = "var(--text-muted)";
      slot.style.minHeight = "100px";
      slot.style.cursor = "pointer";
      slot.innerHTML = `+ Ajouter un projet`;
      slot.addEventListener('click', () => {
        const btn = document.getElementById('add-project-btn');
        if (btn) btn.click();
      });
    }
    
    grid.appendChild(slot);
  }
}
