import type { CollectionRecord } from './record';

// 永続化境界。実装は adapters。domain はこの interface しか知らない。

// 確定の正本（SoR store）。backing は外部スキーマ or 自前 store。
export interface CollectionStore<F> {
  list(): Promise<CollectionRecord<F>[]>;
  get(id: string): Promise<CollectionRecord<F> | null>;
  upsert(record: CollectionRecord<F>): Promise<void>;
}

// 下書きのステージング（studio 自前 store）。publish 前の record を置く。
export interface DraftStore<F> {
  list(): Promise<CollectionRecord<F>[]>;
  get(id: string): Promise<CollectionRecord<F> | null>;
  save(record: CollectionRecord<F>): Promise<void>;
  remove(id: string): Promise<void>;
}
