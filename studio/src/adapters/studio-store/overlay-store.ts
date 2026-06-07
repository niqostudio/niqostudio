import 'server-only';
import { createHash } from 'node:crypto';
import type { CollectionSemantics } from '@/shared/records/overlay';
import {
  createStudioStoreClient,
  resolveStudioStoreConfig,
  type RecordRow,
  type StudioStoreClient,
  type StudioStoreConfig,
} from './client';

// semantics overlay（画面入力の意味）を studio.records に予約 collection で相乗りで持つ（新テーブル不要）。
// records.id は uuid なので collection 名から決定的 uuid を作って行 id にする（upsert が安定・名で引ける）。
const OVERLAY_COLLECTION = '__semantics__';

// 名前 → 決定的 uuid（sha1 を uuid 体裁に整形＝version/variant ビットを固定）。
function nameUuid(name: string): string {
  const h = createHash('sha1').update(name).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export class StudioOverlayStore {
  private client: StudioStoreClient | null = null;

  constructor(
    private readonly tenantId: string,
    private readonly config?: Partial<StudioStoreConfig>,
  ) {}

  private getClient(): StudioStoreClient {
    if (!this.client) this.client = createStudioStoreClient(resolveStudioStoreConfig(this.config));
    return this.client;
  }

  private rowId(collection: string): string {
    return nameUuid(`${OVERLAY_COLLECTION}:${this.tenantId}:${collection}`);
  }

  async get(collection: string): Promise<CollectionSemantics | null> {
    const { data, error } = await this.getClient()
      .from('records')
      .select('fields')
      .eq('id', this.rowId(collection))
      .maybeSingle();
    if (error) throw error;
    return data ? ((data as { fields: unknown }).fields as CollectionSemantics) : null;
  }

  async save(collection: string, semantics: CollectionSemantics): Promise<void> {
    const { error } = await this.getClient()
      .from('records')
      .upsert({
        id: this.rowId(collection),
        tenant_id: this.tenantId,
        collection: OVERLAY_COLLECTION,
        source_id: null,
        fields: semantics as unknown as RecordRow['fields'],
        draft_state: 'published',
      });
    if (error) throw error;
  }
}
