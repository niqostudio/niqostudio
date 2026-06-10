import 'server-only';

// PageSpeed Insights（Lighthouse）で URL を測定。case-metrics.mjs と同じ計算。
// 返り値は metric_definitions.key（snake_case）→数値。マスタの auto 指標と key で対応づく。
const PSI = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

interface PsiDoc {
  error?: { message?: string };
  lighthouseResult?: {
    categories: Record<string, { score?: number } | undefined>;
    audits: Record<string, { numericValue?: number } | undefined>;
  };
}

export async function capturePsi(url: string, strategy: 'mobile' | 'desktop'): Promise<Record<string, number | null>> {
  const u = new URL(PSI);
  u.searchParams.set('url', url);
  u.searchParams.set('strategy', strategy);
  for (const c of ['performance', 'seo', 'accessibility', 'best-practices']) u.searchParams.append('category', c);
  if (process.env.PSI_API_KEY) u.searchParams.set('key', process.env.PSI_API_KEY);

  const res = await fetch(u);
  const data = (await res.json()) as PsiDoc;
  if (!res.ok || data.error || !data.lighthouseResult) {
    const hint = res.status === 429 ? '（PSI_API_KEY を設定するとレート制限が緩みます）' : '';
    throw new Error(`PageSpeed Insights 失敗: ${data.error?.message ?? `HTTP ${res.status}`}${hint}`);
  }
  const lr = data.lighthouseResult;
  const score = (k: string) => (lr.categories[k]?.score != null ? Math.round((lr.categories[k]!.score as number) * 100) : null);
  const ms = (k: string) => (lr.audits[k]?.numericValue != null ? Math.round(lr.audits[k]!.numericValue as number) : null);
  const clsRaw = lr.audits['cumulative-layout-shift']?.numericValue;
  const bytes = lr.audits['total-byte-weight']?.numericValue;

  return {
    performance: score('performance'),
    seo: score('seo'),
    accessibility: score('accessibility'),
    best_practices: score('best-practices'),
    lcp: ms('largest-contentful-paint'),
    cls: clsRaw != null ? Math.round(clsRaw * 1000) / 1000 : null,
    tbt: ms('total-blocking-time'),
    fcp: ms('first-contentful-paint'),
    speed_index: ms('speed-index'),
    ttfb: ms('server-response-time'),
    page_kb: bytes != null ? Math.round(bytes / 1024) : null,
    dom_size: ms('dom-size'),
  };
}
