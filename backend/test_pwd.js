// Test des variantes de mot de passe
import pg from 'pg';

const { Client } = pg;

const HOST_DIRECT = 'aws-1-eu-central-1.pooler.supabase.com';
const PORT_DIRECT = 5432;
const DATABASE = 'postgres';
const USER = 'postgres.mpifqpbfphzpuydpxgnc';

const passwords = [
  { label: 'Combase@1#èè (majuscule C)', value: 'Combase@1#\u00e8\u00e8' },
  { label: 'combase@1#èè (minuscule c)', value: 'combase@1#\u00e8\u00e8' },
  { label: 'Combase@1#ee (sans accent)', value: 'Combase@1#ee' },
  { label: 'combase@1#ee (minuscule sans accent)', value: 'combase@1#ee' },
];

console.log('=== Test de connexion PostgreSQL — variantes de mot de passe ===\n');

for (const pwd of passwords) {
  const client = new Client({
    host: HOST_DIRECT,
    port: PORT_DIRECT,
    database: DATABASE,
    user: USER,
    password: pwd.value,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  process.stdout.write(`Test: ${pwd.label} ... `);
  try {
    await client.connect();
    const res = await client.query('SELECT 1 as ok');
    console.log('✅ SUCCÈS !');
    await client.end();
    console.log(`\n=> MOT DE PASSE CORRECT : "${pwd.value}"\n`);
    process.exit(0);
  } catch (e) {
    console.log(`❌ ${e.message}`);
    try { await client.end(); } catch {}
  }
}

console.log('\nAucune variante ne fonctionne. Vérifiez le mot de passe dans Settings → Database.');
