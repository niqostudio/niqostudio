// レシート（Ed25519 JWT）の形式・署名/検証の契約テスト。
// 本番は Deno（djwt）で署名し製品が JWKS で検証するが、ワイヤ形式は標準 JWS(EdDSA) なので
// Node の webcrypto で同形式を再現し、製品側検証チェックリスト（署名・iss・product・scope・exp）を固める。
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto as crypto } from 'node:crypto';

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlJson = (obj) => b64url(new TextEncoder().encode(JSON.stringify(obj)));

let priv, pub, kid;
before(async () => {
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  priv = kp.privateKey;
  pub = kp.publicKey;
  kid = crypto.randomUUID();
});

async function sign(claims, key = priv) {
  const header = b64urlJson({ alg: 'EdDSA', typ: 'JWT', kid });
  const payload = b64urlJson(claims);
  const data = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await crypto.subtle.sign({ name: 'Ed25519' }, key, data);
  return `${header}.${payload}.${b64url(sig)}`;
}

async function verify(token, key = pub) {
  const [h, p, s] = token.split('.');
  const data = new TextEncoder().encode(`${h}.${p}`);
  const sig = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const ok = await crypto.subtle.verify({ name: 'Ed25519' }, key, sig, data);
  if (!ok) throw new Error('bad signature');
  return JSON.parse(Buffer.from(p, 'base64url').toString());
}

function claims(over = {}) {
  const now = Math.floor(Date.now() / 1000);
  return { iss: 'https://saas.example/functions/v1', product: 'demo-app', plan: 'launch_pass', scope: 'proj-a', jti: 'x', iat: now, exp: now + 600, ...over };
}

test('正規レシートは検証を通り claims を取り出せる', async () => {
  const token = await sign(claims());
  const c = await verify(token);
  assert.equal(c.product, 'demo-app');
  assert.equal(c.scope, 'proj-a');
  assert.equal(c.plan, 'launch_pass');
});

test('改竄（payload 差し替え）は署名検証で落ちる', async () => {
  const token = await sign(claims());
  const [h, , s] = token.split('.');
  const forged = `${h}.${b64urlJson(claims({ scope: 'proj-EVIL' }))}.${s}`;
  await assert.rejects(() => verify(forged), /bad signature/);
});

test('別の鍵で署名されたレシートは落ちる（製品跨ぎ防止）', async () => {
  const other = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const token = await sign(claims(), other.privateKey);
  await assert.rejects(() => verify(token), /bad signature/);
});

test('検証チェックリスト：product / scope / exp / iss を製品が突き合わせる', async () => {
  const token = await sign(claims());
  const c = await verify(token);
  const now = Math.floor(Date.now() / 1000);
  // 製品側の必須チェック（契約）。±60s skew を許容。
  const valid =
    c.iss === 'https://saas.example/functions/v1' &&
    c.product === 'demo-app' &&
    c.scope === 'proj-a' &&
    c.exp > now - 60;
  assert.ok(valid, '全項目一致で有効');
  // exp 切れは無効
  const expired = await verify(await sign(claims({ exp: now - 120 })));
  assert.ok(!(expired.exp > now - 60), '期限切れは弾く');
});
