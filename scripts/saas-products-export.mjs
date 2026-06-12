// 製品・商品マスタ（core.products / core.product_offers・正本は core DB）を書き出す。
// 出力は stripe stack の入力 兼 identity.products 射影の入力（products.auto.tfvars.json・gitignore）。
// 対象は is_saas の製品のみ。offer は有効（is_active）なものだけ。
import { writeFileSync } from 'node:fs';
import { Client } from 'pg';

const DB_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable';
const OUT = 'infra/stacks/stripe/products.auto.tfvars.json';

const client = new Client({ connectionString: DB_URL });
await client.connect();
try {
  const { rows } = await client.query(`
    select p.slug as code,
           p.name,
           case when p.status = 'sunset' then 'inactive' else 'active' end as status,
           coalesce(
             json_agg(json_build_object(
               'key', o.key,
               'currency', o.currency,
               'unit_amount', o.unit_amount,
               'interval', o.billing_interval,
               'access_period_days', o.access_period_days
             ) order by o.key) filter (where o.id is not null),
             '[]'
           ) as offers
    from core.products p
    left join core.product_offers o on o.product_id = p.id and o.is_active
    where p.is_saas
    group by p.id
    order by p.slug
  `);
  writeFileSync(OUT, JSON.stringify({ products: rows }, null, 2) + '\n');
  console.log(`✓ ${OUT}（${rows.length} 製品）`);
} finally {
  await client.end();
}
