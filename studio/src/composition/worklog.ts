import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';
import { CoreReferenceResolver } from '@/adapters/domain-store/supabase/reference-resolver';

// 工数の集計（案件別・期間別）。ドメイン判断（期間幅・粗利＝受注額÷工数）は composition が持つ。
// hours は numeric＝PostgREST から文字列で来るため parseFloat で集計する（MetricsProvider.sum は数値型だけ）。

export interface ProjectHours {
  projectId: string;
  title: string;
  hours: number;
  value: number | null; // 受注額（contract_value）
  rate: number | null; // 時給＝受注額÷工数（両方あるとき）
}

export interface DayHours {
  day: string; // 当月の日（1〜月末）
  hours: number;
}

export interface WorklogSummary {
  byProject: ProjectHours[];
  byDay: DayHours[];
  thisWeek: number;
  thisMonth: number;
  total: number;
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
};
const round1 = (n: number): number => Math.round(n * 10) / 10;

export async function loadWorklogSummary(): Promise<WorklogSummary> {
  const metrics = new CoreMetricsProvider();
  const [entries, projects] = await Promise.all([
    metrics.rows('work_logs', ['project_id', 'hours', 'worked_on']),
    metrics.rows('projects', ['id', 'title', 'contract_value']),
  ]);

  const title = new Map<string, string>();
  const value = new Map<string, number | null>();
  for (const p of projects) {
    const id = String(p.id);
    title.set(id, typeof p.title === 'string' ? p.title : id);
    value.set(id, typeof p.contract_value === 'number' ? p.contract_value : null);
  }

  // 案件別の合計工数。
  const byProjectMap = new Map<string, number>();
  for (const e of entries) {
    const pid = String(e.project_id);
    byProjectMap.set(pid, (byProjectMap.get(pid) ?? 0) + num(e.hours));
  }
  const byProject: ProjectHours[] = [...byProjectMap.entries()]
    .map(([projectId, h]) => {
      const v = value.get(projectId) ?? null;
      const hours = round1(h);
      return { projectId, title: title.get(projectId) ?? projectId, hours, value: v, rate: v != null && h > 0 ? Math.round(v / h) : null };
    })
    .sort((a, b) => b.hours - a.hours);

  // 期間別（今月の日別）。1〜月末の枠を作り、今月の工数を日ごとに埋める（月全体を出す）。
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const byDayMap = new Map<number, number>();
  for (let d = 1; d <= lastDay; d++) byDayMap.set(d, 0);
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const weekAgoIso = weekAgo.toISOString().slice(0, 10);

  let thisWeek = 0;
  let thisMonth = 0;
  let total = 0;
  for (const e of entries) {
    const h = num(e.hours);
    total += h;
    const wo = typeof e.worked_on === 'string' ? e.worked_on : '';
    if (!wo) continue;
    if (wo.slice(0, 7) === thisMonthKey) {
      thisMonth += h;
      const day = parseInt(wo.slice(8, 10), 10);
      if (byDayMap.has(day)) byDayMap.set(day, (byDayMap.get(day) ?? 0) + h);
    }
    if (wo >= weekAgoIso) thisWeek += h;
  }
  const byDay: DayHours[] = [...byDayMap.entries()].map(([day, h]) => ({ day: String(day), hours: round1(h) }));

  return { byProject, byDay, thisWeek: round1(thisWeek), thisMonth: round1(thisMonth), total: round1(total) };
}

// 1案件の総工数（案件詳細の集計表示用）。受注額があれば時給も返す。
export async function loadProjectHours(projectId: string): Promise<{ hours: number; count: number; value: number | null; rate: number | null }> {
  const metrics = new CoreMetricsProvider();
  const [entries, projectRows] = await Promise.all([
    metrics.rows('work_logs', ['hours'], { column: 'project_id', value: projectId }),
    metrics.rows('projects', ['contract_value'], { column: 'id', value: projectId }),
  ]);
  let h = 0;
  let count = 0;
  for (const e of entries) {
    h += num(e.hours);
    count++;
  }
  const pv = projectRows[0]?.contract_value;
  const value = typeof pv === 'number' ? pv : null;
  return { hours: round1(h), count, value, rate: value != null && h > 0 ? Math.round(value / h) : null };
}

// 入力フォームの案件選択肢（id→title）。
export async function loadProjectOptions(): Promise<{ value: string; label: string }[]> {
  return new CoreReferenceResolver().options('projects', 'id').catch(() => []);
}
