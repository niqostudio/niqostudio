'use server';

import { redirect } from 'next/navigation';
import type { Fields } from '@/features/collections/collection';

const asStr = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const today = () => new Date().toISOString().slice(0, 10);

// 担当者から案件化（ワンショット）：会社（client）が未割当なら下書きで作って担当者に紐付け、案件（project）も下書きで作る。
// いずれも下書き＝FK のため publish は client → project / 担当者 の順（会社を作ったときは会社編集へ送る）。
export async function createProjectFromContact(contactId: string): Promise<void> {
  const { getCollection } = await import('./collections');
  const contacts = getCollection('contacts');
  const clients = getCollection('clients');
  const projects = getCollection('projects');
  if (!contacts || !clients || !projects) return;

  const contact = (await contacts.drafts.get(contactId).catch(() => null)) ?? (await contacts.store.get(contactId));
  if (!contact) return;
  const cf = contact.fields as Fields;

  const existing = asStr(cf.client_id);
  const clientId = existing || crypto.randomUUID();
  const newClient = !existing;

  if (newClient) {
    const cs = await clients.resolveSchema();
    const clientFields: Fields = {};
    for (const d of cs.fields) clientFields[d.key] = d.key === cs.titleField ? '' : null;
    for (const c of cs.children) clientFields[c.key] = [];
    await clients.drafts.save({ id: clientId, fields: clientFields, draftState: 'draft', sourceId: null, updatedAt: today() });
    await clients.versions?.append(clientId, clientFields, 'create');

    // 担当者に会社を紐付け（下書き＝client publish 後に反映）。
    const linked = { ...cf, client_id: clientId };
    await contacts.drafts.save({ id: contactId, fields: linked, draftState: 'draft', sourceId: contact.sourceId, updatedAt: today() });
    await contacts.versions?.append(contactId, linked, 'manual');
  }

  // 案件の下書き（client_id を文脈設定・status は初期状態）。
  const projectId = crypto.randomUUID();
  const ps = await projects.resolveSchema();
  const pf: Fields = {};
  for (const d of ps.fields) pf[d.key] = d.key === ps.titleField ? '無題' : null;
  for (const c of ps.children) pf[c.key] = [];
  const statusDesc = ps.statusField ? ps.fields.find((d) => d.key === ps.statusField) : undefined;
  if (statusDesc?.kind === 'reference' && statusDesc.refTable && projects.references) {
    const opts = await projects.references.options(statusDesc.refTable, statusDesc.refColumn ?? 'id').catch(() => []);
    if (opts[0]) pf[statusDesc.key] = opts[0].value;
  }
  pf.client_id = clientId;
  pf.contact_id = contactId;
  await projects.drafts.save({ id: projectId, fields: pf, draftState: 'draft', sourceId: null, updatedAt: today() });
  await projects.versions?.append(projectId, pf, 'create');

  // 会社を新規作成したときは会社編集へ（先に publish）、既存会社なら案件編集へ。
  redirect(newClient ? `/clients/${clientId}/edit` : `/projects/${projectId}/edit`);
}
