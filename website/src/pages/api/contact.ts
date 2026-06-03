import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { submitInquiry } from '../../lib/core';
import { inquiryClient } from '../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const company = formData.get('company')?.toString();
    const email = formData.get('email')?.toString();
    const subject = formData.get('subject')?.toString();
    const message = formData.get('message')?.toString();

    if (!name || !email || !message) {
      return json({ error: 'Required fields missing' }, 400);
    }

    // 早期バリデーション: email 形式と各フィールド長（DB / RLS 前段で弾く）。
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json({ error: 'Invalid email' }, 400);
    }
    if (name.length > 100 || (company && company.length > 100) || (subject && subject.length > 200) || message.length > 5000) {
      return json({ error: 'Field too long' }, 400);
    }

    // 実行時の secret/var は Worker の env（cloudflare:workers）から読む。公開値でない（PUBLIC_ なし）
    // ＝ビルドにインラインされないため。dev は .dev.vars が供給する。未設定の機能は skip。
    const runtimeEnv = env as Record<string, string | undefined>;

    // Turnstile: secret 設定時のみ検証（未設定なら skip＝dev/未導入でも動く）。
    // 変数名は infra コントラクト（docs/variables.md）の TURNSTILE_SECRET_KEY に合わせる。
    const turnstileSecret = runtimeEnv.TURNSTILE_SECRET_KEY;
    // フェイルクローズ: site key を出している（＝ウィジェット表示中）のに secret が無いのは構成ミス。
    // 黙って通さず 503。site key 自体が無い（dev/未導入）なら従来どおり検証を skip する。
    if (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY && !turnstileSecret) {
      console.error('Turnstile enabled (site key set) but TURNSTILE_SECRET_KEY missing — refusing (fail-closed)');
      return json({ error: 'Server misconfigured' }, 503);
    }
    if (turnstileSecret) {
      const token = formData.get('cf-turnstile-response')?.toString() ?? '';
      const ip = request.headers.get('CF-Connecting-IP') ?? '';
      const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret: turnstileSecret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      });
      const outcome = (await verify.json()) as { success?: boolean };
      if (!outcome.success) {
        return json({ error: 'Verification failed' }, 403);
      }
    }

    // SUPABASE_INQUIRY_JWT があれば最小権限ロール経由で INSERT（直叩き不可の本番経路）。
    // 未設定なら共有クライアント（publishable=anon）にフォールバック（移行期/dev でも動く）。
    const writerJwt = runtimeEnv.SUPABASE_INQUIRY_JWT;
    await submitInquiry({ name, company, email, subject, message }, writerJwt ? inquiryClient(writerJwt) : undefined);

    const resendApiKey = runtimeEnv.RESEND_API_KEY;
    if (resendApiKey) {
      const from = runtimeEnv.CONTACT_FROM;
      const to = runtimeEnv.CONTACT_TO;
      const mail = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          // 通知メールから送信者へ直接返信できるよう reply_to に問い合わせ者のアドレスを入れる。
          reply_to: email,
          subject: `[Inquiry] ${subject || 'New message'}`,
          text: `From: ${name} (${email})\nCompany: ${company || '-'}\n\n${message}`,
        }),
      });
      // 受理（DB INSERT）は済んでいるので通知失敗で 500 にはしない。可観測性のためログに残す。
      if (!mail.ok) {
        console.error(`Resend notification failed: ${mail.status} ${await mail.text()}`);
      }
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error(err);
    return json({ error: 'Server error' }, 500);
  }
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
