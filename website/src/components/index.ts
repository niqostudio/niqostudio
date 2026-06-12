// コンポーネントの再export（バレル）。
// ページ・レイアウトはここから import し、物理配置（ui/cards/layout/form）に依存しない。
// コンポーネント間は循環を避けるため相対パスで直接 import する（バレル経由にしない）。

// ui — 汎用プリミティブ
export { default as ArrowLink } from './ui/ArrowLink.astro';
export { default as Button } from './ui/Button.astro';
export { default as Card } from './ui/Card.astro';
export { default as Chip } from './ui/Chip.astro';
export { default as Icon } from './ui/Icon.astro';
export { default as SectionLabel } from './ui/SectionLabel.astro';
export { default as PageHeader } from './ui/PageHeader.astro';
export { default as LogoMark } from './ui/LogoMark.astro';
export { default as Wordmark } from './ui/Wordmark.astro';
export { default as Jp } from './ui/Jp.astro';
export { default as RichText } from './ui/RichText.astro';

// cards — ドメインのカード
export { default as CaseCard } from './cards/CaseCard.astro';
export { default as ServiceCard } from './cards/ServiceCard.astro';
export { default as ProductCard } from './cards/ProductCard.astro';

// layout — ページのクロム
export { default as Header } from './layout/Header.astro';
export { default as Footer } from './layout/Footer.astro';
export { default as CTA } from './layout/CTA.astro';
export { default as SocialIcon } from './layout/SocialIcon.astro';
export { default as SocialLinks } from './layout/SocialLinks.astro';

// form — 入力・契約フロー
export { default as ContactForm } from './form/ContactForm.astro';
export { default as ContractFlow } from './form/ContractFlow.astro';
