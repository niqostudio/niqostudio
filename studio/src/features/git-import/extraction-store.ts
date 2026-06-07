import type { Extraction } from '@/features/git-import/ingestion';
import {
  createStudioStoreClient,
  resolveStudioStoreConfig,
  type StudioStoreClient,
  type StudioStoreConfig,
} from '@/adapters/studio-store/supabase/client';

export interface StoredExtraction {
  id: string;
  projectId: string;
  graph: Extraction;
  createdAt: string;
}

type Row = { id: string; project_id: string; graph: unknown; created_at: string };

// git 取り込みの中間表現（studio.extractions）。deriver が save、dev 可視化が list。
export class StudioExtractionStore {
  private client: StudioStoreClient | null = null;

  constructor(
    private readonly tenantId: string,
    private readonly config?: Partial<StudioStoreConfig>,
  ) {}

  private getClient(): StudioStoreClient {
    if (!this.client) this.client = createStudioStoreClient(resolveStudioStoreConfig(this.config));
    return this.client;
  }

  async save(projectId: string, graph: Extraction): Promise<void> {
    const { error } = await this.getClient()
      .from('extractions')
      .insert({ tenant_id: this.tenantId, project_id: projectId, graph: graph as unknown });
    if (error) throw error;
  }

  async list(limit = 20): Promise<StoredExtraction[]> {
    const { data, error } = await this.getClient()
      .from('extractions')
      .select('id, project_id, graph, created_at')
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const row = r as Row;
      return {
        id: row.id,
        projectId: row.project_id,
        graph: row.graph as Extraction,
        createdAt: row.created_at,
      };
    });
  }
}
