// OG 画像をビルド前に生成して public/og/<key>.png に出力する。
// satori(→SVG) + resvg(→PNG) を純 Node で実行（Cloudflare アダプタの prerender 環境では
// canvas/node:fs が使えないため、インビルド生成ではなくプリビルドで行う）。英字のみ＝Inter。
import { mkdirSync, writeFileSync } from 'node:fs';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const TAGLINE = 'AI-Speed, Designed to Fit.';
const pages = {
  index: 'NIQO STUDIO',
  works: 'Works',
  cases: 'Cases',
  services: 'Services',
  about: 'About',
  contact: 'Contact',
};

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

for (const [key, title] of Object.entries(pages)) {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1917',
          padding: '80px',
          borderBottom: '24px solid #d4af37',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { fontSize: 88, fontWeight: 700, color: '#faf9f7', letterSpacing: '-0.02em' },
              children: title,
            },
          },
          {
            type: 'div',
            props: {
              style: { fontSize: 38, fontWeight: 400, color: '#d4af37', marginTop: '20px' },
              children: TAGLINE,
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
