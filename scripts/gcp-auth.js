#!/usr/bin/env node
// =============================================================================
//  Atlas Finance — GCP Auth via Service Account JSON
//
//  Autentica no GCP usando a chave JSON de uma Service Account.
//  Assina um JWT com RS256 usando crypto nativo do Node.js —
//  sem nenhuma dependência externa.
//
//  Uso:
//    const { getAccessToken } = require('./gcp-auth');
//    const token = await getAccessToken('/workspaces/atlas/.gcp-sa-key.json');
//
//  Ou via variável de ambiente:
//    GOOGLE_APPLICATION_CREDENTIALS=/workspaces/atlas/.gcp-sa-key.json
// =============================================================================
'use strict';

const https  = require('https');
const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');

// Cache simples em memória para evitar requests repetidos
const _cache = { token: null, expiresAt: 0 };

/**
 * Retorna um access token OAuth2 válido para as GCP APIs.
 * Detecta automaticamente as credenciais disponíveis.
 * @param {string[]} scopes  Scopes OAuth2 (padrão: cloud-platform)
 * @returns {Promise<string>} access_token
 */
async function getAccessToken(
  scopes = ['https://www.googleapis.com/auth/cloud-platform']
) {
  // Verifica cache (margem de 60s antes de expirar)
  if (_cache.token && Date.now() < _cache.expiresAt - 60_000) {
    return _cache.token;
  }

  const creds = findCredentials();
  if (!creds) {
    throw new Error(
      'Nenhuma credencial GCP encontrada.\n' +
      '  Execute: firebase login --no-localhost\n' +
      '  Ou defina: export FIREBASE_TOKEN=<token>'
    );
  }

  let accessToken;
  if (creds.type === 'refresh') {
    accessToken = await refreshToAccessToken(creds.token);
  } else {
    // Service Account JSON
    const key = JSON.parse(fs.readFileSync(creds.path, 'utf8'));
    accessToken = await serviceAccountToken(key, scopes);
  }

  _cache.token     = accessToken;
  _cache.expiresAt = Date.now() + 3500_000; // ~58 min
  return accessToken;
}

// Client ID do Firebase CLI (público, não é segredo)
const FIREBASE_CLIENT_ID     = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function refreshToAccessToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const body = [
      `client_id=${encodeURIComponent(FIREBASE_CLIENT_ID)}`,
      `client_secret=${encodeURIComponent(FIREBASE_CLIENT_SECRET)}`,
      `refresh_token=${encodeURIComponent(refreshToken)}`,
      `grant_type=refresh_token`,
    ].join('&');

    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.access_token) resolve(json.access_token);
          else reject(new Error('Refresh falhou: ' + data));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function serviceAccountToken(key, scopes) {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: key.client_email, sub: key.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
    scope: scopes.join(' '),
  };
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(claim)).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const sign = crypto.createSign('SHA256');
  sign.update(unsigned);
  const jwt = `${unsigned}.${sign.sign(key.private_key, 'base64url')}`;

  return new Promise((resolve, reject) => {
    const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`;
    const req = https.request({
      hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const j = JSON.parse(data);
        if (j.access_token) resolve(j.access_token);
        else reject(new Error('SA token falhou: ' + data));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function findKeyFile() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS &&
      fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const defaults = [
    path.join(__dirname, '..', '.gcp-sa-key.json'),
    '/workspaces/atlas/.gcp-sa-key.json',
  ];
  for (const p of defaults) { if (fs.existsSync(p)) return p; }
  return null;
}

/**
 * Descobre o refresh token pela ordem de prioridade:
 * 1. Variável FIREBASE_TOKEN (CI/CD)
 * 2. Variável GOOGLE_REFRESH_TOKEN
 * 3. Credenciais do `firebase login` salvas localmente (~/.config/configstore/firebase-tools.json)
 * 4. Arquivo explícito de Service Account JSON (GOOGLE_APPLICATION_CREDENTIALS)
 */
function findCredentials() {
  // CI/CD — env vars
  if (process.env.FIREBASE_TOKEN)       return { type: 'refresh', token: process.env.FIREBASE_TOKEN };
  if (process.env.GOOGLE_REFRESH_TOKEN) return { type: 'refresh', token: process.env.GOOGLE_REFRESH_TOKEN };

  // firebase login local
  const configPath = path.join(
    process.env.HOME || process.env.USERPROFILE || '/root',
    '.config', 'configstore', 'firebase-tools.json'
  );
  if (fs.existsSync(configPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const rt = cfg?.tokens?.refresh_token;
      if (rt) return { type: 'refresh', token: rt };
    } catch {}
  }

  // Service Account JSON
  const saPath = findKeyFile();
  if (saPath) return { type: 'service_account', path: saPath };

  return null;
}

module.exports = { getAccessToken, findKeyFile };
