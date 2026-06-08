import { RecordMeetingList } from './RecordMeetingList';

// 顧客詳細に出す、その顧客の打ち合わせ一覧。
export function ClientMeetings({ id }: { id: string }) {
  return <RecordMeetingList column="client_id" id={id} />;
}
