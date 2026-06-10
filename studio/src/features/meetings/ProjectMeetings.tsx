import { RecordMeetingList } from './RecordMeetingList';

// 案件詳細に出す、その案件の打ち合わせ一覧。
export function ProjectMeetings({ id }: { id: string }) {
  return <RecordMeetingList column="project_id" id={id} />;
}
