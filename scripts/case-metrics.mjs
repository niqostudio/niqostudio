// ケーススタディの before/after を客観計測する補助（自動化できる Web/SEO 指標のみ）。
// PageSpeed Insights API（Lighthouse）で URL のスコアと Core Web Vitals を取る。純 Node・依存なし。
// 業務システム系（業務効率）など顧客固有の指標は自動化できないため、別途の方法論に沿って手集計する。
//
// 使い方:
//   計測: node scripts/case-metrics.mjs <url> [--strategy mobile|desktop] > before.json
//   差分: node scripts/case-metrics.mjs --diff before.json after.json
// 任意: 環境変数 PSI_API_KEY を設定するとレート制限が緩む（無くても少量なら可）。
import { readFileSync } from 'node:fs';

const PSI = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// 差分表示する数値指標（パス・表示名・良い方向）。スコアは高い方が良く、時間/CLS は低い方が良い。
const METRICS = [
  ['scores.performance', 'Performance', 'up'],
  ['scores.seo', 'SEO', 'up'],
  ['scores.accessibility', 'Accessibility', 'up'],
  ['scores.bestPractices', 'Best Practices', 'up'],
  ['lab.lcpMs', 'LCP (ms)', 'down'],
  ['lab.cls', 'CLS', 'down'],
  ['lab.tbtMs', 'TBT (ms)', 'down'],
  ['lab.fcpMs', 'FCP (ms)', 'down'],
  ['lab.speedIndexMs', 'Speed Index (ms)', 'down'],
  ['field.lcpMs', 'LCP 実測 (ms)', 'down'],
  ['field.inpMs', 'INP 実測 (ms)', 'down'],
  ['field.cls', 'CLS 実測', 'down'],
];

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? null : o[k]), obj);
const fmt = (v) => (v == null ? '—' : Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000));

async function capture(url, strategy) {
  const u = new URL(PSI);
  u.searchParams.set('url', url);
  u.searchParams.set('strategy', strategy);
  for (const c of ['performance', 'seo', 'accessibility', 'best-practices']) u.searchParams.append('category', c);
  if (process.env.PSI_API_KEY) u.searchParams.set('key', process.env.PSI_API_KEY);

  const res = await fetch(u);
  const data = await res.json();
  if (!res.ok || data.error) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    const hint = res.status === 429 ? '（PSI_API_KEY を設定するとレート制限が緩みます）' : '';
    throw new Error(`PageSpeed Insights 失敗: ${msg}${hint}`);
  }

  const lr = data.lighthouseResult;
  const score = (k) => (lr.categories[k]?.score != null ? Math.round(lr.categories[k].score * 100) : null);
  const ms = (k) => (lr.audits[k]?.numericValue != null ? Math.round(lr.audits[k].numericValue) : null);
  const clsLab = lr.audits['cumulative-layout-shift']?.numericValue;

  // 実測（CrUX）。トラフィックが少ない URL では存在しない。
  const fm = data.loadingExperience?.metrics ?? {};
  const field = Object.keys(fm).length
    ? {
        lcpMs: fm.LARGEST_CONTENTFUL_PAINT_MS?.percentile ?? null,
        inpMs: fm.INTERACTION_TO_NEXT_PAINT?.percentile ?? null,
        cls: fm.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile != null ? fm.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100 : null,
      }
    : null;

  return {
    url,
    strategy,
    capturedAt: new Date().toISOString(),
    scores: { performance: score('performance'), seo: score('seo'), accessibility: score('accessibility'), bestPractices: score('best-practices') },
    lab: { lcpMs: ms('largest-contentful-paint'), cls: clsLab != null ? Math.round(clsLab * 1000) / 1000 : null, tbtMs: ms('total-blocking-time'), fcpMs: ms('first-contentful-paint'), speedIndexMs: ms('speed-index') },
    field,
  };
}

function diff(beforeFile, afterFile) {
  const b = JSON.parse(readFileSync(beforeFile, 'utf8'));
  const a = JSON.parse(readFileSync(afterFile, 'utf8'));
  console.log('| 指標 | before | after | Δ | Δ% | 良い方向 |');
  console.log('| --- | --- | --- | --- | --- | --- |');
  for (const [path, label, dir] of METRICS) {
    const bv = get(b, path);
    const av = get(a, path);
    if (bv == null && av == null) continue;
    let delta = '—';
    let pct = '—';
    if (typeof bv === 'number' && typeof av === 'number') {
      const d = av - bv;
      delta = (d > 0 ? '+' : '') + fmt(Math.round(d * 1000) / 1000);
      if (bv !== 0) pct = `${d > 0 ? '+' : ''}${Math.round((d / bv) * 100)}%`;
    }
    console.log(`| ${label} | ${fmt(bv)} | ${fmt(av)} | ${delta} | ${pct} | ${dir === 'up' ? '↑' : '↓'} |`);
  }
}

function usage() {
  console.error('使い方:\n  計測: node scripts/case-metrics.mjs <url> [--strategy mobile|desktop]\n  差分: node scripts/case-metrics.mjs --diff before.json after.json');
  process.exit(1);
}

const argv = process.argv.slice(2);
if (argv[0] === '--diff') {
  if (argv.length < 3) usage();
  diff(argv[1], argv[2]);
} else if (argv[0] && !argv[0].startsWith('-')) {
  const sIdx = argv.indexOf('--strategy');
  const strategy = sIdx !== -1 ? argv[sIdx + 1] : 'mobile';
  if (!['mobile', 'desktop'].includes(strategy)) usage();
  console.log(JSON.stringify(await capture(argv[0], strategy), null, 2));
} else {
  usage();
}
