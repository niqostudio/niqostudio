import 'server-only';
import { structureFor, type StructuralCollection, type StructuralField } from '@/features/domain-overlay/overlay';
import { introspectCore } from './introspect';
import type { SupabaseConfig } from './client';

// core 構造の live introspection をプロセス内でメモ化（1リクエスト〜短命プロセスで1回叩く）。
// drift 検知時は clearStructureCache で破棄して取り直す。
let cache: Map<string, StructuralField[]> | null = null;

export async function coreStructure(
  table: string,
  config?: Partial<SupabaseConfig>,
): Promise<StructuralCollection> {
  if (!cache) cache = await introspectCore(config);
  return structureFor(table, cache);
}

export function clearStructureCache(): void {
  cache = null;
}
