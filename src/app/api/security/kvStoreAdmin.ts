import { createClient } from '@supabase/supabase-js';

const DEFAULT_TABLE = 'kv_store_f09713ba';

function getTableName(): string {
  return (process.env.KV_STORE_TABLE ?? DEFAULT_TABLE).trim() || DEFAULT_TABLE;
}

function getAdminClient() {
  const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const { error } = await admin.from(getTableName()).upsert({ key, value });
  if (error) throw new Error(error.message);
}

export async function kvGet(key: string): Promise<unknown> {
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const { data, error } = await admin.from(getTableName()).select('value').eq('key', key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value ?? null;
}

export async function kvDel(key: string): Promise<void> {
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const { error } = await admin.from(getTableName()).delete().eq('key', key);
  if (error) throw new Error(error.message);
}

export async function kvGetByPrefix(prefix: string): Promise<unknown[]> {
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const { data, error } = await admin
    .from(getTableName())
    .select('value')
    .like('key', `${prefix}%`);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.value);
}

export async function kvKeysByPrefix(prefix: string): Promise<string[]> {
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const { data, error } = await admin
    .from(getTableName())
    .select('key')
    .like('key', `${prefix}%`);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => row.key);
}

export async function kvDelByPrefix(prefix: string): Promise<number> {
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const { data, error } = await admin
    .from(getTableName())
    .delete()
    .like('key', `${prefix}%`)
    .select('key');
  if (error) throw new Error(error.message);
  return (data ?? []).length;
}
