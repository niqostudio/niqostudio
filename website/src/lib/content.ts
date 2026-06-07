import * as core from './core';
import { toCaseView, toServiceView, toProfileView } from './projection';
import type { CaseView, ServiceView, ProfileView, ContentLink } from '../types/views';

// 一覧・profile はページ/コンポーネント横断で何度も呼ばれるため、ビルド内で Promise をメモ化する。
let casesP: Promise<CaseView[]> | undefined;
export function getCases(): Promise<CaseView[]> {
  return (casesP ??= core.fetchCases().then((rows) => rows.map((row) => toCaseView(row))));
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

export async function getCase(slug: string): Promise<CaseView | null> {
  const row = await core.fetchCaseBySlug(slug);
  if (!row) return null;

  // 同じ被写体（project または product）に属する他の公開ケースを関連として出す（truth 自体は非公開）。
  const subjectId = row.project_id ?? row.product_id;
  const related: ContentLink[] = subjectId
    ? (await core.fetchCases())
        .filter((c) => (c.project_id ?? c.product_id) === subjectId && c.slug !== row.slug)
        .map((c) => ({ slug: c.slug!, title: c.title! }))
    : [];

  return toCaseView(row, related);
}
