// Resend 経由のメール送信ヘルパー。自動返信（顧客宛・noreply）と通知（hi@ 宛）を組み立てる。
// /api/email-events と /api/contact の双方から使う。ブランド名・送信元は config/site.ts に集約。
import { SITE } from '../config/site';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export type InquiryMail = {
  name: string;
  company?: string | null;
  email: string;
  subject?: string | null;
  message: string;
};

function escapeHtml(s: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

// 改行を <br> にしつつ各行をエスケープ（message の表示用）。
function multiline(s: string): string {
  return escapeHtml(s).replace(/\r?\n/g, '<br>');
}

function detailRows(input: InquiryMail): string {
  const row = (label: string, value: string) =>
    `<tr><th style="text-align:left;padding:4px 12px 4px 0;color:#57534e;font-weight:600;vertical-align:top;white-space:nowrap">${label}</th><td style="padding:4px 0;color:#1c1917">${value}</td></tr>`;
  return [
    row('お名前', escapeHtml(input.name)),
    input.company ? row('会社名', escapeHtml(input.company)) : '',
    row('メール', escapeHtml(input.email)),
    input.subject ? row('件名', escapeHtml(input.subject)) : '',
    row('内容', multiline(input.message)),
  ].join('');
}

function shell(bodyHtml: string): string {
  return `<!doctype html><html lang="ja"><body style="margin:0;background:#faf9f8;font-family:-apple-system,'Segoe UI',sans-serif;color:#1c1917;line-height:1.8">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px">
    <div style="font-family:ui-monospace,monospace;letter-spacing:.08em;color:#1c1917;font-weight:600">${SITE.name}</div>
    <div style="height:2px;background:#dcb441;margin:8px 0 20px"></div>
    ${bodyHtml}
  </div></body></html>`;
}

async function send(apiKey: string, payload: Record<string, unknown>): Promise<Response> {
  return fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// 顧客への自動返信（noreply）。入力内容を反映した HTML。相関用の Resend email id を返す（失敗は null）。
export async function sendAutoReply(apiKey: string, input: InquiryMail): Promise<string | null> {
  const html = shell(`
    <p>${escapeHtml(input.name)} 様</p>
    <p>お問い合わせいただきありがとうございます。以下の内容で受け付けました。通常2営業日以内にご返信します。</p>
    <table style="border-collapse:collapse;margin:16px 0;width:100%">${detailRows(input)}</table>
    <p style="color:#57534e;font-size:13px">本メールは送信専用アドレスからの自動返信です。本メールへの返信はご遠慮ください。</p>`);
  const res = await send(apiKey, {
    from: `${SITE.name} <${SITE.noreply}>`,
    to: input.email,
    subject: `お問い合わせを受け付けました｜${SITE.name}`,
    html,
  });
  if (!res.ok) {
    console.error(`auto-reply failed: ${res.status} ${await res.text()}`);
    return null;
  }
  const data = (await res.json()) as { id?: string };
  return data.id ?? null;
}

// 管理者（hi@）への通知。From はドメイン・表示名は顧客名・Reply-To は顧客＝返信でそのまま顧客に届く。
export async function sendOwnerNotification(
  apiKey: string,
  from: string,
  to: string,
  input: InquiryMail,
): Promise<boolean> {
  const html = shell(`
    <p style="color:#57534e;font-size:13px;margin:0 0 12px">新しいお問い合わせが届きました。このメールに返信すると送信者へ届きます。</p>
    <table style="border-collapse:collapse;width:100%">${detailRows(input)}</table>`);
  const res = await send(apiKey, {
    // 表示名を顧客名にし Reply-To を顧客にする（From アドレスは認証済みドメインのまま＝なりすましにしない）。
    from: `${input.name} <${from}>`,
    to,
    reply_to: input.email,
    subject: `[問い合わせ] ${input.subject || input.name}`,
    html,
  });
  if (!res.ok) {
    console.error(`owner notification failed: ${res.status} ${await res.text()}`);
    return false;
  }
  return true;
}
