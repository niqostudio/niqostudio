import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

// studio 自前スキン（globals.css の .btn/.card/.chip 等）を着せる薄いラッパー。
// 形・色は共有クラスが持ち、中身と中身ごとのレイアウトは呼び出し側が持つ。

export function Button({
  children,
  variant = 'primary',
  className,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  return <button className={cn('btn', `btn-${variant}`, className)}>{children}</button>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('card', className)}>{children}</div>;
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('chip chip-mono inline-flex items-center', className)}>{children}</span>;
}

// 入力面の共通スキン（.field）を着せる薄いラッパー。幅は className で渡す（既定は持たない）。
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn('field', className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select className={cn('field', className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn('field', className)} {...props} />;
}

// 検索欄。先頭にアイコンを置き、枠は .field（focus 枠色はグローバル規則）。幅は className（既定 w-full）。
export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className ?? 'w-full')}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="field w-full pl-8"
      />
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('section-label text-xs', className)}>{children}</p>;
}

// 戻りリンク。矢印は SVG＋inline-flex items-center で文字メトリクスに依らず中央揃え（← 文字のズレ回避）。
export function BackLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent', className)}
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

// 案件ステータスの表示色（ラベルの正本は core の project_statuses）。一覧バッジは同期描画なので色だけ持つ。
const STATUS: Record<string, { label: string; className: string }> = {
  consultation: { label: '無料相談', className: 'text-muted border-border' },
  discovery: { label: '事前設計', className: 'text-accent border-accent' },
  active: { label: '進行中', className: 'text-accent border-accent' },
  delivered: { label: '納品済', className: 'text-accent border-accent' },
  closed: { label: 'クローズ', className: 'text-muted border-border' },
};

// ステータスバッジ。色は STATUS（studio の presentation）、ラベルは overlay 由来を優先（label）。
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  // 値が無ければ何も出さない（空の四角を描かない）。
  if (!status) return null;
  const s = STATUS[status] ?? { label: status, className: 'text-muted border-border' };
  return <span className={cn('chip inline-flex items-center px-2 py-0.5', s.className)}>{label ?? s.label}</span>;
}
