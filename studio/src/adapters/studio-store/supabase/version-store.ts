import type { VersionStore, RecordVersion } from '@/ports/studio-store';
import {
  createStudioStoreClient,
  resolveStudioStoreConfig,
  type StudioStoreClient,
  type StudioStoreConfig,
} from './client';

type VersionRow = {
  id: string;
  fields: unknown;
  origin: string;
  created_at: string;
};

// studio スキーマの record_versions を VersionStore として扱う。tenant・collection でスコープ。
export class StudioVersionStore<F> implements VersionStore<F> {
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

  private toVersion(r: VersionRow): RecordVersion<F> {
    return { id: r.id, fields: r.fields as F, origin: r.origin, createdAt: r.created_at };
  }

  async append(recordId: string, fields: F, origin: string): Promise<void> {
    const { error } = await this.getClient()
      .from('record_versions')
      .insert({
        tenant_id: this.tenantId,
        collection: this.collection,
        record_id: recordId,
        fields: fields as unknown,
        origin,
      });
    if (error) throw error;
  }

  async listForRecord(recordId: string): Promise<RecordVersion<F>[]> {
    const { data, error } = await this.getClient()
      .from('record_versions')
      .select('id, fields, origin, created_at')
      .eq('tenant_id', this.tenantId)
      .eq('collection', this.collection)
      .eq('record_id', recordId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []).map((r) => this.toVersion(r as VersionRow));
  }

  async get(versionId: string): Promise<RecordVersion<F> | null> {
    const { data, error } = await this.getClient()
      .from('record_versions')
      .select('id, fields, origin, created_at')
      .eq('id', versionId)
      .maybeSingle();
    if (error) throw error;
    return data ? this.toVersion(data as VersionRow) : null;
  }
}
