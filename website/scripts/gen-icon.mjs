// core の profile.logo_svg から GitHub org アイコン用の正方形 PNG を生成する。
// ブランドの暗色地・角丸なし・ロゴ本来の2色（緑/金）。出力はリポ直下 org-icon.png（手動アップロード用）。
// 使い方: pnpm --filter @niqostudio/website run gen:icon（要 Supabase 公開値）
import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { createClient } from '@supabase/supabase-js';

const BG = '#1c1917'; // ブランドの暗色地
const GOLD = '#d4af37';
const SIZE = 1024; // 出力解像度（正方）
const SCALE = 0.72; // ロゴの占有率（周囲に余白）
const OUT = new URL('../../org-icon.png', import.meta.url);

try {
  process.loadEnvFile?.();
} catch {}

const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('org-icon: Supabase 未設定（PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_PUBLISHABLE_KEY）');
  process.exit(1);
}

const supabase = createClient(url, key);
const { data } = await supabase.from('profile').select('logo_svg').eq('id', 'singleton').single();
const logo = data?.logo_svg;
if (!logo) {
  console.error('org-icon: profile.logo_svg が無い');
  process.exit(1);
}

// CSS 変数は本来の2色（フォールバック値＝緑/金）へ、currentColor は金へ解決。
const resolved = logo.replace(/var\(\s*--[^,)]+,\s*([^)]+)\)/g, '$1').replace(/currentColor/g, GOLD);

const vb = resolved.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 10 10';
const [, , W, H] = vb.split(/\s+/).map(Number);
const inner = resolved
  .replace(/^[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .trim();

// 正方キャンバス（長辺基準）にロゴを中央寄せ＋指定占有率で配置。角丸は付けない。
const S = Math.max(W, H);
const offX = (S - W) / 2;
const offY = (S - H) / 2;
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}">` +
  `<rect width="${S}" height="${S}" fill="${BG}"/>` +
  `<g transform="translate(${S / 2} ${S / 2}) scale(${SCALE}) translate(${-S / 2} ${-S / 2})">` +
  `<g transform="translate(${offX} ${offY})">${inner}</g></g></svg>`;

const png = new Resvg(svg, { fitTo: { mode: 'width', value: SIZE } }).render().asPng();
writeFileSync(OUT, png);
console.log(`org-icon: org-icon.png (${SIZE}x${SIZE}) を生成`);
