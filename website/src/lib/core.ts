import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Service, Profile, Case, Database, PublicProduct } from '../types/database';

// 公開ケーススタディは DB の単一 view `showcases`（showcase_entries を投影。client 解決・deliverables/metrics 集約済み）。
// website 側では Case と呼ぶ（projection 境界での翻訳）。
export type CaseRow = Case;

// view が公開してよい列のみを明示 SELECT（内部表は anon 権限なし＝直読みは権限エラーで fail-fast）。
const CASE_COLS =
  'slug, title, summary, body_md, thumbnail_url, period, display_priority, project_id, product_id, subject_kind, tech_stack, testimonial, client_name, client_industry, problems, deliverables, metrics';

// fallback / モックは持たない。接続不可や取得失敗は throw してビルドを止める。
// 「公開対象が無い（空配列）」「該当 slug 無し（null）」は正常な状態であり error ではない。

export async function fetchCases(): Promise<CaseRow[]> {
  const { data, error } = await supabase.from('public_showcases').select(CASE_COLS).order('display_priority', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as CaseRow[];
}

export async function fetchCaseBySlug(slug: string): Promise<CaseRow | null> {
  const { data, error } = await supabase.from('public_showcases').select(CASE_COLS).eq('slug', slug).maybeSingle();
  if (error) throw error;
  return (data as unknown as CaseRow) ?? null;
}

export async function fetchServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('public_services')
    .select('*')
    .order('display_priority', { ascending: false });
  if (error) throw error;
  // public_services view は全列 nullable 型だが実体は非 null（services 由来）＝Service へキャスト。
  return (data ?? []) as unknown as Service[];
}

export async function fetchProducts(): Promise<PublicProduct[]> {
  const { data, error } = await supabase
    .from('public_products')
    .select('slug, name, summary, url, tech_stack, launched_on')
    .order('launched_on', { ascending: false, nullsFirst: false });
  if (error) throw error;
  // view は全列 nullable 型のため部分集合型へキャスト（実体の非 null は products 由来）。
  return (data ?? []) as unknown as PublicProduct[];
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
  client: SupabaseClient<Database, 'core'> = supabase,
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
  client: SupabaseClient<Database, 'core'>,
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
  client: SupabaseClient<Database, 'core'>,
  autoReplyId: string,
  status: 'delivered' | 'bounced',
): Promise<void> {
  const { error } = await client.from('inquiries').update({ delivery_status: status }).eq('auto_reply_id', autoReplyId);
  if (error) throw error;
}

// profile は singleton（必須）。欠落・接続失敗は throw（本番相当の前提）。
export async function fetchProfile(): Promise<Profile> {
  const { data, error } = await supabase.from('public_profile').select('*').eq('id', 'singleton').single();
  if (error) throw error;
  // public_profile view は全列 nullable 型だが実体は非 null（profile 由来）＝Profile へキャスト。
  return data as unknown as Profile;
}
