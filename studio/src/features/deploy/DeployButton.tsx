'use client';

import { useState } from 'react';
import { deployAction } from '@/composition/deploy-actions';
import { toast } from '@/features/feedback/toast';
import { t } from '@/shared/i18n';

// デプロイ要求ボタン。本番の再ビルド＆デプロイを起動するため確認を挟む（実反映は CI の承認ゲート）。
export function DeployButton({ id, label }: { id: string; label: string }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    if (!confirm(`${label}\n本番の再ビルド＆デプロイを要求します。よろしいですか？`)) return;
    setBusy(true);
    try {
      await deployAction(id);
      toast.success('デプロイを要求しました');
    } catch {
      toast.error(t('error'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className="btn btn-secondary" disabled={busy} onClick={run}>
      {label}
    </button>
  );
}
