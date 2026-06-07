// 汎用核：collection の1エントリ。fields の形 F は collection binding が与える（核は形を知らない）。

export type DraftState = 'draft' | 'published';

export interface CollectionRecord<F> {
  id: string;
  fields: F;
  draftState: DraftState;
  // 由来：この record を生んだ source（手入力なら null）。
  sourceId: string | null;
  updatedAt: string;
}
