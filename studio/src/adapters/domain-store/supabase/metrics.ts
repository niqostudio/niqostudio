import 'server-only';
import type { MetricsProvider, CountFilter } from '@/ports/domain-store';
import { resolveSupabaseConfig, createDynamicCoreClient, type CoreClient, type SupabaseConfig } from './client';

// core の任意テーブルの件数を返す（head:true で行を取らず count だけ取得）。
export class CoreMetricsProvider implements MetricsProvider {
  private client: CoreClient | null = null;

  constructor(private readonly config?: Partial<SupabaseConfig>) {}

  private getClient(): CoreClient {
    if (!this.client) this.client = createDynamicCoreClient(resolveSupabaseConfig(this.config));
    return this.client;
  }

  async count(table: string, filter?: CountFilter): Promise<number> {
    const base = this.getClient().from(table).select('id', { count: 'exact', head: true });
    const { count, error } = await (filter ? base.in(filter.column, filter.in) : base);
    if (error) throw new Error(`${table}.count 失敗: ${error.message}`);
    return count ?? 0;
  }
}
