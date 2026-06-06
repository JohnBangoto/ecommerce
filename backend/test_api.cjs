const https = require('https');

const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1waWZxcGJmcGh6cHV5ZHB4Z25jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDA3MDc0NiwiZXhwIjoyMDk1NjQ2NzQ2fQ.hDlUKcOXEcbRgQbuBOgIUVw6hOLdOopIZWDHnNC2TDY";

const options = {
  hostname: 'mpifqpbfphzpuydpxgnc.supabase.co',
  path: '/rest/v1/',
  method: 'GET',
  headers: {
    'apikey': key,
    'Authorization': 'Bearer ' + key
  }
};

console.log('Testing Supabase REST API...');
const req = https.request(options, (res) => {
  console.log('HTTP Status:', res.statusCode);
  if (res.statusCode === 200) {
    console.log('=> Projet Supabase ACTIF');
  } else if (res.statusCode === 503) {
    console.log('=> Projet Supabase EN PAUSE — rendez-vous sur le dashboard pour le restaurer');
  } else {
    console.log('=> Statut inattendu:', res.statusCode);
  }
  let data = '';
  res.on('data', (d) => data += d);
  res.on('end', () => console.log('Response:', data.substring(0, 200)));
});

req.on('error', (e) => {
  console.error('Erreur réseau:', e.message);
});

req.setTimeout(10000, () => {
  console.log('Timeout — serveur inaccessible');
  req.destroy();
});

req.end();
