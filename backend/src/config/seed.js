require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('🌱 Initialisation des données...');

  const hash = await bcrypt.hash('Admin@2024', 12);

  await db.query(`
    INSERT INTO utilisateurs (nom, prenom, login, mot_de_passe, role)
    VALUES ('Admin', 'Responsable', 'admin', $1, 'RESPONSABLE')
    ON CONFLICT (login) DO NOTHING
  `, [hash]);

  console.log('✅ Compte responsable créé :');
  console.log('   Login    : admin');
  console.log('   Mot de passe : Admin@2024');
  console.log('   ⚠️  Changez ce mot de passe dès la première connexion !');

  process.exit(0);
}

seed().catch(e => { console.error('❌', e.message); process.exit(1); });
