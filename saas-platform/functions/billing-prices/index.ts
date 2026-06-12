// 表示価格：現行版 offer の一覧。製品の /pricing が読む（Stripe への price 取得が製品から消える）。
// GET /billing-prices?product=<code>
import { json, preflight } from '../_shared/cors.ts';
import { db } from '../_shared/db.ts';

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  const product = new URL(req.url).searchParams.get('product');
  if (!product) return json({ error: 'product_required' }, 400);

  const sql = db();
  const rows = await sql`
    select o.key, o.currency, o.unit_amount, o.billing_interval as interval, o.access_period_days
    from billing.product_offers o
    join identity.products p on p.id = o.product_id
    where p.code = ${product} and p.status = 'active' and o.is_active
    order by o.key`;
  return json(
    rows.map((r) => ({
      key: r.key,
      currency: r.currency,
      unit_amount: r.unit_amount,
      interval: r.interval,
      access_period_days: r.access_period_days,
    })),
    200,
    { 'cache-control': 'public, max-age=60' },
  );
});
