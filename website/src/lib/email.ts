// Resend 経由のメール送信ヘルパー。自動返信（顧客宛・noreply）と通知（hi@ 宛）を組み立てる。
// /api/email-events と /api/contact の双方から使う。送信 identity（表示名＋送信元）は
// config.<env>.json 由来で astro.config が __MAIL__ に inline 注入する。
const RESEND_ENDPOINT = 'https://api.resend.com/emails';
// フッターのサイトリンク用（config.<env>.json の primary 由来）。
const SITE_URL = import.meta.env.SITE as string;

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
    `<tr><th style="text-align:left;padding:8px 14px 8px 0;color:#57534e;font-weight:600;font-size:13px;vertical-align:top;white-space:nowrap;border-bottom:1px solid #eae7e3">${label}</th><td style="padding:8px 0;color:#1c1917;border-bottom:1px solid #eae7e3">${value}</td></tr>`;
  return [
    row('お名前', escapeHtml(input.name)),
    input.company ? row('会社名', escapeHtml(input.company)) : '',
    row('メール', escapeHtml(input.email)),
    input.subject ? row('件名', escapeHtml(input.subject)) : '',
    row('内容', multiline(input.message)),
  ].join('');
}

// サイトのウォーム配色に合わせた枠。サイトヘッダ（gold の上線＋暗色バー＋等幅 wordmark）を踏襲する。
// メールは CSS 変数を使えないため色は global.css の warm テーマ値をインライン（hex）で再掲する。
function shell(bodyHtml: string): string {
  return `<!doctype html><html lang="ja"><body style="margin:0;padding:0;background:#faf9f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Hiragino Sans','Noto Sans JP',Meiryo,sans-serif;color:#1c1917;line-height:1.8;-webkit-text-size-adjust:100%">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px">
    <div style="background:#ffffff;border:1px solid #eae7e3;border-radius:2px;overflow:hidden">
      <div style="background:#211d19;border-top:3px solid #dcb441;padding:16px 24px">
        <span style="font-family:'JetBrains Mono',ui-monospace,'Courier New',monospace;letter-spacing:.14em;color:#faf9f7;font-weight:600;font-size:15px">${__MAIL__.name}</span>
      </div>
      <div style="padding:24px 24px 28px">${bodyHtml}</div>
    </div>
    <div style="padding:14px 24px 0;color:#57534e;font-size:12px;text-align:center">
      <a href="${SITE_URL}" style="color:#15803d;text-decoration:none">${__MAIL__.name}</a>
    </div>
  </div></body></html>`;
}

async function send(apiKey: string, payload: Record<string, unknown>): Promise<Response> {
  return fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

// 自動返信の HTML（プレビューと送信で共用）。
export function autoReplyHtml(input: InquiryMail): string {
  return shell(`
    <p>${escapeHtml(input.name)} 様</p>
    <p>お問い合わせいただきありがとうございます。以下の内容で受け付けました。通常2営業日以内にご返信します。</p>
    <table style="border-collapse:collapse;margin:16px 0;width:100%">${detailRows(input)}</table>
    <p style="color:#57534e;font-size:13px">本メールは送信専用アドレスからの自動返信です。本メールへの返信はご遠慮ください。</p>`);
}

// 顧客への自動返信（noreply）。相関用の Resend email id を返す（失敗は null）。
export async function sendAutoReply(apiKey: string, input: InquiryMail): Promise<string | null> {
  const html = autoReplyHtml(input);
  const res = await send(apiKey, {
    from: `${__MAIL__.name} <${__MAIL__.noreply}>`,
    to: input.email,
    subject: `お問い合わせを受け付けました｜${__MAIL__.name}`,
    html,
  });
  if (!res.ok) {
    console.error(`auto-reply failed: ${res.status} ${await res.text()}`);
    return null;
  }
  const data = (await res.json()) as { id?: string };
  return data.id ?? null;
}

// 管理者通知の HTML（プレビューと送信で共用）。
export function ownerNotificationHtml(input: InquiryMail): string {
  return shell(`
    <p style="color:#57534e;font-size:13px;margin:0 0 12px">新しいお問い合わせが届きました。このメールに返信すると送信者へ届きます。</p>
    <table style="border-collapse:collapse;width:100%">${detailRows(input)}</table>`);
}

// 管理者への通知。From=noreply・表示名は顧客名・Reply-To は顧客（返信でそのまま顧客に届く）。
// 宛先は公開連絡先（contact＝hi@）で、Email Routing が個人箱（EMAIL_FORWARD_TO）へ転送する＝個人箱は infra の1か所のみ。
export async function sendOwnerNotification(apiKey: string, input: InquiryMail): Promise<boolean> {
  const html = ownerNotificationHtml(input);
  const res = await send(apiKey, {
    // 表示名を顧客名にし Reply-To を顧客にする（From アドレスは認証済みドメインのまま＝なりすましにしない）。
    from: `${input.name} <${__MAIL__.noreply}>`,
    to: __MAIL__.contact,
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
