import type { MessageKey } from '@/shared/i18n';
import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';

// サイドバー nav。ドメイン別グループ（業務/公開）＋各 collection の件数。機能を足す＝該当グループに id を1つ。
export interface NavGroup {
  labelKey: MessageKey;
  ids: string[];
}

export const NAV_GROUPS: NavGroup[] = [
  { labelKey: 'business', ids: ['inquiries', 'clients', 'projects'] },
  { labelKey: 'publishing', ids: ['showcase_entries', 'ndas', 'services', 'products', 'profile'] },
];

const NAV_IDS = NAV_GROUPS.flatMap((g) => g.ids);

// nav 行に出す件数（接続先の集計）。取得失敗は握り潰して badge を出さない（shell を壊さない）。
export async function loadNavCounts(): Promise<Record<string, number>> {
  const metrics = new CoreMetricsProvider();
  const counts: Record<string, number> = {};
  await Promise.all(
    NAV_IDS.map(async (id) => {
      try {
        counts[id] = await metrics.count(id);
      } catch {
        // 件数が取れない collection は badge なし。
      }
    }),
  );
  return counts;
}
