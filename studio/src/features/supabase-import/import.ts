import { parse } from 'pgsql-ast-parser';
import type { CollectionSchema, FieldDescriptor, FieldKind } from '@/features/domain-overlay/schema';

// Supabase の migration SQL 群から collection の schema 記述子を生成する（顧客の既存スキーマ接続）。
// CREATE TABLE / ALTER TABLE を畳み込み、FK(ON DELETE CASCADE) を親子、それ以外を別 collection と見なす。
// 生成は下書き＝人が見直して採用する前提（型→種別や status の選択肢は粗い）。

interface Col {
  name: string;
  type: string;
  isArray: boolean;
  fkTable: string | null;
  fkCascade: boolean;
}
interface Table {
  name: string;
  cols: Col[];
}

export interface ImportedCollection {
  table: string;
  schema: CollectionSchema;
}

const INTERNAL = new Set(['id', 'created_at', 'updated_at', 'display_priority']);
const LONG = new Set(['content', 'note', 'notes', 'description', 'internal_notes', 'problem', 'solution', 'outcome', 'decision', 'rationale', 'summary']);
const TITLEY = ['title', 'name', 'label', 'topic', 'item', 'content', 'problem', 'kind'];

// $$ 本体やネスト括弧を考慮して文を分割し、CREATE/ALTER TABLE だけを取り出す（関数/policy/view を避ける）。
function tableStatements(sql: string): string[] {
  const noComments = sql.replace(/--[^\n]*/g, '');
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  let dollar: string | null = null;
  for (let i = 0; i < noComments.length; ) {
    if (!dollar) {
      const m = noComments.slice(i).match(/^\$[a-zA-Z0-9_]*\$/);
      if (m) { dollar = m[0]; cur += dollar; i += dollar.length; continue; }
    } else if (noComments.startsWith(dollar, i)) {
      cur += dollar; i += dollar.length; dollar = null; continue;
    }
    if (dollar) { cur += noComments[i++]; continue; }
    const ch = noComments[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { out.push(cur.trim()); cur = ''; i++; continue; }
    cur += ch; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((s) => /^(create\s+table|alter\s+table|drop\s+table)/i.test(s));
}

function colOf(def: unknown): Col | null {
  const d = def as { kind?: string; name?: { name: string }; dataType?: { name?: string; kind?: string; arrayOf?: { name?: string } }; constraints?: { type: string; foreignTable?: { name: string }; onDelete?: string }[] };
  if (d.kind !== 'column' || !d.name) return null;
  const dt = d.dataType ?? {};
  const isArray = dt.kind === 'array' || !!dt.arrayOf;
  const type = String((isArray ? dt.arrayOf?.name ?? dt.name : dt.name) ?? 'text').toLowerCase();
  let fkTable: string | null = null;
  let fkCascade = false;
  for (const c of d.constraints ?? []) {
    if (c.type === 'reference') {
      fkTable = c.foreignTable?.name ?? null;
      fkCascade = String(c.onDelete ?? '').toLowerCase().includes('cascade');
    }
  }
  return { name: d.name.name, type, isArray, fkTable, fkCascade };
}

function tablesFromSql(sqls: string[]): Map<string, Table> {
  const tables = new Map<string, Table>();
  for (const sql of sqls) {
    for (const stmt of tableStatements(sql)) {
      let ast: unknown[];
      try {
        ast = parse(stmt);
      } catch {
        continue;
      }
      for (const raw of ast) {
        const st = raw as { type: string; name?: { name: string }; columns?: unknown[]; table?: { name: string }; changes?: unknown[]; names?: { name: string }[] };
        if (st.type === 'drop table') {
          for (const n of st.names ?? []) tables.delete(n.name);
        } else if (st.type === 'create table' && st.name) {
          const cols = (st.columns ?? []).map(colOf).filter((c): c is Col => c !== null);
          tables.set(st.name.name, { name: st.name.name, cols });
        } else if (st.type === 'alter table' && st.table) {
          const tbl = tables.get(st.table.name);
          if (!tbl) continue;
          for (const ch of st.changes ?? []) {
            const c = ch as { type: string; column?: unknown; name?: { name: string } };
            if (c.type === 'add column') {
              const col = colOf(c.column);
              if (col) tbl.cols.push(col);
            } else if (c.type === 'drop column' && c.name) {
              tbl.cols = tbl.cols.filter((x) => x.name !== c.name!.name);
            }
          }
        }
      }
    }
  }
  return tables;
}

function kindFor(col: Col): FieldKind | null {
  if (col.fkTable) return null;
  if (col.isArray) return 'list';
  switch (col.type) {
    case 'boolean': case 'bool': return 'boolean';
    case 'date': return 'date';
    case 'timestamptz': case 'timestamp': case 'jsonb': case 'json': case 'uuid': return null;
    case 'integer': case 'int': case 'int4': case 'bigint': case 'numeric': return 'text';
    default: return LONG.has(col.name) ? 'textarea' : 'text';
  }
}

function fieldsOf(tbl: Table): FieldDescriptor[] {
  return tbl.cols
    .filter((c) => !INTERNAL.has(c.name))
    .map((c) => ({ col: c, kind: kindFor(c) }))
    .filter((x): x is { col: Col; kind: FieldKind } => x.kind !== null)
    .map(({ col, kind }) => ({ key: col.name, label: col.name, kind }));
}

// migration SQL 群 → collection 記述子（top-level＋葉の子）。
export function importSupabaseSchema(sqls: string[]): ImportedCollection[] {
  const tables = tablesFromSql(sqls);

  const parentOf = new Map<string, string>();
  for (const t of tables.values()) {
    const fk = t.cols.find((c) => c.fkCascade && c.fkTable);
    if (fk?.fkTable) parentOf.set(t.name, fk.fkTable);
  }
  const hasChildren = new Set([...parentOf.values()]);
  const isLeafChild = (name: string) => parentOf.has(name) && !hasChildren.has(name);

  const result: ImportedCollection[] = [];
  for (const tbl of tables.values()) {
    if (isLeafChild(tbl.name)) continue; // 親に畳む
    const childTables = [...tables.values()].filter((c) => parentOf.get(c.name) === tbl.name && isLeafChild(c.name));
    const fields = fieldsOf(tbl);
    const titleField = fields.find((f) => TITLEY.includes(f.key))?.key ?? fields[0]?.key ?? 'id';
    const statusField = fields.find((f) => f.key === 'status')?.key;
    result.push({
      table: tbl.name,
      schema: {
        titleField,
        ...(statusField ? { statusField } : {}),
        fields,
        children: childTables.map((c) => ({ key: c.name, label: c.name, fields: fieldsOf(c) })),
      },
    });
  }
  return result;
}
