/**
 * scripts/add-github-secret.cjs
 * Encrypts and adds the GH_TOKEN secret to the GitHub repo
 * using GitHub's required libsodium sealed box encryption
 */

const https = require('https');

const GITHUB_TOKEN = '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';
const REPO_OWNER = 'rachidtaouama-del';
const REPO_NAME = 'plannex';
const SECRET_NAME = 'GH_TOKEN';
const SECRET_VALUE = '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';

// The public key we already fetched
const PUBLIC_KEY_B64 = 'TrjbHYC5/GRkj0nR2No2jX/EaiE8qNhHkoi+MgeAJR0=';
const KEY_ID = '3380204578043523366';

async function addSecret() {
  // Dynamically import libsodium-wrappers (ESM)
  const sodium = await import('libsodium-wrappers');
  await sodium.default.ready;

  // Decode the public key from Base64
  const keyBytes = Buffer.from(PUBLIC_KEY_B64, 'base64');
  const secretBytes = Buffer.from(SECRET_VALUE, 'utf8');

  // Encrypt using sealed box (what GitHub requires)
  const encryptedBytes = sodium.default.crypto_box_seal(secretBytes, keyBytes);
  const encryptedB64 = Buffer.from(encryptedBytes).toString('base64');

  // PUT the secret to GitHub API
  const body = JSON.stringify({
    encrypted_value: encryptedB64,
    key_id: KEY_ID,
  });

  const options = {
    hostname: 'api.github.com',
    path: `/repos/${REPO_OWNER}/${REPO_NAME}/actions/secrets/${SECRET_NAME}`,
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'plannex-setup',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 204) {
          console.log(`✅ Secret "${SECRET_NAME}" added to GitHub repo successfully!`);
          resolve();
        } else {
          console.error(`❌ Failed: HTTP ${res.statusCode}`, data);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

addSecret().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
