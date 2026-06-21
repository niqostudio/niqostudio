import Link from 'next/link';
import { loadProjectMetrics } from '@/composition/project-metrics';
import { SectionLabel } from '@/shared/ui/primitives';

// 案件詳細：確定メトリクス＋計測ログを指標ごとに読み取り表示。値があるときだけ出す（騒がしくしない）。
export async function ProjectMetrics({ id }: { id: string }) {
  const rows = await loadProjectMetrics(id);
  if (rows.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <SectionLabel>メトリクス</SectionLabel>
        <Link href={`/metrics?project=${id}`} className="text-xs text-muted transition-colors hover:text-accent">
          計測・編集 ›
        </Link>
      </div>
      <div className="overflow-hidden rounded-sm border border-border-subtle">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-xs text-muted">
              <th className="px-3 py-2 font-medium">指標</th>
              <th className="px-3 py-2 text-right font-medium">旧環境</th>
              <th className="px-3 py-2 text-right font-medium">目標</th>
              <th className="px-3 py-2 text-right font-medium">after</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-border-subtle last:border-0">
                <td className="px-3 py-2">{r.label}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.before || '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.goal || '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.after || '—'}</td>
                <td className="px-3 py-2 text-xs text-muted">{r.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
