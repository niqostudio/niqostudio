// record の出来事の時系列（管理画面の右ペインに出す）。実装は adapters。
// いまは案件の状態遷移（core の project_status_events）を出す。持つ collection だけが配線する。

export interface TimelineEntry {
  at: string;
  from: string | null;
  to: string;
  fromLabel: string | null;
  toLabel: string;
}

export interface RecordTimeline {
  list(recordId: string): Promise<TimelineEntry[]>;
}
