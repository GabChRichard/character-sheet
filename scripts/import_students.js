import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';

// Helper pour lire le fichier .env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error("❌ Fichier .env introuvable dans le répertoire courant.");
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

// Fonction pour poser des questions dans la console
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Les variables VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY sont manquantes dans le .env");
    process.exit(1);
  }

  console.log("==========================================");
  console.log("📥 Importation des étudiants dans Supabase");
  console.log("==========================================");

  // Demander les identifiants admin
  const adminUser = await askQuestion("Nom d'utilisateur administrateur (ex: momo) : ");
  const adminPass = await askQuestion("Mot de passe administrateur : ");

  if (!adminUser || !adminPass) {
    console.error("❌ Les identifiants administrateur sont obligatoires.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Valider la connexion admin
  console.log("🔑 Connexion au serveur...");
  const { data: adminAuth, error: authError } = await supabase
    .rpc('admin_verify_login', { p_username: adminUser, p_password: adminPass });

  if (authError) {
    console.error("❌ Erreur lors de la validation admin :", authError.message);
    process.exit(1);
  }

  if (!adminAuth || adminAuth.length === 0) {
    console.error("❌ Identifiants administrateur incorrects.");
    process.exit(1);
  }

  const adminName = adminAuth[0].display_name;
  console.log(`✅ Authentifié en tant que : ${adminName} (${adminAuth[0].role})`);

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

  // Lire et analyser le CSV
  console.log("📄 Lecture du fichier CSV...");
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length <= 1) {
    console.error("❌ Le fichier CSV ne contient pas d'étudiants (uniquement l'en-tête ou vide).");
    process.exit(1);
  }

  // Retirer l'en-tête
  const headerLine = lines[0];
  const students = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2) continue; // Besoin au moins de code et password

    const student = {
      code: cols[0],
      password: cols[1],
      alias: cols[2] || 'Étudiant',
      year: parseInt(cols[3], 10) || 1,
      interests: cols[4] ? cols[4].split(',').map(s => s.trim()).filter(s => s.length > 0) : [],
      bio: cols[5] || '',
      avatarSeed: cols[6] || 'default'
    };
    students.push(student);
  }

  console.log(`📦 Préparation de l'importation de ${students.length} étudiants...`);

  // Envoyer la requête RPC d'import
  const { data: importResult, error: importError } = await supabase
    .rpc('admin_import_students', {
      p_username: adminUser,
      p_password: adminPass,
      p_students: students
    });

  if (importError) {
    console.error("❌ Erreur lors de l'importation massive :", importError.message);
    process.exit(1);
  }

  if (importResult) {
    console.log("🎉 Importation réussie ! Tous les étudiants ont été créés ou mis à jour.");
  } else {
    console.error("❌ Échec de l'importation (retour inattendu).");
  }
}

main().catch(err => {
  console.error("❌ Erreur inattendue :", err);
});
