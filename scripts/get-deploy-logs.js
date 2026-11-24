const https = require('https');

const RENDER_API_KEY = 'rnd_5vwIbakuByuEvwRRKkcXKIYPImga';
const apiId = 'srv-dc2t8t0m7kps73es991g';
const deployId = 'dep-dc2tc3gm7kps73esgrs0';

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
            resolve(parsed);
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

async function checkDeploy() {
  const deploy = await renderRequest('GET', `/services/${apiId}/deploys/${deployId}`);
  console.log('Deploy Info:', JSON.stringify(deploy, null, 2));
}

checkDeploy().catch(console.error);
