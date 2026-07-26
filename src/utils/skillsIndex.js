// src/utils/skillsIndex.js
import skillCategories from '../data/skills.json';

// Index plat { skillId: { id, label, icon, categoryId, categoryLabel } } pour les
// affichages qui ont besoin de retrouver une compétence individuelle par id
// (tags de projet, cartes) sans reparcourir les catégories à chaque fois.
export const skillsIndex = skillCategories.reduce((acc, cat) => {
  cat.items.forEach(item => {
    acc[item.id] = { ...item, icon: cat.icon, categoryId: cat.id, categoryLabel: cat.label };
  });
  return acc;
}, {});

// `project.skills` accepte deux formes : l'ancienne (tableau d'ids strings,
// pour les projets créés avant l'ajout du temps investi) et la nouvelle
// (tableau d'objets { id, hours }). Ces deux helpers permettent à tout
// le code d'affichage/scoring de lire l'un ou l'autre sans distinction.
export function getSkillId(entry) {
  return typeof entry === 'string' ? entry : entry.id;
}

// `hours` est un palier (1, 2 ou 3 — voir config.scoring.hoursTiers), pas un
// nombre d'heures brut. Par défaut à 1 (entrées legacy en string, ou objets
// sans palier valide).
export function getSkillHours(entry) {
  if (typeof entry === 'string') return 1;
  return [1, 2, 3].includes(entry.hours) ? entry.hours : 1;
}

// Autoévaluation qualitative de l'élève pour cette compétence sur ce projet
// (voir config.scoring.selfAssessmentTiers). Absente pour les entrées legacy
// ou tant que l'élève ne l'a pas renseignée — retourne alors `null` (aucun
// bonus, ni pénalité).
const VALID_SELF_ASSESSMENTS = new Set(['excellent', 'bien', 'correct', 'insuffisant']);
export function getSkillSelfAssessment(entry) {
  if (typeof entry === 'string') return null;
  return VALID_SELF_ASSESSMENTS.has(entry.selfAssessment) ? entry.selfAssessment : null;
}
