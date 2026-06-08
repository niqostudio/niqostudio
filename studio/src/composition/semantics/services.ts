import type { CollectionSemantics } from '@/features/domain-overlay/overlay';

// services（提供サービス）の意味。構造は core から live。
export const servicesSemantics: CollectionSemantics = {
  titleField: 'name_ja',
  fields: {
    slug: { label: 'slug' },
    name: { label: '名称（英）' },
    name_ja: { label: '名称（和）' },
    headline: { label: '見出し' },
    summary: { label: '概要', kind: 'textarea' },
    details: { label: '詳細', kind: 'textarea' },
    target_pains: { label: '対象の課題' },
    coverage: { label: '対応範囲' },
    deliverables: { label: '成果物' },
    followups: { label: 'フォロー' },
    exclusions: { label: '対象外' },
    pricing: { label: '料金（JSON）', kind: 'textarea' },
    price_min: { label: '最小額' },
    currency: { label: '通貨' },
    duration: { label: '期間' },
    display_priority: { label: '表示順' },
    is_active: { label: '公開中' },
  },
};
