import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { submitInquiry } from '../../lib/core';
import { inquiryClient } from '../../lib/supabase';
import { sendAutoReply, sendOwnerNotification } from '../../lib/email';

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

    // site key がビルドにある＝ウィジェットを出す配信なので検証必須。secret 欠落は構成ミスとして弾く（fail-closed）。
    // secret 名は infra コントラクト（docs/variables.md）の TURNSTILE_SECRET_KEY に合わせる。
    if (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY) {
      const turnstileSecret = runtimeEnv.TURNSTILE_SECRET_KEY;
      if (!turnstileSecret) {
        console.error('Turnstile enabled (PUBLIC_TURNSTILE_SITE_KEY present) but TURNSTILE_SECRET_KEY is missing');
        return json({ error: 'Server error' }, 500);
      }
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

    // INSERT は最小権限ロールの JWT 経由のみ（anon は INSERT 不可）。JWT 欠落は構成ミスとして弾く（fail-closed）。
    const writerJwt = runtimeEnv.SUPABASE_INQUIRY_WRITER_JWT;
    if (!writerJwt) {
      console.error('SUPABASE_INQUIRY_WRITER_JWT is missing; inquiry insert requires the least-privilege writer role');
      return json({ error: 'Server error' }, 500);
    }

    const mail = { name, company, email, subject, message };
    const resendApiKey = runtimeEnv.RESEND_API_KEY;

    // 自動返信（noreply）を先に送り、その email id を inquiry に紐付ける。webhook が到達状況（delivered/bounced）で
    // この行を相関し、delivered のとき初めて hi@ へ通知する（無効アドレスへの通知を避ける）。
    const autoReplyId = resendApiKey ? await sendAutoReply(resendApiKey, mail) : null;
    await submitInquiry(mail, inquiryClient(writerJwt), autoReplyId);

    // 自動返信を送れなかった（key 無し or 送信失敗）＝到達 webhook が来ないため、通知をここで送る（取りこぼし防止）。
    if (!autoReplyId && resendApiKey) {
      const from = runtimeEnv.CONTACT_FROM;
      const to = runtimeEnv.CONTACT_TO;
      if (from && to) await sendOwnerNotification(resendApiKey, from, to, mail);
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
