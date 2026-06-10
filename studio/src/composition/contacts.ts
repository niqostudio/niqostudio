import { CoreMetricsProvider } from '@/adapters/domain-store/supabase/metrics';

export interface ContactRow {
  id: string;
  name: string;
  role: string;
  email: string;
}

// 指定の会社（client）に紐づく担当者を名前順で返す（顧客詳細の一覧表示用）。
export async function loadContactsForClient(clientId: string): Promise<ContactRow[]> {
  const rows = await new CoreMetricsProvider().rows('contacts', ['id', 'name', 'role', 'email'], { column: 'client_id', value: clientId });
  return rows
    .map((r) => ({
      id: String(r.id),
      name: typeof r.name === 'string' ? r.name : '',
      role: typeof r.role === 'string' ? r.role : '',
      email: typeof r.email === 'string' ? r.email : '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
