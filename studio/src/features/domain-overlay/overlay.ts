import type { CollectionSchema, ChildDescriptor, FieldDescriptor, FieldKind } from './schema';

// schema を「構造（core から live import）× セマンティクス（画面入力の overlay）」で組む。
// studio は core の列を持たない（重複しない）。意味（label/ヒント/種別精緻化/title/グルーピング）だけを
// overlay として持ち、field 名キーで結ぶ＝core 変更に強い（消えた列の overlay は無視・新列は素のまま出る）。

// --- 構造：live import で得る（core 由来・studio は保持しない） ---
export interface StructuralField {
  name: string;
  // 型から導いた基底種別（text/date/boolean/list…）。
  baseKind: FieldKind;
  // FK 参照先テーブル（あれば）。
  refTable: string | null;
  // FK 参照先の列（参照キー。status→code・*_id→id 等）。
  refColumn: string | null;
  required: boolean;
}

export interface StructuralCollection {
  table: string;
  fields: StructuralField[];
  // FK で従属する子テーブル（1:N）。
  childTables: StructuralCollection[];
}

// --- セマンティクス：画面から入力する overlay（core に無い意味） ---
export interface FieldSemantics {
  label?: string;
  // 意味ヒント（人の編集補助＋AI 抽出を駆動）。
  description?: string;
  // 基底種別の精緻化（text→textarea/select、参照の reference 化など）。
  kind?: FieldKind;
  options?: string[];
  // 選択肢の表示ラベル（値→ラベル）。値の集合・制約は core、ラベルは overlay（schema config で編集）。
  optionLabels?: Record<string, string>;
  // 表示上の必須（DB の NOT NULL とは独立。法令等の運用必須を UI に示す）。
  required?: boolean;
  // 条件付き必須：指定フィールドに値がある間だけ必須として表示。
  requiredWith?: string;
  // 相互排他の相手フィールド（複数可・core の制約や法令の択一を編集 UI に写す）。
  exclusiveWith?: string | string[];
  hidden?: boolean;
  order?: number;
}

export interface ChildSemantics {
  label?: string;
  description?: string;
  hidden?: boolean;
  order?: number;
  fields?: Record<string, FieldSemantics>;
}

export interface CollectionSemantics {
  titleField?: string;
  statusField?: string;
  fields?: Record<string, FieldSemantics>;
  children?: Record<string, ChildSemantics>;
}

// asReference=true（親フィールド）は外向き FK を reference として残す（選択肢は別 collection から live）。
// false（子フィールド）は FK 列を落とす＝同じ record 内の関係は子グルーピング側で扱う（現状維持）。
function refine(
  structurals: StructuralField[],
  sem: Record<string, FieldSemantics>,
  asReference: boolean,
): FieldDescriptor[] {
  return structurals
    .filter((f) => (asReference ? true : !f.refTable))
    .filter((f) => !sem[f.name]?.hidden)
    .map((f) => ({ f, s: sem[f.name] ?? {} }))
    .sort((a, b) => (a.s.order ?? 0) - (b.s.order ?? 0))
    .map(({ f, s }) => {
      const isRef = asReference && !!f.refTable;
      return {
        key: f.name,
        label: s.label ?? f.name,
        kind: s.kind ?? (isRef ? 'reference' : f.baseKind),
        ...(f.required || s.required ? { required: true } : {}),
        ...(s.description ? { description: s.description } : {}),
        ...(s.options ? { options: s.options } : {}),
        ...(s.optionLabels ? { optionLabels: s.optionLabels } : {}),
        ...(s.requiredWith ? { requiredWith: s.requiredWith } : {}),
        ...(s.exclusiveWith ? { exclusiveWith: s.exclusiveWith } : {}),
        ...(isRef ? { refTable: f.refTable!, ...(f.refColumn ? { refColumn: f.refColumn } : {}) } : {}),
      };
    });
}

// 構造 × セマンティクス → 実効スキーマ（schema 駆動 UI の契約）。
export function buildSchema(
  structure: StructuralCollection,
  semantics: CollectionSemantics = {},
): CollectionSchema {
  const fields = refine(structure.fields, semantics.fields ?? {}, true);

  // 子（1:N のグルーピング）は overlay で宣言したものだけ＝allowlist。未宣言の FK 表（別 collection・
  // 公開 view 等）は子にしない（fields は構造から自動だが、子テーブルの取り込みは意味決定）。
  const childSem = semantics.children ?? {};
  const children: ChildDescriptor[] = structure.childTables
    .filter((c) => childSem[c.table] && !childSem[c.table]?.hidden)
    .map((c) => ({ c, s: childSem[c.table] ?? {} }))
    .sort((a, b) => (a.s.order ?? 0) - (b.s.order ?? 0))
    .map(({ c, s }) => ({
      key: c.table,
      label: s.label ?? c.table,
      ...(s.description ? { description: s.description } : {}),
      fields: refine(c.fields, s.fields ?? {}, false),
    }));

  const names = new Set(structure.fields.map((f) => f.name));
  const titleField =
    semantics.titleField ??
    (names.has('title') ? 'title' : names.has('name') ? 'name' : fields[0]?.key ?? 'id');
  const statusField = semantics.statusField ?? (names.has('status') ? 'status' : undefined);

  return { titleField, ...(statusField ? { statusField } : {}), fields, children };
}

// introspect 結果（table → fields）から root を親に、root へ FK を持つテーブルを子に畳む。
// 余分な子（公開ゲートの ndas・源リポ等）は overlay の hidden で落とす。
export function structureFor(
  root: string,
  tables: Map<string, StructuralField[]>,
): StructuralCollection {
  const childTables: StructuralCollection[] = [...tables.entries()]
    .filter(([t, fields]) => t !== root && fields.some((f) => f.refTable === root))
    .map(([t, fields]) => ({ table: t, fields, childTables: [] }));
  return { table: root, fields: tables.get(root) ?? [], childTables };
}
