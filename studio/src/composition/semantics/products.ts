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
        version: { label: 'バージョン', description: '価格改定ごとに +1（旧版は不変・is_active を外す）' },
        currency: { label: '通貨', description: 'ISO 小文字3字（usd 等）' },
        unit_amount: { label: '金額', description: '最小通貨単位（usd は 900=$9.00）' },
        billing_interval: { label: '課金間隔', description: 'month / year 等。空=一回課金' },
        access_period_days: { label: '付与日数', description: '一回課金の有効日数（空=無期限）' },
        is_active: { label: '販売中', kind: 'boolean' },
      },
    },
  },
};
