'use client';

import { useState } from 'react';
import { createNdaForProject } from '../nda-actions';
import { toast } from '@/features/feedback/toast';
import { t } from '@/shared/i18n';

type Client = { value: string; label: string };
type Project = { value: string; label: string; clientId: string };

// NDA 作成のカスケード選択：顧客 → 案件（その顧客の・NDA 未作成のみ）→ 作成。
export function NdaCreate({ clients, projects }: { clients: Client[]; projects: Project[] }) {
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [busy, setBusy] = useState(false);
  const clientProjects = projects.filter((p) => p.clientId === clientId);

  const submit = async () => {
    if (!projectId) {
      toast.error('案件を選択してください');
      return;
    }
    setBusy(true);
    try {
      await createNdaForProject(projectId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('error'));
      setBusy(false);
    }
  };

  return (
    <div className="card flex flex-col gap-4 p-5">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">顧客</span>
        <select
          className="field"
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setProjectId('');
          }}
        >
          <option value="">選択してください</option>
          {clients.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">
          案件
          {clientId && clientProjects.length === 0 && (
            <span className="ml-1 text-warning">（NDA 未作成の案件がありません）</span>
          )}
        </span>
        <select className="field" value={projectId} onChange={(e) => setProjectId(e.target.value)} disabled={!clientId}>
          <option value="">選択してください</option>
          {clientProjects.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex justify-end">
        <button type="button" className="btn btn-primary" onClick={submit} disabled={busy || !projectId}>
          作成
        </button>
      </div>
    </div>
  );
}
