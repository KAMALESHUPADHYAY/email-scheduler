const https = require('https');

const RENDER_API_KEY = 'rnd_5vwIbakuByuEvwRRKkcXKIYPImga';
const apiId = 'srv-dc2t8t0m7kps73es991g';
const workerId = 'srv-dc2t9hrncjis73duadbg';
const apiDeployId = 'dep-dc2tg2mtlv9c73940fvg';
const workerDeployId = 'dep-dc2tg2jncjis73duqjo0';

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
            resolve(JSON.parse(body));
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function monitor() {
  console.log('Monitoring Render deployments...');
  for (let i = 0; i < 20; i++) {
    const apiD = await renderRequest('GET', `/services/${apiId}/deploys/${apiDeployId}`);
    const workerD = await renderRequest('GET', `/services/${workerId}/deploys/${workerDeployId}`);

    console.log(`[T+${i * 10}s] API status: ${apiD.status} | Worker status: ${workerD.status}`);

    if (apiD.status === 'live' && workerD.status === 'live') {
      console.log('🎉 BOTH API AND WORKER ARE LIVE!');
      return;
    }
    if (apiD.status.includes('failed') || workerD.status.includes('failed')) {
      console.log('❌ A deployment failed!');
      return;
    }
    await sleep(10000);
  }
}

monitor().catch(console.error);
