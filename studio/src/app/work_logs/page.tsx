import Link from 'next/link';
import { loadWorklogSummary, loadProjectOptions } from '@/composition/worklog';
import { WorklogEntry } from '@/features/worklog/WorklogEntry';
import { WorklogDailyChart } from '@/features/worklog/WorklogCharts';
import { Card, SectionLabel } from '@/shared/ui/primitives';

export const dynamic = 'force-dynamic';

// 工数は一覧/CRUD ではなく「入力＋集計」。上で記録し、下で案件別・期間別に集計する。
export default async function WorklogPage() {
  const [summary, projects] = await Promise.all([loadWorklogSummary(), loadProjectOptions()]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 p-5 md:p-10">
      <header>
        <SectionLabel>業務</SectionLabel>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">工数</h1>
      </header>

      <section className="flex flex-col gap-3">
        <SectionLabel>記録</SectionLabel>
        <WorklogEntry projects={projects} />
      </section>

      {/* 期間別：今月の日別＋今週/今月 */}
      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <SectionLabel>今月の工数</SectionLabel>
          <div className="flex gap-8 text-right">
            <div>
              <p className="text-xs text-muted">今週</p>
              <p className="text-xl font-semibold tabular-nums">
                {summary.thisWeek}
                <span className="ml-0.5 text-sm font-normal text-muted">h</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">今月</p>
              <p className="text-xl font-semibold tabular-nums">
                {summary.thisMonth}
                <span className="ml-0.5 text-sm font-normal text-muted">h</span>
              </p>
            </div>
          </div>
        </div>
        <Card className="p-4">
          <WorklogDailyChart data={summary.byDay} />
        </Card>
      </section>

      {/* 案件別：合計工数・受注額・時給（粗利の目安） */}
      <section className="flex flex-col gap-3">
        <SectionLabel>案件別の工数</SectionLabel>
        <Card className="overflow-hidden">
          {summary.byProject.length === 0 ? (
            <p className="p-4 text-sm text-muted">まだ工数の記録がありません。上のフォームから記録してください。</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-left text-xs text-muted">
                  <th className="px-4 py-2 font-medium">案件</th>
                  <th className="px-4 py-2 text-right font-medium">工数</th>
                  <th className="px-4 py-2 text-right font-medium">受注額</th>
                  <th className="px-4 py-2 text-right font-medium">時給</th>
                </tr>
              </thead>
              <tbody>
                {summary.byProject.map((p) => (
                  <tr key={p.projectId} className="border-b border-border-subtle last:border-0">
                    <td className="px-4 py-2">
                      <Link href={`/projects?sel=${p.projectId}`} className="transition-colors hover:text-accent">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{p.hours}h</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted">
                      {p.value != null ? `¥${p.value.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{p.rate != null ? `¥${p.rate.toLocaleString()}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}
