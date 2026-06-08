import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';
import { SectionLabel } from '@/shared/ui/primitives';
import { mailEnabled } from '../mail';
import { InquiryThread } from './inquiry-thread';

const asStr = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const fmt = (s: string) => (s ? s.slice(5, 16).replace('T', ' ') : '');

// 問い合わせ詳細の返信スレッド（NIQO 固有）。元の問い合わせ＋送信した返信を時系列で出す。
// collections への循環を避けるため inquiry / 返信は metrics（rows）で直接読む。
export async function InquiryReply({ id }: { id: string }) {
  const metrics = new CoreMetricsProvider();
  const [inqRows, replyRows] = await Promise.all([
    metrics.rows('inquiries', ['id', 'email', 'subject', 'message', 'status', 'created_at']).catch(() => []),
    metrics.rows('inquiry_replies', ['id', 'inquiry_id', 'body', 'created_at']).catch(() => []),
  ]);
  const inq = inqRows.find((r) => String(r.id) === id);
  if (!inq) return null;
  const to = asStr(inq.email);
  const responded = asStr(inq.status) === 'responded';
  const items = [
    { from: 'customer' as const, body: asStr(inq.message), at: fmt(asStr(inq.created_at)) },
    ...replyRows
      .filter((r) => String(r.inquiry_id) === id)
      .sort((a, b) => asStr(a.created_at).localeCompare(asStr(b.created_at)))
      .map((r) => ({ from: 'us' as const, body: asStr(r.body), at: fmt(asStr(r.created_at)) })),
  ];
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>返信{responded ? '（返信済み）' : ''}</SectionLabel>
      <InquiryThread inquiryId={id} to={to} enabled={mailEnabled()} items={items} />
    </section>
  );
}
