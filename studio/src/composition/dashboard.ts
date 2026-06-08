import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';
import type { TrendPoint, FunnelStep } from '@/features/dashboard/types';

// ダッシュボードの構成（KPI / 配信ヘルス / パイプライン / 最近の活動）。どの値を「未対応/進行中/公開待ち」と
// みなすか・stage の並び＝ドメイン判断なので composition が持つ。count 機構は adapter（CoreMetricsProvider）。
export type KpiTone = 'warning' | 'error' | 'info';

export interface Kpi {
  label: string;
  count: number;
  href: string;
  // 0 超のとき数値を色づけする（要対応の温度感）。
  tone?: KpiTone;
}

interface KpiDef {
  label: string;
  table: string;
  filter?: { column: string; in: string[] };
  href: string;
  tone?: KpiTone;
}

// 進行中（受注予測の対象）の案件 status。KPI と受注予測で共用する。
export const IN_PROGRESS_STATUSES = ['consultation', 'discovery', 'active'];

// 業務 KPI はドメイン均等に1枚ずつ（問い合わせに寄せない）。
const KPI_DEFS: KpiDef[] = [
  { label: '未対応の問い合わせ', table: 'inquiries', filter: { column: 'status', in: ['new'] }, href: '/inquiries?status=new', tone: 'warning' },
  {
    label: '進行中の案件',
    table: 'projects',
    filter: { column: 'status', in: IN_PROGRESS_STATUSES },
    href: '/projects',
  },
  { label: '公開待ちの事例', table: 'showcase_entries', filter: { column: 'status', in: ['draft'] }, href: '/showcase_entries?status=draft' },
];

export async function loadKpis(): Promise<Kpi[]> {
  const metrics = new CoreMetricsProvider();
  return Promise.all(
    KPI_DEFS.map(async (d) => ({ label: d.label, href: d.href, count: await metrics.count(d.table, d.filter), tone: d.tone })),
  );
}

// 配信ヘルス（業務 KPI とは別枠）。メール送達失敗の件数。
export async function loadDeliveryHealth(): Promise<{ failed: number; href: string }> {
  const metrics = new CoreMetricsProvider();
  const failed = await metrics.count('inquiries', { column: 'delivery_status', in: ['bounced'] });
  return { failed, href: '/inquiries' };
}

// 案件パイプライン（status 別件数）。各 stage は絞り込み済み一覧へドリルダウン。
export const PIPELINE_TITLE = '案件パイプライン';

export interface PipelineStage {
  label: string;
  status: string;
  count: number;
  // その stage の受注額合計（contract_value 合算）。
  value: number;
  href: string;
}

const STAGES: { label: string; status: string }[] = [
  { label: '無料相談', status: 'consultation' },
  { label: '事前設計', status: 'discovery' },
  { label: '進行中', status: 'active' },
  { label: '納品済', status: 'delivered' },
  { label: 'クローズ', status: 'closed' },
];

export async function loadPipeline(): Promise<PipelineStage[]> {
  const metrics = new CoreMetricsProvider();
  return Promise.all(
    STAGES.map(async (s) => {
      const filter = { column: 'status', in: [s.status] };
      const [count, value] = await Promise.all([
        metrics.count('projects', filter),
        metrics.sum('projects', 'contract_value', filter),
      ]);
      return { ...s, count, value, href: `/projects?status=${s.status}` };
    }),
  );
}

// パイプラインの健康度：納期リスク（進行中で due_on が dueWithinDays 以内/超過）＋滞留（現ステージに stuckDays 以上）。
export interface PipelineHealth {
  dueSoon: number;
  stuck: number;
  href: string;
}

export async function loadPipelineHealth(dueWithinDays = 14, stuckDays = 21): Promise<PipelineHealth> {
  const metrics = new CoreMetricsProvider();
  const now = new Date();
  const dueLimit = new Date(now);
  dueLimit.setDate(now.getDate() + dueWithinDays);
  const dueSoon = await metrics.count(
    'projects',
    { column: 'status', in: IN_PROGRESS_STATUSES },
    { column: 'due_on', value: dueLimit.toISOString().slice(0, 10) },
  );
  // 滞留：最新 status イベントの changed_at が古い進行中案件（イベントの to_status ＝現 status）。
  const events = await metrics.rows('project_status_events', ['project_id', 'to_status', 'changed_at']);
  const latest = new Map<string, { to: string; at: string }>();
  for (const e of events) {
    const pid = String(e.project_id);
    const at = String(e.changed_at);
    const cur = latest.get(pid);
    if (!cur || at > cur.at) latest.set(pid, { to: String(e.to_status), at });
  }
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - stuckDays);
  const cutoffIso = cutoff.toISOString();
  const inProgress = new Set(IN_PROGRESS_STATUSES);
  let stuck = 0;
  for (const e of latest.values()) if (inProgress.has(e.to) && e.at < cutoffIso) stuck++;
  return { dueSoon, stuck, href: '/projects' };
}

// 財務サマリ（請求書から集計）。売上＝入金済合計、未入金＝請求済かつ未入金、期日超過＝そのうち支払期日超過。
export interface Finance {
  revenue: number;
  unpaid: number;
  overdue: number;
  overdueCount: number;
}

export async function loadFinance(): Promise<Finance> {
  const rows = await new CoreMetricsProvider().rows('invoices', ['subtotal', 'tax', 'status', 'due_on', 'paid_on']);
  const today = new Date().toISOString().slice(0, 10);
  const n = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : 0);
  const s = (v: unknown) => (typeof v === 'string' ? v : '');
  const f: Finance = { revenue: 0, unpaid: 0, overdue: 0, overdueCount: 0 };
  for (const r of rows) {
    const total = n(r.subtotal) + n(r.tax);
    if (s(r.status) === 'paid') f.revenue += total;
    else if (s(r.status) === 'sent' && !s(r.paid_on)) {
      f.unpaid += total;
      const due = s(r.due_on);
      if (due && due < today) {
        f.overdue += total;
        f.overdueCount++;
      }
    }
  }
  return f;
}

// 受注ファネル：問い合わせ→顧客→案件（件数）。どこで落ちるかを可視化。
export async function loadFunnel(): Promise<FunnelStep[]> {
  const metrics = new CoreMetricsProvider();
  const [inquiries, clients, projects] = await Promise.all([
    metrics.count('inquiries'),
    metrics.count('clients'),
    metrics.count('projects'),
  ]);
  return [
    { label: '問い合わせ', count: inquiries },
    { label: '顧客', count: clients },
    { label: '案件', count: projects },
  ];
}

// 月次推移：問い合わせ・案件の作成件数（直近 months ヶ月）。created_at を月で集計。
export async function loadTrend(months = 6): Promise<TrendPoint[]> {
  const metrics = new CoreMetricsProvider();
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).toISOString();
  const [inq, prj] = await Promise.all([
    metrics.timestamps('inquiries', 'created_at', since),
    metrics.timestamps('projects', 'created_at', since),
  ]);
  const points: TrendPoint[] = [];
  const byKey = new Map<string, TrendPoint>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const point: TrendPoint = { month: key, inquiries: 0, projects: 0 };
    points.push(point);
    byKey.set(key, point);
  }
  for (const ts of inq) {
    const p = byKey.get(ts.slice(0, 7));
    if (p) p.inquiries++;
  }
  for (const ts of prj) {
    const p = byKey.get(ts.slice(0, 7));
    if (p) p.projects++;
  }
  return points;
}
