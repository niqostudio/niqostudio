import { RecordInvoiceList } from './RecordInvoiceList';

// 顧客詳細に出す、その顧客の請求一覧。
export function ClientInvoices({ id }: { id: string }) {
  return <RecordInvoiceList column="client_id" id={id} />;
}
