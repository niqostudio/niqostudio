import type { CollectionSemantics } from '@/shared/records/overlay';

// inquiries（問い合わせ）の意味。構造は core から live。status は core 値をそのまま扱う（text）。
export const inquiriesSemantics: CollectionSemantics = {
  titleField: 'name',
  statusField: 'status',
  fields: {
    name: { label: '名前' },
    company: { label: '会社' },
    email: { label: 'メール' },
    subject: { label: '件名' },
    message: { label: '本文', kind: 'textarea' },
    status: { label: 'ステータス' },
    internal_notes: { label: '内部メモ', kind: 'textarea' },
    delivery_status: { label: '配信状態' },
    auto_reply_id: { label: '自動返信 ID', hidden: true },
  },
};
