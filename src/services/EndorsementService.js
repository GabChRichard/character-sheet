// src/services/EndorsementService.js
import { db } from './SupabaseService.js';

export class EndorsementService {
  /**
   * Endosse un projet spécifique.
   * @param {string} fromCode - Code de l'étudiant visiteur.
   * @param {string} projectId - ID du projet à endosser.
   */
  static async endorseProject(fromCode, projectId) {
    try {
      return await db.addEndorsement(fromCode, projectId);
    } catch (error) {
      console.error("Erreur lors de l'endossement de projet:", error);
      return null;
    }
  }

  /**
   * Retire un endossement sur un projet spécifique.
   * @param {string} fromCode - Code de l'étudiant visiteur.
   * @param {string} projectId - ID du projet.
   */
  static async unendorseProject(fromCode, projectId) {
    try {
      return await db.removeEndorsement(fromCode, projectId);
    } catch (error) {
      console.error("Erreur lors du retrait de l'endossement de projet:", error);
      return null;
    }
  }
}
