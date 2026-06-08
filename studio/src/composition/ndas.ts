import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';

// NDA 同意の公開カテゴリ（boolean 列 → 表示ラベル）。
export const NDA_PUBLISH_LABELS: Record<string, string> = {
  publish_problems: '課題',
  publish_deliverables: '成果物',
  publish_metrics: '数値',
  publish_testimonial: '推薦文',
};

export interface NdaEvent {
  status: string;
  enabled: string[];
  changedAt: string;
}

// NDA の変更履歴（nda_events）を新しい順で返す。各行＝その時点の同意スナップショット。
export async function loadNdaEvents(ndaId: string): Promise<NdaEvent[]> {
  const rows = await new CoreMetricsProvider()
    .rows(
      'nda_events',
      ['status', 'publish_problems', 'publish_deliverables', 'publish_metrics', 'publish_testimonial', 'changed_at'],
      { column: 'nda_id', value: ndaId },
    )
    .catch(() => []);
  return rows
    .map((r) => ({
      status: typeof r.status === 'string' ? r.status : '',
      enabled: Object.keys(NDA_PUBLISH_LABELS)
        .filter((k) => r[k] === true)
        .map((k) => NDA_PUBLISH_LABELS[k]),
      changedAt: typeof r.changed_at === 'string' ? r.changed_at : '',
    }))
    .sort((a, b) => b.changedAt.localeCompare(a.changedAt));
}
