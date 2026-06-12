import * as core from './core';
import { fetchOgImage } from './og';
import { toCaseView, toServiceView, toProfileView, toProductView } from './projection';
import type { CaseView, ServiceView, ProfileView, ProductView, ContentLink } from '../types/views';

// 一覧・profile はビルド中にページ/コンポーネント横断で何度も呼ばれるため Promise をメモ化する。
// ただし dev は長命プロセスでメモが残り、接続先（core）の変更がリロードで反映されない。
// そこで本番ビルド時のみメモ化し、dev は毎回取得する（studio→website の反映がすぐ見えるように）。
const memo = import.meta.env.PROD;

let casesP: Promise<CaseView[]> | undefined;
export function getCases(): Promise<CaseView[]> {
  const load = () => core.fetchCases().then((rows) => rows.map((row) => toCaseView(row)));
  return memo ? (casesP ??= load()) : load();
}

let servicesP: Promise<ServiceView[]> | undefined;
export function getServices(): Promise<ServiceView[]> {
  const load = () =>
    core.fetchServices().then((rows) => {
      const services = rows.map(toServiceView);
      return [
        ...services.filter((s) => s.slug === 'discovery'),
        ...services.filter((s) => s.slug !== 'discovery'),
      ];
    });
  return memo ? (servicesP ??= load()) : load();
}

let productsP: Promise<ProductView[]> | undefined;
export function getProducts(): Promise<ProductView[]> {
  const load = () =>
    core
      .fetchProducts()
      .then((rows) =>
        Promise.all(rows.map(async (row) => toProductView(row, row.url ? await fetchOgImage(row.url) : null))),
      );
  return memo ? (productsP ??= load()) : load();
}

let profileP: Promise<ProfileView> | undefined;
export function getProfile(): Promise<ProfileView> {
  const load = () => core.fetchProfile().then(toProfileView);
  return memo ? (profileP ??= load()) : load();
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
