import type { ComponentProps, ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, Search } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { t } from '@/shared/i18n';

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

// アクションボタン（button/link 兼用）。色は variant の props で変える＝保存/反映/編集で共通化。
export function Action({
  children,
  variant = 'secondary',
  href,
  onClick,
  type = 'button',
  disabled,
  title,
  className,
}: {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  href?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  const cls = cn('btn', `btn-${variant}`, 'inline-flex items-center gap-1.5', className);
  if (href)
    return (
      <Link href={href} title={title} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={cls}>
      {children}
    </button>
  );
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

// 未実装ドメインの「あるべき場所」を示す枠。準備中バッジ＋何が入るかの一文。core を変えず UI 骨格を見せる。
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-sm border border-dashed border-border p-4 text-sm text-muted">
      <span className="chip chip-mono px-1.5 py-0.5">{t('comingSoon')}</span>
      <span>{children}</span>
    </div>
  );
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

// ステータスバッジ（presentation のみ）。studio は status 値の意味を知らないため色は中立。
// ラベルは overlay 由来を呼び出し側が渡す（label）。色分けが要るなら overlay に色を持たせて渡す方針。
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  // 値が無ければ何も出さない（空の四角を描かない）。
  if (!status) return null;
  return <span className="chip inline-flex items-center px-2 py-0.5 text-muted border-border">{label ?? status}</span>;
}

// ステータスの流れ（順序つき）。現在を塗り、過去は通常、未来は淡く＝現在地が一目で分かる。
export function StatusStepper({ steps, current }: { steps: { value: string; label: string }[]; current: string }) {
  const idx = steps.findIndex((s) => s.value === current);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((s, i) => {
        const isCurrent = s.value === current;
        const done = idx >= 0 && i < idx;
        return (
          <span key={s.value} className="inline-flex items-center gap-1">
            {i > 0 && (
              <span className="text-border" aria-hidden="true">
                →
              </span>
            )}
            <span
              className={cn(
                'chip inline-flex items-center px-2 py-0.5',
                isCurrent
                  ? 'border-accent bg-accent text-surface'
                  : done
                    ? 'border-border text-fg'
                    : 'border-border-subtle text-muted',
              )}
            >
              {s.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}
