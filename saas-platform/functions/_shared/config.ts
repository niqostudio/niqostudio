// 関数共通の設定。允許リストは config.<env>.json（saas.billing.allowed_origins）由来で、
// deploy 時に env BILLING_ALLOWED_ORIGINS（JSON）として注入する（auth の redirect 允許リストと同じ作法）。

export function issuer(): string {
  // ブラウザ/製品が到達する**公開**関数 URL を基底にする（レシートの iss・billing-return の
  // success_url・JWKS の所在）。本番は SUPABASE_URL が公開 URL なのでそれで足りるが、ローカルは
  // SUPABASE_URL が内部ホスト（http://kong:8000）になるため BILLING_PUBLIC_URL で明示上書きする。
  const url = Deno.env.get('BILLING_PUBLIC_URL') ?? Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error('BILLING_PUBLIC_URL / SUPABASE_URL のいずれも未設定');
  return `${url}/functions/v1`;
}

import { originAllowed as originAllowedPure } from './checkout-rules.mjs';

// 製品ごとの allowed origins。{ "demo-app": ["https://demo-app.example"] }
function allowMap(): Record<string, string[]> {
  const raw = Deno.env.get('BILLING_ALLOWED_ORIGINS');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// env から allowMap を読み、純粋ロジック（checkout-rules）で判定する。
export function originAllowed(productCode: string, url: string): boolean {
  return originAllowedPure(allowMap(), productCode, url);
}
