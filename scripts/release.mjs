// release workflow を手元から dispatch する導線（認証は gh CLI のログインを使う＝PAT の配備不要）。
// 既定は dry-run、--apply で本番反映。Environment の承認は表示される run の URL から行う。
import { execFileSync } from 'node:child_process';

const apply = process.argv.includes('--apply');
execFileSync('gh', ['workflow', 'run', 'release.yml', '-f', `apply=${apply}`], { stdio: 'inherit', shell: true });

// dispatch 直後は run がまだ一覧に出ないことがあるため少し待ってから URL を引く。
await new Promise((resolve) => setTimeout(resolve, 5000));
const url = execFileSync(
  'gh',
  ['run', 'list', '--workflow=release.yml', '--limit', '1', '--json', 'url', '--jq', '.[0].url'],
  { encoding: 'utf8', shell: true },
).trim();
console.log(`▶ release（${apply ? 'apply' : 'dry-run'}）: ${url}`);
console.log('  承認（Review deployments）は上の URL から。');
