// 汎用 UI が扱う record の fields（記述子のキーでアクセスする袋）と値ヘルパ。
// どの collection が在るか・binding の解決は composition（@/composition/collections）が持つ。
export type Fields = Record<string, unknown>;

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function asChildren(value: unknown): Fields[] {
  return Array.isArray(value) ? (value as Fields[]) : [];
}
