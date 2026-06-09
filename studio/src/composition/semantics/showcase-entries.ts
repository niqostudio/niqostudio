import type { CollectionSemantics } from '@/features/domain-overlay/overlay';

// showcase_entries（公開事例の curation）の意味。title/status は既定の field 名と一致。
// project_id / product_id はどちらか一方（外向き FK＝reference）。
export const showcaseEntriesSemantics: CollectionSemantics = {
  fields: {
    project_id: { label: '案件' },
    product_id: { label: 'プロダクト' },
    slug: { label: 'slug', hidden: true },
    title: { label: '公開見出し' },
    summary: { label: '公開リード', kind: 'textarea' },
    body_md: { label: '本文（Markdown）', kind: 'textarea' },
    thumbnail_url: { label: 'サムネ URL' },
    period: { label: '期間（表示）' },
    client_display: {
      label: '顧客表示',
      kind: 'select',
      options: ['named', 'anonymized', 'hidden'],
      optionLabels: { named: '実名', anonymized: '匿名', hidden: '非表示' },
    },
    status: {
      label: '公開状態',
      kind: 'select',
      options: ['draft', 'published', 'archived'],
      optionLabels: { draft: '下書き', published: '公開', archived: 'アーカイブ' },
    },
    display_priority: { label: '表示順' },
  },
};
