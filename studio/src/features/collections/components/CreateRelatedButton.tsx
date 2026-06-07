'use client';

import { Plus } from 'lucide-react';
import { createRecordAction } from '../actions';

// 親 record の詳細から子 collection を作る（fk に親 id を入れて作成→そのエディタへ）。
export function CreateRelatedButton({
  targetCollection,
  fk,
  parentId,
  label,
}: {
  targetCollection: string;
  fk: string;
  parentId: string;
  label: string;
}) {
  return (
    <form action={createRecordAction.bind(null, targetCollection, { [fk]: parentId })}>
      <button type="submit" className="btn btn-secondary inline-flex items-center gap-1.5">
        <Plus className="size-4" />
        {label}
      </button>
    </form>
  );
}
