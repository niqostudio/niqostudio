import type { Source } from '@/ports/domain-store';

// git 射影の seam。抽出（事実→クラスタ）は target 非依存＝汎用。写像（クラスタ→F）だけが target 特化。
// 源（Source）の契約は shared/records が持つ＝この feature は「源をどう読み・射影するか」を担う。

// 正規化した git の事実。SourceAccess はこれを返す（ローカル作業ツリーのパスは渡さない）。
export interface Commit {
  sha: string;
  parents: string[];
  authoredAt: string;
  author: string;
  subject: string;
  body: string;
  // 変更パス。
  files: string[];
}

export interface CommitGraph {
  sourceId: string;
  commits: Commit[];
}

// 決定的に束ねた commit 群（射影の単位）。
export interface CommitCluster {
  commits: Commit[];
}

// リポ→正規化 commit/diff の IO 境界（取得方法＝ローカル/リモートを吸収）。
export interface SourceAccess {
  read(source: Source): Promise<CommitGraph>;
}

// 1クラスタ → target の fields 写像（差し替え点）。
export interface ProjectionTarget<F> {
  project(cluster: CommitCluster): F;
}

// 抽出した中間表現（commit 群＋クラスタ）。射影の証拠＝traceability の対象。
export interface Extraction {
  commits: Commit[];
  clusters: CommitCluster[];
}

// git 特化・射影先汎用の engine。record に紐づく複数 source を集約し（target 非依存の抽出・
// クラスタリング）、target で1つの fields に写像する。
export interface GitRepositoryProjection {
  project<F>(
    sources: Source[],
    target: ProjectionTarget<F>,
    onExtract?: (extraction: Extraction) => void | Promise<void>,
  ): Promise<F | null>;
}
