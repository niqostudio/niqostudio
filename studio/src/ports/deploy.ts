// 公開デプロイ（CI workflow の起動）。接続先 CI は adapter（GitHub Actions 等）が実装する。
export interface DeployTrigger {
  // 連携 creds が設定済みか（未設定なら UI はボタンを出さない）。
  available(): boolean;
  // workflow を ref で dispatch する。本番反映は CI 側の承認ゲート（Environment）が二重に効く。
  trigger(workflow: string, ref: string): Promise<void>;
}
