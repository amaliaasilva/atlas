#!/usr/bin/env node
// =============================================================================
//  Atlas Finance — Provisionamento GCP via REST APIs
//  Funciona SEM gcloud instalado. Usa o token gerado por:
//    firebase login:ci --no-localhost
//
//  Uso:
//    FIREBASE_TOKEN=<token> node scripts/provision-gcp.js
//    node scripts/provision-gcp.js --check   # apenas verifica status
//    node scripts/provision-gcp.js --step=sql # só provisiona Cloud SQL
//
//  O que este script cria:
//    1. Ativa APIs necessárias (serviceusage)
//    2. Service Account para CI/CD + IAM bindings
//    3. Cloud SQL PostgreSQL 16 (atlas-db)
//    4. Banco de dados atlas_finance + usuário atlas
//    5. Cloud Storage bucket (atlasfinance-uploads)
//    6. Secrets no Secret Manager
//    7. Imprime os valores para configurar GitHub Secrets
// =============================================================================

'use strict';

const https  = require('https');
const crypto = require('crypto');
const { getAccessToken } = require('./gcp-auth');

// ─── Config ──────────────────────────────────────────────────────────────────
const PROJECT  = process.env.GCP_PROJECT  || 'atlasfinance';
const REGION   = process.env.GCP_REGION   || 'southamerica-east1';
const DB_INST  = 'atlas-db';
const DB_NAME  = 'atlas_finance';
const DB_USER  = 'atlas';
const BUCKET   = `${PROJECT}-uploads`;
const SA_NAME  = 'atlas-deploy';
const SA_EMAIL = `${SA_NAME}@${PROJECT}.iam.gserviceaccount.com`;

// ─── Modo ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const CHECK_ONLY  = args.includes('--check');
const STEP        = (args.find(a => a.startsWith('--step=')) || '').replace('--step=', '');
const DRY_RUN     = args.includes('--dry-run');

// ─── Cores ───────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m',
};
const ok    = (msg) => console.log(`${C.green}  ✓ ${msg}${C.reset}`);
const warn  = (msg) => console.log(`${C.yellow}  ⚠ ${msg}${C.reset}`);
const info  = (msg) => console.log(`${C.cyan}  ℹ ${msg}${C.reset}`);
const step  = (msg) => console.log(`\n${C.bold}${C.blue}▶ ${msg}${C.reset}`);
const err   = (msg) => console.error(`${C.red}  ✗ ${msg}${C.reset}`);
const dry   = (msg) => console.log(`${C.yellow}  [DRY] ${msg}${C.reset}`);

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function request(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${json.error?.message || data}`));
          } else {
            resolve({ status: res.statusCode, body: json });
          }
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// Aguarda uma operação LRO (Long Running Operation) do GCP concluir
async function waitOperation(operationUrl, token, maxWaitMs = 900_000) {
  const start = Date.now();
  let delay = 3000;
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 15000);
    const { body } = await request('GET', operationUrl, null, token);
    if (body.done) {
      if (body.error) throw new Error(JSON.stringify(body.error));
      return body.response || body;
    }
    process.stdout.write('.');
  }
  throw new Error('Timeout aguardando operação GCP');
}

// ─── 1. Ativar APIs ───────────────────────────────────────────────────────────
async function enableApis(token) {
  step('1/7 — Ativando APIs do GCP');

  const apis = [
    'run.googleapis.com',
    'sqladmin.googleapis.com',
    'storage.googleapis.com',
    'secretmanager.googleapis.com',
    'containerregistry.googleapis.com',
    'cloudbuild.googleapis.com',
    'iam.googleapis.com',
    'iamcredentials.googleapis.com',
  ];

  if (DRY_RUN) { apis.forEach(a => dry(`Ativaria: ${a}`)); return; }

  const url = `https://serviceusage.googleapis.com/v1/projects/${PROJECT}/services:batchEnable`;
  const { body } = await request('POST', url, {
    serviceIds: apis,
  }, token);

  if (body.name) {
    info('Aguardando ativação das APIs...');
    await waitOperation(
      `https://serviceusage.googleapis.com/v1/${body.name}`,
      token
    );
    console.log('');
  }
  ok('APIs ativadas: ' + apis.join(', '));
}

// ─── 2. Service Account ───────────────────────────────────────────────────────
async function setupServiceAccount(token) {
  step('2/7 — Service Account para CI/CD');
  if (DRY_RUN) { dry(`Criaria SA: ${SA_EMAIL}`); return null; }

  // Cria SA (ignora se já existe)
  try {
    await request('POST',
      `https://iam.googleapis.com/v1/projects/${PROJECT}/serviceAccounts`,
      {
        accountId: SA_NAME,
        serviceAccount: { displayName: 'Atlas Finance Deploy SA' },
      }, token);
    ok(`Service Account criada: ${SA_EMAIL}`);
  } catch (e) {
    if (e.message.includes('409') || e.message.includes('already exists')) {
      warn(`SA já existe: ${SA_EMAIL}`);
    } else throw e;
  }

  // Roles mínimas (princípio do menor privilégio)
  const roles = [
    'roles/run.admin',
    'roles/storage.admin',
    'roles/secretmanager.secretAccessor',
    'roles/cloudsql.client',
    'roles/iam.serviceAccountUser',
    'roles/firebase.admin',
  ];

  // Busca policy atual
  const { body: policy } = await request('POST',
    `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:getIamPolicy`,
    {}, token);

  // Adiciona bindings
  for (const role of roles) {
    const existing = policy.bindings?.find(b => b.role === role);
    const member = `serviceAccount:${SA_EMAIL}`;
    if (existing) {
      if (!existing.members.includes(member)) existing.members.push(member);
    } else {
      policy.bindings = policy.bindings || [];
      policy.bindings.push({ role, members: [member] });
    }
  }

  await request('POST',
    `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}:setIamPolicy`,
    { policy }, token);
  ok(`IAM roles atribuídas: ${roles.length} roles`);

  // Gera chave JSON
  const { body: keyBody } = await request('POST',
    `https://iam.googleapis.com/v1/projects/${PROJECT}/serviceAccounts/${SA_EMAIL}/keys`,
    { keyAlgorithm: 'KEY_ALG_RSA_2048', privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE' },
    token);

  const keyJson = Buffer.from(keyBody.privateKeyData, 'base64').toString('utf8');
  ok('Chave JSON gerada para o Service Account');
  return keyJson;
}

// ─── 3. Cloud SQL ─────────────────────────────────────────────────────────────
async function provisionCloudSQL(token) {
  step('3/7 — Cloud SQL PostgreSQL 16');
  if (DRY_RUN) { dry(`Criaria: ${DB_INST} (db-g1-small, ${REGION})`); return null; }

  // Verifica se já existe
  try {
    const { body } = await request('GET',
      `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/instances/${DB_INST}`,
      null, token);
    warn(`Instância já existe: ${DB_INST} — state: ${body.state}`);

    if (body.state !== 'RUNNABLE') {
      warn('Instância não está RUNNABLE — aguardando...');
    }
  } catch (e) {
    if (!e.message.includes('404') && !e.message.includes('does not exist')) throw e;

    info('Criando instância Cloud SQL (pode levar ~5 min)...');
    const { body: op } = await request('POST',
      `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/instances`,
      {
        name: DB_INST,
        databaseVersion: 'POSTGRES_16',
        region: REGION,
        settings: {
          tier: 'db-g1-small',
          edition: 'ENTERPRISE',
          dataDiskType: 'PD_SSD',
          dataDiskSizeGb: '10',
          storageAutoResize: true,
          backupConfiguration: {
            enabled: true,
            startTime: '03:00',
            pointInTimeRecoveryEnabled: true,
          },
          ipConfiguration: {
            ipv4Enabled: true,   // IP público com SSL obrigatório
            requireSsl: true,
          },
          maintenanceWindow: { hour: 4, day: 7 },
          activationPolicy: 'ALWAYS',
        },
      }, token);

    info('Aguardando criação da instância');
    await waitOperation(
      `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/operations/${op.name}`,
      token, 600_000 // 10 min timeout
    );
    console.log('');
    ok(`Instância criada: ${DB_INST}`);
  }

  // Obtém connection name
  const { body: inst } = await request('GET',
    `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/instances/${DB_INST}`,
    null, token);
  const connectionName = inst.connectionName;
  ok(`Connection name: ${connectionName}`);

  // Cria banco de dados
  try {
    await request('POST',
      `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/instances/${DB_INST}/databases`,
      { name: DB_NAME }, token);
    ok(`Database criado: ${DB_NAME}`);
  } catch (e) {
    if (e.message.includes('409') || e.message.includes('already exists')) {
      warn(`Database já existe: ${DB_NAME}`);
    } else throw e;
  }

  // Cria usuário com senha aleatória
  const dbPassword = crypto.randomBytes(24).toString('base64url');
  try {
    await request('POST',
      `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/instances/${DB_INST}/users`,
      { name: DB_USER, password: dbPassword }, token);
    ok(`Usuário criado: ${DB_USER}`);
  } catch (e) {
    if (e.message.includes('409') || e.message.includes('already exists')) {
      // Atualiza senha do usuário existente
      await request('PUT',
        `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/instances/${DB_INST}/users?name=${DB_USER}`,
        { name: DB_USER, password: dbPassword }, token);
      warn(`Usuário já existe — senha atualizada: ${DB_USER}`);
    } else throw e;
  }

  const databaseUrl = `postgresql+asyncpg://${DB_USER}:${dbPassword}@/${DB_NAME}?host=/cloudsql/${connectionName}`;
  ok(`DATABASE_URL gerado (Cloud SQL proxy)`);

  return { connectionName, databaseUrl, dbPassword };
}

// ─── 4. Cloud Storage ─────────────────────────────────────────────────────────
async function provisionStorage(token) {
  step('4/7 — Cloud Storage Bucket');
  if (DRY_RUN) { dry(`Criaria bucket: gs://${BUCKET}`); return; }

  try {
    await request('POST',
      `https://storage.googleapis.com/storage/v1/b?project=${PROJECT}`,
      {
        name: BUCKET,
        location: REGION,
        storageClass: 'STANDARD',
        iamConfiguration: { uniformBucketLevelAccess: { enabled: true } },
        lifecycle: {
          rule: [{
            action: { type: 'Delete' },
            condition: { age: 365, matchesPrefix: ['tmp/'] },
          }],
        },
      }, token);
    ok(`Bucket criado: gs://${BUCKET}`);
  } catch (e) {
    if (e.message.includes('409') || e.message.includes('already exists')) {
      warn(`Bucket já existe: gs://${BUCKET}`);
    } else throw e;
  }
}

// ─── 5. Secret Manager ───────────────────────────────────────────────────────
async function upsertSecret(name, value, token) {
  const secretUrl = `https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets`;
  // Cria secret com secretId como query param (formato correto da API)
  await request('POST', `${secretUrl}?secretId=${name}`,
    { replication: { automatic: {} } },
    token).catch(() => {});
  // Adiciona versão com o valor
  const encoded = Buffer.from(value).toString('base64');
  await request('POST',
    `${secretUrl}/${name}:addVersion`,
    { payload: { data: encoded } },
    token);
  ok(`Secret atualizado: ${name}`);
}

async function provisionSecrets(token, { databaseUrl, gcsBucket, secretKey }) {
  step('5/7 — Secret Manager');
  if (DRY_RUN) {
    dry('Criaria secrets: atlas-database-url, atlas-secret-key, atlas-gcs-bucket');
    return;
  }

  await upsertSecret('atlas-database-url', databaseUrl, token);
  await upsertSecret('atlas-secret-key', secretKey, token);
  await upsertSecret('atlas-gcs-bucket', gcsBucket, token);
}

// ─── 6. Verificação de status ────────────────────────────────────────────────
async function checkStatus(token) {
  step('Verificando status da infraestrutura');

  const checks = [
    {
      name: 'Cloud SQL',
      url: `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/instances/${DB_INST}`,
      field: (b) => b.state,
    },
    {
      name: `GCS gs://${BUCKET}`,
      url: `https://storage.googleapis.com/storage/v1/b/${BUCKET}`,
      field: (b) => b.id ? 'EXISTS' : 'NOT FOUND',
    },
    {
      name: 'Cloud Run',
      url: `https://run.googleapis.com/v1/namespaces/${PROJECT}/services/atlas-backend`,
      field: (b) => b.status?.conditions?.[0]?.type || 'NOT DEPLOYED',
    },
  ];

  for (const check of checks) {
    try {
      const { body } = await request('GET', check.url, null, token);
      const status = check.field(body);
      ok(`${check.name}: ${status}`);
    } catch (e) {
      warn(`${check.name}: ${e.message.includes('404') ? 'NÃO CRIADO' : e.message}`);
    }
  }
}

// ─── 7. Resumo e GitHub Secrets ──────────────────────────────────────────────
function printGitHubSecrets(saKeyJson, databaseUrl, secretKey) {
  console.log(`
${C.bold}${C.green}╔═══════════════════════════════════════════════════════╗
║       Configure estes GitHub Secrets agora            ║
║  https://github.com/amaliaasilva/atlas/settings/      ║
║                    secrets/actions                    ║
╚═══════════════════════════════════════════════════════╝${C.reset}

${C.bold}Secret: GCP_SA_KEY${C.reset}
${C.cyan}(Cole o JSON completo abaixo como valor do secret)${C.reset}
${saKeyJson || '<execute sem --dry-run para obter>'}

${C.bold}Secret: FIREBASE_TOKEN${C.reset}
${process.env.FIREBASE_TOKEN || '<não disponível — execute firebase login:ci>'}

${C.bold}Secret: GCP_PROJECT${C.reset}
${PROJECT}

${C.bold}Secret: GCP_REGION${C.reset}
${REGION}

${C.bold}Secret: NEXT_PUBLIC_API_URL${C.reset}
${C.yellow}(Disponível após o primeiro deploy do backend — use a URL do Cloud Run)${C.reset}
https://atlas-backend-<hash>.${REGION}.run.app

${C.cyan}Após configurar os secrets, faça push para main:${C.reset}
  git push origin main
`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`
${C.bold}${C.blue}╔═══════════════════════════════════════════════════╗
║   Atlas Finance — GCP Provisioning (sem gcloud)  ║
╚═══════════════════════════════════════════════════╝${C.reset}
  Projeto: ${PROJECT}  |  Região: ${REGION}
  ${DRY_RUN ? C.yellow + '[DRY RUN]' + C.reset : ''}
`);

  step('0/7 — Obtendo access token GCP');
  let accessToken;
  try {
    accessToken = await getAccessToken();
    ok('Access token obtido (via firebase login local)');
  } catch (e) {
    err(`Falha ao obter access token: ${e.message}`);
    err('Execute: firebase login --no-localhost');
    process.exit(1);
  }

  if (CHECK_ONLY) {
    await checkStatus(accessToken);
    return;
  }

  const secretKey = crypto.randomBytes(32).toString('hex');
  let saKeyJson = null;
  let sqlResult = null;

  try {
    if (!STEP || STEP === 'apis')    await enableApis(accessToken);
    if (!STEP || STEP === 'sa')      saKeyJson = await setupServiceAccount(accessToken);
    if (!STEP || STEP === 'sql')     sqlResult = await provisionCloudSQL(accessToken);
    if (!STEP || STEP === 'storage') await provisionStorage(accessToken);

    if (!STEP || STEP === 'secrets') {
      if (sqlResult) {
        await provisionSecrets(accessToken, {
          databaseUrl: sqlResult.databaseUrl,
          gcsBucket:   BUCKET,
          secretKey,
        });
      } else if (!DRY_RUN) {
        warn('Cloud SQL não provisionado nesta execução — secrets não criados');
        warn('Execute novamente sem --step para criar todos os recursos');
      }
    }

    step('6/7 — Verificando status final');
    await checkStatus(accessToken);

    step('7/7 — Infraestrutura provisionada com sucesso!');
    printGitHubSecrets(saKeyJson, sqlResult?.databaseUrl, secretKey);

  } catch (e) {
    err(`\nFalha no provisionamento: ${e.message}`);
    if (e.message.includes('403') || e.message.includes('PERMISSION_DENIED')) {
      err('Permissão negada. Verifique se a conta tem papel Owner no projeto.');
    }
    process.exit(1);
  }
}

main().catch(e => { err(e.message); process.exit(1); });
