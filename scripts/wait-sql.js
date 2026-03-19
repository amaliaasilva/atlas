#!/usr/bin/env node
// Verifica o status da instância Cloud SQL e aguarda ela ficar RUNNABLE.
// Uso: FIREBASE_TOKEN=<token> node scripts/wait-sql.js

'use strict';
const https   = require('https');
const { getAccessToken } = require('./gcp-auth');

const PROJECT   = 'atlasfinance';
const DB_INST   = 'atlas-db';
const DB_NAME   = 'atlas_finance';
const DB_USER   = 'atlas';
const DB_PASS   = 'Atlas@2026!Secure';

const C = { reset:'\x1b[0m', green:'\x1b[32m', yellow:'\x1b[33m', red:'\x1b[31m', cyan:'\x1b[36m', bold:'\x1b[1m' };
const ok   = m => console.log(`${C.green}  ✓ ${m}${C.reset}`);
const warn = m => console.log(`${C.yellow}  ⚠ ${m}${C.reset}`);
const info = m => console.log(`${C.cyan}  ℹ ${m}${C.reset}`);
const err  = m => console.error(`${C.red}  ✗ ${m}${C.reset}`);

function req(method, url, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, path: u.pathname + u.search,
      method, headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    };
    const r = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  console.log(`\n${C.bold}Atlas Finance — Aguardando Cloud SQL${C.reset}\n`);

  const token = await getAccessToken();
  ok('Access token obtido (via credenciais locais)');

  const baseUrl = `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/instances/${DB_INST}`;

  // 1. Verificar status atual
  info('Verificando status da instância...');
  let { status, body } = await req('GET', baseUrl, null, token);

  if (status === 404) {
    warn('Instância não encontrada. Criando...');
    await createInstance(token);
    return;
  }

  console.log(`  Estado atual: ${C.bold}${body.state}${C.reset}`);

  if (body.state === 'RUNNABLE') {
    ok(`Instância ${DB_INST} já está RUNNABLE!`);
    await postSetup(token, body);
    return;
  }

  if (body.state === 'PENDING_CREATE' || body.state === 'MAINTENANCE') {
    info(`Aguardando instância (estado: ${body.state})...`);
    await waitRunnable(token);
    return;
  }

  // Estado desconhecido
  warn(`Estado: ${body.state} — aguardando mesmo assim...`);
  await waitRunnable(token);
}

async function waitRunnable(token) {
  const baseUrl = `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/instances/${DB_INST}`;
  const maxWait = 15 * 60 * 1000; // 15 min
  const start = Date.now();
  let delay = 10000;

  while (Date.now() - start < maxWait) {
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 1.2, 30000);
    process.stdout.write('.');

    const newToken = await getAccessToken(); // refresh automático
    const { body } = await req('GET', baseUrl, null, newToken);

    if (body.state === 'RUNNABLE') {
      console.log('');
      ok(`Instância RUNNABLE após ${Math.round((Date.now()-start)/1000)}s`);
      await postSetup(newToken, body);
      return;
    }
    if (body.state === 'FAILED') {
      console.log('');
      err(`Instância em estado FAILED: ${JSON.stringify(body)}`);
      process.exit(1);
    }
  }
  console.log('');
  err('Timeout de 15 min — verifique no console do GCP');
  process.exit(1);
}

async function postSetup(token, instance) {
  const ip = instance.ipAddresses?.find(a => a.type === 'PRIMARY')?.ipAddress || '(sem IP público)';
  info(`IP público da instância: ${ip}`);

  // Criar banco de dados
  info('Criando banco de dados atlas_finance...');
  const { status: dbStatus, body: dbBody } = await req(
    'POST',
    `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/instances/${DB_INST}/databases`,
    { name: DB_NAME },
    token
  );
  if (dbStatus === 409 || dbBody.name === DB_NAME) {
    ok(`Banco ${DB_NAME} já existe`);
  } else if (dbStatus >= 200 && dbStatus < 300) {
    ok(`Banco ${DB_NAME} criado`);
  } else {
    warn(`Banco: ${JSON.stringify(dbBody)}`);
  }

  // Criar usuário
  info('Criando usuário atlas...');
  const { status: uStatus, body: uBody } = await req(
    'POST',
    `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/instances/${DB_INST}/users`,
    { name: DB_USER, password: DB_PASS },
    token
  );
  if (uStatus >= 200 && uStatus < 300) {
    ok(`Usuário '${DB_USER}' criado`);
  } else if (JSON.stringify(uBody).includes('already exists')) {
    ok(`Usuário '${DB_USER}' já existe`);
  } else {
    warn(`Usuário: ${JSON.stringify(uBody)}`);
  }

  // Resumo final
  console.log(`
${C.bold}${C.green}════════════════════════════════════════${C.reset}
${C.bold}  Atlas Finance — Cloud SQL Pronto!${C.reset}
${C.bold}${C.green}════════════════════════════════════════${C.reset}

  Instância : ${DB_INST}
  Projeto   : ${PROJECT}
  IP público: ${ip}
  Banco     : ${DB_NAME}
  Usuário   : ${DB_USER}
  Senha     : ${DB_PASS}

  DATABASE_URL (Cloud Run):
  postgresql+asyncpg://${DB_USER}:${encodeURIComponent(DB_PASS)}@${ip}:5432/${DB_NAME}

${C.yellow}  ⚠  Configure esta DATABASE_URL no Secret Manager:${C.reset}
  node scripts/provision-gcp.js --step=secrets
`);
}

async function createInstance(token) {
  info('Criando instância Cloud SQL PostgreSQL 16 (pode levar ~8min)...');
  const body = {
    name: DB_INST,
    databaseVersion: 'POSTGRES_16',
    region: 'southamerica-east1',
    settings: {
      tier: 'db-f1-micro',
      availabilityType: 'ZONAL',
      ipConfiguration: {
        ipv4Enabled: true,
        requireSsl: false,
        authorizedNetworks: [{ value: '0.0.0.0/0', name: 'allow-all-temp' }]
      },
      backupConfiguration: { enabled: true, startTime: '03:00' },
      databaseFlags: [{ name: 'max_connections', value: '100' }],
    }
  };

  const r = await req('POST', `https://sqladmin.googleapis.com/v1/projects/${PROJECT}/instances`, body, token);
  if (r.status !== 200) {
    err(`Erro ao criar: ${JSON.stringify(r.body)}`);
    process.exit(1);
  }
  ok('Criação iniciada — aguardando...');
  await waitRunnable(token);
}

main().catch(e => { err(e.message); process.exit(1); });
