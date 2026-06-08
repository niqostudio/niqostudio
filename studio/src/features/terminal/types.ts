import type { ActivityEntry } from '@/ports/studio-store';

// terminal の活動タブ行＝活動エントリ＋表示ラベル（collection の meta.label を server で解決）。
export interface ActivityRow extends ActivityEntry {
  label: string;
}
