// dev サーバ（detached）と Supabase をまとめて停止する。
import { execSync } from 'node:child_process';
import { readState, stopDev } from './niqo-lib.mjs';

const s = readState();
if (s) {
  for (const k of ['website', 'studio']) {
    if (s[k]?.pid) console.log(`停止: ${k}（pid ${s[k].pid}${s[k].port ? `, :${s[k].port}` : ''}）`);
  }
  stopDev();
} else {
  console.log('dev 状態ファイルなし（未起動 or 既に停止）');
}

console.log('停止: Supabase');
execSync('pnpm db:stop', { stdio: 'inherit', shell: true });
console.log('✓ niqo:down 完了（dev＋Supabase）');
