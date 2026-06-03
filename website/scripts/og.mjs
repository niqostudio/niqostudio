// OG 画像をビルド前に生成して public/og/<key>.png に出力する。
// satori(→SVG) + resvg(→PNG) を純 Node で実行（Cloudflare アダプタの prerender 環境では
// canvas/node:fs が使えないため、インビルド生成ではなくプリビルドで行う）。英字のみ＝Inter。
// ロゴ（core の profile.logo_svg）は resvg で PNG 化してから satori に渡す（SVG 直埋めより確実）。
// 正方形にクロップされても屋号・tagline が見えるよう、中央寄りに配置する。
import { mkdirSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { createClient } from '@supabase/supabase-js';

const TAGLINE = 'AI-Speed, Designed to Fit.';
const pages = {
  index: 'NIQO STUDIO',
  works: 'Works',
  cases: 'Cases',
  services: 'Services',
  about: 'About',
  contact: 'Contact',
};

const GOLD = '#d4af37';
const CREAM = '#faf9f7';
const BG = '#1a1917';

// プリビルドは素の node 実行のため、.env を best-effort で読み込む（無ければ環境変数のまま）。
try {
  process.loadEnvFile?.();
} catch {}

// ロゴを取得 → 暗色地用に色を解決 → resvg で PNG 化 → data URI（無ければ null＝ロゴ無しで描画）。
let logo = null;
{
  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const supabase = createClient(url, key);
    const { data } = await supabase.from('profile').select('logo_svg').eq('id', 'singleton').single();
    const svg = data?.logo_svg;
    if (svg) {
      // CSS 変数は satori/resvg が解決しないため、本来の2色（フォールバック値＝pair 緑 / diag 金）に解決する。
      const resolved = svg.replace(/var\(\s*--[^,)]+,\s*([^)]+)\)/g, '$1').replace(/currentColor/g, GOLD);
      const r = new Resvg(resolved, { fitTo: { mode: 'width', value: 600 } });
      const png = r.render();
      logo = {
        src: `data:image/png;base64,${Buffer.from(png.asPng()).toString('base64')}`,
        w: png.width,
        h: png.height,
      };
    }
  }
  if (!logo) console.log('og: Supabase 未設定 or logo 無し → ロゴ無しで生成');
}

const loadFont = async (url, weight) => ({
  name: 'Inter',
  weight,
  style: 'normal',
  data: await (await fetch(url)).arrayBuffer(),
});

const fonts = [
  await loadFont('https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter/Inter_700Bold.ttf', 700),
  await loadFont('https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter/Inter_400Regular.ttf', 400),
];

mkdirSync('public/og', { recursive: true });

// ロゴ→屋号→tagline を中央に縦スタック。全要素を中央に置くことで横長 1200x630 でも
// 正方クロップ（中央 630px）でも破綻なく収まる。ロゴは重ならないのでフル不透明の2色。
const LOGO_H = 184;
const logoW = logo ? Math.round((logo.w / logo.h) * LOGO_H) : 0;

for (const [key, title] of Object.entries(pages)) {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          gap: '28px',
          width: '100%',
          height: '100%',
          padding: '0 80px',
          backgroundColor: BG,
          borderBottom: `24px solid ${GOLD}`,
        },
        children: [
          ...(logo ? [{ type: 'img', props: { src: logo.src, width: logoW, height: LOGO_H } }] : []),
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 76, fontWeight: 700, color: CREAM, letterSpacing: '-0.02em', lineHeight: 1.05 },
                    children: title,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 34, fontWeight: 400, color: GOLD, marginTop: '16px' },
                    children: TAGLINE,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { width: 1200, height: 630, fonts }
  );
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  writeFileSync(`public/og/${key}.png`, png);
  console.log(`og: public/og/${key}.png`);
}
