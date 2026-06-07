// website のドメイン語彙で表したビューモデル。core の行型とは独立。

export type ClientRef = { name: string | null; industry: string | null };
export type Metric = { label: string; achieved: string; previous: string | null; unit: string | null; kind: string };
// 課題→対応→結果のトリプル（現状は problem の文脈に含む）。
export type Problem = { problem: string; solution: string | null; outcome: string | null };
export type Deliverable = { kind: string; name: string; url: string | null; images: string[] };
export type Testimonial = { quote: string; role: string | null };
export type ContentLink = { slug: string; title: string };

// 被写体の種別。project＝有期の客先案件 / product＝継続の自社プロダクト。
export type SubjectKind = 'project' | 'product';

// 公開ケーススタディ1件（成果起点の物語）。core の showcases view 由来。
export type CaseView = {
  slug: string;
  title: string;
  summary: string | null;
  // 被写体が project か product か。今は /cases に一本化、将来 /products 分割の分岐点。
  subjectKind: SubjectKind;
  client: ClientRef | null;
  problems: Problem[];
  metrics: Metric[];
  deliverables: Deliverable[];
  techStack: string[];
  testimonial: Testimonial | null;
  period: string | null;
  thumbnail: string | null;
  // 同じ案件（project）に属する他のケース。
  related: ContentLink[];
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
