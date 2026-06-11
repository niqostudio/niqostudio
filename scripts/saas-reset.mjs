// saas:reset オーケストレータ（db-reset.mjs の saas 版）。supabase はクリーンスタック供給のみ、
// スキーマは dbmate（identity）、seed は pg で適用。対象は niqostudio-saas のローカルスタック（55xxx）。
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { Client } from 'pg';

const DB_URL =
  process.env.SAAS_DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:55322/postgres?sslmode=disable';
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', shell: true });
const dbmate = (dir, table) =>
  execFileSync(
    'pnpm',
    ['exec', 'dbmate', '--migrations-dir', dir, '--migrations-table', table, '--no-dump-schema', 'up'],
    { stdio: 'inherit', shell: true, env: { ...process.env, DATABASE_URL: DB_URL } },
  );

console.log('▶ supabase: クリーンスタックへリセット（saas）');
run('pnpm', ['--filter', '@niqostudio/infra', 'run', 'saas:reset']);

console.log('▶ dbmate up: saas-platform → public.saas_platform_migrations');
dbmate('./saas-platform/migrations', 'saas_platform_migrations');

console.log('▶ seed（スキーマ生成後）');
const client = new Client({ connectionString: DB_URL });
await client.connect();
try {
  for (const f of ['saas-platform/seeds/dev.sql']) {
    if (existsSync(f)) {
      await client.query(readFileSync(f, 'utf8'));
      console.log(`  seeded: ${f}`);
    }
  }
} finally {
  await client.end();
}

console.log('✓ saas:reset 完了');
