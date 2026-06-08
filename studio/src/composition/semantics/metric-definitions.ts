import type { CollectionSemantics } from '@/features/domain-overlay/overlay';

// 指標マスタ（カタログ）の意味。機械的（technical）/ビジネス（business）を kind で区別、auto＝スクリプト測定可。
export const metricDefinitionsSemantics: CollectionSemantics = {
  titleField: 'label',
  fields: {
    label: { label: '指標名', order: 1 },
    key: { label: 'キー', description: 'スクリプト測定の対応キー（technical）', order: 2 },
    unit: { label: '単位', order: 3 },
    kind: {
      label: '種別',
      kind: 'select',
      options: ['technical', 'business'],
      optionLabels: { technical: '機械的（技術）', business: 'ビジネス' },
      order: 4,
    },
    auto: { label: 'スクリプト測定可', kind: 'boolean', order: 5 },
    howto: { label: '測り方（手動）', kind: 'textarea', order: 6 },
    sort_order: { label: '並び順', order: 7 },
    is_active: { label: '有効', kind: 'boolean', order: 8 },
  },
};
