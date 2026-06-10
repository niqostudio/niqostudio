// niqo dev プロセスの共有ヘルパ。detached で起動した dev サーバの pid/port を state に残し、
// niqo:down から横断停止できるようにする。state とログは .niqo/（gitignore）。
import { execSync, execFile, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { platform } from 'node:os';

export const STATE_DIR = '.niqo';
export const STATE_FILE = `${STATE_DIR}/dev.json`;

// ローカル dev operator（studio 認証ゲート用）。STUDIO_ALLOWED_EMAILS と一致させる。
export const DEV_EMAIL = 'dev@niqostudio.local';
export const DEV_PASSWORD = 'devpassword';

// supabase status から URL/keys を拾い dev operator を冪等作成（gotrue admin）。
// db:reset が auth.users を作り直すと operator が消えるため reset 後に呼ぶ。
export async function ensureDevOperator() {
  const env = execFileSync('pnpm', ['--filter', '@niqostudio/infra', 'exec', 'supabase', 'status', '-o', 'env'], {
    encoding: 'utf8',
    shell: true,
  });
  const pick = (k) => env.match(new RegExp(`^${k}="?([^"\\n]+)"?`, 'm'))?.[1] ?? '';
  const API = pick('API_URL');
  const S = pick('SERVICE_ROLE_KEY');
  if (!API || !S) {
    console.log('  operator: supabase status から取得できず skip');
    return;
  }
  // reset 直後は auth(gotrue) が起動途中で 502/503 を返すためリトライ。既存(422/409)は成功扱い。
  for (let i = 0; i < 8; i++) {
    try {
      const r = await fetch(`${API}/auth/v1/admin/users`, {
        method: 'POST',
        headers: { apikey: S, authorization: `Bearer ${S}`, 'content-type': 'application/json' },
        body: JSON.stringify({ email: DEV_EMAIL, password: DEV_PASSWORD, email_confirm: true }),
      });
      if (r.ok || r.status === 422 || r.status === 409) {
        console.log(`  + operator: ${DEV_EMAIL}`);
        return;
      }
      if (![502, 503, 504].includes(r.status)) {
        console.log(`  operator: HTTP ${r.status}`);
        return;
      }
    } catch {
      // 接続不可（起動途中）。
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  console.log('  operator: auth 未起動でタイムアウト');
}

export function open(url) {
  const cp =
    platform() === 'win32'
      ? execFile('cmd', ['/c', 'start', '', url])
      : platform() === 'darwin'
        ? execFile('open', [url])
        : execFile('xdg-open', [url]);
  cp.unref?.();
}

// プロセスツリーごと停止（pnpm→node の孫まで）。Win=taskkill /T、Unix=プロセスグループ。
export function killTree(pid) {
  if (!pid) return;
  try {
    if (platform() === 'win32') execSync(`taskkill /pid ${pid} /t /f`, { stdio: 'ignore' });
    else process.kill(-pid, 'SIGTERM');
  } catch {
    // 既に終了している場合は無視。
  }
}

export function readState() {
  if (!existsSync(STATE_FILE)) return null;
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return null;
  }
}

export function writeState(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export function clearState() {
  rmSync(STATE_FILE, { force: true });
}

// この repo の dev プロセス（next/astro/pnpm ラッパ・ビルドワーカ）を CommandLine で特定して停止。
// state 追跡外のゾンビも掃除する（兄弟 repo＝sindo/preflight 等は CommandLine が一致しないので対象外）。
export function killRepoDev() {
  try {
    if (platform() === 'win32') {
      const likes = [
        '*niqostudio\\niqostudio*',
        '*@niqostudio/studio*',
        '*@niqostudio/website*',
        '*dev:studio*',
        '*dev:website*',
      ]
        .map((p) => `$_.CommandLine -like '${p}'`)
        .join(' -or ');
      const ps = `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { ${likes} } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
      execFileSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'ignore' });
    } else {
      for (const p of ['niqostudio/niqostudio', '@niqostudio/studio', '@niqostudio/website', 'dev:studio', 'dev:website']) {
        try {
          execFileSync('pkill', ['-f', p], { stdio: 'ignore' });
        } catch {
          // pkill は該当 0 件で非 0 終了するため無視。
        }
      }
    }
  } catch {
    // best-effort。
  }
}

// dev を停止。state 追跡 pid＋CommandLine 一致の全プロセス（ゾンビ含む）を掃除する。
export function stopDev() {
  const s = readState();
  if (s) for (const k of ['website', 'studio']) if (s[k]?.pid) killTree(s[k].pid);
  killRepoDev();
  clearState();
  return !!s;
}
