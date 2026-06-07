// 別 collection への外向き FK（reference フィールド）の選択肢を解決する境界。実装は adapters。
// value＝参照キー（status→code・*_id→id）、label＝表示用に選んだ列。構造は core から live。

export interface ReferenceOption {
  value: string;
  label: string;
}

export interface ReferenceResolver {
  // 参照先テーブルの選択肢を返す（valueColumn＝FK 参照キー列）。
  options(table: string, valueColumn: string): Promise<ReferenceOption[]>;
}
