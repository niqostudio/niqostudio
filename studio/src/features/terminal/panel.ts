// terminal パネル（メイン列内の in-flow ボトムパネル）の開閉と、注目している実行行。
let open = false;
let activeRunId: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function subscribeTerminal(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function isTerminalOpen(): boolean {
  return open;
}
export function getActiveRunId(): string | null {
  return activeRunId;
}
export function setTerminalOpen(v: boolean): void {
  open = v;
  emit();
}
export function toggleTerminal(): void {
  setTerminalOpen(!open);
}
export function openTerminal(): void {
  setTerminalOpen(true);
}
// 通知トーストのクリック時：terminal を開き、紐づく実行行をアクティブにする。
export function openTerminalWithRun(runId: string): void {
  open = true;
  activeRunId = runId;
  emit();
}
