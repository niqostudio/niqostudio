import type { GitRepositoryProjection } from '@/features/git-import/ingestion';
import { StudioExtractionStore } from '@/features/git-import/extraction-store';
import { getCollection } from '@/composition/collections';
import { INSTANCE_ID } from '@/composition/instance';
import { ProjectsProjectionTarget } from '@/domain/projects/projection';

// 指定 project の源リポ（複数）を集約して射影し、その案件の下書き（1:1・id=projectId）に反映する。
// engine（GitRepositoryProjection）は注入（アダプタの構築は composition が持つ）。
export async function deriveProjectDrafts(
  projectId: string,
  engine: GitRepositoryProjection,
): Promise<boolean> {
  const binding = getCollection('projects');
  if (!binding?.sources) throw new Error('projects collection に sources が未配線です');

  const sources = await binding.sources.listForRecord(projectId);
  // 中間表現（CommitGraph＋クラスタ）を永続化（traceability）。
  const extractions = new StudioExtractionStore(INSTANCE_ID);
  const projected = await engine.project(sources, new ProjectsProjectionTarget(), (e) =>
    extractions.save(projectId, e),
  );
  if (!projected) return false;

  // 既存（下書き or 正本）があれば人/AI が育てた値を土台に、git 由来の骨格（題名・期間）だけ更新。
  const existing = (await binding.drafts.get(projectId)) ?? (await binding.store.get(projectId));
  const fields = existing
    ? { ...existing.fields, title: projected.title, started_on: projected.started_on, ended_on: projected.ended_on }
    : projected;

  await binding.drafts.save({
    id: projectId,
    fields,
    draftState: 'draft',
    sourceId: null,
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  await binding.versions?.append(projectId, fields, 'derive');
  return true;
}
