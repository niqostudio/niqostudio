/// <reference types="astro/client" />

// @astrojs/cloudflare の実行時 env（secret/var）。値は string のみ参照する（バインディングは未使用）。
declare module 'cloudflare:workers' {
  export const env: Record<string, string | undefined>;
}
