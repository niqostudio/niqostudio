// 署名レシート（一回課金の即解錠用・往復ゼロ）。非対称（Ed25519）で署名し、製品は公開鍵で検証する。
// HMAC は製品に秘密を渡すことになるため不可（ADR 0008）。auth の JWKS とは別系統＝billing-keys が公開。
import { create, getNumericDate, verify } from 'djwt';

const ALG = 'EdDSA';

export interface ReceiptClaims {
  iss: string; // billing の発行者 URL
  product: string; // 製品コード
  scope: string | null; // 対象（一回課金）
  plan: string; // offer キー
  jti: string;
  iat: number;
  exp: number;
}

// 秘密鍵（JWK）を env から読み、署名用 CryptoKey にする。
async function privateKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('RECEIPT_SIGNING_KEY');
  if (!raw) throw new Error('RECEIPT_SIGNING_KEY is not set');
  const jwk = JSON.parse(raw) as JsonWebKey;
  return await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['sign']);
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
  return await create(
    { alg: ALG, typ: 'JWT', kid },
    {
      iss,
      product,
      plan,
      scope,
      jti: crypto.randomUUID(),
      iat: getNumericDate(0),
      exp: getNumericDate(ttlSeconds),
    },
    key,
  );
}

// 製品側の検証相当（テスト・自己検査用）。本番の検証は製品が JWKS でやる。
export async function verifyReceipt(token: string): Promise<ReceiptClaims> {
  const jwk = publicJwk();
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'Ed25519' }, false, ['verify']);
  return (await verify(token, key)) as unknown as ReceiptClaims;
}
