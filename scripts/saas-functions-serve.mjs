// billing Edge Functions をローカルで serve する。関数の正本は saas-platform/functions/（モジュール所有）
// だが、supabase CLI は <workdir>/supabase/functions/ を見る。そこへ junction/symlink で繋いでから serve する
// （コピーでなくリンクなので編集が即反映＝ホットリロード）。env は saas-platform/functions/.env.local。
import { existsSync, lstatSync, symlinkSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { platform } from 'node:os';
import { resolve } from 'node:path';

const SRC = resolve('saas-platform/functions');
const LINK = resolve('infra/supabase-saas/supabase/functions');
const ENV = resolve('saas-platform/functions/.env.local');

if (!existsSync(ENV)) {
  console.error(`✗ ${ENV} がありません。saas-platform/functions/.env.local.example をコピーして値を入れてください。`);
  process.exit(1);
}

// 既存リンク/ディレクトリを掃除して張り直す。
if (existsSync(LINK) || (() => { try { return lstatSync(LINK); } catch { return false; } })()) {
  rmSync(LINK, { recursive: true, force: true });
}
symlinkSync(SRC, LINK, platform() === 'win32' ? 'junction' : 'dir');
console.log(`▶ ${LINK} → ${SRC}（リンク）`);

console.log('▶ supabase functions serve（CLI 同梱 Deno・Ctrl+C で停止）');
execFileSync(
  'pnpm',
  ['--filter', '@niqostudio/infra', 'exec', 'supabase', '--workdir', 'supabase-saas', 'functions', 'serve', '--env-file', ENV],
  { stdio: 'inherit', shell: true },
);
