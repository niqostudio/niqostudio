import { loadProjectHours } from '@/composition/worklog';
import { SectionLabel } from '@/shared/ui/primitives';

// 案件詳細に出す「その案件の総工数」（受注額があれば時給も）。読み取りのみ＝作成導線ではない。
export async function ProjectWorklogSummary({ id }: { id: string }) {
  const { hours, count, rate } = await loadProjectHours(id);
  if (count === 0) return null; // 記録ゼロなら出さない（騒がしくしない）。
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>工数</SectionLabel>
      <div className="flex flex-wrap gap-8">
        <div>
          <p className="text-2xl font-semibold tabular-nums">
            {hours}
            <span className="ml-1 text-sm font-normal text-muted">時間</span>
          </p>
          <p className="mt-0.5 text-xs text-muted">{count}件の記録</p>
        </div>
        {rate != null && (
          <div>
            <p className="text-2xl font-semibold tabular-nums">
              ¥{rate.toLocaleString()}
              <span className="ml-1 text-sm font-normal text-muted">/ 時</span>
            </p>
            <p className="mt-0.5 text-xs text-muted">受注額 ÷ 工数</p>
          </div>
        )}
      </div>
    </section>
  );
}
