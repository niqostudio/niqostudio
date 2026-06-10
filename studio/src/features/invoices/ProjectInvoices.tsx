import { RecordInvoiceList } from './RecordInvoiceList';

// 案件詳細に出す、その案件の請求一覧。
export function ProjectInvoices({ id }: { id: string }) {
  return <RecordInvoiceList column="project_id" id={id} />;
}
