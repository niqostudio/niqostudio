import { RecordList } from '@/features/collections';

export const dynamic = 'force-dynamic';

// 全 collection 共通の一覧（master）＋右ペイン詳細。未登録 collection は RecordList が notFound。
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>;
  searchParams: Promise<{ sel?: string }>;
}) {
  const { collection } = await params;
  const { sel } = await searchParams;
  return <RecordList collectionId={collection} selectedId={sel} />;
}
