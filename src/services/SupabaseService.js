// src/services/SupabaseService.js
import { createClient } from '@supabase/supabase-js'
import { compressImage } from '../utils/imageCompressor.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// PKCE : après connexion GitHub, l'URL de retour ne contient qu'un code
// d'échange à usage unique (jamais les tokens eux-mêmes), échangé aussitôt
// par le SDK via une requête serveur — rien d'exploitable ne transite par
// l'URL/l'historique du navigateur.
//
// sessionStorage (plutôt que le localStorage par défaut) : la session est
// effacée à la fermeture de l'onglet/navigateur, au lieu de survivre
// indéfiniment — important sur les postes partagés (labo informatique).
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { flowType: 'pkce', storage: window.sessionStorage }
})

export class SupabaseService {
  // --- AUTHENTIFICATION (GitHub OAuth via Supabase Auth) ---

  async signInWithGithub(redirectTo) {
    return supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo }
    });
  }

  async signOut() {
    return supabase.auth.signOut();
  }

  async getAuthSession() {
    return supabase.auth.getSession();
  }

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  }

  // Username GitHub du compte actuellement connecté (pour affichage si aucun
  // rattachement n'est trouvé côté serveur).
  async getGithubUsername() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.user_metadata?.user_name || user?.user_metadata?.preferred_username || null;
  }

  // Retourne le student lié au compte GitHub connecté (auto-lié au premier
  // login si son username GitHub correspond à une ligne pré-provisionnée non
  // réclamée), ou null si aucune correspondance.
  async getMyStudent() {
    const { data, error } = await supabase.rpc('get_my_student');
    if (error) {
      console.error("getMyStudent error:", error);
      return null;
    }
    return data?.[0] || null;
  }

  // Équivalent admin.
  async getMyAdmin() {
    const { data, error } = await supabase.rpc('get_my_admin');
    if (error) {
      console.error("getMyAdmin error:", error);
      return null;
    }
    return data?.[0] || null;
  }

  // --- LECTURE PUBLIQUE ---

  async getStudent(code) {
    const { data, error } = await supabase
      .from('students')
      .select('code, profile, badges, updated_at, updated_by')
      .eq('code', code)
      .maybeSingle();
    if (error) {
      console.error("getStudent error:", error);
      return null;
    }
    return data;
  }

  // Recherche d'un profil par alias (insensible à la casse). L'alias est
  // garanti unique en base (index unique sur lower(alias), migration v7),
  // donc au plus un résultat.
  async searchStudentByAlias(alias) {
    const { data, error } = await supabase
      .from('students')
      .select('code, profile, badges, updated_at, updated_by')
      .ilike('alias', alias)
      .maybeSingle();
    if (error) {
      console.error("searchStudentByAlias error:", error);
      return null;
    }
    return data;
  }

  async getProjects(studentCode) {
    // Trier par pinned DESC (projets épinglés en premier) puis pin_order ASC, puis par date de création
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('student_code', studentCode)
      .order('pinned', { ascending: false })
      .order('pin_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) {
      console.error("getProjects error:", error);
      return [];
    }
    return data || [];
  }

  // Récupérer tous les endossements reçus par un étudiant. Si l'appelant a
  // déjà les projets sous la main, les passer en 2e argument évite de les
  // refetcher ici (voir main.js:loadStudentData).
  async getStudentEndorsements(studentCode, projects = null) {
    const projs = projects || await this.getProjects(studentCode);
    const projectIds = projs.map(p => p.id);
    if (projectIds.length === 0) return [];

    const { data, error } = await supabase
      .from('endorsements')
      .select('*')
      .in('project_id', projectIds);

    if (error) {
      console.error("getStudentEndorsements error:", error);
      return [];
    }
    return data || [];
  }

  // Récupérer les projets de plusieurs étudiants en une seule requête (dashboard admin).
  async getProjectsForStudents(studentCodes) {
    if (studentCodes.length === 0) return [];
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .in('student_code', studentCodes)
      .order('pinned', { ascending: false })
      .order('pin_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) {
      console.error("getProjectsForStudents error:", error);
      return [];
    }
    return data || [];
  }

  // Récupérer les endossements de plusieurs projets en une seule requête (dashboard admin).
  async getEndorsementsForProjectIds(projectIds) {
    if (projectIds.length === 0) return [];
    const { data, error } = await supabase
      .from('endorsements')
      .select('*')
      .in('project_id', projectIds);
    if (error) {
      console.error("getEndorsementsForProjectIds error:", error);
      return [];
    }
    return data || [];
  }

  // --- ÉCRITURES ÉTUDIANT ---

  async updateStudentProfile(updates) {
    const { data, error } = await supabase
      .rpc('update_student_profile_rpc', { p_updates: updates });
    if (error) {
      console.error("updateStudentProfile error:", error);
      throw error;
    }
    return data;
  }

  async addProject(projectData) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        student_code: projectData.studentCode,
        name: projectData.name,
        description: projectData.description,
        course: projectData.course,
        semester: projectData.semester || '',
        skills: projectData.skills || [],
        link: projectData.link || '',
        thumbnail_url: projectData.thumbnailUrl || ''
      })
      .select()
      .single();
    if (error) {
      console.error("addProject error:", error);
      throw error;
    }
    return data;
  }

  async updateProject(projectId, projectData) {
    const { data, error } = await supabase
      .from('projects')
      .update({
        name: projectData.name,
        description: projectData.description,
        course: projectData.course,
        semester: projectData.semester || '',
        skills: projectData.skills || [],
        link: projectData.link || '',
        ...(projectData.thumbnailUrl !== undefined && { thumbnail_url: projectData.thumbnailUrl })
      })
      .eq('id', projectId)
      .select()
      .single();
    if (error) {
      console.error("updateProject error:", error);
      throw error;
    }
    return data;
  }

  async togglePin(projectId, pinned, pinOrder = 1) {
    const { data, error } = await supabase
      .rpc('toggle_pin_rpc', {
        p_project_id: projectId,
        p_pinned: pinned,
        p_pin_order: pinOrder
      });
    if (error) {
      console.error("togglePin error:", error);
      throw error;
    }
    return data;
  }

  async deleteProject(projectId) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);
    if (error) {
      console.error("deleteProject error:", error);
      throw error;
    }
    return true;
  }

  async addEndorsement(fromCode, projectId) {
    const { data, error } = await supabase
      .from('endorsements')
      .insert({ from_code: fromCode, project_id: projectId })
      .select()
      .single();
    if (error) {
      console.error("addEndorsement error:", error);
      throw error;
    }
    return data;
  }

  async removeEndorsement(fromCode, projectId) {
    const { error } = await supabase
      .from('endorsements')
      .delete()
      .eq('from_code', fromCode)
      .eq('project_id', projectId);
    if (error) {
      console.error("removeEndorsement error:", error);
      throw error;
    }
    return true;
  }

  // Upload d'image de profil vers Supabase Storage (bucket "avatars").
  // L'image est recompressée côté client et le chemin est fixe par étudiant
  // (upsert), pour que les ré-uploads remplacent l'ancien avatar au lieu
  // d'accumuler des fichiers orphelins dans le storage.
  async uploadAvatar(studentCode, file) {
    const compressed = await compressImage(file);
    const filePath = `avatars/${studentCode}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, compressed, { upsert: true, contentType: 'image/jpeg' });

    if (uploadError) {
      console.error("uploadAvatar storage upload error:", uploadError);
      throw uploadError;
    }

    // Récupérer l'URL publique du fichier. Le chemin étant fixe, on ajoute un
    // paramètre anti-cache pour éviter qu'un navigateur affiche l'ancienne
    // image mise en cache après un ré-upload.
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return `${data.publicUrl}?v=${Date.now()}`;
  }

  // Upload de la miniature d'un projet vers Supabase Storage (bucket
  // "project-thumbnails"). Même logique que uploadAvatar (compression client,
  // upsert sur un chemin fixe par projet), mais avec un cadrage plus large
  // (miniature rectangulaire de carte plutôt qu'un avatar carré).
  async uploadProjectThumbnail(studentCode, projectId, file) {
    const compressed = await compressImage(file, 800, 0.75);
    const filePath = `project-thumbnails/${studentCode}/${projectId}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from('project-thumbnails')
      .upload(filePath, compressed, { upsert: true, contentType: 'image/jpeg' });

    if (uploadError) {
      console.error("uploadProjectThumbnail storage upload error:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('project-thumbnails')
      .getPublicUrl(filePath);

    return `${data.publicUrl}?v=${Date.now()}`;
  }


  // --- LECTURE & ÉCRITURES ADMIN ---

  async getAllStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('code, github_username, profile, badges, updated_at, updated_by')
      .order('code', { ascending: true });
    if (error) {
      console.error("getAllStudents error:", error);
      return [];
    }
    return data || [];
  }

  async updateStudentBadges(studentCode, badges) {
    const { data, error } = await supabase
      .rpc('admin_update_student_badges_rpc', {
        p_student_code: studentCode,
        p_badges: badges
      });
    if (error) {
      console.error("updateStudentBadges error:", error);
      throw error;
    }
    return data;
  }

  async adminUpdateStudentAlias(studentCode, alias) {
    const { data, error } = await supabase
      .rpc('admin_update_student_alias_rpc', {
        p_student_code: studentCode,
        p_alias: alias
      });
    if (error) {
      console.error("adminUpdateStudentAlias error:", error);
      throw error;
    }
    return data;
  }

  async logAction(actionData) {
    const { data, error } = await supabase
      .rpc('admin_log_action_rpc', { p_action: actionData });
    if (error) {
      console.error("logAction error:", error);
      throw error;
    }
    return data;
  }

  async getAuditLog() {
    const { data, error } = await supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) {
      console.error("getAuditLog error:", error);
      return [];
    }
    return data || [];
  }

  async bulkImportStudents(studentsList) {
    const { data, error } = await supabase
      .rpc('admin_import_students_rpc', { p_students: studentsList });
    if (error) {
      console.error("bulkImportStudents error:", error);
      throw error;
    }
    return data;
  }
}

export const db = new SupabaseService();
