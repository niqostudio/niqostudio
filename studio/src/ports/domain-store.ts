// 接続先システム（domain-store）のデータ契約。実装は adapters/domain-store/<tech>。
// studio は保存場所/ドメインを関知せず、この interface だけを知る。port は論理1本（adapter が複数ソースを束ねてよい）。
import type { CollectionRecord } from '@/shared/model/record';

// 確定の正本（接続先 SoR）。
export interface CollectionStore<F> {
  list(): Promise<CollectionRecord<F>[]>;
  get(id: string): Promise<CollectionRecord<F> | null>;
  upsert(record: CollectionRecord<F>): Promise<void>;
}

// 集計（ダッシュボード KPI 等）。filter 省略＝全件、指定＝column IN values の件数。
export interface CountFilter {
  column: string;
  in: string[];
}
export interface MetricsProvider {
  // filter＝column IN values、before＝column <= value（日付上限。納期リスク等）。
  count(table: string, filter?: CountFilter, before?: { column: string; value: string }): Promise<number>;
  // timestamp 列の値一覧（推移グラフの集計源）。since 以降に絞れる。
  timestamps(table: string, column?: string, since?: string): Promise<string[]>;
  // 数値列の合計（filter で絞る）。受注額パイプライン等の金額集計に使う。
  sum(table: string, column: string, filter?: CountFilter): Promise<number>;
  // 指定列だけの行を取得（JS 側で集計する用途。滞留＝最新イベント判定など）。
  rows(table: string, columns: string[]): Promise<Record<string, unknown>[]>;
}

// reference（外向き FK）の選択肢解決。value＝参照キー、label＝表示用に選んだ列。
export interface ReferenceOption {
  value: string;
  label: string;
}
export interface ReferenceResolver {
  options(table: string, valueColumn: string): Promise<ReferenceOption[]>;
}

// record の出来事の時系列（状態遷移など）。右ペインに出す。
export interface TimelineEntry {
  at: string;
  from: string | null;
  to: string;
  fromLabel: string | null;
  toLabel: string;
}
export interface RecordTimeline {
  list(recordId: string): Promise<TimelineEntry[]>;
}

// 状態機械（許容遷移は接続先が正本。studio は読むだけ）。
export interface WorkflowState {
  value: string;
  label: string;
}
export interface WorkflowProvider {
  nextStates(current: string | null): Promise<WorkflowState[]>;
  // 状態機械の全遷移（エッジ）。グラフ表示で枝分かれを描くのに使う。
  transitions(): Promise<{ from: string; to: string }[]>;
}

// record に紐づく取り込み源（source）。取得方法・射影は feature（git-import 等）が担う。
export type SourceKind = 'git';
export interface Source {
  id: string;
  kind: SourceKind;
  ref: string;
  visibility: 'public' | 'private';
  role: string | null;
}
export interface SourceInput {
  ref: string;
  role: string | null;
  visibility: 'public' | 'private';
}
export interface SourceRegistry {
  listForRecord(recordId: string): Promise<Source[]>;
  add(recordId: string, input: SourceInput): Promise<void>;
  remove(sourceId: string): Promise<void>;
}
