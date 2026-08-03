// src/utils/authFlow.js
// Flux d'authentification GitHub OAuth partagé entre la vue étudiante et le
// dashboard admin : les deux pages font le même enchaînement (session
// Supabase -> lookup métier -> écran correspondant), seuls les IDs DOM et le
// lookup (getMyStudent vs getMyAdmin) diffèrent.
export function createAuthFlow({ db, screenIds, getMine, onSignedIn }) {
  const {
    loginScreen,
    noAccountScreen,
    mainScreen,
    noAccountGithubUsernameId,
    loginBtnId,
    retryBtnId,
    noAccountLogoutBtnId
  } = screenIds;

  function showLoginScreen() {
    document.getElementById(loginScreen)?.classList.remove('hidden');
    document.getElementById(noAccountScreen)?.classList.add('hidden');
    document.getElementById(mainScreen)?.classList.add('hidden');
  }

  async function showNoAccountScreen() {
    document.getElementById(loginScreen)?.classList.add('hidden');
    document.getElementById(noAccountScreen)?.classList.remove('hidden');
    document.getElementById(mainScreen)?.classList.add('hidden');

    const githubUsername = await db.getGithubUsername();
    const detected = document.getElementById(noAccountGithubUsernameId);
    if (detected) detected.innerText = githubUsername || '(inconnu)';
  }

  async function bootstrap() {
    const { data: { session } } = await db.getAuthSession();
    if (!session) {
      showLoginScreen();
      return;
    }

    const mine = await getMine();
    if (!mine) {
      await showNoAccountScreen();
      return;
    }

    await onSignedIn(mine);
  }

  document.getElementById(loginBtnId)?.addEventListener('click', async () => {
    await db.signInWithGithub(window.location.origin + window.location.pathname);
  });

  document.getElementById(retryBtnId)?.addEventListener('click', () => {
    bootstrap();
  });

  document.getElementById(noAccountLogoutBtnId)?.addEventListener('click', async () => {
    await db.signOut();
    window.location.reload();
  });

  return { bootstrap, showLoginScreen };
}
