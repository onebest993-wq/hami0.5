import { sortHqVerificationQueueRows } from '@/app/domain/admin/hqVerificationQueueOrder';
import { getSupabaseAdminClient } from './supabaseAdminClient.ts';

const DEFAULT_TABLE = 'kv_store_f09713ba';

function getTableName(): string {
  return (process.env.KV_STORE_TABLE ?? DEFAULT_TABLE).trim() || DEFAULT_TABLE;
}

const getAdminClient = getSupabaseAdminClient;

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

const KV_PREFIX_SAFE = /^[a-zA-Z0-9:-]{3,80}$/;
export const KV_JSON_STATUS_PAGE = 200;
export const KV_JSON_STATUS_SCAN_CAP = 2000;

/** يمنع LIKE-injection في بادئة KV */
export function assertSafeKvPrefix(prefix: string): string {
  const p = String(prefix ?? '').trim();
  if (!KV_PREFIX_SAFE.test(p)) {
    throw new Error('Unsafe KV prefix');
  }
  return p;
}

/**
 * مسح بادئة بلا LIKE — `%` و`_` في المعرّف لا يصبحان أحرفاً عامّة.
 * النتائج تُصفّى بـ startsWith بعد المدى.
 */
export function kvPrefixSortBounds(prefix: string): { gte: string; lt: string } {
  const p = String(prefix ?? '');
  if (!p) throw new Error('Unsafe KV prefix');
  return { gte: p, lt: `${p}\uffff` };
}

function applyKvKeyPrefixRange<
  Q extends {
    gte: (column: string, value: string) => Q;
    lt: (column: string, value: string) => Q;
  },
>(query: Q, prefix: string): Q {
  const { gte, lt } = kvPrefixSortBounds(prefix);
  return query.gte('key', gte).lt('key', lt);
}

export async function kvGetByPrefix(prefix: string): Promise<unknown[]> {
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const { data, error } = await applyKvKeyPrefixRange(
    admin.from(getTableName()).select('key, value'),
    prefix,
  );
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((row: { key?: string }) => typeof row.key === 'string' && row.key.startsWith(prefix))
    .map((row: { value: unknown }) => row.value);
}

/**
 * يقرأ `value->>status` فقط — بلا معاينات هوية أو بريد.
 * للطابور الإداري الذي يحتاج العدّ لا السجل الكامل.
 */
export async function kvReadJsonStatusByPrefix(
  prefix: string,
  options?: { cap?: number },
): Promise<{ statuses: string[]; capped: boolean }> {
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const safe = assertSafeKvPrefix(prefix);
  const cap = Math.min(Math.max(1, options?.cap ?? KV_JSON_STATUS_SCAN_CAP), KV_JSON_STATUS_SCAN_CAP);
  const statuses: string[] = [];
  let offset = 0;
  while (statuses.length < cap) {
    const take = Math.min(KV_JSON_STATUS_PAGE, cap - statuses.length);
    const { data, error } = await applyKvKeyPrefixRange(
      admin.from(getTableName()).select('status:value->>status'),
      safe,
    )
      .order('key', { ascending: true })
      .range(offset, offset + take - 1);
    if (error) throw new Error(error.message);
    const rows = Array.isArray(data) ? data : [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const status = String((row as { status?: unknown }).status ?? '').trim();
      if (status) statuses.push(status);
    }
    if (rows.length < take) {
      return { statuses, capped: false };
    }
    offset += rows.length;
  }
  return { statuses, capped: true };
}

/**
 * يقرأ `key` + `value->>status` + `value->>fullName` — بلا صور هوية.
 * يُستخدم لدليل مستخدمي المقر لربط التوثيق ومقارنة الاسم دون تحميل السجل الكامل.
 */
export type HqKvVerificationHint = { status: string; kycName: string };

const KV_IN_CHUNK = 80;

function hintFromKvRow(row: unknown, prefix: string): { userId: string; hint: HqKvVerificationHint } | null {
  if (!row || typeof row !== 'object') return null;
  const key = String((row as { key?: unknown }).key ?? '');
  if (!key.startsWith(prefix)) return null;
  const userId = key.slice(prefix.length).trim();
  const status = String((row as { status?: unknown }).status ?? '').trim();
  const kycName = String((row as { fullName?: unknown }).fullName ?? '').trim().slice(0, 80);
  if (!userId || !status) return null;
  return { userId, hint: { status, kycName } };
}

/** قراءة توثيق صفحة الدليل فقط — بلا مسح البادئة كاملة. */
export async function kvReadUserStatusMapByKeys(
  prefix: string,
  userIds: readonly string[],
): Promise<Map<string, HqKvVerificationHint>> {
  const map = new Map<string, HqKvVerificationHint>();
  const ids = [...new Set(userIds.map((id) => String(id ?? '').trim()).filter(Boolean))];
  if (ids.length === 0) return map;
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const safe = assertSafeKvPrefix(prefix);
  for (let i = 0; i < ids.length; i += KV_IN_CHUNK) {
    const chunk = ids.slice(i, i + KV_IN_CHUNK);
    const keys = chunk.map((id) => `${safe}${id}`);
    const { data, error } = await admin
      .from(getTableName())
      .select('key, status:value->>status, fullName:value->>fullName')
      .in('key', keys);
    if (error) throw new Error(error.message);
    for (const row of Array.isArray(data) ? data : []) {
      const parsed = hintFromKvRow(row, safe);
      if (parsed) map.set(parsed.userId, parsed.hint);
    }
  }
  return map;
}

export async function kvReadUserStatusMapByPrefix(
  prefix: string,
  options?: { cap?: number },
): Promise<{ map: Map<string, HqKvVerificationHint>; capped: boolean }> {
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const safe = assertSafeKvPrefix(prefix);
  const cap = Math.min(Math.max(1, options?.cap ?? KV_JSON_STATUS_SCAN_CAP), KV_JSON_STATUS_SCAN_CAP);
  const map = new Map<string, HqKvVerificationHint>();
  let offset = 0;
  while (map.size < cap) {
    const take = Math.min(KV_JSON_STATUS_PAGE, cap - map.size);
    const { data, error } = await applyKvKeyPrefixRange(
      admin.from(getTableName()).select('key, status:value->>status, fullName:value->>fullName'),
      safe,
    )
      .order('key', { ascending: true })
      .range(offset, offset + take - 1);
    if (error) throw new Error(error.message);
    const rows = Array.isArray(data) ? data : [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const key = String((row as { key?: unknown }).key ?? '');
      if (!key.startsWith(safe)) continue;
      const userId = key.slice(safe.length).trim();
      const status = String((row as { status?: unknown }).status ?? '').trim();
      const kycName = String((row as { fullName?: unknown }).fullName ?? '').trim().slice(0, 80);
      if (userId && status) map.set(userId, { status, kycName });
    }
    if (rows.length < take) return { map, capped: false };
    offset += rows.length;
  }
  return { map, capped: true };
}

/**
 * طابور توثيق المقر: حقول jsonb العددية فقط — بلا `idFrontPreview` / ظهر / سيلفي.
 * PostgREST `->>` يعيد نصاً؛ التحويل إلى أعلام يتم في `toHqQueueRecord`.
 */
export const HQ_VERIFICATION_QUEUE_SELECT = [
  'key',
  'userId:value->>userId',
  'status:value->>status',
  'submittedAt:value->>submittedAt',
  'updatedAt:value->>updatedAt',
  'rejectionReason:value->>rejectionReason',
  'email:value->>email',
  'fullName:value->>fullName',
  'familyName:value->>familyName',
  'phone:value->>phone',
  'governorate:value->>governorate',
  'lawyerBarRoom:value->>lawyerBarRoom',
  'faceAssistOptedIn:value->>faceAssistOptedIn',
  'hasIdFront:value->>hasIdFront',
  'hasIdBack:value->>hasIdBack',
  'hasFaceSelfie:value->>hasFaceSelfie',
].join(', ');

export type HqVerificationQueueKvRow = {
  userId: string;
  status: string;
  submittedAt: string;
  updatedAt: string;
  rejectionReason: string;
  email: string;
  fullName: string;
  familyName: string;
  phone: string;
  governorate: string;
  lawyerBarRoom: string;
  faceAssistOptedIn: unknown;
  hasIdFront: unknown;
  hasIdBack: unknown;
  hasFaceSelfie: unknown;
};

function textField(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (value == null) return '';
  return String(value);
}

export async function kvReadHqVerificationQueueByPrefix(
  prefix: string,
  options?: { cap?: number },
): Promise<{ rows: HqVerificationQueueKvRow[]; capped: boolean }> {
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const safe = assertSafeKvPrefix(prefix);
  const cap = Math.min(Math.max(1, options?.cap ?? KV_JSON_STATUS_SCAN_CAP), KV_JSON_STATUS_SCAN_CAP);
  const collected: HqVerificationQueueKvRow[] = [];
  let offset = 0;
  while (collected.length < cap) {
    const take = Math.min(KV_JSON_STATUS_PAGE, cap - collected.length);
    const { data, error } = await applyKvKeyPrefixRange(
      admin.from(getTableName()).select(HQ_VERIFICATION_QUEUE_SELECT),
      safe,
    )
      .order('key', { ascending: true })
      .range(offset, offset + take - 1);
    if (error) throw new Error(error.message);
    const rows = Array.isArray(data) ? data : [];
    for (const raw of rows) {
      if (!raw || typeof raw !== 'object') continue;
      const row = raw as Record<string, unknown>;
      const key = textField(row, 'key');
      if (!key.startsWith(safe)) continue;
      const userId = key.slice(safe.length).trim() || textField(row, 'userId').trim();
      if (!userId) continue;
      collected.push({
        userId,
        status: textField(row, 'status').trim(),
        submittedAt: textField(row, 'submittedAt'),
        updatedAt: textField(row, 'updatedAt'),
        rejectionReason: textField(row, 'rejectionReason'),
        email: textField(row, 'email'),
        fullName: textField(row, 'fullName'),
        familyName: textField(row, 'familyName'),
        phone: textField(row, 'phone'),
        governorate: textField(row, 'governorate'),
        lawyerBarRoom: textField(row, 'lawyerBarRoom'),
        faceAssistOptedIn: row.faceAssistOptedIn,
        hasIdFront: row.hasIdFront,
        hasIdBack: row.hasIdBack,
        hasFaceSelfie: row.hasFaceSelfie,
      });
    }
    if (rows.length < take) return { rows: sortHqVerificationQueueRows(collected), capped: false };
    offset += rows.length;
  }
  return { rows: sortHqVerificationQueueRows(collected), capped: true };
}

export async function kvKeysByPrefix(prefix: string): Promise<string[]> {
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const { data, error } = await applyKvKeyPrefixRange(admin.from(getTableName()).select('key'), prefix);
  if (error) throw new Error(error.message);
  const rows: unknown[] = Array.isArray(data) ? data : [];
  return rows
    .map((row: unknown): string =>
        row && typeof row === 'object' && 'key' in row
            ? String((row as { key?: unknown }).key ?? '')
            : '',
    )
    .filter((key) => key.length > 0 && key.startsWith(prefix));
}

export async function kvDelByPrefix(prefix: string): Promise<number> {
  const admin = getAdminClient();
  if (!admin) throw new Error('KV admin client is not configured');
  const { data, error } = await applyKvKeyPrefixRange(admin.from(getTableName()).delete(), prefix).select('key');
  if (error) throw new Error(error.message);
  return (data ?? []).filter((row: { key?: string }) => typeof row.key === 'string' && row.key.startsWith(prefix)).length;
}
