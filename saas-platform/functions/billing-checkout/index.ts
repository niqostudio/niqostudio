// checkout 作成。匿名（認証不要）だが、registry 突合・origin 允許リスト・整合検証・レート制限で守る。
// POST { product, offer, scope, success_url, cancel_url, locale } -> { url }
import { json, preflight } from '../_shared/cors.ts';
import { db } from '../_shared/db.ts';
import { issuer, originAllowed } from '../_shared/config.ts';
import { checkScopeOffer } from '../_shared/checkout-rules.mjs';
import { stripeProvider } from '../_shared/stripe.ts';

const provider = stripeProvider;

// 簡易レート制限（プロセス内・IP+product 単位）。本番は Cloudflare/エッジ側でも縛る前提の最終防壁。
const hits = new Map<string, { n: number; resetAt: number }>();
function rateLimited(keyId: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = hits.get(keyId);
  if (!cur || now > cur.resetAt) {
    hits.set(keyId, { n: 1, resetAt: now + windowMs });
    return false;
  }
  cur.n++;
  return cur.n > limit;
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }
  const product = String(body.product ?? '');
  const offer = String(body.offer ?? '');
  const scope = body.scope == null || body.scope === '' ? null : String(body.scope);
  const successUrl = String(body.success_url ?? '');
  const cancelUrl = String(body.cancel_url ?? '');
  const locale = body.locale ? String(body.locale) : undefined;

  if (!product || !offer || !successUrl || !cancelUrl) return json({ error: 'missing_fields' }, 400);
  if (rateLimited(`${ip}:${product}`)) return json({ error: 'rate_limited' }, 429);
  // ③ origin 允許リスト（success/cancel とも）
  if (!originAllowed(product, successUrl) || !originAllowed(product, cancelUrl)) {
    return json({ error: 'origin_not_allowed' }, 403);
  }

  const sql = db();
  // ① registry 突合＋現行版 offer 解決
  const offers = await sql`
    select o.key, o.version, o.billing_interval
    from billing.product_offers o
    join identity.products p on p.id = o.product_id
    where p.code = ${product} and p.status = 'active' and o.key = ${offer} and o.is_active
    limit 1`;
  const row = offers[0];
  if (!row) return json({ error: 'offer_not_found' }, 400);

  const isSubscription = row.billing_interval != null;
  // ④ offer 種別と scope の整合（サブスクに scope 付き / 対象束縛に scope 欠落は拒否）
  const integrityError = checkScopeOffer(isSubscription, scope);
  if (integrityError) return json({ error: integrityError }, 400);

  // billing-return を経由してレシートを発行し、最終 dest（製品の success_url）へ送る。
  const returnUrl = new URL(`${issuer()}/billing-return`);
  returnUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}'); // Stripe が置換
  returnUrl.searchParams.set('product', product);
  returnUrl.searchParams.set('offer', offer);
  if (scope) returnUrl.searchParams.set('scope', scope);
  returnUrl.searchParams.set('dest', successUrl);

  try {
    const { url } = await provider.createCheckout({
      productCode: product,
      offerKey: offer,
      scope,
      priceLookupKey: `${product}_${offer}_v${row.version}`,
      isSubscription,
      // Stripe は success_url の {CHECKOUT_SESSION_ID} を展開する。encode せず生で渡す必要があるため手組み。
      successUrl: returnUrl.toString().replace('%7BCHECKOUT_SESSION_ID%7D', '{CHECKOUT_SESSION_ID}'),
      cancelUrl,
      locale,
    });
    return json({ url });
  } catch (e) {
    console.error('checkout failed', e);
    return json({ error: 'checkout_failed' }, 502);
  }
});
