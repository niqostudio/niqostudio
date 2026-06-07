import { redirect } from 'next/navigation';

// 詳細は一覧の右ペイン（master-detail）。直リンクは ?sel= に寄せる。編集は /<id>/edit。
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/products?sel=${id}`);
}
