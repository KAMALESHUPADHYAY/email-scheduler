const https = require('https');

const RENDER_API_KEY = 'rnd_5vwIbakuByuEvwRRKkcXKIYPImga';
const apiId = 'srv-dc2t8t0m7kps73es991g';
const workerId = 'srv-dc2t9hrncjis73duadbg';

function renderRequest(method, endpoint) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      `https://api.render.com/v1${endpoint}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${RENDER_API_KEY}`,
          Accept: 'application/json',
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
    req.end();
  });
}

async function check() {
  console.log('--- API DEPLOYS ---');
  const apiDeploys = await renderRequest('GET', `/services/${apiId}/deploys?limit=2`);
  for (const d of apiDeploys) {
    console.log(`API Deploy [${d.deploy.id}]: status = ${d.deploy.status}, createdAt = ${d.deploy.createdAt}`);
  }

  console.log('\n--- WORKER DEPLOYS ---');
  const workerDeploys = await renderRequest('GET', `/services/${workerId}/deploys?limit=2`);
  for (const d of workerDeploys) {
    console.log(`Worker Deploy [${d.deploy.id}]: status = ${d.deploy.status}, createdAt = ${d.deploy.createdAt}`);
  }
}

check().catch(console.error);
