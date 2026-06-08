import type { CollectionSemantics } from '@/features/domain-overlay/overlay';

// ndas（案件ごとの公開可否合意）の意味。project と 1:1。標準の title 列が無いため reference を見出しに。
export const ndasSemantics: CollectionSemantics = {
  titleField: 'reference',
  fields: {
    project_id: { label: '案件' },
    reference: { label: 'NDA 文書' },
    agreed_on: { label: '合意日' },
    status: {
      label: '状態',
      kind: 'select',
      options: ['draft', 'agreed'],
      optionLabels: { draft: '下書き', agreed: '合意済' },
    },
    notes: { label: 'メモ', kind: 'textarea' },
    publish_problems: { label: '課題を公開' },
    publish_deliverables: { label: '成果物を公開' },
    publish_metrics: { label: '数値を公開' },
    publish_testimonial: { label: '推薦文を公開' },
  },
};
