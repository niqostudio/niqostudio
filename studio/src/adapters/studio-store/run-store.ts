import {
  createStudioStoreClient,
  resolveStudioStoreConfig,
  type StudioStoreClient,
  type StudioStoreConfig,
} from './client';

export type RunStatus = 'running' | 'ok' | 'error';

export interface CommandRun {
  id: string;
  command: string;
  status: RunStatus;
  output: string;
  createdAt: string;
  finishedAt: string | null;
}

type RunRow = {
  id: string;
  command: string;
  status: RunStatus;
  output: string;
  created_at: string;
  finished_at: string | null;
};

// daemon/CLI の実行履歴（studio.command_runs）。daemon が start→finish、terminal 画面が list。
export class StudioRunStore {
  private client: StudioStoreClient | null = null;

  constructor(
    private readonly tenantId: string,
    private readonly config?: Partial<StudioStoreConfig>,
  ) {}

  private getClient(): StudioStoreClient {
    if (!this.client) this.client = createStudioStoreClient(resolveStudioStoreConfig(this.config));
    return this.client;
  }

  async start(command: string): Promise<string> {
    const { data, error } = await this.getClient()
      .from('command_runs')
      .insert({ tenant_id: this.tenantId, command, status: 'running' })
      .select('id')
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  }

  async finish(id: string, status: RunStatus, output: string): Promise<void> {
    const { error } = await this.getClient()
      .from('command_runs')
      .update({ status, output, finished_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }

  async list(limit = 50): Promise<CommandRun[]> {
    const { data, error } = await this.getClient()
      .from('command_runs')
      .select('id, command, status, output, created_at, finished_at')
      .eq('tenant_id', this.tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((r) => {
      const row = r as RunRow;
      return {
        id: row.id,
        command: row.command,
        status: row.status,
        output: row.output,
        createdAt: row.created_at,
        finishedAt: row.finished_at,
      };
    });
  }
}
