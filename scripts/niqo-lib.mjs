// niqo dev プロセスの共有ヘルパ。detached で起動した dev サーバの pid/port を state に残し、
// niqo:down から横断停止できるようにする。state とログは .niqo/（gitignore）。
import { execSync, execFile, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { platform } from 'node:os';

export const STATE_DIR = '.niqo';
export const STATE_FILE = `${STATE_DIR}/dev.json`;

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
