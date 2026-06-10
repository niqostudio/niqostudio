'use server';

import type { Fields } from '@/features/collections/collection';

// 案件から打ち合わせを作る：案件の顧客を引き継ぐ（顧客は必須・案件リンクは結果的に付く）。
// 静的な循環依存を避けるため collections / actions は dynamic import。
export async function createMeetingFromProject(projectId: string): Promise<void> {
  const [{ getCollection }, { createRecordAction }] = await Promise.all([
    import('./collections'),
    import('@/features/collections/actions'),
  ]);
  const projects = getCollection('projects');
  if (!projects) return;
  const project = (await projects.drafts.get(projectId).catch(() => null)) ?? (await projects.store.get(projectId));
  const clientId = project ? (project.fields as Fields).client_id : null;
  // createRecordAction が初期 status・タイトル・下書き保存・編集への遷移までやる。
  await createRecordAction('meetings', {
    project_id: projectId,
    ...(typeof clientId === 'string' && clientId ? { client_id: clientId } : {}),
  });
}
