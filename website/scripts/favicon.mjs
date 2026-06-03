// core の正本 profile.logo_svg から favicon.svg を生成する。
// favicon は単体表示なので暗色角丸スクエアの地を与える。ロゴの色（緑/金）はそのまま使う。
// CSS 変数 var(--x, fallback) はフォールバック値へ、currentColor はクリームへ解決する。
// Supabase 未設定・ロゴ未登録ならスキップ（コミット済みの favicon.svg を維持）。
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const OUT = 'public/favicon.svg';

// プリビルドは素の node 実行のため、.env を best-effort で読み込む（無ければ環境変数のまま）。
try {
  process.loadEnvFile?.();
} catch {}

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.log('favicon: Supabase 未設定のためスキップ');
  process.exit(0);
}

const supabase = createClient(url, key);
const { data } = await supabase.from('profile').select('logo_svg').eq('id', 'singleton').single();
const logo = data?.logo_svg;

if (!logo) {
  console.log('favicon: profile.logo_svg が無いためスキップ');
  process.exit(0);
}

const vb = logo.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 512 512';
const [, , W, H] = vb.split(/\s+/).map(Number);

// <svg> の中身（path 等）を取り出す。favicon は単体表示なので CSS 変数は使えない:
// var(--x, fallback) はフォールバック値に解決し、currentColor はクリームにする。
const inner = logo
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .replace(/var\(\s*--[^,)]+,\s*([^)]+)\)/g, '$1')
  .replace(/currentColor/g, '#faf9f7')
  .trim();

const cx = W / 2;
const cy = H / 2;
const rx = Math.round(Math.min(W, H) * 0.2);

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">` +
  `<rect width="${W}" height="${H}" rx="${rx}" fill="#1c1917"/>` +
  `<g transform="translate(${cx} ${cy}) scale(.92) translate(${-cx} ${-cy})">${inner}</g></svg>\n`;

writeFileSync(OUT, svg);
console.log(`favicon: ${OUT} を生成 (${svg.length} bytes)`);
