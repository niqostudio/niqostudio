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
      // optional: webfont を参照しても準備が間に合わなければ fallback のまま差し替えない（＝遷移時の swap なし）。
      // 適用は font loader（BaseLayout）が制御: 既定 fallback のみ→読込後 html.fonts-loaded で webfont へ。初回訪問は
      // 間に合わなければ一度 swap（fallback→webfont）、2回目以降は class 即付与＋キャッシュで初回ペイントから webfont。
      display: 'optional',
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
      // 適用は font loader が制御（上記 Inter と同じ）。和文は重いので preload しない。
      display: 'optional',
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
    {
      // 等幅は wordmark・コード調 UI（SectionLabel・価格・番号）に使う。端末依存の system mono を避け固定。
      provider: fontProviders.google(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      weights: [400, 600],
      subsets: ['latin'],
      display: 'optional',
      // latin 専用 mono なので（Inter/Noto と違い和文汚染が無い）Astro 自動のメトリクス補正 fallback を使う。
      // これが無いと swap 時に wordmark がガタつく（fallback が等幅メトリクスに合っていなかった）。
      optimizedFallbacks: true,
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  // CSP は Astro が出力（インライン script/style の hash をビルド毎に自動生成＝ClientRouter も追従）。
  // meta 出力のため frame-ancestors は効かないが X-Frame-Options: DENY（_headers）で担保。
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self' https://challenges.cloudflare.com https://*.supabase.co https://cloudflareinsights.com",
        "frame-src https://challenges.cloudflare.com",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: {
        // Turnstile ウィジェット＋ Cloudflare Web Analytics ビーコン。インライン script は hash 自動付与。
        resources: ["'self'", 'https://challenges.cloudflare.com', 'https://static.cloudflareinsights.com'],
      },
      styleDirective: {
        resources: ["'self'", "'unsafe-inline'"],
      },
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
