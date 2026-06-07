import { SchemaConfigPage } from '@/features/schema-config';

export const dynamic = 'force-dynamic';

export default async function Page({ params }: { params: Promise<{ collection: string }> }) {
  const { collection } = await params;
  return <SchemaConfigPage collection={collection} />;
}
