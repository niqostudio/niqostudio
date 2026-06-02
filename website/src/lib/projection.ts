import type { Service, Profile, PublicClient, CaseMetric, SocialLink } from '../types/database';
import type { WorkRow, CaseRow } from './core';
import { ENTRY_SERVICE_SLUG } from '../config/site';
import type {
  WorkView,
  CaseView,
  ServiceView,
  ProfileView,
  ClientRef,
  ContentLink,
  Pricing,
} from '../types/views';

// anon は real_name を取得できないため、公開表示名は public_name 固定。
function toClientRef(client: PublicClient | null): ClientRef | null {
  if (!client) return null;
  return { name: client.public_name, industry: client.industry };
}

export function toWorkView(row: WorkRow, relatedCases: ContentLink[] = []): WorkView {
  return {
    slug: row.slug,
    title: row.title,
    client: toClientRef(row.clients),
    period: row.period,
    scope: row.scope,
    techStack: row.tech_stack,
    summary: row.summary,
    thumbnail: row.thumbnail_url,
    images: row.image_urls,
    publicUrl: row.public_url,
    relatedCases,
  };
}

export function toCaseView(row: CaseRow): CaseView {
  return {
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    client: toClientRef(row.clients),
    problem: row.problem,
    solution: row.solution,
    outcome: row.outcome,
    metrics: (row.metrics as unknown as CaseMetric[] | null) ?? [],
    techDetails: row.tech_details,
    thumbnail: row.thumbnail_url,
    images: row.image_urls,
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
