'use server';

import { redirect } from 'next/navigation';
import type { Fields } from '@/features/collections/collection';

const asStr = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const today = () => new Date().toISOString().slice(0, 10);

// 問い合わせ → 顧客担当者（人）の変換。会社（client）は案件化のときに作る（ここでは作らない）。
// 会社名のヒント（inquiry.company）は notes に残す。仕上げ（役職・電話等）は転換先の編集で人が補う。
// collections への静的依存を避けるため getCollection は dynamic import。core 反映は各 record の publish で。
export async function convertInquiryToContact(recordId: string): Promise<void> {
  const { getCollection } = await import('./collections');
  const inquiries = getCollection('inquiries');
  const contacts = getCollection('contacts');
  if (!inquiries || !contacts) return;

  const inq = (await inquiries.drafts.get(recordId).catch(() => null)) ?? (await inquiries.store.get(recordId));
  if (!inq) return;
  const f = inq.fields as Fields;

  // 担当者の下書き（全フィールド初期化＋inquiry からの写像）。
  const contactId = crypto.randomUUID();
  const schema = await contacts.resolveSchema();
  const fields: Fields = {};
  for (const d of schema.fields) fields[d.key] = d.key === schema.titleField ? '' : null;
  for (const c of schema.children) fields[c.key] = [];
  const company = asStr(f.company);
  fields.name = asStr(f.name);
  fields.email = asStr(f.email) || null;
  fields.notes = `問い合わせから変換（${asStr(f.email)}${company ? ` / ${company}` : ''}）${asStr(f.message) ? `\n${asStr(f.message)}` : ''}`;
  await contacts.drafts.save({ id: contactId, fields, draftState: 'draft', sourceId: null, updatedAt: today() });
  await contacts.versions?.append(contactId, fields, 'create');

  // 問い合わせを converted に（下書き）。
  const inqFields = { ...f, status: 'converted' };
  await inquiries.drafts.save({ id: recordId, fields: inqFields, draftState: 'draft', sourceId: inq.sourceId, updatedAt: today() });
  await inquiries.versions?.append(recordId, inqFields, 'manual');

  redirect(`/contacts/${contactId}/edit`);
}
