import { RecordList } from '@/features/collections';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ sel?: string }> }) {
  const { sel } = await searchParams;
  return <RecordList collectionId="products" selectedId={sel} />;
}
