// Test de connexion PostgreSQL bas-niveau via pg (sans Prisma)
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

// Extraire et afficher les URLs (sans le mot de passe complet)
const dbUrl = process.env.DATABASE_URL || '';
const directUrl = process.env.DIRECT_URL || '';

const maskUrl = (url) => url.replace(/:([^@]+)@/, ':****@');
console.log('DATABASE_URL:', maskUrl(dbUrl));
console.log('DIRECT_URL:', maskUrl(directUrl));
console.log('');

// Test avec DIRECT_URL (port 5432)
console.log('Test 1 — DIRECT_URL (port 5432, pour migrations)...');
const pool1 = new Pool({ connectionString: directUrl, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });

try {
  const client1 = await pool1.connect();
  const res1 = await client1.query('SELECT version()');
  console.log('SUCCESS:', res1.rows[0].version);
  client1.release();
} catch (e) {
  console.error('FAIL (direct):', e.message);
} finally {
  await pool1.end();
}

// Test avec DATABASE_URL (port 6543 pooler)
console.log('');
console.log('Test 2 — DATABASE_URL (port 6543, pooler)...');
const pool2 = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });

try {
  const client2 = await pool2.connect();
  const res2 = await client2.query('SELECT 1 as ok');
  console.log('SUCCESS: pooler OK');
  client2.release();
} catch (e) {
  console.error('FAIL (pooler):', e.message);
} finally {
  await pool2.end();
}
