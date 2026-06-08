// dev サーバ（website/studio）を detached で起動し、ターミナルを解放する。
// ポートは事前割当せず astro/next 自身の衝突回避に任せ、起動ログから実ポートを拾う。
// pid/port を state に残し（niqo:down で停止）、出力はログファイルへ。
import { spawn } from 'node:child_process';
import { mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { platform } from 'node:os';
import { STATE_DIR, open, writeState, stopDev } from './niqo-lib.mjs';

// 既存 dev があれば止めてから（restart 相当）。
stopDev();
mkdirSync(STATE_DIR, { recursive: true });

function start(name, cmd) {
  const log = `${STATE_DIR}/${name}.log`;
  writeFileSync(log, ''); // 旧ログをクリア
  const out = openSync(log, 'a');
  // Windows は detached だと（windowsHide でも）新しいコンソール窓が出るため付けない。
  // windowsHide＋stdio→ログ＋unref で「窓無しのバックグラウンド」になり、ターミナルは解放される
  // （その端末を閉じると dev も終わる／niqo:down では taskkill /T で確実に止める）。
  // unix は detached でプロセスグループを分け、niqo:down の group kill を効かせる。
  const opts = { stdio: ['ignore', out, out], shell: true, windowsHide: true };
  if (platform() !== 'win32') opts.detached = true;
  const child = spawn(cmd, opts);
  child.unref();
  return { name, pid: child.pid, log };
}

// 起動ログから実際に bind した port を拾う（astro/next が "http://localhost:PORT" を出す）。
async function waitPort(log, tries = 120) {
  for (let i = 0; i < tries; i++) {
    let txt = '';
    try {
      txt = readFileSync(log, 'utf8');
    } catch {
      // まだ生成前。
    }
    const m = txt.match(/https?:\/\/localhost:(\d+)/i);
    if (m) return Number(m[1]);
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

console.log('dev を detached 起動中…（ポートはログから取得）');
const website = start('website', 'pnpm dev:website');
const studio = start('studio', 'pnpm dev:studio');

const [wport, sport] = await Promise.all([waitPort(website.log), waitPort(studio.log)]);

if (wport) open(`http://localhost:${wport}`);
if (sport) open(`http://localhost:${sport}`);
open('http://127.0.0.1:54323');

writeState({
  website: { pid: website.pid, port: wport, log: website.log },
  studio: { pid: studio.pid, port: sport, log: studio.log },
});

console.log('\n✓ dev 起動（detached・ターミナル解放）');
console.log(`  website: ${wport ? `http://localhost:${wport}` : '起動待ち（ログ参照）'}`);
console.log(`  studio:  ${sport ? `http://localhost:${sport}` : '起動待ち（ログ参照）'}`);
console.log('  DB:      http://127.0.0.1:54323');
console.log('  停止:    pnpm niqo:down（dev＋Supabase）');
console.log(`  ログ:    ${website.log} / ${studio.log}`);
