import { supabase } from './supabase';
import type { Work, Case, Service, Profile, PublicClient } from '../types/database';

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

// RLS で inquiries の INSERT のみ許可。失敗は throw。
export async function submitInquiry(input: InquiryInput): Promise<void> {
  const { error } = await supabase.from('inquiries').insert({
    name: input.name,
    company: input.company ?? null,
    email: input.email,
    subject: input.subject ?? null,
    message: input.message,
  });
  if (error) throw error;
}

// profile は singleton（必須）。欠落・接続失敗は throw（本番相当の前提）。
export async function fetchProfile(): Promise<Profile> {
  const { data, error } = await supabase.from('profile').select('*').eq('id', 'singleton').single();
  if (error) throw error;
  return data;
}
