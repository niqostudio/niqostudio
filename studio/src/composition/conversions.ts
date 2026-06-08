'use server';

import { redirect } from 'next/navigation';
import type { Fields } from '@/features/collections/collection';

const asStr = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const today = () => new Date().toISOString().slice(0, 10);

// 問い合わせ → 顧客の写像（ドメイン判断）。slug 等は転換先の編集で人が仕上げる。
function inquiryToClient(inq: Fields): Fields {
  const name = asStr(inq.name);
  const company = asStr(inq.company);
  return {
    public_name: company || name,
    real_name: name,
    is_public_name_allowed: false,
    description: asStr(inq.message) || null,
    first_contact_date: today(),
    internal_notes: `問い合わせから転換（${asStr(inq.email)}）`,
  };
}

// 問い合わせを顧客へ転換：顧客の下書きを inquiry から生成し、問い合わせを converted＋converted_client_id に。
// 仕上げ（slug 等）のため新規顧客の編集へ送る。core 反映は各 record の publish で（先に顧客→次に問い合わせ）。
// collections への静的依存を避けるため getCollection は dynamic import。
export async function convertInquiryToClient(recordId: string): Promise<void> {
  const { getCollection } = await import('./collections');
  const inquiries = getCollection('inquiries');
  const clients = getCollection('clients');
  if (!inquiries || !clients) return;

  const inq = (await inquiries.drafts.get(recordId).catch(() => null)) ?? (await inquiries.store.get(recordId));
  if (!inq) return;

  // 顧客の下書き（全フィールド初期化＋inquiry からの写像を上書き）。
  const clientId = crypto.randomUUID();
  const schema = await clients.resolveSchema();
  const clientFields: Fields = {};
  for (const d of schema.fields) clientFields[d.key] = d.key === schema.titleField ? '' : null;
  for (const c of schema.children) clientFields[c.key] = [];
  Object.assign(clientFields, inquiryToClient(inq.fields as Fields));
  await clients.drafts.save({ id: clientId, fields: clientFields, draftState: 'draft', sourceId: null, updatedAt: today() });
  await clients.versions?.append(clientId, clientFields, 'create');

  // 問い合わせを converted に（下書き）。converted_client_id は生成した顧客 id を指す。
  const inqFields = { ...(inq.fields as Fields), status: 'converted', converted_client_id: clientId };
  await inquiries.drafts.save({
    id: recordId,
    fields: inqFields,
    draftState: 'draft',
    sourceId: inq.sourceId,
    updatedAt: today(),
  });
  await inquiries.versions?.append(recordId, inqFields, 'manual');

  redirect(`/clients/${clientId}/edit`);
}
