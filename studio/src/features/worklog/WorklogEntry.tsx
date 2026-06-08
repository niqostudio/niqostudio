'use client';

import { useState } from 'react';
import { logWorkAction } from './actions';
import { toast } from '@/features/feedback/toast';
import { t } from '@/shared/i18n';

const today = () => new Date().toISOString().slice(0, 10);

// 工数の記録フォーム。案件を選んで時間を記録する（一覧で作るのではなく、ここで入力→集計に反映）。
export function WorklogEntry({ projects }: { projects: { value: string; label: string }[] }) {
  const [projectId, setProjectId] = useState(projects[0]?.value ?? '');
  const [workedOn, setWorkedOn] = useState(today());
  const [hours, setHours] = useState('');
  const [task, setTask] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const h = parseFloat(hours);
    if (!projectId || !(h > 0) || !task.trim()) {
      toast.error('案件・工数・作業内容は必須です');
      return;
    }
    setBusy(true);
    try {
      await logWorkAction({ projectId, workedOn, hours: h, task });
      toast.success(t('saved'));
      // 案件・日付は連続入力で使い回せるよう残し、時間と内容だけ消す。
      setHours('');
      setTask('');
    } catch {
      toast.error(t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem_8rem]">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">案件</span>
          <select className="field" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.length === 0 && <option value="">（案件がありません）</option>}
            {projects.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">作業日</span>
          <input type="date" className="field" value={workedOn} onChange={(e) => setWorkedOn(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-muted">工数（時間）</span>
          <input type="number" min="0" step="0.25" className="field" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
      </div>
      <div className="flex items-end gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-muted">作業内容</span>
          <input type="text" className="field" value={task} onChange={(e) => setTask(e.target.value)} placeholder="何をしたか" />
        </label>
        <button type="button" className="btn btn-primary shrink-0" onClick={submit} disabled={busy}>
          記録
        </button>
      </div>
    </div>
  );
}
