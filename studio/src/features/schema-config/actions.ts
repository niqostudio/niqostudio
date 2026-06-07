'use server';

import { revalidatePath } from 'next/cache';
import type { CollectionSemantics } from '@/shared/records/overlay';
import { StudioOverlayStore } from '@/adapters/studio-store/overlay-store';
import { INSTANCE_ID } from '@/composition/instance';

// 画面入力の semantics（意味）を overlay store に保存する。構造（core）は触らない。
export async function saveSemantics(collection: string, semanticsJson: string): Promise<void> {
  const semantics = JSON.parse(semanticsJson) as CollectionSemantics;
  await new StudioOverlayStore(INSTANCE_ID).save(collection, semantics);
  revalidatePath(`/${collection}`);
  revalidatePath(`/schema/${collection}`);
}
