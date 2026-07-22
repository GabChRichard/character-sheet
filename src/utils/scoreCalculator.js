// src/utils/scoreCalculator.js

/**
 * Calcule les scores pour chaque compétence en fonction des projets et des endossements.
 * @param {Array} projects - Tous les projets de l'étudiant
 * @param {Array} endorsements - Tous les endossements reçus par l'étudiant
 * @returns {Object} Un dictionnaire { skillId: score }
 */
export function computeSkillScores(projects, endorsements) {
  const scores = {};

  // Par défaut, s'assurer que les projets ne causent pas d'erreur s'ils sont vides
  const safeProjects = projects || [];
  const safeEndorsements = endorsements || [];

  for (const project of safeProjects) {
    // Nombre d'endossements reçus par ce projet spécifique
    const projectEndorsements = safeEndorsements
      .filter(e => e.project_id === project.id).length;
    
    // Valeur de base du projet = nombre de compétences mobilisées
    const projectValue = (project.skills || []).length;
    
    // Boost des endossements sur ce projet
    const endorsementBoost = projectEndorsements * 10;

    for (const skillId of (project.skills || [])) {
      if (!scores[skillId]) scores[skillId] = 0;
      scores[skillId] += projectValue + endorsementBoost;
    }
  }

  return scores;
}

/**
 * Calcule le score global cumulé à partir des scores de chaque compétence.
 * @param {Object} skillScores - Dictionnaire calculé par computeSkillScores
 * @returns {number} Score global total
 */
export function calculateGlobalScore(skillScores) {
  if (!skillScores) return 0;
  return Object.values(skillScores).reduce((sum, score) => sum + score, 0);
}
