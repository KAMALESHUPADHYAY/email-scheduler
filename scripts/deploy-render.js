const https = require('https');

const RENDER_API_KEY = 'rnd_5vwIbakuByuEvwRRKkcXKIYPImga';
const OWNER_ID = 'tea-d69m0roboq4c73dk3d7g';
const REPO_URL = 'https://github.com/KAMALESHUPADHYAY/email-scheduler';

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

async function deployWorker() {
  console.log('🚀 Deploying Dedicated Worker Web Service to Render Free Tier...');

  const commonEnvVars = [
    { key: 'NODE_ENV', value: 'production' },
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
    { key: 'MAX_EMAILS_PER_HOUR', value: '100' },
    { key: 'MAX_EMAILS_PER_HOUR_PER_SENDER', value: '20' },
    { key: 'WORKER_CONCURRENCY', value: '5' },
    { key: 'MIN_DELAY_MS', value: '2000' },
    { key: 'PORT', value: '10000' },
  ];

  const workerPayload = {
    ownerId: OWNER_ID,
    name: 'email-scheduler-worker',
    type: 'web_service',
    repo: REPO_URL,
    branch: 'main',
    autoDeploy: 'yes',
    serviceDetails: {
      env: 'node',
      plan: 'free',
      region: 'singapore',
      envSpecificDetails: {
        buildCommand: 'npm install && npm run build',
        startCommand: 'npm run start --workspace=@email-scheduler/worker',
      },
      healthCheckPath: '/',
      envVars: commonEnvVars,
    },
  };

  const workerService = await renderRequest('POST', '/services', workerPayload);
  console.log('✅ Worker service created!');
  console.log('🔗 Worker URL:', workerService.service?.serviceDetails?.url);
  console.log('Worker Service ID:', workerService.service?.id);
}

deployWorker().catch((err) => {
  console.error('Worker deployment error:', err);
  process.exit(1);
});
