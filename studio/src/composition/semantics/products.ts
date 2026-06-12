import type { CollectionSemantics } from '@/features/domain-overlay/overlay';

// products（自社プロダクト＝継続実体）の意味。構造は core から live。
// SaaS 製品は is_saas で明示し、課金の商品（offer・価格）を子 product_offers として編集する。
// 価格（currency / unit_amount / billing_interval）は version 単位で不変（core のトリガが UPDATE を拒否）＝
// 改定は「新しい version の offer 行を追加」して旧の is_active を外す（saas-products: sync が現行版を反映）。
export const productsSemantics: CollectionSemantics = {
  titleField: 'name',
  fields: {
    slug: { label: 'スラッグ（製品コード）', description: 'SaaS 製品コード・Stripe lookup key の基底' },
    name: { label: '名称' },
    summary: { label: '概要', kind: 'textarea' },
    status: {
      label: '状態',
      // 値集合は core の CHECK 制約（introspection に出ないため overlay に列挙して select 化）。
      kind: 'select',
      options: ['active', 'maintained', 'sunset'],
      optionLabels: { active: '稼働中', maintained: '保守', sunset: '終了' },
    },
    is_saas: {
      label: 'SaaS 製品',
      kind: 'boolean',
      description: '顧客がサインアップ・課金できる製品（identity / Stripe 反映の対象）',
    },
    tech_stack: { label: '技術スタック' },
    launched_on: { label: '公開日', kind: 'date' },
    internal_notes: { label: '内部メモ', kind: 'textarea' },
  },
  children: {
    product_offers: {
      label: '商品（offer・価格）',
      description: 'SaaS の販売単位。billing_interval 有=サブスク / 無=一回課金（access_period_days で付与日数）',
      fields: {
        key: { label: 'offer キー', description: '例: launch_pass / pro_monthly' },
        version: { label: 'バージョン', kind: 'number', description: '価格改定ごとに +1（旧版は不変・is_active を外す）' },
        currency: {
          label: '通貨',
          kind: 'select',
          options: ['usd'],
          description: '一律 usd（多通貨は Stripe の Adaptive Pricing が購入者の地域通貨へ自動換算）',
        },
        unit_amount: { label: '金額', kind: 'number', description: '最小通貨単位（usd は 900=$9.00）' },
        billing_interval: {
          label: '課金タイプ',
          kind: 'select',
          options: ['month', 'year'],
          optionLabels: { '': '買い切り（一回課金）', month: '月額サブスク', year: '年額サブスク' },
          description: 'サブスクの課金周期。買い切りの期限は付与日数で持つ',
        },
        access_period_days: {
          label: '付与日数',
          kind: 'number',
          description: '買い切りの有効日数（空=無期限）。サブスクでは設定しない',
        },
        is_active: { label: '販売中', kind: 'boolean' },
      },
    },
  },
};
