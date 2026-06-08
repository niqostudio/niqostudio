import { notFound } from 'next/navigation';
import { RecordEditorPage } from '@/features/collections';
import { getCollection } from '@/composition/collections';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await params;
  if (!getCollection(collection)) notFound();
  return <RecordEditorPage collection={collection} id={id} />;
}
