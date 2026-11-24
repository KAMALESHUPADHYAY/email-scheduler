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

async function trigger() {
  const buildCmd = 'npm install --include=dev && npm run build';

  console.log('Updating build command on API...');
  await renderRequest('PATCH', `/services/${apiId}`, {
    serviceDetails: {
      envSpecificDetails: {
        buildCommand: buildCmd,
        startCommand: 'node apps/api/dist/index.js',
      },
    },
  });

  console.log('Updating build command on Worker...');
  await renderRequest('PATCH', `/services/${workerId}`, {
    serviceDetails: {
      envSpecificDetails: {
        buildCommand: buildCmd,
        startCommand: 'node apps/worker/dist/index.js',
      },
    },
  });

  console.log('Triggering clean build deploy for API...');
  const d1 = await renderRequest('POST', `/services/${apiId}/deploys`, { clearCache: 'clear' });
  console.log('Triggering clean build deploy for Worker...');
  const d2 = await renderRequest('POST', `/services/${workerId}/deploys`, { clearCache: 'clear' });

  console.log(`API Deploy ID: ${d1.id}`);
  console.log(`Worker Deploy ID: ${d2.id}`);
}

trigger().catch(console.error);
