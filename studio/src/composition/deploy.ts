import { GithubDeploy } from '@/adapters/deploy/github/deploy';
import type { DeployTrigger } from '@/ports/deploy';

// デプロイ操作（どの workflow を起動するか＝インスタンス設定）。
export interface DeployTarget {
  id: string;
  label: string;
  workflow: string;
  ref: string;
  inputs?: Record<string, string>;
}

export const DEPLOY_TARGETS: DeployTarget[] = [
  // release＝本番反映の単一の入口。未反映の変更（migration / functions / website / infra / 商品マスタ）を
  // 依存順で反映する。承認は CI 側の Environment ゲート。
  { id: 'release', label: '未反映の変更を本番へ反映（release）', workflow: 'release.yml', ref: 'main', inputs: { apply: 'true' } },
];

let _deploy: DeployTrigger | null = null;
export function getDeploy(): DeployTrigger {
  return (_deploy ??= new GithubDeploy());
}
