'use server';

import { revalidatePath } from 'next/cache';
import type { Fields } from '@/features/collections/collection';
import { mailIdentity, sendMail } from './mail';
import { CoreCollectionStore } from '@/adapters/domain-store/supabase/collection-store';

const asStr = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const today = () => new Date().toISOString().slice(0, 10);

// 問い合わせへ返信（実メール送信）。From=hi@（双方向＝顧客の返信は hi@ に届く）。送信後に status を responded に。
// 送信した本文は inquiry_replies に保存（スレッド表示）。collections は dynamic import で循環回避。
export async function replyToInquiryAction(inquiryId: string, body: string): Promise<void> {
  if (!body.trim()) throw new Error('本文は必須です');
  const { getCollection } = await import('./collections');
  const inquiries = getCollection('inquiries');
  if (!inquiries) return;
  const record = await inquiries.store.get(inquiryId);
  if (!record) throw new Error('問い合わせが見つかりません');
  const fields = record.fields as Fields;
  const to = asStr(fields.email);
  if (!to) throw new Error('宛先メールがありません');

  const id = mailIdentity();
  const subj = asStr(fields.subject);
  await sendMail({ to, from: `${id.senderName} <${id.contact}>`, subject: subj ? `Re: ${subj}` : 'お問い合わせの件', text: body });

  // 送信した返信を保存（スレッド表示用・append-only）。
  await new CoreCollectionStore('inquiry_replies', async () => []).upsert({
    id: crypto.randomUUID(),
    fields: { inquiry_id: inquiryId, body },
    draftState: 'published',
    sourceId: null,
    updatedAt: today(),
  });

  // 送信できたら responded に（公開済みレコードを直接更新）。
  if (asStr(fields.status) !== 'responded') {
    await inquiries.store.upsert({ ...record, fields: { ...fields, status: 'responded' } });
  }
  revalidatePath('/inquiries');
}
