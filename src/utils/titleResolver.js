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
