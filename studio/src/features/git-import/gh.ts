import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);

// gh 本体を解決：GH_BIN → PATH の 'gh' → Windows 既定インストール先、の順で動くものを採用。
// （PATH 反映待ちでも動くよう full path を fallback に持つ）。auth は gh login が握る＝token 非保持。
const CANDIDATES = [
  process.env.GH_BIN,
  'gh',
  'C:\\Program Files\\GitHub CLI\\gh.exe',
  'C:\\Program Files (x86)\\GitHub CLI\\gh.exe',
].filter((c): c is string => !!c);

let resolved: string | undefined;
async function ghBin(): Promise<string> {
  if (resolved) return resolved;
  for (const c of CANDIDATES) {
    try {
      await exec(c, ['--version']);
      resolved = c;
      return c;
    } catch {
      // 次の候補へ。
    }
  }
  throw new Error('gh が見つかりません。gh auth login 済みか、GH_BIN を設定してください。');
}

// gh api を叩いて JSON を返す（利用者の gh 認証で org/顧客横断にアクセス）。
export async function ghApi<T = unknown>(endpoint: string): Promise<T> {
  const bin = await ghBin();
  const { stdout } = await exec(bin, ['api', endpoint], { maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(stdout) as T;
}
