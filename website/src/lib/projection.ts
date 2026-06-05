import type { Service, Profile, SocialLink } from '../types/database';
import type { CaseRow } from './core';
import { ENTRY_SERVICE_SLUG } from '../config/site';
import type {
  CaseView,
  ServiceView,
  ProfileView,
  ClientRef,
  Metric,
  Problem,
  Deliverable,
  Testimonial,
  ContentLink,
  Pricing,
} from '../types/views';

// 公開 view 行 → ケースビューモデル。client は view が同意解決済み（name は匿名時 null・hidden 時は両方 null）。
// problems / deliverables / metrics は NDA カテゴリ許可 ∩ 選択分の集約（view で解決済み）。
export function toCaseView(row: CaseRow, related: ContentLink[] = []): CaseView {
  const client: ClientRef | null =
    row.client_name || row.client_industry ? { name: row.client_name, industry: row.client_industry } : null;
  return {
    slug: row.slug!,
    title: row.title!,
    summary: row.summary,
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
  };
}
