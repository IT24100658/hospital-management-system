#!/usr/bin/env node
const { randomBytes } = require('crypto');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ATLAS_BASE = 'https://cloud.mongodb.com/api/atlas/v2';
const RENDER_BASE = 'https://api.render.com/v1';

const log = (...a) => console.log(...a);

async function atlasJson(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${ATLAS_BASE}${path}`, {
    method,
    headers: {
      Authorization:
        'Basic ' + Buffer.from(`${process.env.ATLAS_PUBLIC}:${process.env.ATLAS_PRIVATE}`).toString('base64'),
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok) {
    const detail = json.detail || json.message || json.error || text.slice(0, 200);
    throw new Error(`Atlas ${method} ${path} -> ${res.status}: ${detail}`);
  }
  return json;
}

async function renderJson(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${RENDER_BASE}${path}`, {
    method,
    headers: {
      'X-API-Key': process.env.RENDER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { /* ignore */ }
  if (!res.ok) {
    const detail = json.message || json.error || text.slice(0, 200);
    throw new Error(`Render ${method} ${path} -> ${res.status}: ${detail}`);
  }
  return json;
}

async function ensureGitHubRepo() {
  const url = process.env.GITHUB_REPO_URL;
  if (!url) throw new Error('GITHUB_REPO_URL not set');
  return url.replace(/^https:\/\/github\.com\//, 'git://github.com/').replace(/^git:\/\//, 'https://github.com/');
}

async function setupAtlas() {
  log('  - Looking for an existing Atlas project...');
  let groupId = process.env.ATLAS_GROUP_ID;
  if (!groupId) {
    try {
      const groups = await atlasJson('/groups?pageNum=1&itemsPerPage=100');
      groupId = groups.results && groups.results.length ? groups.results[0].id : null;
    } catch (e) {
      log('    listing projects failed: ' + e.message);
    }
  }
  if (!groupId) {
    throw new Error(
      'Could not read your Atlas projects with this API key.\n' +
      'Fix one of these, then run `sh scripts/deploy.sh` again (it will resume):\n' +
      '  A) Give the API key an ORGANIZATION role too:\n' +
      '     cloud.mongodb.com -> hamburger menu -> Access Manager -> API Keys -> edit your key\n' +
      '     -> in "Change Organization" / org roles, select "Organization Owner".\n' +
      '  B) Or skip listing: copy your Project ID from the site URL\n' +
      '     (looks like: https://cloud.mongodb.com/v2/5f1a2b3c4d5e6f7890a1b2c3#/...) and add to deploy.env:\n' +
      '     ATLAS_GROUP_ID=5f1a2b3c4d5e6f7890a1b2c3'
    );
  }
  log(`    using project ${groupId}`);

  const clusterName = process.env.ATLAS_CLUSTER || 'hms-cluster';
  let clusters;
  try {
    clusters = await atlasJson(`/groups/${groupId}/clusters`);
  } catch {
    clusters = { results: [] };
  }
  let cluster = clusters.results.find((c) => c.name === clusterName);
  if (!cluster) {
    const regions = [process.env.ATLAS_REGION || 'AP_SOUTH_1', 'US_EAST_1', 'EU_WEST_1'];
    let created = null;
    for (const region of regions) {
      try {
        log(`  - Creating free M0 cluster "${clusterName}" in ${region}...`);
        created = await atlasJson(`/groups/${groupId}/clusters`, {
          method: 'POST',
          body: {
            name: clusterName,
            clusterType: 'REPLICASET',
            providerSettings: {
              providerName: 'TENANT',
              backingProviderName: 'AWS',
              instanceSizeName: 'M0',
              regionName: region
            },
            replicationSpecs: [
              {
                numShards: 1,
                zoneName: 'Zone 1',
                regionsConfig: {
                  [region]: { analyticsNodes: 0, electableNodes: 3, priority: 7, readOnlyNodes: 0 }
                }
              }
            ]
          }
        });
        break;
      } catch (e) {
        log(`    ${region} unavailable (${e.message.split('->')[1]?.trim() || e.message}); trying next...`);
      }
    }
    if (!created) throw new Error('Could not create cluster in any region. Check your Atlas API key permissions.');
    cluster = created;
    log('    cluster created, waiting for it to be ready (this can take 3-10 minutes)...');
    for (let i = 0; i < 90; i++) {
      await sleep(10000);
      const cur = await atlasJson(`/groups/${groupId}/clusters/${clusterName}`);
      if (cur.stateName === 'IDLE') { cluster = cur; break; }
      if (i % 6 === 5) log(`    still creating (${i + 1}/15 min)...`);
    }
  }

  const dbName = process.env.DB_NAME || 'hospital_management';
  const dbUser = 'hms_app';
  const dbPass = randomBytes(16).toString('hex');
  let srvHost = null;
  try {
    const cur = await atlasJson(`/groups/${groupId}/clusters/${cluster.name}`);
    srvHost = cur.connectionStrings?.standardSrv?.replace('mongodb+srv://', '') || null;
  } catch { srvHost = null; }

  log('  - Creating database user (hms_app)...');
  try {
    await atlasJson(`/groups/${groupId}/databaseUsers`, { method: 'POST', body: {
      databaseName: 'admin',
      username: dbUser,
      password: dbPass,
      roles: [{ roleName: 'atlasAdmin', databaseName: 'admin' }]
    }});
  } catch (e) {
    if (!String(e.message).includes('already exists')) throw e;
    log('    user exists, keeping existing password (copy it from your Atlas dashboard if lost)');
  }

  log('  - Allowing connections from anywhere (required for Render)...');
  try {
    await atlasJson(`/groups/${groupId}/accessList`, { method: 'POST', body: {
      items: [{ ipAddress: '0.0.0.0/0', comment: 'render' }]
    }});
  } catch (e) {
    if (!String(e.message).includes('already')) throw e;
  }

  if (!srvHost) srvHost = `${cluster.name}.mongodb.net`;
  const uri = `mongodb+srv://${dbUser}:${dbPass}@${srvHost}/${dbName}?retryWrites=true&w=majority`;
  const { writeFileSync } = require('fs');
  writeFileSync('.deploy-atlas-uri', uri);
  process.env.MONGO_URI = uri;
  log('    MONGO_URI ready.');
}

async function setupRender() {
  const repo = await ensureGitHubRepo();
  const appUrl = `${process.env.CLIENT_URL_NAME || 'hospital-management-system'}.onrender.com`;
  const name = process.env.CLIENT_URL_NAME || 'hospital-management-system';
  const MONGO_URI = process.env.MONGO_URI || require('fs').readFileSync('.deploy-atlas-uri', 'utf8').trim();
  const JWT_SECRET = randomBytes(32).toString('hex');

  let services = [];
  try {
    services = (await renderJson('/services?limit=100')).filter((s) => s.name === name);
  } catch { services = []; }

  let service;
  if (services.length) {
    log(`  - Render service "${name}" already exists, reusing it.`);
    service = services[0];
  } else {
    log(`  - Creating free Render web service "${name}" from ${repo}...`);
    service = await renderJson('/services', {
      method: 'POST',
      body: {
        type: 'web_service',
        name,
        repo,
        branch: 'main',
        autoDeploy: 'yes',
        envVars: [
          { key: 'MONGO_URI', value: MONGO_URI },
          { key: 'JWT_SECRET', value: JWT_SECRET },
          { key: 'CLIENT_URL', value: `https://${appUrl}` },
          { key: 'NODE_ENV', value: 'production' }
        ],
        serviceDetails: {
          env: 'node',
          buildCommand: 'npm run build',
          startCommand: 'npm start',
          healthCheckPath: '/api/health',
          plan: 'free',
          numInstances: 1
        }
      }
    });
    log('    service created, deploying...');
  }

  const svcUrl = service.serviceDetails?.url || service.serviceDetails?.windowsUrl || `https://${appUrl}`;
  log('  - Waiting for the first successful deploy (5-15 min)...');
  let deployed = false;
  for (let i = 0; i < 90; i++) {
    await sleep(15000);
    let deploys = [];
    try { deploys = await renderJson(`/services/${service.id}/deploys?limit=1`); } catch { /* ignore */ }
    if (deploys.length && deploys[0].status === 'live') { deployed = true; break; }
    if (i % 4 === 3) log(`    still deploying (${((i + 1) * 15 / 60).toFixed(1)} min)...`);
  }
  if (!deployed) {
    log(`  - Build not finished yet. It keeps running in the background.`);
    log(`    Check: https://dashboard.render.com/web/srv/${service.id}`);
  }

  log('  - Verifying health endpoint...');
  for (let i = 0; i < 10; i++) {
    try {
      const r = await fetch(`https://${appUrl}/api/health`);
      if (r.ok) { log(`    All good! ${await r.text()}`); break; }
    } catch { /* not ready */ }
    await sleep(10000);
  }

  log('');
  log('============================================================');
  log(`   YOUR LIVE APP:  https://${appUrl}`);
  log('   Demo login:     admin / admin123');
  log('============================================================');
}

const step = process.argv[2];
(async () => {
  if (step === 'setup-atlas') return setupAtlas();
  if (step === 'setup-render') return setupRender();
  throw new Error('unknown step: ' + step);
})().catch((e) => {
  console.error('\nERROR: ' + e.message);
  process.exit(1);
});