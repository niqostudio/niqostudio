// 書き出し済みマスタ（products.auto.tfvars.json）を identity.products（saas 側レジストリ）へ射影する。
// upsert ＋ 書き出しに無い code は inactive 化（grants から参照されるため行は消さない）。
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
  for (const p of products) {
    await client.query(
      `insert into identity.products (code, name, status) values ($1, $2, $3)
       on conflict (code) do update set name = excluded.name, status = excluded.status`,
      [p.code, p.name, p.status],
    );
  }
  const { rowCount } = await client.query(
    `update identity.products set status = 'inactive'
     where not (code = any($1::text[])) and status <> 'inactive'`,
    [products.map((p) => p.code)],
  );
  await client.query('commit');
  console.log(`✓ identity.products 同期（upsert ${products.length} / inactive 化 ${rowCount}）`);
} catch (e) {
  await client.query('rollback');
  throw e;
} finally {
  await client.end();
}
