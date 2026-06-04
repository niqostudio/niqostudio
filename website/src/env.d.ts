/// <reference types="astro/client" />

// @astrojs/cloudflare の実行時 env（secret/var）。値は string のみ参照する（バインディングは未使用）。
declare module 'cloudflare:workers' {
  export const env: Record<string, string | undefined>;
}

// astro.config が config.<env>.json から inline 注入するメール設定（vite define）。
declare const __MAIL__: { name: string; noreply: string; contact: string };

// astro.config が config.<env>.json から inline 注入する問い合わせフォーム文言（vite define）。
declare const __INQUIRY_FORM__: {
  message_placeholder: string;
  schedule: {
    heading: string;
    time_bands: string[];
    max_candidates: number;
    months_ahead: number;
    // 受付曜日（0=日〜6=土）。カレンダーで選べるのはこの曜日だけ。
    working_days: number[];
    block_label: string;
    line_format: string;
  };
};
