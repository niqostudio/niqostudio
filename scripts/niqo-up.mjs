// niqo:up — core+studio のローカル開発環境を 1 発で整える（dev のモデル＝core+studio セット）。
// install → DB(reset+seed) → 型生成 → studio/website の .env.local 生成 → dev operator → dev 起動(website/studio)＋ブラウザ自動オープン。
// 冪等・再実行可。前提: Docker / pnpm。db:reset は DB をクリーンに作り直す（ローカル専用）。
import { execSync, execFileSync, execFile, spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { platform } from 'node:os';

// ローカル dev operator（認証ゲートを通すための既定アカウント）。STUDIO_ALLOWED_EMAILS と一致させる。
const DEV_EMAIL = 'dev@niqostudio.local';
const DEV_PASSWORD = 'devpassword';

const run = (cmd) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true });
};

// 空きポートを2つ（重複しない）取得して dev サーバへ割り当てる。
const twoFreePorts = async () => {
  const listen = (s) =>
    new Promise((res, rej) => {
      s.on('error', rej);
      s.listen(0, '127.0.0.1', () => res(s.address().port));
    });
  const a = createServer();
  const b = createServer();
  const ports = await Promise.all([listen(a), listen(b)]);
  await new Promise((r) => a.close(r));
  await new Promise((r) => b.close(r));
  return ports;
};

// dev サーバ起動後にブラウザで開く（ポーリングで起動完了を待ってから開く）。
const open = (url) => {
  if (platform() === 'win32') execFile('cmd', ['/c', 'start', '', url]);
  else if (platform() === 'darwin') execFile('open', [url]);
  else execFile('xdg-open', [url]);
};
const waitFor = async (url, tries = 60) => {
  for (let i = 0; i < tries; i++) {
    try {
      await fetch(url);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return false;
};

run('pnpm install'); // 依存（concurrently 等）を揃える
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

console.log('== dev operator を作成（gotrue admin・既存なら skip） ==');
const res = await fetch(`${API_URL}/auth/v1/admin/users`, {
  method: 'POST',
  headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' },
  body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD, email_confirm: true }),
});
console.log(res.ok ? `  + operator: ${DEV_EMAIL}` : `  operator: HTTP ${res.status}（既存なら OK）`);

const [WPORT, SPORT] = await twoFreePorts();
console.log('\n✓ セットアップ完了。dev サーバを起動します（空きポート自動割当・ブラウザ自動オープン・停止は Ctrl+C → `pnpm niqo:down`）。');
console.log(`  website: http://localhost:${WPORT}   studio: http://localhost:${SPORT}   DB: http://127.0.0.1:54323`);
console.log(`  studio ログイン: ${DEV_EMAIL} / ${DEV_PASSWORD}`);

// dev サーバは spawn（非同期）で起動し、その裏で本プロセスがブラウザを開く（execSync は event loop を塞ぐため）。
const devCmd =
  `pnpm exec concurrently -n website,studio -c blue,green ` +
  `"pnpm --filter @niqostudio/website exec astro dev --port ${WPORT}" ` +
  `"pnpm --filter @niqostudio/studio exec next dev --port ${SPORT}"`;
console.log(`\n$ ${devCmd}`);
const dev = spawn(devCmd, { stdio: 'inherit', shell: true });
dev.on('exit', (code) => process.exit(code ?? 0));

for (const url of [`http://localhost:${WPORT}`, `http://localhost:${SPORT}`, 'http://127.0.0.1:54323']) {
  if (await waitFor(url)) open(url);
}
