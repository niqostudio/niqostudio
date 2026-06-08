import { GithubDeploy } from '@/adapters/deploy/github/deploy';
import type { DeployTrigger } from '@/ports/deploy';

// デプロイ操作（どの workflow を起動するか＝インスタンス設定）。
export interface DeployTarget {
  id: string;
  label: string;
  workflow: string;
  ref: string;
}

export const DEPLOY_TARGETS: DeployTarget[] = [
  { id: 'website', label: '公開サイトを再ビルド＆デプロイ', workflow: 'website.yml', ref: 'main' },
];

let _deploy: DeployTrigger | null = null;
export function getDeploy(): DeployTrigger {
  return (_deploy ??= new GithubDeploy());
}
