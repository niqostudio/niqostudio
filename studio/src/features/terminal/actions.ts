'use server';

import { INSTANCE_ID } from '@/composition/instance';
import { getCollection } from '@/composition/collections';
import { StudioRunStore, type CommandRun } from '@/adapters/studio-store/supabase/run-store';
import { StudioActivityFeed } from '@/adapters/studio-store/supabase/activity-feed';
import type { ActivityRow } from './types';

export async function listRuns(): Promise<CommandRun[]> {
  return new StudioRunStore(INSTANCE_ID).list().catch(() => []);
}

// 活動タブ：collection 横断の版イベント。ラベルは server で meta から解決して返す。
export async function listActivity(limit = 30): Promise<ActivityRow[]> {
  const entries = await new StudioActivityFeed(INSTANCE_ID).recent(limit).catch(() => []);
  return entries.map((a) => ({ ...a, label: getCollection(a.collection)?.meta.label ?? a.collection }));
}
