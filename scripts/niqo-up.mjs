// niqo:up — core+studio のローカル開発環境を 1 発で整える（dev のモデル＝core+studio セット）。
// install → DB(reset+seed) → 型生成 → studio/website の .env.local 生成 → dev operator → dev を detached 起動。
// 冪等・再実行可。前提: Docker / pnpm。db:reset は DB をクリーンに作り直す（ローカル専用）。
import { execSync, execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { DEV_EMAIL, DEV_PASSWORD } from './niqo-lib.mjs';

const run = (cmd) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true });
};

run('pnpm install'); // 依存を揃える
run('pnpm db:start'); // ローカル Supabase
run('pnpm db:reset'); // dbmate(core/studio) + seed
run('pnpm db:types'); // 生成型

console.log('\n== Supabase 接続情報を取得（supabase status） ==');
const env = execFileSync(
  'pnpm',
  ['--filter', '@niqostudio/infra', 'exec', 'supabase', 'status', '-o', 'env'],
  { encoding: 'utf8', shell: true },
);
const pick = (k) => env.match(new RegExp(`^${k}="?([^"\\n]+)"?`, 'm'))?.[1] ?? '';
const API_URL = pick('API_URL');
const ANON = pick('ANON_KEY');
const SERVICE = pick('SERVICE_ROLE_KEY');
if (!API_URL || !ANON || !SERVICE) throw new Error('supabase status から URL/keys を取得できませんでした。');

console.log('== studio/.env.local を自動生成 ==');
writeFileSync(
  'studio/.env.local',
  [
    '# niqo:up が自動生成（ローカル専用・コミットしない）。再実行で上書きされる。',
    `SUPABASE_URL=${API_URL}`,
    `SUPABASE_SECRET_KEY=${SERVICE}`,
    `NEXT_PUBLIC_SUPABASE_URL=${API_URL}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON}`,
    `STUDIO_ALLOWED_EMAILS=${DEV_EMAIL}`,
    '',
  ].join('\n'),
);

console.log('== website/.env.local を自動生成 ==');
writeFileSync(
  'website/.env.local',
  [
    '# niqo:up が自動生成（ローカル専用・コミットしない）。',
    `PUBLIC_SUPABASE_URL=${API_URL}`,
    `PUBLIC_SUPABASE_PUBLISHABLE_KEY=${ANON}`,
    '',
  ].join('\n'),
);

// dev operator は db:reset 内で復旧済み（auth.users もリセットで消えるため）。

console.log(`\n✓ セットアップ完了。dev を起動します（detached）。studio ログイン: ${DEV_EMAIL} / ${DEV_PASSWORD}`);
run('node scripts/niqo-dev.mjs');
