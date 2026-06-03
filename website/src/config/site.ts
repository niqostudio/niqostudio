// サイト全体の定数。ブランド / ナビ / 各ページの meta（title・description）・見出しラベル。
// description は CMS 管理せず、ページ固有の SEO 文としてここで一元管理する。

// 正 URL（astro.config の site）をホスト名の単一ソースにする（astro.config が config.<env>.json の
// primary から site を必ず設定するため fallback は持たない）。
const SITE_HOST = new URL(import.meta.env.SITE!).hostname;

export const SITE = {
  name: 'NIQO STUDIO',
  // 事業の固定説明。JSON-LD の組織エンティティ・トップ meta など、事業を語る箇所の単一ソース。
  description:
    '設計・実装・運用を一貫して通す業務委託エンジニア。中小事業者・スタートアップの Web・業務システムを構築。',
  // 既定の連絡先メール（profile.contact_email 未設定時のフォールバック）。ドメインは site から導出。
  email: `hi@${SITE_HOST}`,
} as const;

// 配色テーマ（global.css の [data-theme] と対応）。既定 'cool'（寒色）/ 代替 'warm'
export const THEME: 'cool' | 'warm' = 'warm';

// 全案件の固定の入口となるサービス。一覧では別扱い（入口グループ）にし、
// 見出しは英語のプラン名を主に出す（他サービスは日本語名が主）。
export const ENTRY_SERVICE_SLUG = 'discovery';

// 各ページ: href / label=ナビ英語 / navJa=ナビ日本語(短) / title=<title>(日) / description=meta
export const PAGES = {
  works: {
    href: '/works',
    label: 'Works',
    navJa: '実績',
    title: '実績',
    description: `設計・実装・運用を一貫して手がけた ${SITE.name} の公開実績。Web サイト・業務システムの構築事例。`,
  },
  cases: {
    href: '/cases',
    label: 'Cases',
    navJa: 'ケーススタディ',
    title: 'ケーススタディ',
    description: `課題・解決策・成果でたどる ${SITE.name} のケーススタディ。中小事業者・スタートアップの業務改善事例。`,
  },
  services: {
    href: '/services',
    label: 'Services',
    navJa: 'サービス',
    title: 'サービス',
    description: '無料相談・Discovery Phase から、Web・業務システムの設計・実装・運用までを一貫提供。料金と進め方を掲載。',
  },
  about: {
    href: '/about',
    label: 'About',
    navJa: 'プロフィール',
    title: `${SITE.name} について`,
    description: `設計・実装・運用を一貫して通す業務委託エンジニア ${SITE.name} の事業内容・進め方・対応領域。`,
  },
  contact: {
    href: '/contact',
    label: 'Contact',
    navJa: 'お問い合わせ',
    title: 'お問い合わせ',
    description: `無料相談（30分）はこちらから。Web・業務システムの相談を ${SITE.name} が承ります。`,
  },
  privacy: {
    href: '/privacy',
    label: 'Privacy',
    navJa: 'プライバシーポリシー',
    title: 'プライバシーポリシー',
    description: `${SITE.name} のプライバシーポリシー。お問い合わせ時に取得する個人情報の取り扱いについて。`,
  },
} as const;

// ヘッダー / フッターのナビ順
export const NAV = [
  PAGES.works,
  PAGES.cases,
  PAGES.services,
  PAGES.about,
  PAGES.contact,
] as const;

// トップページの meta。title は KW を含む説明文（fullTitle で「… | NIQO STUDIO」になる）。
// description は事業の固定説明（SITE.description）をそのまま使う。
export const HOME = {
  title: 'Web・業務システムの設計から運用まで',
  description: SITE.description,
} as const;

// ページ末尾の CTA（Shell が描画。/about・/contact では非表示）
export const CTA = {
  heading: 'まずは無料相談から',
  body: '30分のオンライン無料相談から。設計〜運用までご一緒します。',
} as const;

// 契約フロー（無料相談 → Discovery Phase → 本契約）。ContractFlow が /contact・/about で共用。
// detail の {price} は live の Discovery サービス価格に置換される。
export const CONTRACT_FLOW = [
  { title: '無料相談', detail: '30分・Google Meet。課題と進め方をすり合わせます。' },
  { title: 'Discovery Phase', detail: '事前設計（有償 {price}）。要件・技術・費用を固めます。' },
  { title: '本契約', detail: 'Discovery Phase の費用は、本契約金額から差し引かれます。' },
] as const;
