import type { CollectionSemantics } from '@/features/domain-overlay/overlay';

// profile（屋号/ブランドの singleton・id='singleton' 固定で1行）の意味。
export const profileSemantics: CollectionSemantics = {
  titleField: 'display_name',
  fields: {
    display_name: { label: '表示名' },
    handle: { label: 'ハンドル' },
    tagline: { label: 'タグライン' },
    bio: { label: '自己紹介', kind: 'textarea' },
    operation_policy: { label: '運営方針', kind: 'textarea' },
    contact_email: { label: '連絡先メール' },
    skills: { label: 'スキル' },
    social_links: { label: 'ソーシャル（JSON）', kind: 'textarea' },
    logo_svg: { label: 'ロゴ SVG', kind: 'textarea' },
  },
};
