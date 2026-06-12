// 署名レシート（一回課金の即解錠用・往復ゼロ）。非対称（Ed25519/EdDSA）で署名し、製品は公開鍵で検証する。
// HMAC は製品に秘密を渡すことになるため不可（ADR 0008）。auth の JWKS とは別系統＝billing-keys が公開。
// 署名は jose（製品側の検証も jose 想定＝同一ライブラリで互換保証。djwt は EdDSA 非対応のため使わない）。
import { SignJWT, jwtVerify, importJWK } from 'jose';

const ALG = 'EdDSA';

export interface ReceiptClaims {
  iss: string;
  product: string;
  scope: string | null;
  plan: string;
  jti: string;
  iat: number;
  exp: number;
}

async function privateKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('RECEIPT_SIGNING_KEY');
  if (!raw) throw new Error('RECEIPT_SIGNING_KEY is not set');
  return (await importJWK(JSON.parse(raw), ALG)) as CryptoKey;
}

// 公開鍵（JWK・kid 付き）。billing-keys が JWKS として配る。
export function publicJwk(): JsonWebKey & { kid: string } {
  const raw = Deno.env.get('RECEIPT_PUBLIC_KEY');
  if (!raw) throw new Error('RECEIPT_PUBLIC_KEY is not set');
  return JSON.parse(raw);
}

export async function issueReceipt(
  iss: string,
  product: string,
  plan: string,
  scope: string | null,
  ttlSeconds = 600,
): Promise<string> {
  const key = await privateKey();
  const kid = publicJwk().kid;
  return await new SignJWT({ product, plan, scope })
    .setProtectedHeader({ alg: ALG, typ: 'JWT', kid })
    .setIssuer(iss)
    .setIssuedAt()
    .setJti(crypto.randomUUID())
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(key);
}

// 自己検査・テスト用（本番の検証は製品が JWKS で行う）。
export async function verifyReceipt(token: string, iss: string): Promise<ReceiptClaims> {
  const key = (await importJWK(publicJwk(), ALG)) as CryptoKey;
  const { payload } = await jwtVerify(token, key, { issuer: iss });
  return payload as unknown as ReceiptClaims;
}
