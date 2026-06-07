import 'server-only';
import { resolveSupabaseConfig, type SupabaseConfig } from './client';
import type { StructuralField } from '@/features/domain-overlay/overlay';
import type { FieldKind } from '@/features/domain-overlay/schema';

// PostgREST の OpenAPI（GET /rest/v1/）から public スキーマの構造を live で取る（core 変更ゼロ）。
// 列の型→基底種別、FK は列 description の <fk table='..'/> から。グルーピング/精緻化は overlay 側。

interface OpenApiProp {
  type?: string;
  format?: string;
  description?: string;
}
interface OpenApiDef {
  properties?: Record<string, OpenApiProp>;
  required?: string[];
}
interface OpenApiDoc {
  definitions?: Record<string, OpenApiDef>;
}

// 監査・主キー・テナント列は編集面に出さない。
const INTERNAL = new Set(['id', 'created_at', 'updated_at', 'tenant_id']);

function baseKindOf(p: OpenApiProp): FieldKind {
  if (p.type === 'array') return 'list';
  const f = (p.format ?? '').toLowerCase();
  if (f === 'date' || f.startsWith('timestamp')) return 'date';
  if (f === 'boolean' || f === 'bool') return 'boolean';
  return 'text';
}

function fkOf(p: OpenApiProp): { table: string; column: string } | null {
  const m = (p.description ?? '').match(/<fk table='([^']+)' column='([^']+)'/);
  return m ? { table: m[1], column: m[2] } : null;
}

function fieldsOf(def: OpenApiDef): StructuralField[] {
  const required = new Set(def.required ?? []);
  return Object.entries(def.properties ?? {})
    .filter(([name]) => !INTERNAL.has(name))
    .map(([name, p]) => {
      const fk = fkOf(p);
      return {
        name,
        baseKind: baseKindOf(p),
        refTable: fk?.table ?? null,
        refColumn: fk?.column ?? null,
        required: required.has(name),
      };
    });
}

// 全 public テーブルの構造（table → fields）を live で返す。
export async function introspectCore(
  config?: Partial<SupabaseConfig>,
): Promise<Map<string, StructuralField[]>> {
  const { url, key } = resolveSupabaseConfig(config);
  const res = await fetch(`${url}/rest/v1/`, {
    // core スキーマの OpenAPI を取る（業務データは core 名前空間）。
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Accept-Profile': 'core' },
  });
  if (!res.ok) throw new Error(`introspection に失敗: ${res.status} ${res.statusText}`);
  const doc = (await res.json()) as OpenApiDoc;
  const out = new Map<string, StructuralField[]>();
  for (const [table, def] of Object.entries(doc.definitions ?? {})) out.set(table, fieldsOf(def));
  return out;
}
