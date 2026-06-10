import type { CollectionSemantics } from '@/features/domain-overlay/overlay';

// 打ち合わせの意味。タイトルは議題、status は予定/実施済/中止の区分（select）。
// client_id / project_id は FK＝reference として顧客・案件を選ぶ。
export const meetingsSemantics: CollectionSemantics = {
  titleField: 'title',
  statusField: 'status',
  fields: {
    client_id: { label: '顧客', order: 1 },
    project_id: { label: '案件', order: 2 },
    inquiry_id: { label: '問い合わせ', order: 3 },
    title: { label: '議題', order: 4 },
    met_on: { label: '日付', order: 5 },
    duration_min: { label: '所要時間（分）', order: 6 },
    status: {
      label: 'ステータス',
      kind: 'select',
      options: ['scheduled', 'done', 'canceled'],
      optionLabels: { scheduled: '予定', done: '実施済', canceled: '中止' },
      order: 7,
    },
    location: { label: '場所 / URL', order: 8 },
    notes: { label: '議事録', kind: 'textarea', order: 9 },
  },
};
