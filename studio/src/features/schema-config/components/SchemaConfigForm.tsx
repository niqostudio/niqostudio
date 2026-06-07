'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BackLink, Input, Select } from '@/shared/ui/primitives';
import type { FieldKind } from '@/features/domain-overlay/schema';
import type { CollectionSemantics, FieldSemantics } from '@/features/domain-overlay/overlay';
import { saveSemantics } from '../actions';

const KINDS: FieldKind[] = ['text', 'textarea', 'select', 'date', 'list', 'boolean', 'reference'];

type FieldEdit = { label: string; kind: FieldKind; description: string; hidden: boolean; optionLabels: Record<string, string> };
type OptionSets = Record<string, { value: string; coreLabel: string }[]>;
type ChildFieldEdit = { label: string; kind: FieldKind; description: string };
type ChildEdit = {
  included: boolean;
  label: string;
  description: string;
  fields: Record<string, ChildFieldEdit>;
};
export type EditableSemantics = {
  titleField: string;
  statusField: string;
  fields: Record<string, FieldEdit>;
  children: Record<string, ChildEdit>;
};

type StructIn = {
  fields: { name: string }[];
  childTables: { table: string; fields: { name: string }[] }[];
};

function KindSelect({ value, onChange }: { value: FieldKind; onChange: (k: FieldKind) => void }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as FieldKind)}>
      {KINDS.map((k) => (
        <option key={k} value={k}>{k}</option>
      ))}
    </Select>
  );
}

// live 構造の上で semantics（意味）を編集する。構造（列・子テーブル）は core が正本＝ここでは変えない。
export function SchemaConfigForm({
  collection,
  structure,
  initial,
  optionSets,
}: {
  collection: string;
  structure: StructIn;
  initial: EditableSemantics;
  optionSets: OptionSets;
}) {
  const router = useRouter();
  const [sem, setSem] = useState<EditableSemantics>(initial);
  const [busy, setBusy] = useState(false);

  const fieldNames = structure.fields.map((f) => f.name);

  function toSemantics(): CollectionSemantics {
    const fields: Record<string, FieldSemantics> = {};
    for (const [k, f] of Object.entries(sem.fields)) {
      fields[k] = {
        label: f.label,
        kind: f.kind,
        ...(f.description ? { description: f.description } : {}),
        ...(f.hidden ? { hidden: true } : {}),
        ...(Object.keys(f.optionLabels).length ? { optionLabels: f.optionLabels } : {}),
      };
    }
    const children: NonNullable<CollectionSemantics['children']> = {};
    for (const [table, c] of Object.entries(sem.children)) {
      if (!c.included) continue;
      const cf: Record<string, FieldSemantics> = {};
      for (const [k, f] of Object.entries(c.fields)) {
        cf[k] = { label: f.label, kind: f.kind, ...(f.description ? { description: f.description } : {}) };
      }
      children[table] = { label: c.label, ...(c.description ? { description: c.description } : {}), fields: cf };
    }
    return { titleField: sem.titleField, ...(sem.statusField ? { statusField: sem.statusField } : {}), fields, children };
  }

  async function save() {
    setBusy(true);
    try {
      await saveSemantics(collection, JSON.stringify(toSemantics()));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const setField = (name: string, patch: Partial<FieldEdit>) =>
    setSem((s) => ({ ...s, fields: { ...s.fields, [name]: { ...s.fields[name], ...patch } } }));
  // 値ラベルの編集（空にすると overlay から外し core ラベルへフォールバック）。
  const setOptionLabel = (name: string, value: string, label: string) =>
    setSem((s) => {
      const cur = { ...s.fields[name].optionLabels };
      if (label) cur[value] = label;
      else delete cur[value];
      return { ...s, fields: { ...s.fields, [name]: { ...s.fields[name], optionLabels: cur } } };
    });
  const setChild = (table: string, patch: Partial<ChildEdit>) =>
    setSem((s) => ({ ...s, children: { ...s.children, [table]: { ...s.children[table], ...patch } } }));
  const setChildField = (table: string, name: string, patch: Partial<ChildFieldEdit>) =>
    setSem((s) => ({
      ...s,
      children: {
        ...s.children,
        [table]: {
          ...s.children[table],
          fields: { ...s.children[table].fields, [name]: { ...s.children[table].fields[name], ...patch } },
        },
      },
    }));

  return (
    <div className="flex flex-col gap-8 p-5 md:p-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="section-label text-xs">schema / {collection}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">スキーマ設定</h1>
          <p className="mt-1 text-sm text-muted">構造は core から自動。ここでは意味（ラベル・ヒント・種別・表示）だけを決める。</p>
        </div>
        <div className="flex items-center gap-3">
          <BackLink href={`/${collection}`}>一覧</BackLink>
          <button className="btn btn-primary" disabled={busy} onClick={save}>保存</button>
        </div>
      </header>

      <section className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted">タイトル列</span>
          <Select value={sem.titleField} onChange={(e) => setSem((s) => ({ ...s, titleField: e.target.value }))}>
            {fieldNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-muted">ステータス列</span>
          <Select value={sem.statusField} onChange={(e) => setSem((s) => ({ ...s, statusField: e.target.value }))}>
            <option value="">（なし）</option>
            {fieldNames.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <p className="section-label text-xs">フィールド</p>
        {structure.fields.map((f) => {
          const e = sem.fields[f.name];
          if (!e) return null;
          return (
            <div key={f.name} className="card flex flex-wrap items-center gap-2 p-3">
              <span className="w-40 shrink-0 font-mono text-xs text-muted">{f.name}</span>
              <Input className="w-40" placeholder="ラベル" value={e.label} onChange={(ev) => setField(f.name, { label: ev.target.value })} />
              <KindSelect value={e.kind} onChange={(k) => setField(f.name, { kind: k })} />
              <Input className="flex-1 min-w-48" placeholder="意味ヒント（AI 抽出も駆動）" value={e.description} onChange={(ev) => setField(f.name, { description: ev.target.value })} />
              <label className="flex items-center gap-1 text-xs text-muted">
                <input type="checkbox" checked={e.hidden} onChange={(ev) => setField(f.name, { hidden: ev.target.checked })} />非表示
              </label>

              {optionSets[f.name] && optionSets[f.name].length > 0 && (
                <div className="mt-1 flex w-full flex-col gap-1 border-t border-border-subtle pt-2 pl-40">
                  <span className="text-xs text-muted">選択肢ラベル（空欄＝core 既定）</span>
                  {optionSets[f.name].map((o) => (
                    <div key={o.value} className="flex items-center gap-2">
                      <span className="w-36 shrink-0 font-mono text-xs text-muted">{o.value}</span>
                      <Input
                        className="flex-1 min-w-48"
                        placeholder={o.coreLabel}
                        value={e.optionLabels[o.value] ?? ''}
                        onChange={(ev) => setOptionLabel(f.name, o.value, ev.target.value)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <p className="section-label text-xs">子テーブル（1:N）</p>
        {structure.childTables.map((c) => {
          const ce = sem.children[c.table];
          if (!ce) return null;
          return (
            <div key={c.table} className="card flex flex-col gap-2 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={ce.included} onChange={(ev) => setChild(c.table, { included: ev.target.checked })} />
                  <span className="font-mono text-xs text-muted">{c.table}</span>
                </label>
                {ce.included && (
                  <>
                    <Input className="w-48" placeholder="ラベル" value={ce.label} onChange={(ev) => setChild(c.table, { label: ev.target.value })} />
                    <Input className="flex-1 min-w-48" placeholder="意味ヒント" value={ce.description} onChange={(ev) => setChild(c.table, { description: ev.target.value })} />
                  </>
                )}
              </div>
              {ce.included && (
                <div className="flex flex-col gap-1 border-t border-border-subtle pt-2">
                  {c.fields.map((cf) => {
                    const fe = ce.fields[cf.name];
                    if (!fe) return null;
                    return (
                      <div key={cf.name} className="flex flex-wrap items-center gap-2 pl-4">
                        <span className="w-36 shrink-0 font-mono text-xs text-muted">{cf.name}</span>
                        <Input className="w-36" placeholder="ラベル" value={fe.label} onChange={(ev) => setChildField(c.table, cf.name, { label: ev.target.value })} />
                        <KindSelect value={fe.kind} onChange={(k) => setChildField(c.table, cf.name, { kind: k })} />
                        <Input className="flex-1 min-w-48" placeholder="意味ヒント" value={fe.description} onChange={(ev) => setChildField(c.table, cf.name, { description: ev.target.value })} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
