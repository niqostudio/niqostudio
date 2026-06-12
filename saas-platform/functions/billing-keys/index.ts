// レシート検証用の公開鍵（JWKS・kid 付き）。製品はこれでレシートを検証する。
// auth の JWKS（/auth/v1/.well-known/jwks.json）とは別系統＝レシート鍵のローテで製品の再デプロイ不要。
import { json, preflight } from '../_shared/cors.ts';
import { publicJwk } from '../_shared/receipt.ts';

Deno.serve((req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);
  try {
    return json({ keys: [publicJwk()] }, 200, { 'cache-control': 'public, max-age=300' });
  } catch {
    return json({ error: 'not_configured' }, 503);
  }
});
