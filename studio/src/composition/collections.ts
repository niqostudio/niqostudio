import type { CollectionBinding } from '@/features/collections/collection';
import type { Fields } from '@/features/collections/collection';
import type { CollectionSemantics } from '@/features/domain-overlay/overlay';
import { buildSchema } from '@/features/domain-overlay/overlay';
import { coreStructure } from '@/adapters/domain-store/supabase/structure';
import { CoreCollectionStore } from '@/adapters/domain-store/supabase/collection-store';
import { CoreReferenceResolver } from '@/adapters/domain-store/supabase/reference-resolver';
import { CoreProjectStatusHistory } from '@/adapters/domain-store/supabase/status-history';
import { CoreProjectWorkflow } from '@/adapters/domain-store/supabase/project-workflow';
import { StudioDraftStore } from '@/adapters/studio-store/supabase/draft-store';
import { StudioVersionStore } from '@/adapters/studio-store/supabase/version-store';
import { StudioOverlayStore } from '@/adapters/studio-store/supabase/overlay-store';
import { CoreProjectSourceRegistry } from '@/adapters/domain-store/supabase/source-registry';
import { clientsSemantics } from '@/composition/semantics/clients';
import { inquiriesSemantics } from '@/composition/semantics/inquiries';
import { servicesSemantics } from '@/composition/semantics/services';
import { showcaseEntriesSemantics } from '@/composition/semantics/showcase-entries';
import { ndasSemantics } from '@/composition/semantics/ndas';
import { profileSemantics } from '@/composition/semantics/profile';
import { INSTANCE_ID } from './instance';

// この app の collection 配線。構造は core から live、意味は overlay（seed＝任意の初期意味、
// 確定は store の overlay）。store は core 列を動的に読む generic＝テーブルごとの手書き写像なし。
const overlay = new StudioOverlayStore(INSTANCE_ID);

// core テーブル（id=table）を構造 live × overlay（seed＝初期意味・任意）で配線する共通 binding。
// store が埋める子は実効スキーマの children＝子の取り込みも overlay に一本化（seed の子配列を持たない）。
function coreCollection(id: string, label: string, seed?: CollectionSemantics): CollectionBinding<Fields> {
  const resolveSchema = async () => buildSchema(await coreStructure(id), (await overlay.get(id)) ?? seed);
  return {
    meta: { id, label },
    resolveSchema,
    store: new CoreCollectionStore(id, async () => (await resolveSchema()).children.map((c) => c.key)),
    drafts: new StudioDraftStore<Fields>(INSTANCE_ID, id),
    versions: new StudioVersionStore<Fields>(INSTANCE_ID, id),
    references: new CoreReferenceResolver(),
  };
}

// projects は源リポ（sources）と git 射影（derive）を追加で持つ。意味は overlay 駆動（seed なし）。
// 作成は顧客（clients）詳細から（client_id を文脈設定）＝一覧に新規ボタンは出さない。
const projects: CollectionBinding<Fields> = {
  ...coreCollection('projects', '案件'),
  meta: { id: 'projects', label: '案件', createVia: { via: 'clients', fk: 'client_id' } },
  history: new CoreProjectStatusHistory(),
  workflow: new CoreProjectWorkflow(),
  sources: new CoreProjectSourceRegistry(),
  derive: async (recordId) => {
    const [{ deriveProjectDrafts }, { GitRepositoryProjectionEngine, GitCliSourceAccess }] =
      await Promise.all([import('./projects/derive'), import('@/features/git-import')]);
    return deriveProjectDrafts(recordId, new GitRepositoryProjectionEngine(new GitCliSourceAccess()));
  },
};

// profile は singleton（id='singleton' 固定で1行）。一覧に「新規」を出さない。
const profile: CollectionBinding<Fields> = {
  ...coreCollection('profile', 'プロフィール', profileSemantics),
  meta: { id: 'profile', label: 'プロフィール', singleton: true },
};

const COLLECTIONS: Record<string, CollectionBinding<unknown>> = {
  projects: projects as CollectionBinding<unknown>,
  products: coreCollection('products', 'プロダクト') as CollectionBinding<unknown>,
  clients: coreCollection('clients', '顧客', clientsSemantics) as CollectionBinding<unknown>,
  inquiries: coreCollection('inquiries', '問い合わせ', inquiriesSemantics) as CollectionBinding<unknown>,
  services: coreCollection('services', 'サービス', servicesSemantics) as CollectionBinding<unknown>,
  showcase_entries: coreCollection('showcase_entries', '事例', showcaseEntriesSemantics) as CollectionBinding<unknown>,
  ndas: coreCollection('ndas', 'NDA', ndasSemantics) as CollectionBinding<unknown>,
  profile: profile as CollectionBinding<unknown>,
};

// collection id → 汎用 binding。各 collection の F は UI では Fields として扱う。
export function getCollection(id: string): CollectionBinding<Fields> | undefined {
  return COLLECTIONS[id] as unknown as CollectionBinding<Fields> | undefined;
}

export function listCollections(): CollectionBinding<Fields>[] {
  return Object.values(COLLECTIONS) as unknown as CollectionBinding<Fields>[];
}
