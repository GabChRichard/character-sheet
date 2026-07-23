// src/main.js
import './style.css';

import html2pdf from 'html2pdf.js';
import { db } from './services/SupabaseService.js';
import { renderProfileCard } from './components/student/ProfileCard.js';
import { renderSkillPanel } from './components/student/SkillPanel.js';
import { renderProjectGrid } from './components/student/ProjectGrid.js';
import { renderBadgeWall } from './components/student/BadgeWall.js';
import { renderLevelBar } from './components/student/LevelBar.js';
import { renderSoftSkillsEditor } from './components/student/SoftSkillsEditor.js';
import { computeSkillScores, calculateGlobalScore } from './utils/scoreCalculator.js';
import { resolveGlobalTitle } from './utils/titleResolver.js';
import config from './data/config.json';

console.log("Feuille de Personnage - Vue Étudiant initialisée (v5.0).");

let myCode = '';
let currentViewedCode = ''; // Code de l'étudiant visité (si mode visiteur)

async function loadStudentData(code, isVisitor = false) {
  currentViewedCode = code;
  const student = await db.getStudent(code);
  if (!student) {
    alert("Impossible de charger les données de l'étudiant.");
    return;
  }

  // Appliquer le thème stocké
  if (student.profile.theme) {
    document.documentElement.dataset.theme = student.profile.theme;
  }

  // Charger les projets et endossements
  const projects = await db.getProjects(code);
  const endorsements = await db.getStudentEndorsements(code);

  // Calculer les scores des compétences
  const skillScores = computeSkillScores(projects, endorsements);

  // Calculer le score global
  const globalScore = calculateGlobalScore(skillScores);
  const globalTitle = resolveGlobalTitle(globalScore, config);

  const levelInfo = {
    score: globalScore,
    title: globalTitle
  };

  const isOwner = !isVisitor;

  // Afficher les données via les composants
  renderProfileCard(student.profile, isOwner, () => loadStudentData(code, isVisitor));
  renderLevelBar(levelInfo, config);
  renderBadgeWall(student.badges);
  renderSoftSkillsEditor(student.profile, isOwner, () => loadStudentData(code, isVisitor));
  renderProjectGrid(projects, isOwner, isVisitor ? myCode : null, code, () => loadStudentData(code, isVisitor));
  renderSkillPanel(projects, endorsements);

  // Mettre à jour l'état du mode visiteur dans l'interface
  const visitorIndicator = document.getElementById('visitor-mode-indicator');
  const visitorMsg = document.getElementById('visitor-msg');
  if (visitorIndicator && visitorMsg) {
    if (isVisitor) {
      visitorMsg.innerText = `Mode Visiteur : ${student.profile.alias || code}`;
      visitorIndicator.classList.remove('hidden');
    } else {
      visitorIndicator.classList.add('hidden');
    }
  }
}

// --- AUTHENTIFICATION (GitHub OAuth via Supabase Auth) ---

function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('no-account-screen').classList.add('hidden');
  document.getElementById('character-sheet').classList.add('hidden');
}

async function showNoAccountScreen() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('no-account-screen').classList.remove('hidden');
  document.getElementById('character-sheet').classList.add('hidden');

  const githubUsername = await db.getGithubUsername();
  const detected = document.getElementById('no-account-github-username');
  if (detected) detected.innerText = githubUsername || '(inconnu)';
}

async function showCharacterSheet(code) {
  myCode = code;
  document.getElementById('student-code-input').value = code;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('no-account-screen').classList.add('hidden');
  document.getElementById('character-sheet').classList.remove('hidden');
  await loadStudentData(code, false);
}

async function bootstrap() {
  const { data: { session } } = await db.getAuthSession();
  if (!session) {
    showLoginScreen();
    return;
  }

  const mine = await db.getMyStudent();
  if (!mine) {
    await showNoAccountScreen();
    return;
  }

  await showCharacterSheet(mine.code);
}

document.getElementById('github-login-btn')?.addEventListener('click', async () => {
  await db.signInWithGithub(window.location.origin + window.location.pathname);
});

document.getElementById('no-account-retry-btn')?.addEventListener('click', () => {
  bootstrap();
});

document.getElementById('no-account-logout-btn')?.addEventListener('click', async () => {
  await db.signOut();
  window.location.reload();
});

// Déconnexion
document.getElementById('student-logout-btn')?.addEventListener('click', async () => {
  await db.signOut();
  window.location.reload();
});

bootstrap();

// Sélecteurs de thèmes
document.querySelectorAll('button[data-theme-target]').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const theme = e.currentTarget.dataset.themeTarget;
    document.documentElement.dataset.theme = theme;
    
    // Si propriétaire, sauvegarder dans son profil
    if (currentViewedCode === myCode && myCode) {
      await db.updateStudentProfile({ theme: theme });
    }
  });
});

// Visiter un pair
document.getElementById('search-peer-btn')?.addEventListener('click', async () => {
  const peerCode = document.getElementById('peer-code-input').value.trim();
  if (!peerCode) return;

  if (peerCode === myCode) {
    alert("Vous êtes déjà sur votre profil.");
    return;
  }

  const peer = await db.getStudent(peerCode);
  if (!peer) {
    alert("Aucun étudiant trouvé avec ce code.");
    return;
  }

  document.getElementById('peer-code-input').value = '';
  await loadStudentData(peerCode, true);
});

// Retourner à son profil
document.getElementById('exit-visitor-btn')?.addEventListener('click', async () => {
  if (myCode) {
    await loadStudentData(myCode, false);
  }
});

// Export PDF
document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
  const element = document.getElementById('character-sheet');
  const name = document.getElementById('student-alias').innerText.replace(/\s+/g, '_');
  
  const opt = {
    margin:       0.4,
    filename:     `Fiche_Personnage_${name}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff', windowWidth: 1080 },
    jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' },
    pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
  };

  // Masquer temporairement les éléments hors CV
  const sidebarActions = document.querySelector('.top-bar');
  const visitorIndicator = document.getElementById('visitor-mode-indicator');
  const addProjectBtn = document.getElementById('add-project-btn');
  const softSkillBtn = document.getElementById('add-soft-skill-btn');

  if (sidebarActions) sidebarActions.style.display = 'none';
  if (visitorIndicator) visitorIndicator.style.display = 'none';
  if (addProjectBtn) addProjectBtn.style.display = 'none';
  if (softSkillBtn) softSkillBtn.style.display = 'none';

  element.classList.add('pdf-export-mode');

  html2pdf().set(opt).from(element).save().then(() => {
    if (sidebarActions) sidebarActions.style.display = 'flex';
    if (visitorIndicator) visitorIndicator.style.display = 'block';
    if (addProjectBtn) addProjectBtn.style.display = 'block';
    if (softSkillBtn) softSkillBtn.style.display = 'block';
    element.classList.remove('pdf-export-mode');
  });
});
