import Link from 'next/link';
import { loadContactsForClient } from '@/composition/contacts';

// 顧客詳細に出す、その会社の担当者一覧（読み取り）。担当者が無ければ何も出さない。
export async function ClientContacts({ id }: { id: string }) {
  const contacts = await loadContactsForClient(id);
  if (contacts.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <p className="section-label text-xs">担当者</p>
      <ul className="flex flex-col gap-1.5">
        {contacts.map((c) => (
          <li key={c.id}>
            <Link
              href={`/contacts?sel=${c.id}`}
              className="flex items-center gap-2 text-sm transition-colors hover:text-accent"
            >
              <span className="flex-1 truncate">
                {c.name}
                {c.role && <span className="text-muted">（{c.role}）</span>}
              </span>
              {c.email && <span className="shrink-0 text-xs text-muted">{c.email}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
