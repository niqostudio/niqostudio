import type { ComponentType, ReactNode } from 'react';
import type {
  CollectionStore,
  SourceRegistry,
  ReferenceResolver,
  RecordTimeline,
  WorkflowProvider,
} from '@/ports/domain-store';
import type { DraftStore, VersionStore } from '@/ports/studio-store';
import type { CollectionSchema } from '@/features/domain-overlay/schema';

// 汎用 UI が扱う record の fields（記述子のキーでアクセスする袋）と値ヘルパ。
// どの collection が在るか・binding の解決は composition（@/composition/collections）が持つ。
export type Fields = Record<string, unknown>;

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function asChildren(value: unknown): Fields[] {
  return Array.isArray(value) ? (value as Fields[]) : [];
}

// 値を canonical 順（order）で並べ、order 外は末尾に入力順のまま残す（安定ソート）。status タブの表示順などに使う。
export function orderByList<T>(values: T[], order: T[]): T[] {
  const rank = (v: T) => {
    const i = order.indexOf(v);
    return i < 0 ? order.length : i;
  };
  return [...values].sort((a, b) => rank(a) - rank(b));
}

// collection のメタ（nav / 見出し）。
export interface CollectionMeta {
  id: string;
  label: string;
  // nav・作成ボタンで使うアイコン（その collection が表す実体＝請求=円 / NDA=文書 等）。
  icon?: ComponentType<{ className?: string }>;
  // この collection を親 collection の画面から作る導線（案件←顧客、事例←案件/プロダクト 等）。
  // 指定があると一覧の新規ボタンは出さず、各親の詳細に作成ボタンを出す（fk に親 id を入れる）。
  // 配列＝複数の親を持てる（showcase は project_id xor product_id）。
  createVia?: { via: string; fk: string }[];
  // 一覧の「新規」をこの URL への遷移にする（専用の作成 UI＝カスケード選択等。createVia と併用可）。
  createHref?: string;
  // singleton（profile 等の固定1行）。一覧に新規ボタンを出さない。
  singleton?: boolean;
}

// collection の配線。SoR store（確定の正本）と staging store（下書き）を別 seam で持つ。
// backing は composition root が決める（接続先 / 自前 store のどちらでもよい）。
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
  // record 単位のカスタム操作（詳細ペインのボタン）。接続先固有のワークフローを composition が差す。
  recordActions?: RecordAction[];
  // この collection 専用の詳細ビュー（汎用 RecordDetail を上書き）。composition が差す（例：NDA 読み合わせ）。
  detail?: (props: { collection: string; id: string }) => ReactNode | Promise<ReactNode>;
  // 汎用詳細の中に足す読み取りの補助表示（例：案件の総工数・打ち合わせ一覧）。composition が差す（複数可）。
  detailExtras?: ((props: { id: string }) => ReactNode | Promise<ReactNode>)[];
}

// 詳細ペインの record 単位アクション（例：問い合わせ→顧客 転換）。run は server action。
export interface RecordAction {
  id: string;
  label: string;
  // ボタンのアイコン（意味で統一＝作成は Plus・変換は UserPlus/FolderPlus・計測は Activity）。createVia の作成ボタンと揃える。
  icon?: ComponentType<{ className?: string }>;
  run: (recordId: string, formData?: FormData) => Promise<void>;
}
