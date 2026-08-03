// src/admin.js
import './styles/base.css';
import './styles/admin.css';

import { db } from './services/SupabaseService.js';
import { renderStudentList } from './components/admin/StudentList.js';
import { renderBadgeToggles, getEditedBadges } from './components/admin/BadgeToggle.js';
import { generateRandomStudentCode } from './components/admin/CodeGenerator.js';
import { computeSkillScores } from './utils/scoreCalculator.js';
import { startIdleLogout } from './utils/idleLogout.js';
import { showToast } from './utils/notify.js';
import { createAuthFlow } from './utils/authFlow.js';
import skillsData from './data/skills.json';

startIdleLogout(db, 60 * 60 * 1000); // 1h d'inactivité

let currentStudentCode = null;
let currentAdmin = null; // { username, displayName, role }
let studentsCache = [];
let projectsCache = {};      // Map code -> projects
let endorsementsCache = {};  // Map code -> endorsements

console.log("Interface d'administration initialisée (v6.0).");

// --- AUTHENTIFICATION (GitHub OAuth via Supabase Auth) ---

async function showDashboard(admin) {
  currentAdmin = { username: admin.username, displayName: admin.display_name, role: admin.role };
  document.getElementById('admin-login').classList.add('hidden');
  document.getElementById('admin-no-account').classList.add('hidden');
  document.getElementById('admin-dashboard').classList.remove('hidden');

  const header = document.querySelector('.admin-header h1');
  if (header) header.innerText = `Panneau d'administration — ${admin.display_name} (${admin.role})`;

  await refreshDashboard();
}

const { bootstrap } = createAuthFlow({
  db,
  screenIds: {
    loginScreen: 'admin-login',
    noAccountScreen: 'admin-no-account',
    mainScreen: 'admin-dashboard',
    noAccountGithubUsernameId: 'admin-no-account-github-username',
    loginBtnId: 'admin-github-login-btn',
    retryBtnId: 'admin-no-account-retry-btn',
    noAccountLogoutBtnId: 'admin-no-account-logout-btn'
  },
  getMine: () => db.getMyAdmin(),
  onSignedIn: (mine) => showDashboard(mine)
});

// Rafraîchir les données globales du dashboard
async function refreshDashboard() {
  const listEl = document.getElementById('student-list');
  if (listEl) listEl.innerHTML = '<li style="padding: 10px; color: var(--text-muted); font-size: 0.85rem; text-align: center;">Chargement...</li>';

  studentsCache = await db.getAllStudents();
  projectsCache = {};
  endorsementsCache = {};

  // Deux requêtes groupées au lieu de ~3 par étudiant : une pour tous les
  // projets, une pour tous les endossements de ces projets.
  const codes = studentsCache.map(s => s.code);
  codes.forEach(code => {
    projectsCache[code] = [];
    endorsementsCache[code] = [];
  });

  const allProjects = await db.getProjectsForStudents(codes);
  const projectIdToCode = {};
  allProjects.forEach(p => {
    projectsCache[p.student_code]?.push(p);
    projectIdToCode[p.id] = p.student_code;
  });

  const allEndorsements = await db.getEndorsementsForProjectIds(allProjects.map(p => p.id));
  allEndorsements.forEach(e => {
    const code = projectIdToCode[e.project_id];
    if (code) endorsementsCache[code]?.push(e);
  });

  renderStudentList(studentsCache, projectsCache, endorsementsCache, async (student) => {
    await loadStudentEditor(student);
  });
}

// Déconnexion
document.getElementById('logout-btn')?.addEventListener('click', async () => {
  currentAdmin = null;
  currentStudentCode = null;
  await db.signOut();
  window.location.reload();
});

// Événement recherche (debounce pour éviter de re-render à chaque frappe)
let searchDebounceTimer = null;
document.getElementById('search-student')?.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase().trim();
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    const filtered = studentsCache.filter(s =>
      (s.profile.alias || '').toLowerCase().includes(query)
    );
    renderStudentList(filtered, projectsCache, endorsementsCache, async (student) => {
      await loadStudentEditor(student);
    });
  }, 200);
});

// Formulaire Ajout Étudiant Inline
const toggleFormBtn = document.getElementById('toggle-new-student-form-btn');
const formContainer = document.getElementById('new-student-inline-container');
const cancelFormBtn = document.getElementById('cancel-new-student-btn');

toggleFormBtn?.addEventListener('click', () => {
  formContainer.classList.toggle('hidden');
  if (!formContainer.classList.contains('hidden')) {
    document.getElementById('new-stu-github').focus();
  }
});

cancelFormBtn?.addEventListener('click', () => {
  formContainer.classList.add('hidden');
  document.getElementById('new-student-inline-form').reset();
});

document.getElementById('new-student-inline-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const githubUsername = document.getElementById('new-stu-github').value.trim();
  const alias = document.getElementById('new-stu-alias').value.trim() || 'Étudiant';

  if (!githubUsername) return;

  const code = generateRandomStudentCode();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const list = [{
      code,
      githubUsername,
      alias,
      year: 1,
      interests: [],
      objectif: '',
      avatarUrl: '',
      softSkills: []
    }];
    await db.bulkImportStudents(list);

    // Audit log
    await db.logAction({
      action: 'student_created',
      target_student: code,
      detail: `Création de l'étudiant ${alias} (${code})`
    });

    formContainer.classList.add('hidden');
    e.target.reset();
    await refreshDashboard();
  } catch (err) {
    showToast("Erreur lors de la création : " + err.message, 'error');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

// CSV Import Logic
document.getElementById('import-csv-btn')?.addEventListener('click', () => {
  document.getElementById('csv-file-input')?.click();
});

document.getElementById('csv-file-input')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    const text = event.target.result;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let start = 0;
    if (lines[0].toLowerCase().includes('githubusername')) start = 1; // skip header

    const existingCodeByGithub = Object.fromEntries(
      studentsCache
        .filter(s => s.github_username)
        .map(s => [s.github_username.toLowerCase(), s.code])
    );

    const students = [];
    for (let i = start; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length >= 1 && parts[0]) {
        const githubUsername = parts[0];
        students.push({
          code: existingCodeByGithub[githubUsername.toLowerCase()] || generateRandomStudentCode(),
          githubUsername,
          alias: parts[1] || '',
          year: 1,
          interests: [],
          objectif: '',
          avatarUrl: '',
          softSkills: []
        });
      }
    }

    const importBtn = document.getElementById('import-csv-btn');
    if (students.length > 0) {
      if (importBtn) importBtn.disabled = true;
      try {
        await db.bulkImportStudents(students);
        await db.logAction({
          action: 'bulk_import',
          target_student: 'N/A',
          detail: `Import de ${students.length} étudiants via CSV`
        });
        showToast(`${students.length} étudiants importés avec succès !`, 'success');
        await refreshDashboard();
      } catch (err) {
        showToast("Erreur d'import : " + err.message, 'error');
      } finally {
        if (importBtn) importBtn.disabled = false;
      }
    }
    e.target.value = ''; // reset input
  };
  reader.readAsText(file);
});

// Charger l'éditeur pour un étudiant sélectionné
async function loadStudentEditor(student) {
  document.getElementById('editor-panel').classList.remove('hidden');
  document.getElementById('edit-student-name').innerText = student.profile.alias || "Anonyme";
  document.getElementById('edit-alias-btn')?.classList.remove('hidden');
  document.getElementById('edit-alias-form')?.classList.add('hidden');
  currentStudentCode = student.code;

  renderBadgeToggles(student.badges, currentAdmin.role);
  renderStudentProjectsAndSkills(student.code);
}

// Rendu en lecture seule des compétences et projets d'un étudiant pour l'admin
function renderStudentProjectsAndSkills(studentCode) {
  const skillsContainer = document.getElementById('admin-skills-view');
  const projectsContainer = document.getElementById('admin-projects-view');
  if (!skillsContainer || !projectsContainer) return;

  const projs = projectsCache[studentCode] || [];
  const ends = endorsementsCache[studentCode] || [];
  const skillScores = computeSkillScores(projs, ends);

  // 1. Compétences
  skillsContainer.innerHTML = '';
  Object.keys(skillsData).forEach(skillId => {
    const sk = skillsData[skillId];
    const score = skillScores[skillId] || 0;

    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.justifyContent = 'space-between';
    div.style.padding = '5px 8px';
    div.style.background = 'rgba(0,0,0,0.01)';
    div.style.borderBottom = '1px dashed var(--border-color)';
    div.style.fontSize = '0.85rem';
    div.innerHTML = `<span>${sk.icon} ${sk.label}</span><strong>${score} pts</strong>`;
    skillsContainer.appendChild(div);
  });

  // 2. Projets
  projectsContainer.innerHTML = '';
  if (projs.length === 0) {
    projectsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">Aucun projet.</p>';
  } else {
    projs.forEach(p => {
      const div = document.createElement('div');
      div.style.padding = '8px 10px';
      div.style.background = 'rgba(0,0,0,0.02)';
      div.style.border = '1px solid var(--border-color)';
      div.style.borderRadius = 'var(--radius)';
      div.style.fontSize = '0.85rem';

      const pEndorsements = ends.filter(e => e.project_id === p.id).length;

      div.innerHTML = `
        <div style="font-weight:600;">${p.name} ${p.pinned ? '📌' : ''}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${p.course || 'Projet'}</div>
        <div style="display:flex; justify-content:space-between; margin-top:5px; font-size:0.75rem;">
          <span>Compétences: ${(p.skills || []).length}</span>
          <span>👍 ${pEndorsements}</span>
        </div>
      `;
      projectsContainer.appendChild(div);
    });
  }
}

// Gestion des onglets
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

    btn.classList.add('active');
    const tabId = btn.dataset.tab;
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');

    if (tabId === 'journal') {
      await renderAuditLog();
    }
  });
});

// Journal d'audit
async function renderAuditLog() {
  const logs = await db.getAuditLog();
  const tbody = document.getElementById('audit-log-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (logs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="padding: 12px; text-align:center; color: var(--text-muted);">Aucune action enregistrée.</td></tr>';
    return;
  }

  logs.forEach(log => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';

    const date = new Date(log.timestamp).toLocaleString('fr-CA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });

    tr.innerHTML = `
      <td style="padding: 7px 10px; color: var(--text-muted); white-space: nowrap;">${date}</td>
      <td style="padding: 7px 10px; font-weight: 600;">${log.admin_display || log.admin_username}</td>
      <td style="padding: 7px 10px;">${log.action}</td>
      <td style="padding: 7px 10px;"><code style="font-size: 0.8rem;">${log.target_student || ''}</code></td>
      <td style="padding: 7px 10px; color: var(--text-muted);">${log.detail}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Sauvegarde des badges
document.querySelector('.save-btn')?.addEventListener('click', async (e) => {
  if (!currentStudentCode || !currentAdmin) return;

  const saveBtn = e.currentTarget;
  saveBtn.disabled = true;
  try {
    const newBadges = getEditedBadges();
    await db.updateStudentBadges(currentStudentCode, newBadges);

    const badgeNames = Object.keys(newBadges).join(', ') || '(aucun)';
    await db.logAction({
      action: 'badge_assigned',
      target_student: currentStudentCode,
      detail: `Badges mis à jour : ${badgeNames}`
    });

    showToast("Badges sauvegardés avec succès !", 'success');
    await refreshDashboard();
  } catch (err) {
    showToast("Erreur lors de la sauvegarde : " + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
  }
});

// Édition de l'alias d'un·e étudiant·e
document.getElementById('edit-alias-btn')?.addEventListener('click', () => {
  const nameEl = document.getElementById('edit-student-name');
  const input = document.getElementById('edit-alias-input');
  input.value = nameEl.innerText;
  document.getElementById('edit-alias-form').classList.remove('hidden');
  input.focus();
});

document.getElementById('cancel-alias-btn')?.addEventListener('click', () => {
  document.getElementById('edit-alias-form').classList.add('hidden');
});

document.getElementById('edit-alias-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('save-alias-btn')?.click();
  }
});

document.getElementById('save-alias-btn')?.addEventListener('click', async () => {
  const newAlias = document.getElementById('edit-alias-input').value.trim();
  if (!newAlias || !currentStudentCode) return;

  try {
    await db.adminUpdateStudentAlias(currentStudentCode, newAlias);
    await db.logAction({
      action: 'alias_updated',
      target_student: currentStudentCode,
      detail: `Alias changé pour "${newAlias}"`
    });

    document.getElementById('edit-student-name').innerText = newAlias;
    document.getElementById('edit-alias-form').classList.add('hidden');
    showToast("Alias mis à jour avec succès !", 'success');
    await refreshDashboard();
  } catch (err) {
    if (err.code === '23505') {
      showToast("Cet alias est déjà pris.", 'error');
    } else {
      showToast("Erreur lors de la mise à jour de l'alias : " + err.message, 'error');
    }
  }
});

bootstrap();
