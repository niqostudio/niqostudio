import 'server-only';
import { createSign } from 'node:crypto';
import type { DeployTrigger } from '@/ports/deploy';

// GitHub Actions への workflow_dispatch。認証は fine-grained PAT（GITHUB_TOKEN）優先、
// 無ければ GitHub App（GITHUB_APP_ID＋GITHUB_APP_PRIVATE_KEY_B64）で installation token を取得。
// App JWT は Node crypto で署名＝依存ゼロ。すべて server 専用（鍵をクライアントに出さない）。

const API = 'https://api.github.com';
const UA = 'niqostudio-studio';
const repo = () => process.env.GITHUB_REPO ?? 'niqostudio/niqostudio';

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');

function appJwt(appId: string, pem: string): string {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }));
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).end().sign(pem);
  return `${head}.${body}.${b64url(sig)}`;
}

async function gh(path: string, bearer: string, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<Response> {
  return fetch(`${API}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${bearer}`,
      accept: 'application/vnd.github+json',
      'user-agent': UA,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export class GithubDeploy implements DeployTrigger {
  available(): boolean {
    return !!process.env.GITHUB_TOKEN || !!(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY_B64);
  }

  private async token(): Promise<string> {
    const pat = process.env.GITHUB_TOKEN;
    if (pat) return pat;
    const appId = process.env.GITHUB_APP_ID;
    const keyB64 = process.env.GITHUB_APP_PRIVATE_KEY_B64;
    if (!appId || !keyB64) throw new Error('GitHub 連携が未設定（GITHUB_TOKEN か GITHUB_APP_ID/_PRIVATE_KEY_B64）。');
    const jwt = appJwt(appId, Buffer.from(keyB64, 'base64').toString('utf8'));
    const instRes = await gh(`/repos/${repo()}/installation`, jwt);
    if (!instRes.ok) throw new Error(`installation 取得失敗: ${instRes.status} ${await instRes.text()}`);
    const installationId = ((await instRes.json()) as { id: number }).id;
    const tokRes = await gh(`/app/installations/${installationId}/access_tokens`, jwt, 'POST');
    if (!tokRes.ok) throw new Error(`installation token 取得失敗: ${tokRes.status}`);
    return ((await tokRes.json()) as { token: string }).token;
  }

  async trigger(workflow: string, ref: string, inputs?: Record<string, string>): Promise<void> {
    const token = await this.token();
    const res = await gh(`/repos/${repo()}/actions/workflows/${workflow}/dispatches`, token, 'POST', {
      ref,
      ...(inputs ? { inputs } : {}),
    });
    if (!res.ok) throw new Error(`deploy dispatch 失敗: ${res.status} ${await res.text()}`);
  }
}
