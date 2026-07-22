// src/components/admin/CodeGenerator.js

/**
 * Génère un code d'étudiant unique et aléatoire au format STU-XXXXXX
 * @returns {string} Le code généré
 */
export function generateRandomStudentCode() {
  const chars = '0123456789abcdef';
  let randomPart = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    randomPart += chars[idx];
  }
  return `STU-${randomPart}`;
}
