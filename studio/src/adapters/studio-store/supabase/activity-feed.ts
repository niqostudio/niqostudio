import type { ActivityFeed, ActivityEntry } from '@/ports/studio-store';
import { throwQueryError } from '@/shared/utils/db-error';
import {
  createStudioStoreClient,
  resolveStudioStoreConfig,
  type StudioStoreClient,
  type StudioStoreConfig,
} from './client';

type Row = { collection: string; record_id: string; origin: string; created_at: string };

// studio.record_versions を collection 横断で時系列に読む（最近の活動）。tenant スコープ。
export class StudioActivityFeed implements ActivityFeed {
  private client: StudioStoreClient | null = null;

  constructor(
    private readonly tenantId: string,
    private readonly config?: Partial<StudioStoreConfig>,
  ) {}

  private getClient(): StudioStoreClient {
    if (!this.client) this.client = createStudioStoreClient(resolveStudioStoreConfig(this.config));
    return this.client;
  }

  async recent(limit: number): Promise<ActivityEntry[]> {
    const { data, error } = await this.getClient()
      .from('record_versions')
      .select('collection, record_id, origin, created_at')
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throwQueryError('最近の活動の取得（studio.record_versions）', error);
    return (data ?? []).map((r) => {
      const row = r as Row;
      return { collection: row.collection, recordId: row.record_id, origin: row.origin, at: row.created_at };
    });
  }
}
