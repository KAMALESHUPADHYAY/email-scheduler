const https = require('https');

const RENDER_API_KEY = 'rnd_5vwIbakuByuEvwRRKkcXKIYPImga';
const apiId = 'srv-dc2t8t0m7kps73es991g';
const FRONTEND_URL = 'https://web-eight-dusky-46.vercel.app';

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
            resolve(JSON.parse(body));
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

async function updateFrontendUrl() {
  console.log('Fetching current API env vars...');
  const currentVars = await renderRequest('GET', `/services/${apiId}/env-vars`);
  const varsToSet = currentVars.map(v => ({
    key: v.envVar.key,
    value: v.envVar.key === 'FRONTEND_URL' ? FRONTEND_URL : v.envVar.value
  }));

  console.log(`Setting FRONTEND_URL to ${FRONTEND_URL}...`);
  await renderRequest('PUT', `/services/${apiId}/env-vars`, varsToSet);
  console.log('✅ FRONTEND_URL updated on Render!');
}

updateFrontendUrl().catch(console.error);
