import type { CollectionSemantics } from '@/features/domain-overlay/overlay';

// 工数（作業ログ）の意味。タイトルは作業内容。project_id は FK＝reference として案件を選ぶ。
export const workLogsSemantics: CollectionSemantics = {
  titleField: 'task',
  fields: {
    project_id: { label: '案件', order: 1 },
    worked_on: { label: '作業日', order: 2 },
    hours: { label: '工数（時間）', order: 3 },
    task: { label: '作業内容', order: 4 },
    note: { label: 'メモ', kind: 'textarea', order: 5 },
  },
};
