// 状態機械（ワークフロー）の境界。CRUD 編集とは分け、詳細側で「次状態へ進める」操作に使う。
// 許容遷移は core（project_status_transitions）が正本。studio はそれを読むだけ＝静的に持たない。

export interface WorkflowState {
  value: string;
  label: string;
}

export interface WorkflowProvider {
  // 現在状態（null＝未設定）から進める次状態。core の遷移マスタ準拠。
  nextStates(current: string | null): Promise<WorkflowState[]>;
}
