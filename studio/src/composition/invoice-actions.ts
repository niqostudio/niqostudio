'use server';

import type { Fields } from '@/features/collections/collection';

// 案件から請求書を作る：案件の顧客を引き継ぐ（顧客は必須・案件リンクも付く）。
// 静的な循環依存を避けるため collections / actions は dynamic import。
export async function createInvoiceFromProject(projectId: string): Promise<void> {
  const [{ getCollection }, { createRecordAction }] = await Promise.all([
    import('./collections'),
    import('@/features/collections/actions'),
  ]);
  const projects = getCollection('projects');
  if (!projects) return;
  const project = (await projects.drafts.get(projectId).catch(() => null)) ?? (await projects.store.get(projectId));
  const clientId = project ? (project.fields as Fields).client_id : null;
  await createRecordAction('invoices', {
    project_id: projectId,
    ...(typeof clientId === 'string' && clientId ? { client_id: clientId } : {}),
  });
}
