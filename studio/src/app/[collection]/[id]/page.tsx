import { redirect } from 'next/navigation';

// 詳細は一覧の右ペイン（master-detail）。直リンクは ?sel= に寄せる。編集は /<col>/<id>/edit。
export default async function Page({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const { collection, id } = await params;
  redirect(`/${collection}?sel=${id}`);
}
