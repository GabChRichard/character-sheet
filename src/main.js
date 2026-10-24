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
import { openCustomThemeEditor } from './components/student/CustomThemeEditor.js';
import { computeSkillScores, calculateGlobalScore } from './utils/scoreCalculator.js';
import { resolveGlobalTitle } from './utils/titleResolver.js';
import { startIdleLogout } from './utils/idleLogout.js';
import { showToast } from './utils/notify.js';
import { setupEscapeToClose } from './utils/modalEscape.js';
import { createAuthFlow } from './utils/authFlow.js';
import { applyCustomTheme, clearCustomTheme } from './utils/customTheme.js';
import config from './data/config.json';

startIdleLogout(db, 60 * 60 * 1000); // 1h d'inactivité
setupEscapeToClose(['profile-modal', 'soft-skills-modal', 'project-detail-modal']);

console.log("Feuille de Personnage - Vue Étudiant initialisée (v5.0).");

let myCode = '';
let currentViewedCode = ''; // Code de l'étudiant visité (si mode visiteur)
let lastProjects = [];
let lastEndorsements = [];
let lastCustomTheme = null; // config du thème personnalisé de la fiche affichée

async function loadStudentData(code, isVisitor = false) {
  currentViewedCode = code;
  const sheet = document.getElementById('character-sheet');
  sheet?.classList.add('is-loading');

  const student = await db.getStudent(code);
  if (!student) {
    sheet?.classList.remove('is-loading');
    showToast("Impossible de charger les données de l'étudiant.", 'error');
    return;
  }

  // Appliquer le thème stocké
  lastCustomTheme = student.profile.customTheme || null;
  if (student.profile.theme === 'custom') {
    applyCustomTheme(lastCustomTheme);
  } else {
    clearCustomTheme();
  }
  if (student.profile.theme) {
    document.documentElement.dataset.theme = student.profile.theme;
  }
  updateActiveThemeButton();

  // Charger les projets et endossements
  const projects = await db.getProjects(code);
  const endorsements = await db.getStudentEndorsements(code, projects);
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
  renderProjectGrid(projects, isOwner, isVisitor ? myCode : null, code, () => loadStudentData(code, isVisitor), endorsements);
  renderSkillPanel(projects, endorsements);
  renderSkillRadar(projects, endorsements);

  // Mettre à jour l'état du mode visiteur dans l'interface
  const visitorIndicator = document.getElementById('visitor-mode-indicator');
  const visitorMsg = document.getElementById('visitor-msg');
  const exitVisitorBtnTop = document.getElementById('exit-visitor-btn-top');
  if (visitorIndicator && visitorMsg) {
    if (isVisitor) {
      visitorMsg.innerText = `Mode Visiteur : ${student.profile.alias || code}`;
      visitorIndicator.classList.remove('hidden');
      exitVisitorBtnTop?.classList.remove('hidden');
    } else {
      visitorIndicator.classList.add('hidden');
      exitVisitorBtnTop?.classList.add('hidden');
    }
  }

  sheet?.classList.remove('is-loading');
}

// --- AUTHENTIFICATION (GitHub OAuth via Supabase Auth) ---

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

const { bootstrap } = createAuthFlow({
  db,
  screenIds: {
    loginScreen: 'login-screen',
    noAccountScreen: 'no-account-screen',
    mainScreen: 'character-sheet',
    noAccountGithubUsernameId: 'no-account-github-username',
    loginBtnId: 'github-login-btn',
    retryBtnId: 'no-account-retry-btn',
    noAccountLogoutBtnId: 'no-account-logout-btn'
  },
  getMine: () => db.getMyStudent(),
  onSignedIn: (mine) => showCharacterSheet(mine.code)
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

    if (theme === 'custom') {
      openCustomThemeEditor({
        initial: lastCustomTheme,
        canSave: currentViewedCode === myCode && !!myCode,
        onSaved: (cfg) => { lastCustomTheme = cfg; },
        onPreview: () => renderSkillRadar(lastProjects, lastEndorsements),
        onClosed: updateActiveThemeButton
      });
      return;
    }

    clearCustomTheme();
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

// Animations des thèmes licorne (préférence locale, off par défaut si mouvement réduit)
const animToggleBtn = document.getElementById('anim-toggle-btn');

function setAnimations(enabled) {
  document.documentElement.dataset.anim = enabled ? 'on' : 'off';
  animToggleBtn?.setAttribute('aria-pressed', String(enabled));
}

let storedAnim = null;
try { storedAnim = localStorage.getItem('licorne-anim'); } catch { /* stockage indisponible */ }
setAnimations(storedAnim
  ? storedAnim === 'on'
  : !window.matchMedia('(prefers-reduced-motion: reduce)').matches);

animToggleBtn?.addEventListener('click', () => {
  const enable = document.documentElement.dataset.anim === 'off';
  setAnimations(enable);
  try { localStorage.setItem('licorne-anim', enable ? 'on' : 'off'); } catch { /* ignoré */ }
});

// Visiter un pair
async function searchPeer() {
  const peerAlias = document.getElementById('peer-alias-input').value.trim();
  if (!peerAlias) return;

  const peer = await db.searchStudentByAlias(peerAlias);
  if (!peer) {
    showToast("Aucun étudiant trouvé avec cet alias.", 'error');
    return;
  }

  if (peer.code === myCode) {
    showToast("Vous êtes déjà sur votre profil.", 'info');
    return;
  }

  document.getElementById('peer-alias-input').value = '';
  await loadStudentData(peer.code, true);
}

document.getElementById('search-peer-btn')?.addEventListener('click', searchPeer);
document.getElementById('peer-alias-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    searchPeer();
  }
});

// Retourner à son profil
async function exitVisitorMode() {
  if (myCode) {
    await loadStudentData(myCode, false);
  }
}
document.getElementById('exit-visitor-btn')?.addEventListener('click', exitVisitorMode);
document.getElementById('exit-visitor-btn-top')?.addEventListener('click', exitVisitorMode);

