import type { DraftStore } from '@/shared/records/ports';
import type { CollectionRecord } from '@/shared/records/record';
import {
  createStudioStoreClient,
  resolveStudioStoreConfig,
  type RecordRow,
  type StudioStoreClient,
  type StudioStoreConfig,
} from './client';

// studio スキーマの汎用 records を DraftStore<F> として扱う。fields は jsonb（F は collection が与える）。
// tenant・collection でスコープし、テナント分離を最初から効かせる。
export class StudioDraftStore<F> implements DraftStore<F> {
  private client: StudioStoreClient | null = null;

  constructor(
    private readonly tenantId: string,
    private readonly collection: string,
    private readonly config?: Partial<StudioStoreConfig>,
  ) {}

  private getClient(): StudioStoreClient {
    if (!this.client) this.client = createStudioStoreClient(resolveStudioStoreConfig(this.config));
    return this.client;
  }

  private toRecord(r: RecordRow): CollectionRecord<F> {
    return {
      id: r.id,
      fields: r.fields as unknown as F,
      draftState: r.draft_state,
      sourceId: r.source_id,
      updatedAt: r.updated_at.slice(0, 10),
    };
  }

  async list(): Promise<CollectionRecord<F>[]> {
    const { data, error } = await this.getClient()
      .from('records')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('collection', this.collection)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => this.toRecord(r));
  }

  async get(id: string): Promise<CollectionRecord<F> | null> {
    const { data, error } = await this.getClient()
      .from('records')
      .select('*')
      .eq('tenant_id', this.tenantId)
      .eq('collection', this.collection)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? this.toRecord(data as RecordRow) : null;
  }

  async save(record: CollectionRecord<F>): Promise<void> {
    const { error } = await this.getClient()
      .from('records')
      .upsert({
        id: record.id,
        tenant_id: this.tenantId,
        collection: this.collection,
        source_id: record.sourceId,
        fields: record.fields as unknown as RecordRow['fields'],
        draft_state: record.draftState,
      });
    if (error) throw error;
  }

  async remove(id: string): Promise<void> {
    const { error } = await this.getClient()
      .from('records')
      .delete()
      .eq('tenant_id', this.tenantId)
      .eq('collection', this.collection)
      .eq('id', id);
    if (error) throw error;
  }
}
