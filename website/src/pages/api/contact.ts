import type { APIRoute } from 'astro';
import { submitInquiry } from '../../lib/core';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
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

    // Cloudflare Pages では実行時シークレットは locals.runtime.env、dev では import.meta.env。
    const runtimeEnv = (locals as { runtime?: { env?: Record<string, string> } })?.runtime?.env;

    // Turnstile: secret 設定時のみ検証（未設定なら skip＝dev/未導入でも動く）。
    // 変数名は infra コントラクト（docs/variables.md）の TURNSTILE_SECRET_KEY に合わせる。
    const turnstileSecret = runtimeEnv?.TURNSTILE_SECRET_KEY ?? import.meta.env.TURNSTILE_SECRET_KEY;
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

    await submitInquiry({ name, company, email, subject, message });

    const resendApiKey = runtimeEnv?.RESEND_API_KEY ?? import.meta.env.RESEND_API_KEY;
    if (resendApiKey) {
      const from = runtimeEnv?.CONTACT_FROM ?? import.meta.env.CONTACT_FROM;
      const to = runtimeEnv?.CONTACT_TO ?? import.meta.env.CONTACT_TO;
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
