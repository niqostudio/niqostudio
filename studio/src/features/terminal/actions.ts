'use server';

import { INSTANCE_ID } from '@/composition/instance';
import { StudioRunStore, type CommandRun } from '@/adapters/studio-store/supabase/run-store';

export async function listRuns(): Promise<CommandRun[]> {
  return new StudioRunStore(INSTANCE_ID).list().catch(() => []);
}
