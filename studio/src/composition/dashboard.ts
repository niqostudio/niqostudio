import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';
import { StudioActivityFeed } from '@/adapters/studio-store/supabase/activity-feed';
import type { ActivityEntry } from '@/ports/studio-store';
import { INSTANCE_ID } from './instance';

// ダッシュボードの構成（KPI / 配信ヘルス / パイプライン / 最近の活動）。どの値を「未対応/進行中/公開待ち」と
// みなすか・stage の並び＝ドメイン判断なので composition が持つ。count 機構は adapter（CoreMetricsProvider）。
export interface Kpi {
  label: string;
  count: number;
  href: string;
}

interface KpiDef {
  label: string;
  table: string;
  filter?: { column: string; in: string[] };
  href: string;
}

// 業務 KPI はドメイン均等に1枚ずつ（問い合わせに寄せない）。
const KPI_DEFS: KpiDef[] = [
  { label: '未対応の問い合わせ', table: 'inquiries', filter: { column: 'status', in: ['new'] }, href: '/inquiries?status=new' },
  {
    label: '進行中の案件',
    table: 'projects',
    filter: { column: 'status', in: ['consultation', 'discovery', 'active'] },
    href: '/projects',
  },
  { label: '公開待ちの事例', table: 'showcase_entries', filter: { column: 'status', in: ['draft'] }, href: '/showcase_entries?status=draft' },
];

export async function loadKpis(): Promise<Kpi[]> {
  const metrics = new CoreMetricsProvider();
  return Promise.all(
    KPI_DEFS.map(async (d) => ({ label: d.label, href: d.href, count: await metrics.count(d.table, d.filter) })),
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
    STAGES.map(async (s) => ({
      ...s,
      count: await metrics.count('projects', { column: 'status', in: [s.status] }),
      href: `/projects?status=${s.status}`,
    })),
  );
}

// 最近の活動（全 collection 横断＝record_versions）。1ドメインに寄らない横断フィード。
export async function loadActivity(limit = 8): Promise<ActivityEntry[]> {
  return new StudioActivityFeed(INSTANCE_ID).recent(limit);
}
