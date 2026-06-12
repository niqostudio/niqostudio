// レシート署名鍵（Ed25519）を生成し、deploy 用の env 値を出力する。
// RECEIPT_SIGNING_KEY（秘密・関数 secret）と RECEIPT_PUBLIC_KEY（公開・billing-keys が JWKS で配る）。
// 鍵はコミットしない。ローテは新鍵を生成して kid を変え、旧鍵を一定期間 JWKS に併載する。
import { webcrypto as crypto } from 'node:crypto';

const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
const priv = await crypto.subtle.exportKey('jwk', privateKey);
const pub = await crypto.subtle.exportKey('jwk', publicKey);
const kid = crypto.randomUUID();

const privJwk = { ...priv, kid, alg: 'EdDSA', use: 'sig' };
const pubJwk = { ...pub, kid, alg: 'EdDSA', use: 'sig' };

console.log('# レシート署名鍵（Ed25519・kid=%s）', kid);
console.log('# 関数 secret に設定（コミットしない）：');
console.log('RECEIPT_SIGNING_KEY=' + JSON.stringify(privJwk));
console.log('RECEIPT_PUBLIC_KEY=' + JSON.stringify(pubJwk));
