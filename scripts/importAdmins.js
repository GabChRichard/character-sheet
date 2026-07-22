import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';

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
    console.error("❌ Variables Supabase manquantes dans le .env");
    process.exit(1);
  }

  console.log("==========================================");
  console.log("📥 Importation des administrateurs");
  console.log("==========================================");

  let csvFile = process.argv[2];
  if (!csvFile) {
    csvFile = 'admins.csv';
    console.log(`ℹ️ Utilisation du fichier par défaut : ${csvFile}`);
  }

  const csvPath = path.resolve(process.cwd(), csvFile);
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Fichier CSV introuvable : ${csvPath}`);
    process.exit(1);
  }

  // Connexion admin pour autorisation (si déjà des admins)
  const tempClient = createClient(supabaseUrl, supabaseAnonKey);
  let adminUser = '';
  let adminPass = '';

  const { data: existingAdmins } = await tempClient.from('admins').select('username').limit(1);
  const needsAuth = existingAdmins && existingAdmins.length > 0;

  if (needsAuth) {
    console.log("🔒 Des administrateurs existent déjà. Connexion requise.");
    adminUser = await askQuestion("Username admin existant : ");
    adminPass = await askQuestion("Mot de passe : ");
  }

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
    if (cols.length < 3) continue; // username, password, display_name, role
    admins.push({
      username: cols[0],
      password: cols[1],
      display_name: cols[2],
      role: cols[3] || 'prof'
    });
  }

  console.log(`📦 Importation de ${admins.length} administrateurs...`);

  const { data, error } = await tempClient.rpc('admin_import_admins', {
    p_username: adminUser,
    p_password: adminPass,
    p_admins: admins
  });

  if (error) {
    console.error("❌ Erreur lors de l'importation :", error.message);
  } else {
    console.log("🎉 Importation des administrateurs réussie !");
  }
}

main().catch(err => console.error("❌ Erreur :", err));
