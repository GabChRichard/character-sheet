// src/services/SupabaseService.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

  // Récupérer tous les endossements reçus par un étudiant
  async getStudentEndorsements(studentCode) {
    // Récupérer d'abord les IDs de projet de l'étudiant
    const projects = await this.getProjects(studentCode);
    const projectIds = projects.map(p => p.id);
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
        link: projectData.link || ''
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
        link: projectData.link || ''
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

  // Upload d'image de profil vers Supabase Storage (bucket "avatars")
  async uploadAvatar(studentCode, file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${studentCode}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Uploader le fichier
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      // Si le bucket n'existe pas, on tente de le créer ou on signale l'erreur
      console.error("uploadAvatar storage upload error:", uploadError);
      throw uploadError;
    }

    // Récupérer l'URL publique du fichier
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }


  // --- LECTURE & ÉCRITURES ADMIN ---

  async getAllStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('code, profile, badges, updated_at, updated_by')
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
