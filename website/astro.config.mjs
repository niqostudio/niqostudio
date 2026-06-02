// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// canonical ドメインは root の config.<env>.json（infra と共有する committed の単一正本）から取る。
// env は DEPLOY_ENV（未設定は production）。SSG なのでビルド時に読む。欠落時は readFileSync が throw＝fallback しない。
const env = process.env.DEPLOY_ENV ?? 'production';
const cfg = JSON.parse(readFileSync(new URL(`../config.${env}.json`, import.meta.url), 'utf8'));
const site = `https://${cfg.primary}`;

export default defineConfig({
  site,
  adapter: cloudflare(),
  // 現状は日本語のみ。英語は将来必要になった時点で方式から検討する（未着手）。
  integrations: [sitemap({ filter: (page) => !page.includes('/og/') && !page.includes('/privacy') })],
  // フォントはビルド時に Google から取得して self-host（preload＋メトリクス最適化フォールバックは
  // Astro が自動生成）。ラテン=Inter / 和文=Noto Sans JP を別 family にし、スタック側で順序を制御。
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [400, 500, 600],
      subsets: ['latin'],
      // swap: 取得まで fallback で表示し、到着後に本フォントへ必ず差し替え（テキストは常に可視）。
      // 遷移時の差し替えは ClientRouter のドキュメント保持で回避済み＝出るのは初回ロードの一瞬のみ。
      display: 'swap',
      // optimizedFallbacks(generic 対象)は和文を Noto 前で食うため使わず、global.css の手動
      // "Inter Fallback"（Arial 基準のメトリクス補正）を先頭に。欧文のみで後段の Noto へ繋ぐ。
      optimizedFallbacks: false,
      fallbacks: ['Inter Fallback', 'Arial'],
    },
    {
      provider: fontProviders.google(),
      name: 'Noto Sans JP',
      cssVariable: '--font-noto-jp',
      weights: [400, 500, 600],
      // swap: 取得まで fallback、到着後に Noto へ必ず差し替え（テキストは常に可視）。
      display: 'swap',
      // 自動最適化フォールバックは Arial 基準で和文グリフを持たないため使わず、
      // global.css の "Noto Sans JP Fallback"（system JP を Noto のメトリクスに合わせたもの）を先頭に。
      optimizedFallbacks: false,
      fallbacks: [
        'Noto Sans JP Fallback',
        'Hiragino Sans',
        'Hiragino Kaku Gothic ProN',
        'Yu Gothic',
        'YuGothic',
        'Meiryo',
        'sans-serif',
      ],
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
