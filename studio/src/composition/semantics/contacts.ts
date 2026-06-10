import type { CollectionSemantics } from '@/features/domain-overlay/overlay';

// 顧客担当者（人）の意味。client_id は FK＝reference として会社を選ぶ（任意）。
export const contactsSemantics: CollectionSemantics = {
  titleField: 'name',
  fields: {
    name: { label: '氏名', order: 1 },
    client_id: { label: '顧客（会社）', order: 2 },
    role: { label: '役職', order: 3 },
    email: { label: 'メール', order: 4 },
    phone: { label: '電話', order: 5 },
    notes: { label: 'メモ', kind: 'textarea', order: 6 },
  },
};
