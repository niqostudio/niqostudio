// 運営者・ブランド情報の正本配信（machine-readable）。SaaS 製品（別 repo）がフッターの
// attribution・©・法務リンク・ロゴをここから描画する＝運営情報の改定で製品の再デプロイを不要にする。
// スキーマは docs/saas/contract.md の「ブランド・運営者情報」節が正本。後方互換を壊す変更は schema_version を上げる。
import type { APIRoute } from 'astro';
import { SITE } from '../config/site';

export const GET: APIRoute = () => {
  const origin = (import.meta.env.SITE as string).replace(/\/$/, '');
  const manifest = {
    schema_version: 1,
    name: SITE.name,
    copyright_holder: SITE.name,
    contact: SITE.email,
    links: {
      site: `${origin}/en`,
      site_ja: origin,
      privacy: `${origin}/privacy`,
      // 特商法表記ページは公開後に legal_jp_tokushoho として追加する（存在しないリンクは配らない）。
    },
    logos: {
      // ダーク地用ワードマーク（auth メールのヘッダーと同一アセット）
      wordmark_png_dark: `${origin}/email-logo.png`,
      // マーク（currentColor 継承の SVG）
      mark_svg: `${origin}/favicon.svg`,
    },
  };
  return new Response(JSON.stringify(manifest, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
