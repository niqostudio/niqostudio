import type { Service, Profile, SocialLink, PublicProduct } from '../types/database';
import type { CaseRow } from './core';
import { ENTRY_SERVICE_SLUG } from '../config/site';
import type {
  CaseView,
  SubjectKind,
  ServiceView,
  ProfileView,
  ProductView,
  ClientRef,
  Metric,
  Problem,
  Deliverable,
  Testimonial,
  ContentLink,
  Pricing,
} from '../types/views';

export function toProductView(row: PublicProduct, ogImage: string | null = null): ProductView {
  return {
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    url: row.url,
    techStack: row.tech_stack ?? [],
    ogImage,
  };
}

// 公開 view 行 → ケースビューモデル。client は view が同意解決済み（name は匿名時 null・hidden 時は両方 null）。
// problems / deliverables / metrics は NDA カテゴリ許可 ∩ 選択分の集約（view で解決済み）。
export function toCaseView(row: CaseRow, related: ContentLink[] = []): CaseView {
  const client: ClientRef | null =
    row.client_name || row.client_industry ? { name: row.client_name, industry: row.client_industry } : null;
  return {
    slug: row.slug!,
    title: row.title!,
    summary: row.summary,
    body: row.body_md,
    subjectKind: (row.subject_kind as SubjectKind | null) ?? 'project',
    client,
    problems: (row.problems as unknown as Problem[] | null) ?? [],
    metrics: (row.metrics as unknown as Metric[] | null) ?? [],
    deliverables: (row.deliverables as unknown as Deliverable[] | null) ?? [],
    techStack: row.tech_stack ?? [],
    testimonial: (row.testimonial as unknown as Testimonial | null) ?? null,
    period: row.period,
    thumbnail: row.thumbnail_url,
    related,
  };
}

export function toServiceView(s: Service): ServiceView {
  return {
    slug: s.slug,
    name: s.name,
    nameJa: s.name_ja,
    enPrimary: s.slug === ENTRY_SERVICE_SLUG,
    headline: s.headline,
    summary: s.summary,
    coverage: s.coverage,
    details: s.details,
    targetPains: s.target_pains,
    deliverables: s.deliverables,
    followups: s.followups,
    duration: s.duration,
    exclusions: s.exclusions,
    pricing: (s.pricing as unknown as Pricing | null) ?? null,
  };
}

// 特商法ブロックの組み立て。事業者名＋（住所・電話のセット or 開示方式の文言）が揃って
// 初めて配る（不完全な表記を製品に出さない fail-closed）。出力キーは contract.md の
// legal_jp_tokushoho が正本。
function toLegalJp(p: Profile): Record<string, unknown> | null {
  const complete = p.legal_seller_name && (p.legal_disclosure_policy || (p.legal_address && p.legal_phone));
  if (!complete) return null;
  return {
    seller_name: p.legal_seller_name,
    ...(p.legal_responsible_person ? { responsible_person: p.legal_responsible_person } : {}),
    ...(p.legal_disclosure_policy
      ? { disclosure_policy: p.legal_disclosure_policy }
      : { address: p.legal_address, phone: p.legal_phone }),
    ...(p.legal_contact_email ? { contact_email: p.legal_contact_email } : {}),
  };
}

export function toProfileView(p: Profile): ProfileView {
  return {
    name: p.display_name,
    handle: p.handle,
    tagline: p.tagline,
    logoSvg: p.logo_svg,
    bio: p.bio,
    skills: p.skills,
    operationPolicy: p.operation_policy,
    contactEmail: p.contact_email,
    socialLinks: (p.social_links as unknown as SocialLink[] | null) ?? [],
    legalJp: toLegalJp(p),
  };
}
