const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin (Assumes SERVICE_ACCOUNT_KEY env var or default credentials)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function backupCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const data = {};
  snapshot.forEach(doc => {
    data[doc.id] = doc.data();
  });
  return data;
}

async function runBackup() {
  console.log('--- Iniciando Backup Portucale ---');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'backups');
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const collections = ['restaurant_orders', 'restaurant_reservations', 'menu_items', 'categories'];
  const fullBackup = {};

  for (const col of collections) {
    console.log(`Fazendo backup da coleção: ${col}...`);
    fullBackup[col] = await backupCollection(col);
  }

  const filePath = path.join(backupDir, `backup_${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(fullBackup, null, 2));
  
  console.log(`--- Backup concluído com sucesso! ---`);
  console.log(`Ficheiro: ${filePath}`);
}

runBackup().catch(err => {
  console.error('Erro no backup:', err);
  process.exit(1);
});
