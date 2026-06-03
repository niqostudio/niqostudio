// OG 画像をビルド前に生成して public/og/<key>.png に出力する。
// satori(→SVG) + resvg(→PNG) を純 Node で実行（Cloudflare アダプタの prerender 環境では
// canvas/node:fs が使えないため、インビルド生成ではなくプリビルドで行う）。
// index は中央縦スタック（ロゴ→屋号→tier1）で正方クロップでも崩れない。
// 他ページは左上に英和ラベル・左下に署名・右に2色ロゴをはみ出し配置（正方では右ロゴが見切れる）。
import { mkdirSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { createClient } from '@supabase/supabase-js';

const GOLD = '#dcb441';
const CREAM = '#faf9f7';
const BG = '#1a1917';
// index OG のタグライン（tier1 のみ。tier2 の自己紹介は OG には載せない）。
const TIER1 = '速く、賢く、ちょうどよく―';

// プリビルドは素の node 実行のため、.env を best-effort で読み込む（無ければ環境変数のまま）。
try {
  process.loadEnvFile?.();
} catch {}

// profile のロゴを取得。暗色地用に本来の2色へ解決し resvg で PNG 化 → data URI。
let logo = null;
{
  const url = process.env.PUBLIC_SUPABASE_URL;
  const key = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const supabase = createClient(url, key);
    const { data } = await supabase.from('profile').select('logo_svg').eq('id', 'singleton').single();
    const svg = data?.logo_svg;
    if (svg) {
      // CSS 変数は satori/resvg が解決しないため、本来の2色（フォールバック値＝pair 緑 / diag 金）へ。
      const resolved = svg
        .replace(/var\(\s*--[^,)]+,\s*([^)]+)\)/g, '$1')
        .replace(/currentColor/g, GOLD)
        .replace(/#d4af37/gi, GOLD); // ロゴの金（diag フォールバック）も OG の金に揃える
      const png = new Resvg(resolved, { fitTo: { mode: 'width', value: 600 } }).render();
      logo = { src: `data:image/png;base64,${Buffer.from(png.asPng()).toString('base64')}`, w: png.width, h: png.height };
    }
  }
  if (!logo) console.log('og: Supabase 未設定 or logo 無し → ロゴ無しで生成');
}

// index はブランド（屋号＋日本語 tagline）。他ページは英字＋日本語ラベル（nav と同じ）。
const pages = {
  index: { en: 'NIQO STUDIO', ja: TIER1 },
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
  // 署名は header の Wordmark（mono・大文字・字間広め）に合わせる。
  await loadFont('https://cdn.jsdelivr.net/npm/@expo-google-fonts/jetbrains-mono/JetBrainsMono_700Bold.ttf', 700, 'JetBrains Mono'),
];

mkdirSync('public/og', { recursive: true });

const LOGO_H = 248; // index 中央ロゴの高さ
const logoW = logo ? Math.round((logo.w / logo.h) * LOGO_H) : 0;
const MARK_H = 720; // 非 index は右側に大きくはみ出すウォーターマーク
const markW = logo ? Math.round((logo.w / logo.h) * MARK_H) : 0;

for (const [key, { en, ja }] of Object.entries(pages)) {
  // index はブランド中央スタック（正方クロップでも崩れない）。
  const indexEl = {
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
        borderBottom: `14px solid ${GOLD}`,
        fontFamily: 'Inter, "Noto Sans JP"',
      },
      children: [
        ...(logo ? [{ type: 'img', props: { src: logo.src, width: logoW, height: LOGO_H } }] : []),
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
            children: [
              { type: 'div', props: { style: { fontSize: 78, fontWeight: 700, color: CREAM, fontFamily: 'JetBrains Mono', letterSpacing: '0.04em', lineHeight: 1.05 }, children: en } },
              { type: 'div', props: { style: { fontSize: 36, fontWeight: 400, color: GOLD, marginTop: '14px' }, children: ja } },
            ],
          },
        },
      ],
    },
  };

  // 他ページ: 右に2色ロゴをはみ出し配置（正方では右ロゴが見切れる）。正方クロップは横(中央 630px)だけ
  // 切れ縦は残るので、タイトルは x≈288 から開始・中央やや上に置き、署名(NIQO STUDIO)は左下。
  const pageEl = {
    type: 'div',
    props: {
      style: {
        position: 'relative',
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: BG,
        borderBottom: `14px solid ${GOLD}`,
        fontFamily: 'Inter, "Noto Sans JP"',
      },
      children: [
        ...(logo
          ? [{ type: 'img', props: { src: logo.src, width: markW, height: MARK_H, style: { position: 'absolute', right: '-40px', top: '-45px', opacity: 0.6 } } }]
          : []),
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              left: '315px',
              top: '0px',
              bottom: '0px',
              width: '400px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              paddingBottom: '40px',
            },
            children: [
              { type: 'div', props: { style: { fontSize: 76, fontWeight: 700, color: CREAM, letterSpacing: '-0.02em', lineHeight: 1.05 }, children: en } },
              { type: 'div', props: { style: { fontSize: 36, fontWeight: 400, color: GOLD, marginTop: '10px' }, children: ja } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { position: 'absolute', left: '315px', bottom: '56px', fontSize: 26, fontWeight: 700, color: CREAM, fontFamily: 'JetBrains Mono', letterSpacing: '0.08em' },
            children: 'NIQO STUDIO',
          },
        },
      ],
    },
  };

  const svg = await satori(key === 'index' ? indexEl : pageEl, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  writeFileSync(`public/og/${key}.png`, png);
  console.log(`og: public/og/${key}.png`);
}
