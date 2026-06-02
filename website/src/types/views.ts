// website のドメイン語彙で表したビューモデル。core の行型とは独立。

export type ClientRef = { name: string; industry: string };
export type Metric = { label: string; before: string; after: string };
export type ContentLink = { slug: string; title: string };

export type WorkView = {
  slug: string;
  title: string;
  client: ClientRef | null;
  period: string | null;
  scope: string[];
  techStack: string[];
  summary: string | null;
  thumbnail: string | null;
  images: string[];
  publicUrl: string | null;
  relatedCases: ContentLink[];
};

export type CaseView = {
  slug: string;
  title: string;
  summary: string | null;
  client: ClientRef | null;
  problem: string | null;
  solution: string | null;
  outcome: string | null;
  metrics: Metric[];
  techDetails: string | null;
  thumbnail: string | null;
  images: string[];
};

export type PricingTier = { name: string; price: string; scope?: string };
export type PricingFactor = { name: string; price: string };
export type Pricing = {
  base_price?: string;
  tiers?: PricingTier[];
  factors?: PricingFactor[];
  notes?: string;
};

export type ServiceView = {
  slug: string;
  name: string;
  nameJa: string | null;
  // 見出しで英語名（プラン名）を主に出す。入口サービス（Discovery Phase）のみ true。
  enPrimary: boolean;
  headline: string | null;
  summary: string | null;
  coverage: string[];
  details: string | null;
  targetPains: string[];
  deliverables: string[];
  followups: string[];
  duration: string | null;
  exclusions: string[];
  pricing: Pricing | null;
};

export type ProfileView = {
  name: string;
  handle: string;
  tagline: string | null;
  logoSvg: string | null;
  bio: string | null;
  skills: string[];
  operationPolicy: string | null;
  contactEmail: string | null;
  socialLinks: { label: string; url: string }[];
};
