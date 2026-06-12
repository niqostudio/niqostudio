'use server';

import { DEPLOY_TARGETS, getDeploy } from './deploy';

// デプロイ要求（workflow_dispatch）。本番反映は CI 側の Environment 承認ゲートが二重に効く。
export async function deployAction(targetId: string): Promise<void> {
  const target = DEPLOY_TARGETS.find((t) => t.id === targetId);
  if (!target) throw new Error(`unknown deploy target: ${targetId}`);
  await getDeploy().trigger(target.workflow, target.ref, target.inputs);
}
