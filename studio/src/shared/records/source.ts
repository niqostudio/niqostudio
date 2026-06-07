// record に紐づく取り込み源（source）の契約。collection 非依存＝binding が持つ汎用概念。
// 取得方法（ローカル/リモート）の吸収・射影は各 feature（git-import 等）が担う。

export type SourceKind = 'git';

export interface Source {
  id: string;
  kind: SourceKind;
  // url またはローカルパス。
  ref: string;
  visibility: 'public' | 'private';
  // 源の役割ラベル（monorepo / site / infra 等）。任意。
  role: string | null;
}

// 源の登録内容（追加時の入力）。
export interface SourceInput {
  ref: string;
  role: string | null;
  visibility: 'public' | 'private';
}

// record に紐づく源を解決・編集する（binding が持つ）。実装は adapter。
export interface SourceRegistry {
  listForRecord(recordId: string): Promise<Source[]>;
  add(recordId: string, input: SourceInput): Promise<void>;
  remove(sourceId: string): Promise<void>;
}
