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
    // 特商法の事業者ブロック（operator.json → 各製品の特商法ページに出る）。
    // 表示は二択：住所＋電話番号（セットで必須）か、開示方式の文言で両方を省略するか。
    legal_seller_name: {
      label: '特商法・事業者名（本名）',
      required: true,
      description: '特商法の表記で省略できない項目（屋号だけでは不可）',
      order: 10,
    },
    legal_responsible_person: {
      label: '特商法・運営責任者',
      description: '任意（個人事業主で事業者名と同じなら空でよい）',
      order: 11,
    },
    legal_address: {
      label: '特商法・住所',
      requiredWith: 'legal_phone',
      exclusiveWith: 'legal_disclosure_policy',
      description: '表示する場合は電話番号とセットで必須。省略するなら「開示方式の文言」を記入',
      order: 12,
    },
    legal_phone: {
      label: '特商法・電話番号',
      requiredWith: 'legal_address',
      exclusiveWith: 'legal_disclosure_policy',
      description: '表示する場合は住所とセットで必須。省略するなら「開示方式の文言」を記入',
      order: 13,
    },
    legal_disclosure_policy: {
      label: '特商法・開示方式の文言',
      kind: 'textarea',
      exclusiveWith: ['legal_address', 'legal_phone'],
      description: '住所・電話番号を省略する場合に「請求があり次第遅滞なく開示する」旨を記入（記入すると住所・電話欄は閉じる）',
      order: 14,
    },
    legal_contact_email: {
      label: '特商法・連絡先メール',
      description: '任意（問い合わせ先として表示する場合）',
      order: 15,
    },
  },
};
