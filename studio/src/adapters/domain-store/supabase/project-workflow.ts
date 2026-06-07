import 'server-only';
import type { WorkflowProvider, WorkflowState } from '@/ports/domain-store';
import { resolveSupabaseConfig, createDynamicCoreClient, type CoreClient, type SupabaseConfig } from './client';

type StatusRow = { code: string; label: string; is_initial: boolean; sort_order: number };

// 案件の状態機械。次状態は core の project_status_transitions（＋初期状態）から live で引く。
export class CoreProjectWorkflow implements WorkflowProvider {
  private client: CoreClient | null = null;

  constructor(private readonly config?: Partial<SupabaseConfig>) {}

  private getClient(): CoreClient {
    if (!this.client) this.client = createDynamicCoreClient(resolveSupabaseConfig(this.config));
    return this.client;
  }

  async nextStates(current: string | null): Promise<WorkflowState[]> {
    const c = this.getClient();
    const statuses = await c.from('project_statuses').select('code,label,is_initial,sort_order').order('sort_order', { ascending: true });
    if (statuses.error) throw new Error(`状態の取得に失敗: ${statuses.error.message}`);
    const rows = (statuses.data ?? []) as StatusRow[];

    // 未設定＝初期状態のみ。
    if (current == null || current === '') {
      return rows.filter((s) => s.is_initial).map((s) => ({ value: s.code, label: s.label }));
    }
    const trans = await c.from('project_status_transitions').select('to_status').eq('from_status', current);
    if (trans.error) throw new Error(`遷移の取得に失敗: ${trans.error.message}`);
    const allowed = new Set((trans.data ?? []).map((t) => (t as { to_status: string }).to_status));
    return rows.filter((s) => allowed.has(s.code)).map((s) => ({ value: s.code, label: s.label }));
  }
}
