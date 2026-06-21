import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';

// 案件の確定メトリクス（core.metrics）＋計測ログ（core.metric_measurements）を指標ごとに集約。
// before/after は確定値（previous/achieved）優先、無ければ計測ログの最新。値のある指標だけ返す。

const asStr = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));

export interface ProjectMetricRow {
  key: string;
  label: string;
  unit: string;
  before: string;
  goal: string;
  after: string;
  beforeCount: number;
  afterCount: number;
}

export async function loadProjectMetrics(projectId: string): Promise<ProjectMetricRow[]> {
  const m = new CoreMetricsProvider();
  const [defs, metrics, meas] = await Promise.all([
    m.rows('metric_definitions', ['key', 'label', 'unit', 'sort_order', 'is_active']).catch(() => []),
    m.rows('metrics', ['label', 'previous', 'goal', 'achieved'], { column: 'project_id', value: projectId }).catch(() => []),
    m
      .rows('metric_measurements', ['metric_key', 'phase', 'value', 'measured_at'], { column: 'project_id', value: projectId })
      .catch(() => []),
  ]);

  const byLabel = new Map(metrics.map((r) => [asStr(r.label), r]));
  const ofKey = (key: string, phase: string) =>
    meas
      .filter((r) => asStr(r.metric_key) === key && asStr(r.phase) === phase)
      .sort((a, b) => asStr(a.measured_at).localeCompare(asStr(b.measured_at)));
  const latest = (key: string, phase: string) => {
    const f = ofKey(key, phase);
    return f.length ? asStr(f[f.length - 1].value) : '';
  };

  return defs
    .filter((d) => d.is_active !== false)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .map((d) => {
      const key = asStr(d.key);
      const metric = byLabel.get(asStr(d.label));
      return {
        key,
        label: asStr(d.label),
        unit: asStr(d.unit),
        before: asStr(metric?.previous) || latest(key, 'before'),
        goal: asStr(metric?.goal),
        after: asStr(metric?.achieved) || latest(key, 'after'),
        beforeCount: ofKey(key, 'before').length,
        afterCount: ofKey(key, 'after').length,
      };
    })
    .filter((r) => r.before || r.goal || r.after);
}
