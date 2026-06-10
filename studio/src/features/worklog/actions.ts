'use server';

import { revalidatePath } from 'next/cache';
import { CoreCollectionStore } from '@/adapters/domain-store/supabase/collection-store';

// 工数を1件記録する。下書きを介さず core へ直接 publish（素早い入力＝集計のための記録）。
export async function logWorkAction(input: {
  projectId: string;
  workedOn: string;
  hours: number;
  task: string;
  note?: string | null;
}): Promise<void> {
  if (!input.projectId || !(input.hours > 0) || !input.task.trim()) {
    throw new Error('案件・工数・作業内容は必須です');
  }
  const store = new CoreCollectionStore('work_logs', async () => []);
  await store.upsert({
    id: crypto.randomUUID(),
    fields: {
      project_id: input.projectId,
      worked_on: input.workedOn,
      hours: input.hours,
      task: input.task.trim(),
      note: input.note?.trim() || null,
    },
    draftState: 'published',
    sourceId: null,
    updatedAt: input.workedOn,
  });
  revalidatePath('/work_logs');
}
