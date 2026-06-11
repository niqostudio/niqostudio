// 運営者・ブランド情報の正本配信（machine-readable）。SaaS 製品（別 repo）がフッターの
// attribution・©・特商法ページの事業者ブロック・ロゴをここから描画する＝運営情報の改定で
// 製品の再デプロイを不要にする。法務情報の正本は core.profile.legal_jp（git に置かない）で、
// ビルド時にここへ投影される。スキーマは docs/saas/contract.md の「ブランド・運営者情報」節が正本。
// 後方互換を壊す変更は schema_version を上げる。
import type { APIRoute } from 'astro';
import { SITE } from '../config/site';
import { getProfile } from '../lib/content';

export const GET: APIRoute = async () => {
  const origin = (import.meta.env.SITE as string).replace(/\/$/, '');
  const profile = await getProfile();
  const manifest = {
    schema_version: 1,
    name: SITE.name,
    copyright_holder: SITE.name,
    contact: SITE.email,
    links: {
      site: `${origin}/en`,
      site_ja: origin,
      privacy: `${origin}/privacy`,
    },
    logos: {
      // ダーク地用ワードマーク（auth メールのヘッダーと同一アセット）
      wordmark_png_dark: `${origin}/email-logo.png`,
      // マーク（currentColor 継承の SVG）
      mark_svg: `${origin}/favicon.svg`,
    },
    // 特商法表記の事業者ブロック（正本＝core.profile.legal_jp・未登録の間はキー自体を出さない）
    ...(profile.legalJp ? { legal_jp_tokushoho: profile.legalJp } : {}),
  };
  return new Response(JSON.stringify(manifest, null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
