import type { APIRoute } from 'astro';
import { SITE, PAGES } from '../config/site';
import { getCases, getServices } from '../lib/content';

// llms.txt（llmstxt.org）は静的ファイルにせず site 設定＋公開コンテンツから生成（ドメイン直書きを避ける）。
// 主要ページ＋公開中のサービス/ケースを Markdown で列挙し、LLM が要点を辿れるようにする。取得失敗は throw（fail-fast）。
export const GET: APIRoute = async ({ site }) => {
  const abs = (path: string) => (site ? new URL(path, site).href : path);
  const link = (name: string, path: string, desc?: string | null) =>
    `- [${name}](${abs(path)})${desc ? `: ${desc}` : ''}`;

  const [services, cases] = await Promise.all([getServices(), getCases()]);

  const body =
    [
      `# ${SITE.name}`,
      '',
      `> ${SITE.description}`,
      '',
      '## ページ',
      link(PAGES.services.title, PAGES.services.href, PAGES.services.description),
      link(PAGES.cases.title, PAGES.cases.href, PAGES.cases.description),
      link(PAGES.about.title, PAGES.about.href, PAGES.about.description),
      link(PAGES.contact.title, PAGES.contact.href, PAGES.contact.description),
      ...(services.length > 0
        ? ['', '## サービス', ...services.map((s) => link(s.nameJa ?? s.name, `/services#${s.slug}`, s.headline ?? s.summary))]
        : []),
      ...(cases.length > 0
        ? ['', '## ケーススタディ', ...cases.map((c) => link(c.title, `/cases/${c.slug}`, c.summary))]
        : []),
    ].join('\n') + '\n';

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
