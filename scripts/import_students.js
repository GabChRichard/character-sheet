import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Helper pour lire un fichier .env donné
function loadEnvFile(filename) {
  const envPath = path.resolve(process.cwd(), filename);
  if (!fs.existsSync(envPath)) {
    console.error(`❌ Fichier ${filename} introuvable dans le répertoire courant.`);
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] ? match[2].trim() : '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.substring(1, value.length - 1);
      }
      env[match[1]] = value;
    }
  });
  return env;
}

// Analyseur de ligne CSV robuste aux guillemets
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  const env = loadEnvFile('.env');
  const adminEnv = loadEnvFile('.env.admin');
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceRoleKey = adminEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    console.error("❌ La variable VITE_SUPABASE_URL est manquante dans .env");
    process.exit(1);
  }
  if (!serviceRoleKey) {
    console.error("❌ La variable SUPABASE_SERVICE_ROLE_KEY est manquante dans .env.admin (voir DEPLOY_SUPABASE.md).");
    process.exit(1);
  }

  console.log("==========================================");
  console.log("📥 Importation des étudiants dans Supabase");
  console.log("==========================================");

  // Ce script utilise la clé service_role : elle bypass RLS et permet de
  // pré-créer des lignes étudiantes non réclamées (auth_user_id NULL), sans
  // dépendre d'un admin déjà rattaché à son compte GitHub. Ne jamais exposer
  // cette clé côté client — elle ne doit vivre que dans .env.admin (gitignored).
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Obtenir le chemin du fichier CSV
  let csvFile = process.argv[2];
  if (!csvFile) {
    csvFile = 'etudiants_template.csv';
    console.log(`ℹ️ Aucun fichier CSV spécifié. Utilisation du fichier par défaut : ${csvFile}`);
  }

  const csvPath = path.resolve(process.cwd(), csvFile);
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Fichier CSV introuvable : ${csvPath}`);
    process.exit(1);
  }

  // Lire et analyser le CSV (plus de colonne "password")
  console.log("📄 Lecture du fichier CSV...");
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length <= 1) {
    console.error("❌ Le fichier CSV ne contient pas d'étudiants (uniquement l'en-tête ou vide).");
    process.exit(1);
  }

  const students = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 1 || !cols[0]) continue; // besoin au moins du code

    students.push({
      code: cols[0],
      githubUsername: cols[1] || '',
      alias: cols[2] || 'Étudiant',
      year: parseInt(cols[3], 10) || 1,
      interests: cols[4] ? cols[4].split(',').map(s => s.trim()).filter(s => s.length > 0) : [],
      bio: cols[5] || '',
      avatarSeed: cols[6] || 'default'
    });
  }

  console.log(`📦 Préparation de l'importation de ${students.length} étudiants...`);

  // Préserver le thème existant des étudiants déjà présents (comme le faisait
  // l'ancienne RPC admin_import_students) : on lit d'abord leur profil actuel.
  const codes = students.map(s => s.code);
  const { data: existing, error: fetchError } = await supabase
    .from('students')
    .select('code, profile')
    .in('code', codes);

  if (fetchError) {
    console.error("❌ Erreur lors de la lecture des étudiants existants :", fetchError.message);
    process.exit(1);
  }

  const existingThemeByCode = Object.fromEntries(
    (existing || []).map(s => [s.code, s.profile?.theme || 'dark-minimal'])
  );

  const rows = students.map(s => ({
    code: s.code,
    github_username: s.githubUsername || null,
    profile: {
      alias: s.alias,
      avatarUrl: '',
      year: s.year,
      interests: s.interests,
      bio: s.bio,
      theme: existingThemeByCode[s.code] || 'dark-minimal',
      softSkills: []
    },
    updated_at: new Date().toISOString(),
    updated_by: 'cli-import'
  }));

  // auth_user_id n'est jamais inclus dans le payload : un ré-import ne peut
  // donc pas délier un étudiant déjà auto-lié à son compte GitHub.
  const { error: upsertError } = await supabase
    .from('students')
    .upsert(rows, { onConflict: 'code' });

  if (upsertError) {
    console.error("❌ Erreur lors de l'importation massive :", upsertError.message);
    process.exit(1);
  }

  console.log("🎉 Importation réussie ! Tous les étudiants ont été créés ou mis à jour.");
  console.log("ℹ️ Chaque étudiant n'a plus qu'à se connecter avec GitHub — le rattachement se fait automatiquement via son username GitHub.");
}

main().catch(err => {
  console.error("❌ Erreur inattendue :", err);
});
