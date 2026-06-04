import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Work, Case, Service, Profile, PublicClient, Database } from '../types/database';

export type WorkRow = Work & { clients: PublicClient | null };
export type CaseRow = Case & { clients: PublicClient | null };

// anon は clients を列限定でしか SELECT できない（real_name 等は不可）
const CLIENT_COLS = 'public_name, industry';

// fallback / モックは持たない。接続不可や取得失敗は throw してビルドを止める。
// 「公開対象が無い（空配列）」「該当 slug 無し（null）」は正常な状態であり error ではない。

export async function fetchWorks(): Promise<WorkRow[]> {
  const { data, error } = await supabase
    .from('works')
    .select(`*, clients(${CLIENT_COLS})`)
    .eq('status', 'published')
    .order('display_order');
  if (error) throw error;
  return (data ?? []) as unknown as WorkRow[];
}

export async function fetchWorkBySlug(slug: string): Promise<WorkRow | null> {
  const { data, error } = await supabase
    .from('works')
    .select(`*, clients(${CLIENT_COLS})`)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as WorkRow) ?? null;
}

export async function fetchCases(): Promise<CaseRow[]> {
  const { data, error } = await supabase
    .from('cases')
    .select(`*, clients(${CLIENT_COLS})`)
    .eq('status', 'published')
    .order('display_order');
  if (error) throw error;
  return (data ?? []) as unknown as CaseRow[];
}

export async function fetchCaseBySlug(slug: string): Promise<CaseRow | null> {
  const { data, error } = await supabase
    .from('cases')
    .select(`*, clients(${CLIENT_COLS})`)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as CaseRow) ?? null;
}

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return data ?? [];
}

export type InquiryInput = {
  name: string;
  company?: string | null;
  email: string;
  subject?: string | null;
  message: string;
};

// inquiries への INSERT。既定は共有クライアント（publishable=anon）。最小権限の inquiry_writer
// クライアントを渡せば、その JWT 経由で INSERT する（Worker 専用経路）。失敗は throw。
// autoReplyId は自動返信の Resend email id（webhook が到達状況で行を相関するため）。
export async function submitInquiry(
  input: InquiryInput,
  client: SupabaseClient<Database> = supabase,
  autoReplyId: string | null = null,
): Promise<void> {
  const { error } = await client.from('inquiries').insert({
    name: input.name,
    company: input.company ?? null,
    email: input.email,
    subject: input.subject ?? null,
    message: input.message,
    auto_reply_id: autoReplyId,
  });
  if (error) throw error;
}

export type InquiryDelivery = Required<Pick<InquiryInput, 'name' | 'email'>> &
  Pick<InquiryInput, 'company' | 'subject'> & { message: string; delivery_status: string };

// 自動返信の Resend email id で inquiry を引く（webhook 用・最小権限 inquiry_reader クライアントを渡す）。
// 該当が無い（自動返信以外の email）場合は null。
export async function findInquiryByAutoReplyId(
  client: SupabaseClient<Database>,
  autoReplyId: string,
): Promise<InquiryDelivery | null> {
  const { data, error } = await client
    .from('inquiries')
    .select('name, company, email, subject, message, delivery_status')
    .eq('auto_reply_id', autoReplyId)
    .maybeSingle();
  if (error) throw error;
  return (data as InquiryDelivery) ?? null;
}

// 到達状況の更新（webhook 用）。auto_reply_id で対象行を特定する。
export async function setDeliveryStatus(
  client: SupabaseClient<Database>,
  autoReplyId: string,
  status: 'delivered' | 'bounced',
): Promise<void> {
  const { error } = await client.from('inquiries').update({ delivery_status: status }).eq('auto_reply_id', autoReplyId);
  if (error) throw error;
}

// profile は singleton（必須）。欠落・接続失敗は throw（本番相当の前提）。
export async function fetchProfile(): Promise<Profile> {
  const { data, error } = await supabase.from('profile').select('*').eq('id', 'singleton').single();
  if (error) throw error;
  return data;
}
