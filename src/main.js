// src/main.js
import './style.css';

import { db } from './services/SupabaseService.js';
import { renderProfileCard } from './components/student/ProfileCard.js';
import { renderSkillPanel } from './components/student/SkillPanel.js';
import { renderSkillRadar } from './components/student/SkillRadar.js';
import { renderProjectGrid } from './components/student/ProjectGrid.js';
import { renderBadgeWall } from './components/student/BadgeWall.js';
import { renderLevelBar } from './components/student/LevelBar.js';
import { renderSoftSkillsEditor } from './components/student/SoftSkillsEditor.js';
import { computeSkillScores, calculateGlobalScore } from './utils/scoreCalculator.js';
import { resolveGlobalTitle } from './utils/titleResolver.js';
import { startIdleLogout } from './utils/idleLogout.js';
import config from './data/config.json';

startIdleLogout(db, 60 * 60 * 1000); // 1h d'inactivité

console.log("Feuille de Personnage - Vue Étudiant initialisée (v5.0).");

let myCode = '';
let currentViewedCode = ''; // Code de l'étudiant visité (si mode visiteur)
let lastProjects = [];
let lastEndorsements = [];

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
  updateActiveThemeButton();

  // Charger les projets et endossements
  const projects = await db.getProjects(code);
  const endorsements = await db.getStudentEndorsements(code);
  lastProjects = projects;
  lastEndorsements = endorsements;

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
  renderSkillRadar(projects, endorsements);

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
  const sheet = document.getElementById('character-sheet');
  sheet.classList.remove('hidden');
  sheet.classList.add('anim-fade-in');
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
const themeButtons = document.querySelectorAll('button[data-theme-target]');

function updateActiveThemeButton() {
  const currentTheme = document.documentElement.dataset.theme;
  themeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeTarget === currentTheme);
  });
}

themeButtons.forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const theme = e.currentTarget.dataset.themeTarget;
    document.documentElement.dataset.theme = theme;
    updateActiveThemeButton();
    renderSkillRadar(lastProjects, lastEndorsements);

    // Si propriétaire, sauvegarder dans son profil
    if (currentViewedCode === myCode && myCode) {
      await db.updateStudentProfile({ theme: theme });
    }
  });
});
updateActiveThemeButton();

// Visiter un pair
document.getElementById('search-peer-btn')?.addEventListener('click', async () => {
  const peerAlias = document.getElementById('peer-alias-input').value.trim();
  if (!peerAlias) return;

  const peer = await db.searchStudentByAlias(peerAlias);
  if (!peer) {
    alert("Aucun étudiant trouvé avec cet alias.");
    return;
  }

  if (peer.code === myCode) {
    alert("Vous êtes déjà sur votre profil.");
    return;
  }

  document.getElementById('peer-alias-input').value = '';
  await loadStudentData(peer.code, true);
});

// Retourner à son profil
document.getElementById('exit-visitor-btn')?.addEventListener('click', async () => {
  if (myCode) {
    await loadStudentData(myCode, false);
  }
});

