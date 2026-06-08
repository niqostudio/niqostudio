'use server';

import { redirect } from 'next/navigation';
import type { Fields } from '@/features/collections/collection';

const today = () => new Date().toISOString().slice(0, 10);

// 選んだ案件で NDA の下書きを作り、NDA の詳細（読み合わせチェックリスト）へ。
// NDA は案件に 1:1（project_id UNIQUE）。collections は dynamic import で循環回避。
export async function createNdaForProject(projectId: string): Promise<void> {
  if (!projectId) throw new Error('案件を選択してください');
  const { getCollection } = await import('./collections');
  const ndas = getCollection('ndas');
  if (!ndas) return;

  const id = crypto.randomUUID();
  const schema = await ndas.resolveSchema();
  const fields: Fields = {};
  for (const d of schema.fields)
    fields[d.key] = d.key === schema.titleField ? '' : d.kind === 'boolean' ? false : d.kind === 'list' ? [] : null;
  for (const c of schema.children) fields[c.key] = [];
  fields.project_id = projectId;
  fields.status = 'draft';

  await ndas.drafts.save({ id, fields, draftState: 'draft', sourceId: null, updatedAt: today() });
  await ndas.versions?.append(id, fields, 'create');
  redirect(`/ndas?sel=${id}`);
}
