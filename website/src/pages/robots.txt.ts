import type { APIRoute } from 'astro';

// robots.txt は静的ファイルにせず site 設定から生成（ドメインのハードコードを避ける）。
export const GET: APIRoute = ({ site }) => {
  const sitemap = site ? new URL('sitemap-index.xml', site).href : undefined;
  const body = ['User-agent: *', 'Allow: /', ...(sitemap ? ['', `Sitemap: ${sitemap}`] : [])].join('\n') + '\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
