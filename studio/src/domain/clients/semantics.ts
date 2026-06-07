import type { CollectionSemantics } from '@/shared/records/overlay';

// clients（顧客）の意味。構造は core から live。
export const clientsSemantics: CollectionSemantics = {
  titleField: 'public_name',
  fields: {
    slug: { label: 'slug' },
    public_name: { label: '公開名' },
    real_name: { label: '実名' },
    is_public_name_allowed: { label: '公開名の使用可', kind: 'boolean' },
    industry: { label: '業種' },
    size: { label: '規模' },
    description: { label: '説明', kind: 'textarea' },
    logo_url: { label: 'ロゴ URL' },
    website_url: { label: 'サイト URL' },
    first_contact_date: { label: '初回接触日', kind: 'date' },
    internal_notes: { label: '内部メモ', kind: 'textarea' },
  },
};
