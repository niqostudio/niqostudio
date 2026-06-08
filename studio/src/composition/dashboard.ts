import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';

// ダッシュボードの KPI。どの値を「未対応/進行中/公開待ち」とみなすか＝ドメイン判断なので composition が持つ。
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

const DEFS: KpiDef[] = [
  { label: '未対応の問い合わせ', table: 'inquiries', filter: { column: 'status', in: ['new'] }, href: '/inquiries' },
  {
    label: '進行中の案件',
    table: 'projects',
    filter: { column: 'status', in: ['consultation', 'discovery', 'active'] },
    href: '/projects',
  },
  { label: '公開待ちの事例', table: 'showcase_entries', filter: { column: 'status', in: ['draft'] }, href: '/showcase_entries' },
];

// 各 KPI の件数を集計して返す（接続先の集計は adapter＝CoreMetricsProvider）。
export async function loadKpis(): Promise<Kpi[]> {
  const metrics = new CoreMetricsProvider();
  return Promise.all(
    DEFS.map(async (d) => ({ label: d.label, href: d.href, count: await metrics.count(d.table, d.filter) })),
  );
}
