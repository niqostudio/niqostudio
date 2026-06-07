import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import type { SourceAccess, CommitGraph, Commit } from '@/features/git-import/ingestion';
import type { Source } from '@/shared/records/source';

const exec = promisify(execFile);

// git plumbing の出力を自前パースする SourceAccess。欲しい項目を --format で精密に取る。
// source.ref はローカルパス、または remote（https/git@/ssh の URL・"owner/repo"）。
// remote は利用者の git 資格情報（SSH/credential helper）で bare partial clone を cache し log を取る
// ＝PAT 等の集中トークン不要・org/顧客横断に効く。フィールド区切り US(0x1f)・レコード区切り RS(0x1e)。
const US = '\x1f';
const RS = '\x1e';
const CACHE = '.repo-cache';

const isRemote = (ref: string): boolean =>
  /^(https?:\/\/|git@|ssh:\/\/)/.test(ref) || /^[\w.-]+\/[\w.-]+$/.test(ref);

const cloneUrl = (ref: string): string =>
  /^(https?:\/\/|git@|ssh:\/\/)/.test(ref) ? ref : `https://github.com/${ref}.git`;

export class GitCliSourceAccess implements SourceAccess {
  // ローカルパスはそのまま、remote は cache に bare clone/fetch して log 取得用のディレクトリを返す。
  private async repoDir(ref: string): Promise<string> {
    if (!isRemote(ref)) return ref;
    const dir = join(CACHE, createHash('sha1').update(ref).digest('hex'));
    if (existsSync(dir)) {
      await exec('git', ['-C', dir, 'fetch', '--all', '--prune'], { maxBuffer: 64 * 1024 * 1024 }).catch(
        () => {},
      );
    } else {
      await mkdir(CACHE, { recursive: true });
      // commit メタだけ要るので blob 無しの bare partial clone（認証は利用者の git 設定）。
      await exec('git', ['clone', '--bare', '--filter=blob:none', cloneUrl(ref), dir], {
        maxBuffer: 256 * 1024 * 1024,
      });
    }
    return dir;
  }

  async read(source: Source): Promise<CommitGraph> {
    const dir = await this.repoDir(source.ref);
    const format = ['%H', '%P', '%an', '%aI', '%s', '%b'].join(US) + RS;
    const { stdout } = await exec('git', ['-C', dir, 'log', '--no-color', `--format=${format}`], {
      maxBuffer: 64 * 1024 * 1024,
    });

    const commits: Commit[] = stdout
      .split(RS)
      .map((rec) => rec.replace(/^\s+/, ''))
      .filter((rec) => rec.length > 0)
      .map((rec) => {
        const [sha, parents, author, authoredAt, subject, body] = rec.split(US);
        return {
          sha,
          parents: parents ? parents.split(' ').filter(Boolean) : [],
          author,
          authoredAt,
          subject,
          body: body ?? '',
          files: [],
        };
      });

    return { sourceId: source.id, commits };
  }
}
