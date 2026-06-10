import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';

// 請求書の status ラベル（studio は中立だが composition は意味を知ってよい）。
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  sent: '請求済',
  paid: '入金済',
  void: '無効',
};

// status → バッジの色トーン。期日超過は呼び出し側で error 上書き。
export const INVOICE_STATUS_TONE: Record<string, 'neutral' | 'success' | 'warning' | 'error' | 'info'> = {
  draft: 'neutral',
  sent: 'info',
  paid: 'success',
  void: 'neutral',
};

const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : 0);
const str = (v: unknown) => (typeof v === 'string' ? v : '');

export const formatYen = (n: number) => `¥${Math.round(n).toLocaleString('ja-JP')}`;

export interface InvoiceRow {
  id: string;
  title: string;
  total: number;
  status: string;
  issuedOn: string;
  dueOn: string;
  paidOn: string;
}

// 請求 = 請求済(sent) かつ 入金日なし かつ 期日超過。集計・一覧の警告表示に使う。
export const isOverdue = (inv: { status: string; dueOn: string; paidOn: string }, today: string): boolean =>
  inv.status === 'sent' && !inv.paidOn && !!inv.dueOn && inv.dueOn < today;

// 指定の相手（顧客 or 案件）に紐づく請求書を新しい順で返す（詳細ペインの一覧表示用）。
export async function loadInvoicesFor(column: 'client_id' | 'project_id', id: string): Promise<InvoiceRow[]> {
  const rows = await new CoreMetricsProvider().rows(
    'invoices',
    ['id', 'title', 'subtotal', 'tax', 'status', 'issued_on', 'due_on', 'paid_on'],
    { column, value: id },
  );
  return rows
    .map((r) => ({
      id: str(r.id),
      title: str(r.title),
      total: num(r.subtotal) + num(r.tax),
      status: str(r.status),
      issuedOn: str(r.issued_on),
      dueOn: str(r.due_on),
      paidOn: str(r.paid_on),
    }))
    .sort((a, b) => (b.issuedOn || b.dueOn).localeCompare(a.issuedOn || a.dueOn));
}
