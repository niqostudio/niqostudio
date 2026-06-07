import type { ProjectionTarget, CommitCluster } from '@/features/git-import/ingestion';

// Conventional Commits の type(scope): を拾う軽量パース。
const HEADER_RE = /^[a-z]+(?:\(([^)]+)\))?!?:/i;

// commit クラスタ → projects の下書き fields（決定的・core 列名＝snake_case）。
// 本文の言語化（problems/decisions）は後段 AI に委ね、ここは骨格（題名・開始日）だけ確実に埋める。
export class ProjectsProjectionTarget implements ProjectionTarget<Record<string, unknown>> {
  project(cluster: CommitCluster): Record<string, unknown> {
    const dates = cluster.commits
      .map((c) => c.authoredAt?.slice(0, 10))
      .filter((d): d is string => Boolean(d))
      .sort();

    const scopeCount = new Map<string, number>();
    for (const c of cluster.commits) {
      const scope = c.subject.match(HEADER_RE)?.[1];
      if (scope) scopeCount.set(scope, (scopeCount.get(scope) ?? 0) + 1);
    }
    const topScope = [...scopeCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const n = cluster.commits.length;
    const title = topScope ? `${topScope}（${n} commits）` : `（${n} commits）`;

    return { title, status: 'discovery', started_on: dates[0] ?? null, ended_on: null };
  }
}
