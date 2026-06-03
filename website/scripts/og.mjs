// OG 画像をビルド前に生成して public/og/<key>.png に出力する。
// satori(→SVG) + resvg(→PNG) を純 Node で実行（Cloudflare アダプタの prerender 環境では
// canvas/node:fs が使えないため、インビルド生成ではなくプリビルドで行う）。
// レイアウトは中央縦スタック（ロゴ→英字→日本語）。top nav と同じ英字大＋日本語小の組。
// 横長 1200x630 でも正方クロップ（中央 630px）でも破綻しないよう全要素を中央に置く。
import { mkdirSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { createClient } from '@supabase/supabase-js';

const GOLD = '#d4af37';
const CREAM = '#faf9f7';
const BG = '#1a1917';
const TAGLINE_FALLBACK = 'AI-Speed, Designed to Fit.';

// プリビルドは素の node 実行のため、.env を best-effort で読み込む（無ければ環境変数のまま）。
try {
  process.loadEnvFile?.();
} catch {}

// profile（ロゴ・tagline）を取得。ロゴは暗色地用に本来の2色へ解決し resvg で PNG 化 → data URI。
let logo = null;
let tagline = TAGLINE_FALLBACK;
{
  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const supabase = createClient(url, key);
    const { data } = await supabase.from('profile').select('logo_svg, tagline').eq('id', 'singleton').single();
    if (data?.tagline) tagline = data.tagline;
    const svg = data?.logo_svg;
    if (svg) {
      // CSS 変数は satori/resvg が解決しないため、本来の2色（フォールバック値＝pair 緑 / diag 金）へ。
      const resolved = svg.replace(/var\(\s*--[^,)]+,\s*([^)]+)\)/g, '$1').replace(/currentColor/g, GOLD);
      const png = new Resvg(resolved, { fitTo: { mode: 'width', value: 600 } }).render();
      logo = { src: `data:image/png;base64,${Buffer.from(png.asPng()).toString('base64')}`, w: png.width, h: png.height };
    }
  }
  if (!logo) console.log('og: Supabase 未設定 or logo 無し → ロゴ無しで生成');
}

// index はブランド（屋号＋日本語 tagline）。他ページは英字＋日本語ラベル（nav と同じ）。
const pages = {
  index: { en: 'NIQO STUDIO', ja: tagline },
  works: { en: 'Works', ja: '実績' },
  cases: { en: 'Cases', ja: 'ケーススタディ' },
  services: { en: 'Services', ja: 'サービス' },
  about: { en: 'About', ja: 'プロフィール' },
  contact: { en: 'Contact', ja: 'お問い合わせ' },
};

const loadFont = async (url, weight, name) => ({
  name,
  weight,
  style: 'normal',
  data: await (await fetch(url)).arrayBuffer(),
});

// 英字＝Inter、日本語＝Noto Sans JP。satori は欠落グリフを後続フォントへフォールバックする。
const fonts = [
  await loadFont('https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter/Inter_700Bold.ttf', 700, 'Inter'),
  await loadFont('https://cdn.jsdelivr.net/npm/@expo-google-fonts/inter/Inter_400Regular.ttf', 400, 'Inter'),
  await loadFont('https://cdn.jsdelivr.net/npm/@expo-google-fonts/noto-sans-jp/NotoSansJP_400Regular.ttf', 400, 'Noto Sans JP'),
];

mkdirSync('public/og', { recursive: true });

const LOGO_H = 248;
const logoW = logo ? Math.round((logo.w / logo.h) * LOGO_H) : 0;

for (const [key, { en, ja }] of Object.entries(pages)) {
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
          gap: '34px',
          width: '100%',
          height: '100%',
          padding: '0 80px',
          backgroundColor: BG,
          borderBottom: `24px solid ${GOLD}`,
          fontFamily: 'Inter, "Noto Sans JP"',
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
                    style: { fontSize: 84, fontWeight: 700, color: CREAM, letterSpacing: '-0.02em', lineHeight: 1.05 },
                    children: en,
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: { fontSize: 40, fontWeight: 400, color: GOLD, marginTop: '16px' },
                    children: ja,
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
