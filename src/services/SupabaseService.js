// src/services/SupabaseService.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export class SupabaseService {
  constructor() {
    this.session = {
      code: '',
      password: ''
    };
    this.adminSession = {
      username: '',
      password: ''
    };
  }

  // --- GESTION DES SESSIONS EN MÉMOIRE ---

  setSession(code, password) {
    this.session = { code, password };
  }

  clearSession() {
    this.session = { code: '', password: '' };
  }

  getSession() {
    return this.session;
  }

  setAdminSession(username, password) {
    this.adminSession = { username, password };
  }

  clearAdminSession() {
    this.adminSession = { username: '', password: '' };
  }

  getAdminSession() {
    return this.adminSession;
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

  // --- AUTHENTIFICATION ÉTUDIANT ---

  async login(code, password) {
    const { data, error } = await supabase
      .rpc('verify_student_login', { p_code: code, p_password: password });
    
    if (error) {
      console.error("login error:", error);
      return { success: false, error: error.message };
    }

    if (data && data.length > 0) {
      this.setSession(code, password);
      return { success: true, student: data[0] };
    }

    return { success: false, error: "Code ou mot de passe invalide." };
  }

  // --- ÉCRITURES ÉTUDIANT ---

  async updateStudentProfile(code, updates) {
    const password = this.session.password;
    const { data, error } = await supabase
      .rpc('update_student_profile_rpc', {
        p_code: code,
        p_password: password,
        p_updates: updates
      });
    if (error) {
      console.error("updateStudentProfile error:", error);
      throw error;
    }
    return data;
  }

  async addProject(projectData) {
    const { code, password } = this.session;
    const { data, error } = await supabase
      .rpc('add_project_rpc', {
        p_code: code,
        p_password: password,
        p_name: projectData.name,
        p_description: projectData.description,
        p_course: projectData.course,
        p_semester: projectData.semester || '',
        p_skills: projectData.skills || [],
        p_link: projectData.link || ''
      });
    if (error) {
      console.error("addProject error:", error);
      throw error;
    }
    return data;
  }

  async updateProject(projectId, projectData) {
    const { code, password } = this.session;
    const { data, error } = await supabase
      .rpc('update_project_rpc', {
        p_code: code,
        p_password: password,
        p_project_id: projectId,
        p_name: projectData.name,
        p_description: projectData.description,
        p_course: projectData.course,
        p_semester: projectData.semester || '',
        p_skills: projectData.skills || [],
        p_link: projectData.link || ''
      });
    if (error) {
      console.error("updateProject error:", error);
      throw error;
    }
    return data;
  }

  async togglePin(projectId, pinned, pinOrder = 1) {
    const { code, password } = this.session;
    const { data, error } = await supabase
      .rpc('toggle_pin_rpc', {
        p_code: code,
        p_password: password,
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
    const { code, password } = this.session;
    const { data, error } = await supabase
      .rpc('delete_project_rpc', {
        p_code: code,
        p_password: password,
        p_project_id: projectId
      });
    if (error) {
      console.error("deleteProject error:", error);
      throw error;
    }
    return data;
  }

  async addEndorsement(fromCode, projectId) {
    const password = this.session.password;
    const { data, error } = await supabase
      .rpc('add_endorsement_rpc', {
        p_from_code: fromCode,
        p_from_password: password,
        p_project_id: projectId
      });
    if (error) {
      console.error("addEndorsement error:", error);
      throw error;
    }
    return data;
  }

  async removeEndorsement(fromCode, projectId) {
    const password = this.session.password;
    const { data, error } = await supabase
      .rpc('remove_endorsement_rpc', {
        p_from_code: fromCode,
        p_from_password: password,
        p_project_id: projectId
      });
    if (error) {
      console.error("removeEndorsement error:", error);
      throw error;
    }
    return data;
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


  // --- ACCÈS & ÉCRITURES ADMIN ---

  async verifyAdmin(username, password) {
    const { data, error } = await supabase
      .rpc('admin_verify_login', { p_username: username, p_password: password });
    if (error) {
      console.error("verifyAdmin error:", error);
      return { success: false, error: error.message };
    }
    if (data && data.length > 0) {
      this.setAdminSession(username, password);
      return { success: true, admin: data[0] };
    }
    return { success: false, error: "Identifiants invalides" };
  }

  async getAllStudents() {
    const { username, password } = this.adminSession;
    const { data, error } = await supabase
      .rpc('admin_get_all_students', { p_username: username, p_password: password });
    if (error) {
      console.error("getAllStudents error:", error);
      return [];
    }
    return data || [];
  }

  async updateStudentBadges(studentCode, badges) {
    const { username, password } = this.adminSession;
    const { data, error } = await supabase
      .rpc('admin_update_student_badges', {
        p_username: username,
        p_password: password,
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
    const { username, password } = this.adminSession;
    const { data, error } = await supabase
      .rpc('admin_log_action', {
        p_username: username,
        p_password: password,
        p_action: actionData
      });
    if (error) {
      console.error("logAction error:", error);
      throw error;
    }
    return data;
  }

  async getAuditLog() {
    const { username, password } = this.adminSession;
    const { data, error } = await supabase
      .rpc('admin_get_audit_log', { p_username: username, p_password: password });
    if (error) {
      console.error("getAuditLog error:", error);
      return [];
    }
    return data || [];
  }

  async bulkImportStudents(studentsList) {
    const { username, password } = this.adminSession;
    const { data, error } = await supabase
      .rpc('admin_import_students', {
        p_username: username,
        p_password: password,
        p_students: studentsList
      });
    if (error) {
      console.error("bulkImportStudents error:", error);
      throw error;
    }
    return data;
  }
}

export const db = new SupabaseService();
