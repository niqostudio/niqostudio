// サイドバー nav。href と i18n ラベルキー（nav.<id>）。機能を足す＝ここに1行。
export interface NavItem {
  id: string;
  href: string;
}

export const NAV: NavItem[] = [
  { id: 'projects', href: '/projects' },
  { id: 'clients', href: '/clients' },
  { id: 'inquiries', href: '/inquiries' },
];
