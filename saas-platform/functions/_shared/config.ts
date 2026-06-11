// 関数共通の設定。允許リストは config.<env>.json（saas.billing.allowed_origins）由来で、
// deploy 時に env BILLING_ALLOWED_ORIGINS（JSON）として注入する（auth の redirect 允許リストと同じ作法）。

export function issuer(): string {
  // レシートの iss。SUPABASE_URL（プロジェクト URL）を基底にする。
  const url = Deno.env.get('SUPABASE_URL');
  if (!url) throw new Error('SUPABASE_URL is not set');
  return `${url}/functions/v1`;
}

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

export function originAllowed(productCode: string, url: string): boolean {
  let origin: string;
  try {
    origin = new URL(url).origin;
  } catch {
    return false;
  }
  const list = allowMap()[productCode] ?? [];
  return list.includes(origin);
}
