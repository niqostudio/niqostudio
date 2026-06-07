// studio store の適用ランナー。migrations/ または seeds/ の *.sql を名前順に流す（冪等前提）。
// DDL は PostgREST 越しに流せないため直 PG 接続（service_role 鍵ではなく接続文字列）を使う。
// 接続は STUDIO_STORE_DB_URL（無ければ DATABASE_URL）。未指定はローカル supabase 既定。
//
//   node store/run.mjs migrate   # studio スキーマ（records / versions / command_runs / extractions）
//   node store/run.mjs seed      # 妥当な overlay と下書きのダミー
//
// 最後に PostgREST へ schema 再読込を通知する（新テーブルを supabase-js から見せるため）。

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const cmd = process.argv[2] ?? 'migrate';
if (cmd !== 'migrate' && cmd !== 'seed') {
  console.error(`unknown command: ${cmd}（migrate | seed）`);
  process.exit(1);
}

const connectionString =
  process.env.STUDIO_STORE_DB_URL ??
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

const dir = join(here, cmd === 'seed' ? 'seeds' : 'migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const client = new pg.Client({ connectionString });
await client.connect();
try {
  for (const f of files) {
    process.stdout.write(`  ${cmd}: ${f} … `);
    await client.query(readFileSync(join(dir, f), 'utf8'));
    console.log('ok');
  }
  await client.query("notify pgrst, 'reload schema'");
} finally {
  await client.end();
}
console.log(`done: ${files.length} ${cmd} file(s)`);
