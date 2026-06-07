import 'server-only';
import type { ReferenceOption, ReferenceResolver } from '@/ports/domain-store';
import { resolveSupabaseConfig, createDynamicCoreClient, type CoreClient, type SupabaseConfig } from './client';
import { coreStructure } from './structure';

// 表示ラベルに使う列の優先順（無ければ valueColumn 自身を表示）。
const LABEL_PRIORITY = ['label', 'public_name', 'name_ja', 'name', 'title', 'slug'];

// core の参照先テーブルから reference 選択肢を live 取得する。studio は値の集合を保持しない。
export class CoreReferenceResolver implements ReferenceResolver {
  private client: CoreClient | null = null;

  constructor(private readonly config?: Partial<SupabaseConfig>) {}

  private getClient(): CoreClient {
    if (!this.client) this.client = createDynamicCoreClient(resolveSupabaseConfig(this.config));
    return this.client;
  }

  async options(table: string, valueColumn: string): Promise<ReferenceOption[]> {
    const s = await coreStructure(table, this.config);
    const names = new Set(s.fields.map((f) => f.name));
    const labelCol = LABEL_PRIORITY.find((c) => names.has(c)) ?? valueColumn;
    // 並び：display_priority は降順（大きいほど先）、sort_order はシーケンス昇順（status パイプライン）、無ければラベル昇順。
    const desc = names.has('display_priority');
    const orderCol = desc ? 'display_priority' : names.has('sort_order') ? 'sort_order' : labelCol;
    const cols = [valueColumn, labelCol, orderCol].filter((c, i, a) => a.indexOf(c) === i);
    const { data, error } = await this.getClient().from(table).select(cols.join(',')).order(orderCol, { ascending: !desc });
    if (error) throw new Error(`reference ${table} の選択肢取得に失敗: ${error.message}`);
    return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
      value: String(r[valueColumn]),
      label: String(r[labelCol] ?? r[valueColumn]),
    }));
  }
}
