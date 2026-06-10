import 'server-only';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

// 送信 identity の正本は root の config.production.json（infra / website と共有）。studio は実行時に読む。
interface MailIdentity {
  senderName: string;
  contact: string;
  noreply: string;
}
let cached: MailIdentity | null = null;

export function mailIdentity(): MailIdentity {
  if (cached) return cached;
  const fallback: MailIdentity = { senderName: 'NIQO STUDIO', contact: 'hi@niqostudio.com', noreply: 'noreply@niqostudio.com' };
  try {
    const cfg = JSON.parse(readFileSync(resolve(process.cwd(), '..', 'config.production.json'), 'utf8'));
    const email = cfg.domains?.[cfg.primary]?.email;
    cached = {
      senderName: email?.sender_name ?? fallback.senderName,
      contact: email?.addresses?.contact ?? fallback.contact,
      noreply: email?.addresses?.noreply ?? fallback.noreply,
    };
  } catch {
    cached = fallback;
  }
  return cached;
}

// 送信が可能か（key の有無）。フォームのボタン活殺に使う。
export function mailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Resend で1通送る。key 未設定・失敗は throw（呼び出し側で toast）。
export async function sendMail(input: { to: string; from: string; subject: string; text: string; replyTo?: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY が未設定です');
  const res = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: input.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`送信に失敗しました: ${res.status} ${await res.text()}`);
}
