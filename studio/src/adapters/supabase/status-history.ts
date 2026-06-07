import 'server-only';
import type { RecordTimeline, TimelineEntry } from '@/shared/records/timeline';
import { resolveSupabaseConfig, createDynamicCoreClient, type CoreClient, type SupabaseConfig } from './client';

type EventRow = { from_status: string | null; to_status: string; changed_at: string };
type StatusRow = { code: string; label: string };

// 案件の状態遷移履歴（core の project_status_events）を時系列で返す。ラベルは project_statuses から。
export class CoreProjectStatusHistory implements RecordTimeline {
  private client: CoreClient | null = null;

  constructor(private readonly config?: Partial<SupabaseConfig>) {}

  private getClient(): CoreClient {
    if (!this.client) this.client = createDynamicCoreClient(resolveSupabaseConfig(this.config));
    return this.client;
  }

  async list(recordId: string): Promise<TimelineEntry[]> {
    const c = this.getClient();
    const [events, statuses] = await Promise.all([
      c.from('project_status_events').select('from_status,to_status,changed_at').eq('project_id', recordId).order('changed_at', { ascending: true }),
      c.from('project_statuses').select('code,label'),
    ]);
    if (events.error) throw new Error(`状態履歴の取得に失敗: ${events.error.message}`);
    const labelOf = new Map(((statuses.data ?? []) as StatusRow[]).map((s) => [s.code, s.label]));
    return ((events.data ?? []) as EventRow[]).map((e) => ({
      at: e.changed_at,
      from: e.from_status,
      to: e.to_status,
      fromLabel: e.from_status ? (labelOf.get(e.from_status) ?? e.from_status) : null,
      toLabel: labelOf.get(e.to_status) ?? e.to_status,
    }));
  }
}
