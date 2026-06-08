// niqo dev プロセスの共有ヘルパ。detached で起動した dev サーバの pid/port を state に残し、
// niqo:down から横断停止できるようにする。state とログは .niqo/（gitignore）。
import { execSync, execFile } from 'node:child_process';
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

// state にある dev を停止（best-effort）。停止したら true。
export function stopDev() {
  const s = readState();
  if (!s) return false;
  for (const k of ['website', 'studio']) if (s[k]?.pid) killTree(s[k].pid);
  clearState();
  return true;
}
