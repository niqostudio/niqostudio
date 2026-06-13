// 支払い管理・解約のセルフサービス（PSP の Billing Portal セッション発行）。
// checkout と違い匿名は通さない：portal は支払い方法・解約に触れるため user JWT 必須（無し/無効は 401）。
// POST { product, return_url } -> { url }
import { json, preflight } from '../_shared/cors.ts';
import { db } from '../_shared/db.ts';
import { originAllowed } from '../_shared/config.ts';
import { resolveIdentity } from '../_shared/auth.ts';
import { stripeProvider } from '../_shared/stripe.ts';

const provider = stripeProvider;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const product = String(body.product ?? '');
  const returnUrl = String(body.return_url ?? '');
  if (!product || !returnUrl) return json({ error: 'missing_fields' }, 400);

  const identity = await resolveIdentity(req);
  if (identity.kind === 'anonymous') return json({ error: 'login_required' }, 401);
  if (identity.kind === 'invalid') return json({ error: 'invalid_token' }, 401);
  if (!identity.orgId) return json({ error: 'no_customer' }, 404);

  // 戻り先も checkout と同じ允許リストで縛る（オープンリダイレクト防止）。
  if (!originAllowed(product, returnUrl)) return json({ error: 'origin_not_allowed' }, 403);

  // org の PSP customer（webhook が購入時に保存した link）。無ければ portal で見せる対象が無い。
  const sql = db();
  const links = await sql`
    select external_customer_id
    from billing.customer_links
    where provider = ${provider.code} and organization_id = ${identity.orgId} and is_active
    limit 1`;
  const link = links[0];
  if (!link) return json({ error: 'no_customer' }, 404);

  try {
    const { url } = await provider.createPortalSession(link.external_customer_id, returnUrl);
    return json({ url });
  } catch (e) {
    console.error('portal session failed', e);
    return json({ error: 'portal_failed' }, 502);
  }
});
