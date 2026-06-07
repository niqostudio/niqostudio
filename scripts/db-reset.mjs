// db:reset オーケストレータ。supabase はクリーンスタック供給のみ、スキーマは dbmate（per-namespace）、
// seed は pg で適用（クロスプラットフォーム）。core から supabase 文脈を剥がした構成の中核。
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { Client } from 'pg';

const DB_URL =
  process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable';
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', shell: true });
const dbmate = (dir, table) =>
  execFileSync(
    'pnpm',
    ['exec', 'dbmate', '--migrations-dir', dir, '--migrations-table', table, '--no-dump-schema', 'up'],
    { stdio: 'inherit', shell: true, env: { ...process.env, DATABASE_URL: DB_URL } },
  );

console.log('▶ supabase: クリーンスタックへリセット');
run('pnpm', ['--filter', '@niqostudio/infra', 'run', 'db:reset']);

console.log('▶ dbmate up: core → public.core_migrations');
dbmate('./core/migrations', 'core_migrations');
console.log('▶ dbmate up: studio → public.studio_migrations');
dbmate('./studio/migrations', 'studio_migrations');

console.log('▶ seed（スキーマ生成後）');
const client = new Client({ connectionString: DB_URL });
await client.connect();
try {
  for (const f of ['core/seeds/dev.sql', 'studio/seeds/dev.sql']) {
    if (existsSync(f)) {
      await client.query(readFileSync(f, 'utf8'));
      console.log(`  seeded: ${f}`);
    }
  }
} finally {
  await client.end();
}
console.log('✓ db:reset 完了');
