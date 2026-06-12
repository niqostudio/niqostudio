// collection の画面記述子（汎用 UI はこれを読んで描く＝schema 駆動）。
// 各 collection はこの記述子を1つ宣言するだけで list/detail/edit を得る。projects 固有の形は
// 記述子（と adapter の写像）に閉じ、汎用 UI は collection を知らない。

export type FieldKind = 'text' | 'textarea' | 'select' | 'number' | 'date' | 'list' | 'boolean' | 'reference';

export interface FieldDescriptor {
  key: string;
  label: string;
  kind: FieldKind;
  // 意味ヒント。人の編集の補助＋AI 抽出を駆動する（label だけでは曖昧な意味を明示）。
  description?: string;
  // select の選択肢。
  options?: string[];
  // 選択肢の表示ラベル（値→ラベル・overlay 由来）。reference/select の表示に上書き適用する。
  optionLabels?: Record<string, string>;
  required?: boolean;
  // 条件付き必須：指定フィールドに値がある間だけ必須として表示する（例: 住所を出すなら電話番号も必須）。
  requiredWith?: string;
  // 相互排他：指定フィールド（複数可）が値を持つ間は入力欄を出さない。指定フィールドに
  // 値が入った時点で自身は null に戻る＝排他制約違反の温床を残さない。
  exclusiveWith?: string | string[];
  // reference：同じ record 内のどの子コレクション（key）を参照するか・選択肢ラベルに使う子の項目。
  refChild?: string;
  refLabelField?: string;
  // reference（別 collection への外向き FK）：参照先テーブルと参照キー列。選択肢は live 取得する。
  refTable?: string;
  refColumn?: string;
}

// 1:N の子（problems 等）。record の fields[key] に配列で入る。
export interface ChildDescriptor {
  key: string;
  label: string;
  // 意味ヒント（この子が表す概念。AI 抽出を正しい意味に導く）。
  description?: string;
  fields: FieldDescriptor[];
}

export interface CollectionSchema {
  // カード/見出しに使うフィールド。
  titleField: string;
  // ステータスバッジに使うフィールド（任意）。
  statusField?: string;
  fields: FieldDescriptor[];
  children: ChildDescriptor[];
}
