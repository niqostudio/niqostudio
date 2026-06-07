import 'server-only';
import type { CollectionStore } from '@/ports/domain-store';
import type { CollectionRecord } from '@/shared/model/record';
import type { StructuralCollection } from '@/features/domain-overlay/overlay';
import { resolveSupabaseConfig, createDynamicCoreClient, type CoreClient, type SupabaseConfig } from './client';
import { coreStructure } from './structure';

type Fields = Record<string, unknown>;
type Row = Record<string, unknown> & { id: string; updated_at: string };

// core の任意テーブルを構造（live introspection）から動的に読む generic store。列は core 名のまま。
// 子として埋める表は overlay 由来（childrenOf＝実効スキーマの children）＝コードに seed を持たない。
export class CoreCollectionStore implements CollectionStore<Fields> {
  private client: CoreClient | null = null;

  constructor(
    private readonly table: string,
    private readonly childrenOf: () => Promise<string[]>,
    private readonly config?: Partial<SupabaseConfig>,
  ) {}

  private getClient(): CoreClient {
    if (!this.client) this.client = createDynamicCoreClient(resolveSupabaseConfig(this.config));
    return this.client;
  }

  private parentSelect(s: StructuralCollection): string[] {
    return ['id', 'updated_at', ...s.fields.map((f) => f.name)];
  }

  private toRecord(row: Row, s: StructuralCollection, children: StructuralCollection[]): CollectionRecord<Fields> {
    const fields: Fields = {};
    for (const f of s.fields) fields[f.name] = row[f.name] ?? (f.baseKind === 'list' ? [] : null);
    for (const c of children) {
      // 子の並びは created_at（作成順）。表示順の authoring は studio draft が持つ＝core は順序列を持たない。
      const rows = (Array.isArray(row[c.table]) ? (row[c.table] as Row[]) : [])
        .slice()
        .sort((a, b) => String(a.created_at ?? '').localeCompare(String(b.created_at ?? '')));
      fields[c.table] = rows.map(({ created_at: _c, ...rest }) => rest);
    }
    return {
      id: row.id,
      fields,
      draftState: 'published',
      sourceId: null,
      updatedAt: String(row.updated_at).slice(0, 10),
    };
  }

  async list(): Promise<CollectionRecord<Fields>[]> {
    const s = await coreStructure(this.table, this.config);
    const { data, error } = await this.getClient()
      .from(this.table)
      .select(this.parentSelect(s).join(','))
      .order('updated_at', { ascending: false });
    if (error) throw new Error(`${this.table}.list select 失敗: ${error.message}`);
    return ((data ?? []) as unknown as Row[]).map((r) => this.toRecord(r, s, []));
  }

  async get(id: string): Promise<CollectionRecord<Fields> | null> {
    const s = await coreStructure(this.table, this.config);
    const names = await this.childrenOf();
    const children = s.childTables.filter((c) => names.includes(c.table));
    const childSel = children.map((c) => `${c.table}(id,created_at,${c.fields.map((f) => f.name).join(',')})`);
    const select = [...this.parentSelect(s), ...childSel].join(',');
    const { data, error } = await this.getClient().from(this.table).select(select).eq('id', id).maybeSingle();
    if (error) throw new Error(`${this.table}.get select 失敗: ${error.message}\nselect=${select}`);
    return data ? this.toRecord(data as unknown as Row, s, children) : null;
  }

  async upsert(_record: CollectionRecord<Fields>): Promise<void> {
    // publish（下書き→core 反映）は後段。
    throw new Error('CoreCollectionStore.upsert は未実装（publish は後段）');
  }
}
