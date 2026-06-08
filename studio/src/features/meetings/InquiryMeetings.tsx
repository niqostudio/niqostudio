import { RecordMeetingList } from './RecordMeetingList';

// 問い合わせ詳細に出す、その問い合わせ（無料相談）の打ち合わせ一覧。
export function InquiryMeetings({ id }: { id: string }) {
  return <RecordMeetingList column="inquiry_id" id={id} />;
}
