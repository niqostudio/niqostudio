// dev サーバ（detached）だけ停止する。Supabase は継続（niqo:dev の対称）。
import { readState, stopDev } from './niqo-lib.mjs';

const s = readState();
if (s) {
  for (const k of ['website', 'studio']) {
    if (s[k]?.pid) console.log(`停止: ${k}（pid ${s[k].pid}${s[k].port ? `, :${s[k].port}` : ''}）`);
  }
  stopDev();
  console.log('✓ dev 停止（Supabase は継続）');
} else {
  console.log('dev 状態ファイルなし（未起動 or 既に停止）');
}
