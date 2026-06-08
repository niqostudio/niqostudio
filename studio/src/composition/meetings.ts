import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';

// 打ち合わせの status ラベル（studio は中立だが、composition は意味を知ってよい）。
export const MEETING_STATUS_LABELS: Record<string, string> = {
  scheduled: '予定',
  done: '実施済',
  canceled: '中止',
};

export interface MeetingRow {
  id: string;
  title: string;
  metOn: string;
  status: string;
}

// 指定の相手（顧客 or 案件）に紐づく打ち合わせを新しい順で返す（詳細ペインの一覧表示用）。
export async function loadMeetingsFor(
  column: 'client_id' | 'project_id' | 'inquiry_id',
  id: string,
): Promise<MeetingRow[]> {
  const rows = await new CoreMetricsProvider().rows('meetings', ['id', 'title', 'met_on', 'status'], { column, value: id });
  return rows
    .map((r) => ({
      id: String(r.id),
      title: typeof r.title === 'string' ? r.title : '',
      metOn: typeof r.met_on === 'string' ? r.met_on : '',
      status: typeof r.status === 'string' ? r.status : '',
    }))
    .sort((a, b) => b.metOn.localeCompare(a.metOn));
}
