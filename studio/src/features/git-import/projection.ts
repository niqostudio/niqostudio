import type {
  GitRepositoryProjection,
  ProjectionTarget,
  SourceAccess,
  Extraction,
  Commit,
} from '@/features/git-import/ingestion';
import type { Source } from '@/ports/domain-store';

// git 特化・射影先汎用の engine。record の複数 source を読み、commit を集約して（クラスタリングの
// 初手は「全 source の全 commit ＝ 1 クラスタ」）target で1つの fields に写像する。
export class GitRepositoryProjectionEngine implements GitRepositoryProjection {
  constructor(private readonly access: SourceAccess) {}

  async project<F>(
    sources: Source[],
    target: ProjectionTarget<F>,
    onExtract?: (extraction: Extraction) => void | Promise<void>,
  ): Promise<F | null> {
    const commits: Commit[] = [];
    for (const source of sources) {
      const graph = await this.access.read(source);
      commits.push(...graph.commits);
    }
    if (commits.length === 0) return null;

    const clusters = [{ commits }];
    if (onExtract) await onExtract({ commits, clusters });
    return target.project(clusters[0]);
  }
}
