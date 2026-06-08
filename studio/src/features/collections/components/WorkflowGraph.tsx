'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { advanceStatusAction } from '../actions';
import { toast } from '@/features/feedback/toast';
import { t } from '@/shared/i18n';

// 状態機械のグラフ。ノード＝状態（sort_order で横並び）、エッジ＝遷移。
// 隣接は直線・スキップは上弧・戻りは下弧で枝分かれを描く。現在から出る遷移は強調し、
// 行ける状態（ノード）はクリックで遷移できる。色はトークン＝ライト/ダーク追従。
const COL = 132;
const NODE_W = 104;
const NODE_H = 34;
const MID = 70;
const H = 140;
const ARC = 44;
const HALF = NODE_W / 2;
const TOP = MID - NODE_H / 2;
const BOTTOM = MID + NODE_H / 2;

export function WorkflowGraph({
  collectionId,
  recordId,
  steps,
  current,
  nextValues,
  edges,
}: {
  collectionId: string;
  recordId: string;
  steps: { value: string; label: string }[];
  current: string;
  nextValues: string[];
  edges: { from: string; to: string }[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const nextSet = new Set(nextValues);
  const idxOf = new Map(steps.map((s, i) => [s.value, i]));
  const curIdx = idxOf.get(current) ?? -1;
  const W = Math.max(steps.length, 1) * COL;
  const cx = (i: number) => i * COL + COL / 2;

  async function advance(to: string) {
    setBusy(true);
    try {
      await advanceStatusAction(collectionId, recordId, to);
    } catch {
      toast.error(t('error'));
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  function edgePath(a: number, b: number): string {
    if (b === a + 1) return `M ${cx(a) + HALF} ${MID} L ${cx(b) - HALF} ${MID}`;
    const mx = (cx(a) + cx(b)) / 2;
    if (b > a) return `M ${cx(a)} ${TOP} Q ${mx} ${TOP - ARC} ${cx(b)} ${TOP}`;
    return `M ${cx(a)} ${BOTTOM} Q ${mx} ${BOTTOM + ARC} ${cx(b)} ${BOTTOM}`;
  }

  return (
    <div className="overflow-x-auto pb-1">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block">
        <defs>
          <marker id="wf-arrow-on" markerWidth="8" markerHeight="8" refX="6.5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-accent)" />
          </marker>
          <marker id="wf-arrow-off" markerWidth="8" markerHeight="8" refX="6.5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--color-border)" />
          </marker>
        </defs>

        {edges.map((e, i) => {
          const a = idxOf.get(e.from);
          const b = idxOf.get(e.to);
          if (a == null || b == null) return null;
          const on = e.from === current; // 現在から出る＝今選べる遷移
          return (
            <path
              key={`${e.from}-${e.to}-${i}`}
              d={edgePath(a, b)}
              fill="none"
              stroke={on ? 'var(--color-accent)' : 'var(--color-border)'}
              strokeWidth={on ? 2 : 1}
              markerEnd={`url(#${on ? 'wf-arrow-on' : 'wf-arrow-off'})`}
            />
          );
        })}

        {steps.map((s, i) => {
          const isCurrent = s.value === current;
          const isNext = nextSet.has(s.value);
          const done = curIdx >= 0 && i < curIdx;
          const fill = isCurrent ? 'var(--color-accent)' : 'var(--color-surface)';
          const stroke = isCurrent || isNext ? 'var(--color-accent)' : done ? 'var(--color-success)' : 'var(--color-border)';
          const textColor = isCurrent
            ? 'var(--color-on-accent)'
            : isNext
              ? 'var(--color-accent)'
              : done
                ? 'var(--color-success)'
                : 'var(--color-muted)';
          return (
            <g
              key={s.value}
              onClick={isNext && !busy ? () => advance(s.value) : undefined}
              style={{ cursor: isNext ? 'pointer' : 'default' }}
            >
              <rect
                x={cx(i) - HALF}
                y={TOP}
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill={fill}
                stroke={stroke}
                strokeWidth={isCurrent || isNext ? 2 : 1}
              />
              <text x={cx(i)} y={MID} textAnchor="middle" dominantBaseline="central" fontSize="13" fill={textColor}>
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
