import * as core from './core';
import { toWorkView, toCaseView, toServiceView, toProfileView } from './projection';
import type { WorkView, CaseView, ServiceView, ProfileView, ContentLink } from '../types/views';

// 一覧・profile はページ/コンポーネント横断で何度も呼ばれるため、ビルド内で Promise をメモ化する。
let worksP: Promise<WorkView[]> | undefined;
export function getWorks(): Promise<WorkView[]> {
  return (worksP ??= core.fetchWorks().then((rows) => rows.map((row) => toWorkView(row))));
}

let casesP: Promise<CaseView[]> | undefined;
export function getCases(): Promise<CaseView[]> {
  return (casesP ??= core.fetchCases().then((rows) => rows.map(toCaseView)));
}

let servicesP: Promise<ServiceView[]> | undefined;
export function getServices(): Promise<ServiceView[]> {
  return (servicesP ??= core.fetchServices().then((rows) => {
    const services = rows.map(toServiceView);
    return [
      ...services.filter((s) => s.slug === 'discovery'),
      ...services.filter((s) => s.slug !== 'discovery'),
    ];
  }));
}

let profileP: Promise<ProfileView> | undefined;
export function getProfile(): Promise<ProfileView> {
  return (profileP ??= core.fetchProfile().then(toProfileView));
}

export async function getWork(slug: string): Promise<WorkView | null> {
  const row = await core.fetchWorkBySlug(slug);
  if (!row) return null;

  // 同じ project に属する公開ケースを関連として出す（projects 自体は非公開）。
  const related: ContentLink[] = row.project_id
    ? (await core.fetchCases())
        .filter((c) => c.project_id === row.project_id)
        .map((c) => ({ slug: c.slug, title: c.title }))
    : [];

  return toWorkView(row, related);
}

export async function getCase(slug: string): Promise<CaseView | null> {
  const row = await core.fetchCaseBySlug(slug);
  return row ? toCaseView(row) : null;
}
