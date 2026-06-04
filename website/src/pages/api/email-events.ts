import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { findInquiryByAutoReplyId, setDeliveryStatus } from '../../lib/core';
import { inquiryClient } from '../../lib/supabase';
import { sendOwnerNotification } from '../../lib/email';

export const prerender = false;

// Resend は Svix 形式で webhook に署名する（svix-id / svix-timestamp / svix-signature）。
// secret は whsec_<base64>。署名対象は `${id}.${timestamp}.${body}` の HMAC-SHA256（base64）。
function b64ToBuf(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}
function bytesToB64(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verifySvix(secret: string, id: string, ts: string, body: string, sigHeader: string): Promise<boolean> {
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  const key = await crypto.subtle.importKey('raw', b64ToBuf(raw), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  const expected = bytesToB64(new Uint8Array(mac));
  // svix-signature は "v1,<base64> v1,<base64> ..." の空白区切り。いずれか一致で OK。
  return sigHeader.split(' ').some((part) => {
    const sig = part.split(',')[1];
    return sig ? safeEqual(sig, expected) : false;
  });
}

type ResendEvent = { type?: string; data?: { email_id?: string } };

export const POST: APIRoute = async ({ request }) => {
  try {
    const runtimeEnv = env as Record<string, string | undefined>;
    const secret = runtimeEnv.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      console.error('RESEND_WEBHOOK_SECRET is missing');
      return new Response('config', { status: 500 });
    }

    const id = request.headers.get('svix-id');
    const ts = request.headers.get('svix-timestamp');
    const sig = request.headers.get('svix-signature');
    const body = await request.text();
    if (!id || !ts || !sig || !(await verifySvix(secret, id, ts, body, sig))) {
      return new Response('invalid signature', { status: 400 });
    }
    // リプレイ防止: タイムスタンプが ±5 分以内であること。
    if (Math.abs(Date.now() - Number(ts) * 1000) > 5 * 60 * 1000) {
      return new Response('stale', { status: 400 });
    }

    const event = JSON.parse(body) as ResendEvent;
    const emailId = event.data?.email_id;
    // 自動返信以外の email（通知メール等）は auto_reply_id に一致せず無視される。
    if (!emailId || (event.type !== 'email.delivered' && event.type !== 'email.bounced')) {
      return new Response('ok', { status: 200 });
    }

    const readerJwt = runtimeEnv.SUPABASE_INQUIRY_READER_JWT;
    if (!readerJwt) {
      console.error('SUPABASE_INQUIRY_READER_JWT is missing');
      return new Response('config', { status: 500 });
    }
    const client = inquiryClient(readerJwt);

    if (event.type === 'email.bounced') {
      // 無効アドレス。hi@ へは通知しない（フォームで再送を案内済み）。
      await setDeliveryStatus(client, emailId, 'bounced');
      return new Response('ok', { status: 200 });
    }

    // email.delivered: 自動返信が届いた＝有効アドレス。初回のみ hi@ へ通知する。
    const inquiry = await findInquiryByAutoReplyId(client, emailId);
    if (inquiry && inquiry.delivery_status !== 'delivered') {
      const apiKey = runtimeEnv.RESEND_API_KEY;
      if (apiKey) await sendOwnerNotification(apiKey, inquiry);
      await setDeliveryStatus(client, emailId, 'delivered');
    }
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response('error', { status: 500 });
  }
};
