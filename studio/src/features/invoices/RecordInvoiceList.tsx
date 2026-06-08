import Link from 'next/link';
import { loadInvoicesFor, INVOICE_STATUS_LABELS, INVOICE_STATUS_TONE, formatYen, isOverdue } from '@/composition/invoices';
import { StatusBadge } from '@/shared/ui/primitives';

// 顧客/案件の詳細に出す、その相手の請求書一覧（読み取り）。記録が無ければ何も出さない。
// 未入金合計を見出しに、各行に金額・期日超過の警告を出す（入金消込の確認用）。
export async function RecordInvoiceList({ column, id }: { column: 'client_id' | 'project_id'; id: string }) {
  const invoices = await loadInvoicesFor(column, id);
  if (invoices.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const unpaid = invoices.filter((i) => i.status === 'sent' && !i.paidOn).reduce((s, i) => s + i.total, 0);
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="section-label text-xs">請求</p>
        {unpaid > 0 && <span className="text-xs text-muted">未入金 {formatYen(unpaid)}</span>}
      </div>
      <ol className="flex flex-col gap-1.5">
        {invoices.map((inv) => {
          const overdue = isOverdue(inv, today);
          return (
            <li key={inv.id}>
              <Link
                href={`/invoices?sel=${inv.id}`}
                className="flex items-center gap-2 text-sm transition-colors hover:text-accent"
              >
                <span className="shrink-0 text-xs text-muted tabular-nums">{inv.issuedOn || inv.dueOn || '—'}</span>
                <span className="flex-1 truncate">{inv.title || '（無題）'}</span>
                {overdue && <span className="shrink-0 text-xs text-error">期日超過</span>}
                <span className="shrink-0 tabular-nums">{formatYen(inv.total)}</span>
                <StatusBadge
                  status={inv.status}
                  label={INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                  tone={overdue ? 'error' : INVOICE_STATUS_TONE[inv.status] ?? 'neutral'}
                />
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
