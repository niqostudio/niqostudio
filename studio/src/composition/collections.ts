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
import { meetingsSemantics } from '@/composition/semantics/meetings';
import { workLogsSemantics } from '@/composition/semantics/work-logs';
import { contactsSemantics } from '@/composition/semantics/contacts';
import { metricDefinitionsSemantics } from '@/composition/semantics/metric-definitions';
import { convertInquiryToContact } from './conversions';
import { createProjectFromContact } from './contact-actions';
import { openMetricsForProject, openMetricsForProduct } from './metrics-actions';
import { NdaDetail } from './details/nda';
import { InquiryReply } from './details/InquiryReply';
import { ProjectWorklogSummary } from '@/features/worklog/ProjectWorklogSummary';
import { ProjectMeetings } from '@/features/meetings/ProjectMeetings';
import { ClientMeetings } from '@/features/meetings/ClientMeetings';
import { InquiryMeetings } from '@/features/meetings/InquiryMeetings';
import { ClientContacts } from '@/features/contacts/ClientContacts';
import { createMeetingFromProject } from './meetings-actions';
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
  meta: { id: 'projects', label: '案件', createVia: [{ via: 'clients', fk: 'client_id' }] },
  history: new CoreProjectStatusHistory(),
  workflow: new CoreProjectWorkflow(),
  sources: new CoreProjectSourceRegistry(),
  detailExtras: [ProjectWorklogSummary, ProjectMeetings],
  recordActions: [
    { id: 'meeting', label: '打ち合わせを作成', run: createMeetingFromProject },
    { id: 'metrics', label: 'メトリクスを計測', run: openMetricsForProject },
  ],
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

// inquiries は顧客への転換アクションを持つ（接続先固有のワークフロー＝composition が差す）。
const inquiries: CollectionBinding<Fields> = {
  ...coreCollection('inquiries', '問い合わせ', inquiriesSemantics),
  recordActions: [{ id: 'convert', label: '顧客担当者に変換', run: convertInquiryToContact }],
  detailExtras: [InquiryReply, InquiryMeetings],
};

// 顧客は詳細にその会社の担当者・打ち合わせ一覧を出す。
const clients: CollectionBinding<Fields> = {
  ...coreCollection('clients', '顧客', clientsSemantics),
  detailExtras: [ClientContacts, ClientMeetings],
};

// 顧客担当者（人）。問い合わせから変換で作られ、案件化で会社（client）に紐付く。一覧から手動追加も可。
const contacts: CollectionBinding<Fields> = {
  ...coreCollection('contacts', '顧客担当者', contactsSemantics),
  recordActions: [{ id: 'projectize', label: '案件化', run: createProjectFromContact }],
};

// プロダクトもメトリクス計測の起点を持つ。
const products: CollectionBinding<Fields> = {
  ...coreCollection('products', 'プロダクト'),
  recordActions: [{ id: 'metrics', label: 'メトリクスを計測', run: openMetricsForProduct }],
};

// ndas は NDA 専用の読み合わせ詳細を持ち、案件から作る。
const ndas: CollectionBinding<Fields> = {
  ...coreCollection('ndas', 'NDA', ndasSemantics),
  meta: { id: 'ndas', label: 'NDA', createVia: [{ via: 'projects', fk: 'project_id' }] },
  detail: NdaDetail,
};

// 事例は被写体（案件 or プロダクト）から作る（showcase_entries は project_id xor product_id）。
const showcaseEntries: CollectionBinding<Fields> = {
  ...coreCollection('showcase_entries', '事例', showcaseEntriesSemantics),
  meta: {
    id: 'showcase_entries',
    label: '事例',
    createVia: [
      { via: 'projects', fk: 'project_id' },
      { via: 'products', fk: 'product_id' },
    ],
  },
};

// 打ち合わせは顧客から作る（client_id を文脈設定）。案件は任意で後から紐付け。
const meetings: CollectionBinding<Fields> = {
  ...coreCollection('meetings', '打ち合わせ', meetingsSemantics),
  meta: {
    id: 'meetings',
    label: '打ち合わせ',
    createVia: [
      { via: 'clients', fk: 'client_id' },
      { via: 'inquiries', fk: 'inquiry_id' },
    ],
  },
};

const COLLECTIONS: Record<string, CollectionBinding<unknown>> = {
  projects: projects as CollectionBinding<unknown>,
  products: products as CollectionBinding<unknown>,
  clients: clients as CollectionBinding<unknown>,
  contacts: contacts as CollectionBinding<unknown>,
  inquiries: inquiries as CollectionBinding<unknown>,
  services: coreCollection('services', 'サービス', servicesSemantics) as CollectionBinding<unknown>,
  showcase_entries: showcaseEntries as CollectionBinding<unknown>,
  ndas: ndas as CollectionBinding<unknown>,
  profile: profile as CollectionBinding<unknown>,
  metric_definitions: coreCollection('metric_definitions', '指標マスタ', metricDefinitionsSemantics) as CollectionBinding<unknown>,
  meetings: meetings as CollectionBinding<unknown>,
  // 工数は一覧から新規作成し、対象の案件はフォームで選ぶ（案件詳細からは作らない）。
  work_logs: coreCollection('work_logs', '工数', workLogsSemantics) as CollectionBinding<unknown>,
};

// collection id → 汎用 binding。各 collection の F は UI では Fields として扱う。
export function getCollection(id: string): CollectionBinding<Fields> | undefined {
  return COLLECTIONS[id] as unknown as CollectionBinding<Fields> | undefined;
}

export function listCollections(): CollectionBinding<Fields>[] {
  return Object.values(COLLECTIONS) as unknown as CollectionBinding<Fields>[];
}
