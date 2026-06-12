// 書き出し済みマスタ（products.auto.tfvars.json）を saas 側へ射影する。
// - identity.products：レジストリ（code/name/status）。upsert ＋ 書き出しに無い code は inactive 化
//   （grants から参照されるため行は消さない）。
// - billing.product_offers：価格射影（billing が実行時に core を読まないための現行版解決先）。
//   書き出しの版を upsert し、書き出しに無い (product,key,version) は inactive 化。
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const SRC = process.env.PRODUCTS_JSON ?? 'infra/stacks/stripe/products.auto.tfvars.json';
const DB_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:55322/postgres?sslmode=disable';

const { products } = JSON.parse(readFileSync(SRC, 'utf8'));
const client = new Client({ connectionString: DB_URL });
await client.connect();
try {
  await client.query('begin');

  // 1) products レジストリ
  for (const p of products) {
    await client.query(
      `insert into identity.products (code, name, status) values ($1, $2, $3)
       on conflict (code) do update set name = excluded.name, status = excluded.status`,
      [p.code, p.name, p.status],
    );
  }
  const { rowCount: productsInactive } = await client.query(
    `update identity.products set status = 'inactive'
     where not (code = any($1::text[])) and status <> 'inactive'`,
    [products.map((p) => p.code)],
  );

  // 2) billing.product_offers 射影（offer の現行版を upsert）
  // partial unique (product,key) WHERE is_active のため、先に全版を inactive 化してから
  // live のみ active で upsert する（同一 (product,key) に active が2件並ぶ瞬間を作らない）。
  const { rowCount: offersInactive } = await client.query(
    `update billing.product_offers set is_active = false where is_active`,
  );
  let offerCount = 0;
  for (const p of products) {
    const { rows } = await client.query('select id from identity.products where code = $1', [p.code]);
    const productId = rows[0].id;
    for (const o of p.offers ?? []) {
      await client.query(
        `insert into billing.product_offers
           (product_id, key, version, currency, unit_amount, billing_interval, access_period_days, is_active, synced_at)
         values ($1, $2, $3, $4, $5, $6, $7, true, now())
         on conflict (product_id, key, version) do update set
           currency = excluded.currency, unit_amount = excluded.unit_amount,
           billing_interval = excluded.billing_interval, access_period_days = excluded.access_period_days,
           is_active = true, synced_at = now()`,
        [productId, o.key, o.version, o.currency, o.unit_amount, o.interval ?? null, o.access_period_days ?? null],
      );
      offerCount++;
    }
  }

  await client.query('commit');
  console.log(
    `✓ 同期: products upsert ${products.length} / inactive ${productsInactive}・` +
      `offers active ${offerCount}（旧 active ${offersInactive} を一旦解除して再構成）`,
  );
} catch (e) {
  await client.query('rollback');
  throw e;
} finally {
  await client.end();
}
