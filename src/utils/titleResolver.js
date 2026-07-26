// src/utils/titleResolver.js

/**
 * Résout le titre global en fonction du score.
 * @param {number} score - Le score global calculé.
 * @param {Object} config - Configuration.
 * @returns {string} Le titre correspondant.
 */
export function resolveGlobalTitle(score, config) {
  const titles = config.globalTitles;
  for (let t of titles) {
    if (score >= t.minScore && score <= t.maxScore) {
      return t.title;
    }
  }
  return titles[titles.length - 1].title;
}

/**
 * Résout le palier qualitatif atteint (ex: Non-initié, Initié, Expert...)
 * en fonction d'un score et d'une liste de seuils ordonnée croissante.
 * @param {number} score - Le score à évaluer.
 * @param {Array} thresholds - Liste ordonnée de { minScore, maxScore, title }.
 * @returns {{title: string, tier: number}} Le titre du palier et son rang (1-based).
 */
export function resolveLevel(score, thresholds) {
  for (let i = 0; i < thresholds.length; i++) {
    const t = thresholds[i];
    if (score >= t.minScore && score <= t.maxScore) {
      return { title: t.title, tier: i + 1 };
    }
  }
  return { title: thresholds.at(-1).title, tier: thresholds.length };
}
