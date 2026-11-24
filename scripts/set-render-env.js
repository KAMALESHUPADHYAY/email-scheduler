const https = require('https');

const RENDER_API_KEY = 'rnd_5vwIbakuByuEvwRRKkcXKIYPImga';
const apiId = 'srv-dc2t8t0m7kps73es991g';
const workerId = 'srv-dc2t9hrncjis73duadbg';

function renderRequest(method, endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const req = https.request(
      `https://api.render.com/v1${endpoint}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${RENDER_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`API Error ${res.statusCode}: ${JSON.stringify(parsed)}`));
            }
          } catch (e) {
            resolve(body);
          }
        });
      }
    );

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

const envVars = [
  { key: 'NODE_ENV', value: 'production' },
  { key: 'PORT', value: '10000' },
  {
    key: 'DATABASE_URL',
    value:
      'postgresql://neondb_owner:npg_reU7XPoxyih0@ep-curly-pine-biur01pw-pooler.c-5.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  },
  {
    key: 'REDIS_URL',
    value:
      'rediss://default:gQAAAAAAA0yhAAIgcDJmYjRhNGJmNDY0N2E0NTNmOTEwMmVmYTNhOGNkZTRmNw@renewing-filly-216225.upstash.io:6379',
  },
  { key: 'ELASTICSEARCH_URL', value: 'http://localhost:9200' },
  { key: 'ELASTICSEARCH_INDEX', value: 'emails' },
  { key: 'SESSION_SECRET', value: 'super_secret_session_encryption_key_at_least_32_chars_prod' },
  { key: 'COOKIE_SECURE', value: 'true' },
  { key: 'COOKIE_SAME_SITE', value: 'none' },
  { key: 'ADMIN_USER', value: 'admin' },
  { key: 'ADMIN_PASSWORD', value: 'admin_secure_password_123' },
  { key: 'MAX_EMAILS_PER_HOUR', value: '100' },
  { key: 'MAX_EMAILS_PER_HOUR_PER_SENDER', value: '20' },
  { key: 'WORKER_CONCURRENCY', value: '5' },
  { key: 'MIN_DELAY_MS', value: '2000' },
  { key: 'FRONTEND_URL', value: 'https://email-scheduler-web.vercel.app' },
  { key: 'API_PUBLIC_URL', value: 'https://email-scheduler-api-433g.onrender.com' },
];

async function run() {
  console.log('Setting env vars on API service...');
  await renderRequest('PUT', `/services/${apiId}/env-vars`, envVars);
  console.log('✅ API env vars set');

  console.log('\nSetting env vars on Worker service...');
  await renderRequest('PUT', `/services/${workerId}/env-vars`, envVars);
  console.log('✅ Worker env vars set');

  console.log('\nTriggering new deploys...');
  const d1 = await renderRequest('POST', `/services/${apiId}/deploys`, { clearCache: 'do_not_clear' });
  const d2 = await renderRequest('POST', `/services/${workerId}/deploys`, { clearCache: 'do_not_clear' });

  console.log('🎉 Deployments triggered!');
  console.log('API Deploy ID:', d1.id);
  console.log('Worker Deploy ID:', d2.id);
}

run().catch(console.error);
