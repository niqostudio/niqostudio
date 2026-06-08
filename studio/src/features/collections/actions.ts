'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { CollectionBinding } from '@/features/collections/collection';
import { StudioRunStore } from '@/adapters/studio-store/supabase/run-store';
import { getCollection } from '@/composition/collections';
import { INSTANCE_ID } from '@/composition/instance';
import type { Fields } from './collection';

function need(collectionId: string): CollectionBinding<Fields> {
  const binding = getCollection(collectionId);
  if (!binding) throw new Error(`unknown collection: ${collectionId}`);
  return binding;
}

async function workingSourceId(binding: CollectionBinding<Fields>, recordId: string): Promise<string | null> {
  const draft = await binding.drafts.get(recordId).catch(() => null);
  const record = draft ?? (await binding.store.get(recordId));
  return record?.sourceId ?? null;
}

async function saveDraft(
  binding: CollectionBinding<Fields>,
  recordId: string,
  fields: Fields,
  sourceId: string | null,
  origin: string,
): Promise<void> {
  await binding.drafts.save({
    id: recordId,
    fields,
    draftState: 'draft',
    sourceId,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  await binding.versions?.append(recordId, fields, origin);
}

// recordId ありは編集ルート（/<col>/<id>/edit）、無しは一覧（/<col>）。詳細は一覧の ?sel= なので
// ワークフロー操作は一覧を revalidate する。新規作成はそのまま編集へ入る。
function path(collectionId: string, recordId?: string): string {
  return recordId ? `/${collectionId}/${recordId}/edit` : `/${collectionId}`;
}

// preset＝親から作る導線（顧客→案件）で文脈の FK 等を初期値に入れる。form action の末尾 FormData は使わない。
export async function createRecordAction(collectionId: string, preset?: Fields, _formData?: FormData): Promise<void> {
  const binding = need(collectionId);
  const schema = await binding.resolveSchema();
  const id = crypto.randomUUID();
  const fields: Fields = {};
  for (const d of schema.fields) fields[d.key] = d.key === schema.titleField ? '無題' : null;
  for (const c of schema.children) fields[c.key] = [];
  if (preset) Object.assign(fields, preset);
  await saveDraft(binding, id, fields, null, 'create');
  redirect(path(collectionId, id));
}

// 状態機械を次状態へ進める（ワークフロー操作）。status は下書きに段階反映する（publish は後段）。
export async function advanceStatusAction(collectionId: string, recordId: string, toStatus: string): Promise<void> {
  const binding = need(collectionId);
  const schema = await binding.resolveSchema();
  const field = schema.statusField;
  if (!field) return;
  const draft = await binding.drafts.get(recordId).catch(() => null);
  const working = draft ?? (await binding.store.get(recordId));
  if (!working) return;
  const fields = { ...(working.fields as Fields), [field]: toStatus };
  await saveDraft(binding, recordId, fields, working.sourceId, 'manual');
  revalidatePath(path(collectionId, recordId));
  revalidatePath(path(collectionId));
}

// 詳細ペインの項目別インライン編集（1フィールドだけ下書きに反映）。
export async function setFieldAction(collectionId: string, recordId: string, key: string, value: unknown): Promise<void> {
  const binding = need(collectionId);
  const draft = await binding.drafts.get(recordId).catch(() => null);
  const working = draft ?? (await binding.store.get(recordId));
  if (!working) return;
  const fields = { ...(working.fields as Fields), [key]: value };
  await saveDraft(binding, recordId, fields, working.sourceId, 'manual');
  revalidatePath(path(collectionId));
  revalidatePath(path(collectionId, recordId));
}

// クライアント・エディタが作業コピー（fields 全体）を JSON で保存する。
export async function saveDraftJson(collectionId: string, recordId: string, fieldsJson: string): Promise<void> {
  const binding = need(collectionId);
  const sourceId = await workingSourceId(binding, recordId);
  await saveDraft(binding, recordId, JSON.parse(fieldsJson) as Fields, sourceId, 'manual');
  revalidatePath(path(collectionId, recordId));
}

export async function discardDraftAction(collectionId: string, recordId: string): Promise<void> {
  await need(collectionId).drafts.remove(recordId);
  revalidatePath(path(collectionId, recordId));
}

// publish＝下書きを接続先（core）正本へ反映。版に origin=publish を残し、反映後は下書きを消す。
export async function publishAction(collectionId: string, recordId: string): Promise<void> {
  const binding = need(collectionId);
  const draft = await binding.drafts.get(recordId).catch(() => null);
  if (!draft) return;
  await binding.store.upsert(draft);
  await binding.versions?.append(recordId, draft.fields, 'publish');
  await binding.drafts.remove(recordId);
  revalidatePath(path(collectionId, recordId));
  revalidatePath(path(collectionId));
}

// 取り込みを実行し、対応する command_runs の id を返す（トーストから terminal の行へ紐づける）。
export async function deriveRecordAction(collectionId: string, recordId: string): Promise<string> {
  const runs = new StudioRunStore(INSTANCE_ID);
  const runId = await runs.start(`derive ${collectionId}/${recordId}`);
  try {
    const reflected = await need(collectionId).derive?.(recordId);
    await runs.finish(runId, 'ok', reflected ? '下書きに反映しました' : '源が無く、反映しませんでした');
  } catch (e) {
    await runs.finish(runId, 'error', e instanceof Error ? (e.stack ?? e.message) : String(e));
    revalidatePath(path(collectionId, recordId));
    throw e;
  }
  revalidatePath(path(collectionId, recordId));
  return runId;
}

export async function restoreVersionAction(collectionId: string, recordId: string, versionId: string): Promise<void> {
  const binding = need(collectionId);
  const version = await binding.versions?.get(versionId);
  if (!version) return;
  await saveDraft(binding, recordId, version.fields as Fields, await workingSourceId(binding, recordId), 'revert');
  revalidatePath(path(collectionId, recordId));
}

export async function addSourceAction(
  collectionId: string,
  recordId: string,
  input: { ref: string; role: string | null; visibility: 'public' | 'private' },
): Promise<void> {
  const sources = need(collectionId).sources;
  if (!sources || !input.ref.trim()) return;
  await sources.add(recordId, { ref: input.ref.trim(), role: input.role, visibility: input.visibility });
  revalidatePath(path(collectionId, recordId));
}

export async function removeSourceAction(collectionId: string, recordId: string, sourceId: string): Promise<void> {
  const sources = need(collectionId).sources;
  if (!sources) return;
  await sources.remove(sourceId);
  revalidatePath(path(collectionId, recordId));
}
