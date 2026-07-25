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
// pour les projets créés avant la gradation de complexité) et la nouvelle
// (tableau d'objets { id, complexity }). Ces deux helpers permettent à tout
// le code d'affichage/scoring de lire l'un ou l'autre sans distinction.
export function getSkillId(entry) {
  return typeof entry === 'string' ? entry : entry.id;
}

export function getSkillComplexity(entry) {
  if (typeof entry === 'string') return 1;
  return entry.complexity === 2 ? 2 : 1;
}
