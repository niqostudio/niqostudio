// レシート（Ed25519 JWT）の契約テスト。
// 製品は標準 JOSE（jose）＋ JWKS でレシートを検証する。ここでは scripts/gen-receipt-key.mjs と同じ
// 鍵生成 → jose で署名 → **製品の検証経路そのもの**（jose の JWKS 検証）で検証して、
// 鍵形式・JWKS・JOSE 検証・exp 拒否・改竄/別鍵拒否が噛み合うことを保証する。
// 注：本番の署名は Deno の djwt（RFC 7515 EdDSA・標準互換）。djwt の出力自体の検証は E2E（Deno）で担う。
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto as crypto } from 'node:crypto';
import { SignJWT, jwtVerify, createLocalJWKSet, exportJWK, importJWK } from 'jose';

const ISS = 'https://saas.example/functions/v1';
let privJwk, jwks, kid;

before(async () => {
  // gen-receipt-key.mjs と同じ生成（Ed25519・kid 付き JWK）。
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  kid = crypto.randomUUID();
  privJwk = { ...(await exportJWK(kp.privateKey)), kid, alg: 'EdDSA', use: 'sig' };
  const pubJwk = { ...(await exportJWK(kp.publicKey)), kid, alg: 'EdDSA', use: 'sig' };
  // 製品が billing-keys から取得する JWKS。
  jwks = createLocalJWKSet({ keys: [pubJwk] });
});

// billing-return の issueReceipt 相当（claims・kid・EdDSA）を jose で組む。
async function issue(over = {}, ttl = 600) {
  const key = await importJWK(privJwk, 'EdDSA');
  return await new SignJWT({ product: 'demo-app', plan: 'launch_pass', scope: 'proj-a', ...over })
    .setProtectedHeader({ alg: 'EdDSA', kid })
    .setIssuer(ISS)
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime(`${ttl}s`)
    .sign(key);
}

// 製品側の検証（契約のチェックリスト：署名=JWKS／iss／product／scope／exp）。
async function verifyAsProduct(token, expect) {
  const { payload } = await jwtVerify(token, jwks, { issuer: ISS }); // 署名・iss・exp は jose が検証
  if (payload.product !== expect.product) throw new Error('product mismatch');
  if ((payload.scope ?? null) !== (expect.scope ?? null)) throw new Error('scope mismatch');
  return payload;
}

test('正規レシートは製品の JWKS 検証を通り claims を取り出せる', async () => {
  const token = await issue();
  const p = await verifyAsProduct(token, { product: 'demo-app', scope: 'proj-a' });
  assert.equal(p.plan, 'launch_pass');
  assert.equal(p.iss, ISS);
});

test('改竄（payload 差し替え）は署名検証で落ちる', async () => {
  const token = await issue();
  const [h, , s] = token.split('.');
  const forged = `${h}.${Buffer.from(JSON.stringify({ product: 'demo-app', scope: 'proj-EVIL' })).toString('base64url')}.${s}`;
  await assert.rejects(() => verifyAsProduct(forged, { product: 'demo-app', scope: 'proj-EVIL' }));
});

test('別の鍵で署名されたレシートは JWKS 検証で落ちる（偽造防止）', async () => {
  const other = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const otherJwk = { ...(await exportJWK(other.privateKey)), kid, alg: 'EdDSA' };
  const key = await importJWK(otherJwk, 'EdDSA');
  const token = await new SignJWT({ product: 'demo-app', scope: 'proj-a' })
    .setProtectedHeader({ alg: 'EdDSA', kid }).setIssuer(ISS).setIssuedAt().setExpirationTime('600s').sign(key);
  await assert.rejects(() => verifyAsProduct(token, { product: 'demo-app', scope: 'proj-a' }));
});

test('期限切れは jose の exp 検証で落ちる', async () => {
  const token = await issue({}, -120); // 既に exp 切れ
  await assert.rejects(() => verifyAsProduct(token, { product: 'demo-app', scope: 'proj-a' }), /exp/i);
});

test('iss 不一致は落ちる（製品跨ぎ・別発行者の偽装防止）', async () => {
  const key = await importJWK(privJwk, 'EdDSA');
  const token = await new SignJWT({ product: 'demo-app', scope: 'proj-a' })
    .setProtectedHeader({ alg: 'EdDSA', kid }).setIssuer('https://evil.example').setIssuedAt().setExpirationTime('600s').sign(key);
  await assert.rejects(() => verifyAsProduct(token, { product: 'demo-app', scope: 'proj-a' }));
});

test('product / scope の突き合わせ不一致は製品側で弾く', async () => {
  const token = await issue({ product: 'demo-app', scope: 'proj-a' });
  await assert.rejects(() => verifyAsProduct(token, { product: 'other-app', scope: 'proj-a' }), /product mismatch/);
  await assert.rejects(() => verifyAsProduct(token, { product: 'demo-app', scope: 'proj-b' }), /scope mismatch/);
});
