// © 2025 CyberLage
const { CosmosClient } = require('@azure/cosmos');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const endpoint = (process.env.COSMOS_ENDPOINT || process.env.COSMOS_DB_ENDPOINT || '').trim();
const key = (process.env.COSMOS_KEY || process.env.COSMOS_DB_KEY || '').trim();

const devDatabaseId = (process.env.COSMOS_DATABASE_DEV || 'cyberradar-dev').trim();
const prodDatabaseId = (process.env.COSMOS_DATABASE || process.env.COSMOS_DB_DATABASE || 'cyberradar').trim();
const usersContainerId = (process.env.COSMOS_USERS_CONTAINER || 'users').trim();
const alertsContainerId = (process.env.COSMOS_ALERTS_CONTAINER || 'raw_alerts').trim();

if (!endpoint || !key) {
  console.error('FEHLER: COSMOS_ENDPOINT/COSMOS_KEY fehlen. Bitte in der .env setzen.');
  process.exit(1);
}

const adminEmail = (process.env.ADMIN_EMAIL || 'admin@cyberlage.local').trim().toLowerCase();
const adminPasswordEnv = (process.env.ADMIN_PASSWORD || '').trim();

const client = new CosmosClient({ endpoint, key });

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

function generatePassword() {
  return crypto.randomBytes(12).toString('base64url');
}

async function run() {
  const devDb = client.database(devDatabaseId);
  const usersContainer = devDb.container(usersContainerId);

  console.log('Prüfe vorhandene Benutzer...');
  const { resources: existingUsers } = await usersContainer.items
    .query({ query: "SELECT * FROM c WHERE c.type = 'user'" })
    .fetchAll();

  console.log(`Gefundene Benutzer: ${existingUsers.length}`);
  if (existingUsers.length > 0) {
    existingUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.role}, aktiv: ${u.isActive})`);
    });
  }

  const existingAdmin = existingUsers.find(u => u.emailLower === adminEmail);
  const adminPassword = adminPasswordEnv || generatePassword();

  if (existingAdmin) {
    console.log('\nAdmin-Konto existiert bereits. Passwort wird aktualisiert...');
    const passwordHash = await hashPassword(adminPassword);
    await usersContainer.items.upsert({
      ...existingAdmin,
      passwordHash,
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date().toISOString(),
    });
    console.log('Admin-Passwort aktualisiert.');
  } else {
    console.log('\nAdmin-Konto wird erstellt...');
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(adminPassword);

    const adminUser = {
      id: `user_${crypto.randomUUID()}`,
      type: 'user',
      email: adminEmail,
      emailLower: adminEmail,
      name: 'Admin',
      authMethod: 'credentials',
      passwordHash,
      passwordHistory: [],
      role: 'admin',
      allowedTenants: [],
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
      tokenVersion: 0,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };

    await usersContainer.items.create(adminUser);
    console.log('Admin-Konto erstellt.');
  }

  console.log(`\nAdmin-Login:\n  Email: ${adminEmail}\n  Passwort: ${adminPasswordEnv ? '(aus ADMIN_PASSWORD)' : adminPassword}`);

  console.log('\nPrüfe Zugriff auf Demo-Meldungen...');
  const prodDb = client.database(prodDatabaseId);
  const { resources: countResult } = await prodDb.container(alertsContainerId).items
    .query({ query: "SELECT VALUE COUNT(1) FROM c WHERE c.isProcessed = true" })
    .fetchAll();
  console.log(`Meldungen (angereichert): ${countResult[0] || 0}`);

  console.log('\n✅ Setup abgeschlossen.');
}

run().catch(e => {
  console.error('FEHLER:', e.message);
  process.exit(1);
});

