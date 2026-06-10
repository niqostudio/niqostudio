import type { CollectionSemantics } from '@/features/domain-overlay/overlay';

// 請求書の意味。タイトルは摘要、status は下書き/請求済/入金済/無効。
// client_id（必須）/ project_id（任意）は FK＝reference で顧客・案件を選ぶ。
export const invoicesSemantics: CollectionSemantics = {
  titleField: 'title',
  statusField: 'status',
  fields: {
    client_id: { label: '顧客', order: 1 },
    project_id: { label: '案件', order: 2 },
    invoice_no: { label: '請求書番号', order: 3 },
    title: { label: '摘要', order: 4 },
    subtotal: { label: '小計（税抜）', order: 5 },
    tax: { label: '消費税', order: 6 },
    withholding: { label: '源泉徴収', order: 7 },
    status: {
      label: 'ステータス',
      kind: 'select',
      options: ['draft', 'sent', 'paid', 'void'],
      optionLabels: { draft: '下書き', sent: '請求済', paid: '入金済', void: '無効' },
      order: 8,
    },
    issued_on: { label: '発行日', order: 9 },
    due_on: { label: '支払期日', order: 10 },
    paid_on: { label: '入金日', order: 11 },
    paid_amount: { label: '入金額（実入金）', order: 12 },
    pdf_url: { label: 'PDF（請求書の URL）', order: 13 },
    notes: { label: 'メモ', kind: 'textarea', order: 14 },
    external_id: { label: '連携 id（freee 等）', order: 15 },
  },
};
