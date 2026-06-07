// アクセスを許可する operator メールの許可リスト（middleware と server の両方から使う純モジュール）。
// 未設定なら全拒否（安全側）＝env を入れ忘れた本番で全開放しない。
export function allowedEmails(): string[] {
  return (process.env.STUDIO_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowed(email?: string | null): boolean {
  const list = allowedEmails();
  if (list.length === 0) return false;
  return !!email && list.includes(email.toLowerCase());
}
