// 下書きの版（スナップショット）。
export interface RecordVersion<F> {
  id: string;
  fields: F;
  origin: string;
  createdAt: string;
}

// 版の追記・取得（studio 自前 store）。append-only の履歴。
export interface VersionStore<F> {
  append(recordId: string, fields: F, origin: string): Promise<void>;
  listForRecord(recordId: string): Promise<RecordVersion<F>[]>;
  get(versionId: string): Promise<RecordVersion<F> | null>;
}
