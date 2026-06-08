import Link from 'next/link';
import { loadMeetingsFor, MEETING_STATUS_LABELS } from '@/composition/meetings';
import { StatusBadge } from '@/shared/ui/primitives';

// 顧客/案件の詳細に出す、その相手の打ち合わせ一覧（読み取り）。記録が無ければ何も出さない。
export async function RecordMeetingList({
  column,
  id,
}: {
  column: 'client_id' | 'project_id' | 'inquiry_id';
  id: string;
}) {
  const meetings = await loadMeetingsFor(column, id);
  if (meetings.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <p className="section-label text-xs">打ち合わせ</p>
      <ol className="flex flex-col gap-1.5">
        {meetings.map((m) => (
          <li key={m.id}>
            <Link
              href={`/meetings?sel=${m.id}`}
              className="flex items-center gap-2 text-sm transition-colors hover:text-accent"
            >
              <span className="shrink-0 text-xs text-muted tabular-nums">{m.metOn}</span>
              <span className="flex-1 truncate">{m.title || '（無題）'}</span>
              <StatusBadge status={m.status} label={MEETING_STATUS_LABELS[m.status] ?? m.status} />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
