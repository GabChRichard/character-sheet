import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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
  console.log("📥 Importation des administrateurs");
  console.log("==========================================");

  let csvFile = process.argv[2];
  if (!csvFile) {
    csvFile = 'profs.csv';
    console.log(`ℹ️ Utilisation du fichier par défaut : ${csvFile}`);
  }

  const csvPath = path.resolve(process.cwd(), csvFile);
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Fichier CSV introuvable : ${csvPath}`);
    process.exit(1);
  }

  // Ce script utilise la clé service_role : elle bypass RLS, donc aucune
  // authentification admin préalable n'est nécessaire (contrairement à v5 où
  // le tout premier admin devait s'auto-bootstrapper via une RPC accessible
  // avec la seule clé anon — risque d'escalade de privilège sous OAuth).
  // Ne jamais exposer cette clé côté client — elle ne doit vivre que dans
  // .env.admin (gitignored).
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log("📄 Lecture du fichier CSV...");
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);

  if (lines.length <= 1) {
    console.error("❌ Le fichier CSV est vide ou ne contient que l'en-tête.");
    process.exit(1);
  }

  const admins = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2 || !cols[0]) continue; // username, githubUsername, display_name, role
    admins.push({
      username: cols[0],
      github_username: cols[1] || null,
      display_name: cols[2] || cols[0],
      role: cols[3] || 'prof'
    });
  }

  console.log(`📦 Importation de ${admins.length} administrateurs...`);

  // auth_user_id n'est jamais inclus dans le payload : un ré-import ne peut
  // donc pas délier un admin déjà auto-lié à son compte GitHub.
  const { error } = await supabase
    .from('admins')
    .upsert(admins, { onConflict: 'username' });

  if (error) {
    console.error("❌ Erreur lors de l'importation :", error.message);
    process.exit(1);
  }

  console.log("🎉 Importation des administrateurs réussie !");
  console.log("ℹ️ Chaque admin doit maintenant se connecter avec GitHub et entrer son username une seule fois pour activer son compte.");
}

main().catch(err => console.error("❌ Erreur :", err));
