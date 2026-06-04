// メールヘッダー用のブランドロックアップ PNG を生成して public/email-logo.png に出力する。
// メールは web フォント非対応・SVG 画像も Gmail 等が遮断するため、マーク＋wordmark を実フォント
// （JetBrains Mono）で焼いたラスタ画像にする＝どのクライアントでも同じ見た目になる。
// 背景は透過（暗色ヘッダーバーは email HTML 側が描く）。Supabase 未設定・ロゴ未登録なら wordmark のみ。
import { mkdirSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { createClient } from '@supabase/supabase-js';
import { JETBRAINS_MONO } from '../src/config/fonts.mjs';

const GOLD = '#dcb441';
const CREAM = '#faf9f7';
const OUT = 'public/email-logo.png';

// プリビルドは素の node 実行のため、.env を best-effort で読み込む（無ければ環境変数のまま）。
try {
  process.loadEnvFile?.();
} catch {}

// マーク（profile.logo_svg）を取得し暗色地用の2色へ解決 → resvg で PNG 化 → data URI。無ければ wordmark のみ。
let mark = null;
{
  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const supabase = createClient(url, key);
    const { data } = await supabase.from('profile').select('logo_svg').eq('id', 'singleton').single();
    const svg = data?.logo_svg;
    if (svg) {
      const resolved = svg
        .replace(/var\(\s*--[^,)]+,\s*([^)]+)\)/g, '$1')
        .replace(/currentColor/g, GOLD)
        .replace(/#d4af37/gi, GOLD);
      const png = new Resvg(resolved, { fitTo: { mode: 'height', value: 96 } }).render();
      mark = { src: `data:image/png;base64,${Buffer.from(png.asPng()).toString('base64')}`, w: png.width, h: png.height };
    }
  }
  if (!mark) console.log('email-logo: ロゴ未取得 → wordmark のみで生成');
}

const loadFont = async (url, weight, name) => ({ name, weight, style: 'normal', data: await (await fetch(url)).arrayBuffer() });
const fonts = [
  await loadFont('https://cdn.jsdelivr.net/npm/@expo-google-fonts/jetbrains-mono/JetBrainsMono_700Bold.ttf', 700, JETBRAINS_MONO.family),
];

// ロックアップ寸法（論理 px）。表示は等倍・resvg で 2x レンダリングして retina で鮮明に。
const H = 30;
const MARK_H = 26;
const FONT = 18;
const GAP = 10;
const markW = mark ? Math.round((mark.w / mark.h) * MARK_H) : 0;
// JetBrains Mono の送り幅（約0.6em）＋字間（0.14em）から wordmark 幅を概算（クリップ回避に余裕を持たせる）。
const TEXT = 'NIQO STUDIO';
const textW = Math.ceil(TEXT.length * (0.6 + 0.14) * FONT);
const W = markW + (mark ? GAP : 0) + textW + 4;

const el = {
  type: 'div',
  props: {
    style: { display: 'flex', alignItems: 'center', gap: `${GAP}px`, width: '100%', height: '100%' },
    children: [
      ...(mark ? [{ type: 'img', props: { src: mark.src, width: markW, height: MARK_H } }] : []),
      {
        type: 'div',
        props: {
          style: { fontFamily: JETBRAINS_MONO.family, fontWeight: 700, fontSize: FONT, color: CREAM, letterSpacing: '0.14em', whiteSpace: 'nowrap', lineHeight: 1 },
          children: TEXT,
        },
      },
    ],
  },
};

const svg = await satori(el, { width: W, height: H, fonts });
const png = new Resvg(svg, { fitTo: { mode: 'width', value: W * 2 }, background: 'rgba(0,0,0,0)' }).render().asPng();
mkdirSync('public', { recursive: true });
writeFileSync(OUT, png);
console.log(`email-logo: ${OUT} を生成 (${W}x${H} @2x)`);
