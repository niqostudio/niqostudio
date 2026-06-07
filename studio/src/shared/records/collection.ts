import type { CollectionStore, DraftStore } from './ports';
import type { SourceRegistry } from './source';
import type { VersionStore } from './versioning';
import type { CollectionSchema } from './schema';
import type { ReferenceResolver } from './reference';
import type { RecordTimeline } from './timeline';
import type { WorkflowProvider } from './workflow';

// 実効スキーマは構造（core から live）×セマンティクス（overlay）で動的に組むため、binding は
// 静的 schema でなく resolveSchema() を持つ（consumer は await する）。

// collection のメタ（nav / 見出し）。
export interface CollectionMeta {
  id: string;
  label: string;
  // この collection を親 collection の画面から作る導線（案件←顧客 等）。
  // 指定があると一覧の新規ボタンは出さず、親の詳細に作成ボタンを出す（fk に親 id を入れる）。
  createVia?: { via: string; fk: string };
}

// collection の配線。SoR store（確定の正本）と staging store（下書き）を別 seam で持つ。
// backing は composition root が決める（外部スキーマ / 自前 store のどちらでもよい）。
// schema は汎用 UI の描画記述子。derive は「源から下書きを埋める」支援（持つ collection だけ）。
export interface CollectionBinding<F> {
  meta: CollectionMeta;
  resolveSchema: () => Promise<CollectionSchema>;
  store: CollectionStore<F>;
  drafts: DraftStore<F>;
  // record に紐づく取り込み源。取り込みを持つ collection だけが配線する。
  sources?: SourceRegistry;
  // 下書きの版管理（保存ごとにスナップショット・任意版へ戻す）。
  versions?: VersionStore<F>;
  // reference フィールド（外向き FK）の選択肢を解決する。
  references?: ReferenceResolver;
  // record の出来事の時系列（状態遷移など）。右ペインに出す。持つ collection だけ配線。
  history?: RecordTimeline;
  // 状態機械（ワークフロー）。詳細側で次状態へ進める。持つ collection は status を CRUD 編集から外す。
  workflow?: WorkflowProvider;
  // 源を射影して下書きへ反映する。反映できたら true。
  derive?: (recordId: string) => Promise<boolean>;
}
