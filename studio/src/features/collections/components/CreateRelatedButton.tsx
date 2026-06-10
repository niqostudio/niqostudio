import type { ComponentType } from 'react';
import { Plus } from 'lucide-react';
import { createRecordAction } from '../actions';

// 親 record の詳細から子 collection を作る（fk に親 id を入れて作成→そのエディタへ）。
// アイコンは対象 collection のもの（請求=円 / NDA=文書 等）。未指定は Plus。
export function CreateRelatedButton({
  targetCollection,
  fk,
  parentId,
  label,
  icon: Icon = Plus,
}: {
  targetCollection: string;
  fk: string;
  parentId: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <form action={createRecordAction.bind(null, targetCollection, { [fk]: parentId })}>
      <button type="submit" className="btn btn-secondary inline-flex items-center gap-1.5">
        <Icon className="size-4" />
        {label}
      </button>
    </form>
  );
}
