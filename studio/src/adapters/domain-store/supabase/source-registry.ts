import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@niqostudio/db-types';
import type { SourceRegistry, SourceInput } from '@/ports/domain-store';
import type { Source } from '@/ports/domain-store';
import { createCoreClient, resolveSupabaseConfig, type SupabaseConfig } from './client';

// core.project_repositories（案件の進行中開発の正本リポ）を Source として写像する。
export class CoreProjectSourceRegistry implements SourceRegistry {
  private client: SupabaseClient<Database> | null = null;

  constructor(private readonly config?: Partial<SupabaseConfig>) {}

  private getClient(): SupabaseClient<Database> {
    if (!this.client) this.client = createCoreClient(resolveSupabaseConfig(this.config));
    return this.client;
  }

  async listForRecord(recordId: string): Promise<Source[]> {
    const { data, error } = await this.getClient()
      .from('project_repositories')
      .select('id, url, role, visibility')
      .eq('project_id', recordId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      kind: 'git',
      ref: r.url,
      visibility: r.visibility === 'public' ? 'public' : 'private',
      role: r.role,
    }));
  }

  async add(recordId: string, input: SourceInput): Promise<void> {
    const { error } = await this.getClient()
      .from('project_repositories')
      .insert({
        project_id: recordId,
        url: input.ref,
        role: input.role,
        visibility: input.visibility,
      });
    if (error) throw error;
  }

  async remove(sourceId: string): Promise<void> {
    const { error } = await this.getClient()
      .from('project_repositories')
      .delete()
      .eq('id', sourceId);
    if (error) throw error;
  }
}
