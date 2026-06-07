// studio 自身の作業データ（studio-store）の契約。実装は adapters/studio-store/<tech>。
// publish 前の下書き・その版を置く（接続先＝domain-store とは別系統）。
import type { CollectionRecord } from '@/shared/model/record';

// 下書きのステージング（publish 前の record）。
export interface DraftStore<F> {
  list(): Promise<CollectionRecord<F>[]>;
  get(id: string): Promise<CollectionRecord<F> | null>;
  save(record: CollectionRecord<F>): Promise<void>;
  remove(id: string): Promise<void>;
}

// 下書きの版（スナップショット）。append-only の履歴。
export interface RecordVersion<F> {
  id: string;
  fields: F;
  origin: string;
  createdAt: string;
}
export interface VersionStore<F> {
  append(recordId: string, fields: F, origin: string): Promise<void>;
  listForRecord(recordId: string): Promise<RecordVersion<F>[]>;
  get(versionId: string): Promise<RecordVersion<F> | null>;
}
