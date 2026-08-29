import { getSupabaseAdminClient } from './supabaseAdminClient.ts';
import { isWifeProduction as isProductionNodeEnv } from './wifeStoreEnv.ts';

const USER_STATUS_CACHE_TTL_MS = 5 * 60 * 1000;

export type WifeUserRestriction = {
  loginAllowed: boolean;
  frozen: boolean;
  freezeUntil: string | null;
  loginUntil: string | null;
  deleted: boolean;
};

const userStatusCache = new Map<string, WifeUserRestriction & { checkedAt: number }>();

function readCachedRestriction(userId: string): WifeUserRestriction | null {
  const cached = userStatusCache.get(userId);
  if (!cached) return null;
  if (Date.now() - cached.checkedAt > USER_STATUS_CACHE_TTL_MS) {
    userStatusCache.delete(userId);
    return null;
  }
  return {
    loginAllowed: cached.loginAllowed,
    frozen: cached.frozen,
    freezeUntil: cached.freezeUntil,
    loginUntil: cached.loginUntil ?? null,
    deleted: cached.deleted === true,
  };
}

function writeCachedRestriction(userId: string, restriction: WifeUserRestriction): void {
  userStatusCache.set(userId, { ...restriction, checkedAt: Date.now() });
}

/**
 * ثلاث حالات لا حالتان.
 *
 * `null` كان يعني «لا صفّ» و«تعذّر السؤال» معاً، فيُقرأ عطل عابر في قاعدة
 * البيانات على أنه «مستخدم جديد بلا ملفّ» فيُؤذن له، ويُخزَّن الإذن خمس دقائق.
 * استعلام فاشل واحد كان يكفي ليعود محامٍ محظور أو محذوف إلى الدخول.
 */
type UserRowLookup =
  | { kind: 'row'; row: Record<string, unknown> }
  | { kind: 'absent' }
  | { kind: 'unavailable' };

const USER_ID_FILTER_RE = /^[A-Za-z0-9_-]+$/;

async function fetchSingleUserRow(
  table: string,
  filterColumn: 'id' | 'user_id' | 'id,user_id',
  filterValue: string,
): Promise<UserRowLookup> {
  if (!filterValue || !USER_ID_FILTER_RE.test(filterValue)) {
    return { kind: 'unavailable' };
  }

  const admin = getSupabaseAdminClient();
  if (!admin) return { kind: 'unavailable' };

  try {
    const selected = admin.from(table).select('*');
    const filtered =
      filterColumn === 'id,user_id'
        ? selected.or(`id.eq.${filterValue},user_id.eq.${filterValue}`)
        : selected.eq(filterColumn, filterValue);

    const { data, error } = await filtered.limit(1).maybeSingle();
    if (error) return { kind: 'unavailable' };
    return data ? { kind: 'row', row: data as Record<string, unknown> } : { kind: 'absent' };
  } catch {
    return { kind: 'unavailable' };
  }
}

function parseFreezeUntilMs(row: Record<string, unknown>): number | null {
  const raw = row.freeze_until;
  if (raw == null || String(raw).trim() === '') return null;
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : null;
}

function isTimedFreezeActive(row: Record<string, unknown>): boolean {
  const until = parseFreezeUntilMs(row);
  return until != null && until > Date.now();
}

function isTimedFreezeExpired(row: Record<string, unknown>): boolean {
  const until = parseFreezeUntilMs(row);
  return until != null && until <= Date.now();
}

function freezeUntilIso(row: Record<string, unknown>): string | null {
  const until = parseFreezeUntilMs(row);
  if (until == null || until <= Date.now()) return null;
  const raw = row.freeze_until;
  return raw == null ? null : String(raw);
}

function isDeletedFromRow(row: Record<string, unknown>): boolean {
  const status = typeof row.status === 'string' ? row.status.trim().toLowerCase() : '';
  const deletedAt = row.deleted_at;
  if (row.is_deleted === true) return true;
  if (deletedAt !== null && deletedAt !== undefined && String(deletedAt).trim() !== '') return true;
  return status === 'deleted' || status === 'disabled';
}

function parseLoginUntilMs(row: Record<string, unknown>): number | null {
  const raw = row.login_until;
  if (raw == null || String(raw).trim() === '') return null;
  const t = Date.parse(String(raw));
  return Number.isFinite(t) ? t : null;
}

function isTimedLoginActive(row: Record<string, unknown>): boolean {
  const until = parseLoginUntilMs(row);
  return until != null && until > Date.now();
}

function isTimedLoginExpired(row: Record<string, unknown>): boolean {
  const until = parseLoginUntilMs(row);
  return until != null && until <= Date.now();
}

function loginUntilIso(row: Record<string, unknown>): string | null {
  const until = parseLoginUntilMs(row);
  if (until == null || until <= Date.now()) return null;
  const raw = row.login_until;
  return raw == null ? null : String(raw);
}

/**
 * التجميد يوقف المنتدى/الشبكة — لا يمنع تسجيل الدخول ولا يمسح الدعاوى.
 * قفل الدخول و`is_deleted` يمنعان الدخول.
 */
function restrictionFromRow(row: Record<string, unknown>): WifeUserRestriction {
  if (isDeletedFromRow(row)) {
    return { loginAllowed: false, frozen: false, freezeUntil: null, loginUntil: null, deleted: true };
  }
  const loginLocked = row.login_blocked === true || isTimedLoginActive(row);
  if (isTimedFreezeExpired(row) && !loginLocked) {
    return { loginAllowed: true, frozen: false, freezeUntil: null, loginUntil: null, deleted: false };
  }
  const status = typeof row.status === 'string' ? row.status.trim().toLowerCase() : '';
  const frozen =
    isTimedFreezeActive(row) ||
    row.is_banned === true ||
    row.is_active === false ||
    status === 'suspended' ||
    status === 'banned' ||
    status === 'frozen' ||
    status === 'blocked' ||
    status === 'inactive';
  return {
    loginAllowed: !loginLocked,
    frozen,
    freezeUntil: frozen ? freezeUntilIso(row) : null,
    loginUntil: loginLocked ? loginUntilIso(row) : null,
    deleted: false,
  };
}

async function clearExpiredTimedFreeze(userId: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  try {
    await admin
      .from('profiles')
      .update({
        is_banned: false,
        is_active: true,
        status: 'active',
        freeze_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    invalidateWifeUserStatusCache(userId);
  } catch {
    /* أفضل جهد — القراءة تعتبر التجميد منتهياً حتى لو بقي العلم */
  }
}

async function clearExpiredLoginLock(userId: string): Promise<void> {
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  try {
    await admin
      .from('profiles')
      .update({
        login_blocked: false,
        login_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    invalidateWifeUserStatusCache(userId);
  } catch {
    /* أفضل جهد */
  }
}

function unavailableRestriction(): WifeUserRestriction {
  const loginAllowed = !isProductionNodeEnv();
  return { loginAllowed, frozen: !loginAllowed, freezeUntil: null, loginUntil: null, deleted: false };
}

/**
 * فحص حيّ: الدخول مسموح ما لم يُحذف الحساب.
 * التجميد يُقرأ من `frozen` ولا يُسقط الجلسة.
 */
export async function getWifeUserRestrictionLive(userId: string): Promise<WifeUserRestriction> {
  const cached = readCachedRestriction(userId);
  if (cached !== null) return cached;

  const profile = await fetchSingleUserRow('profiles', 'id,user_id', userId);
  if (profile.kind === 'row') {
    const restriction = restrictionFromRow(profile.row);
    writeCachedRestriction(userId, restriction);
    if (restriction.loginAllowed && !restriction.frozen && isTimedFreezeExpired(profile.row)) {
      void clearExpiredTimedFreeze(userId);
    }
    if (restriction.loginAllowed && isTimedLoginExpired(profile.row) && profile.row.login_blocked !== true) {
      void clearExpiredLoginLock(userId);
    }
    return restriction;
  }

  /*
   * profiles هو جدول السلطة (تجميد/حذف). تعذّر سؤاله وحده يُقفل في الإنتاج.
   * جدول lawyers اختياري وقد لا يوجد — خطأه لا يُسمَّم جواب profiles=absent.
   */
  if (profile.kind === 'unavailable') {
    return unavailableRestriction();
  }

  const lawyer = await fetchSingleUserRow('lawyers', 'id,user_id', userId);
  if (lawyer.kind === 'row') {
    const restriction = restrictionFromRow(lawyer.row);
    writeCachedRestriction(userId, restriction);
    return restriction;
  }

  /*
   * JWT صالح ولا صفّ profiles: نأذن للتسجيل الجديد، ولا نُجمّد الإذن في الكاش.
   */
  return { loginAllowed: true, frozen: false, freezeUntil: null, loginUntil: null, deleted: false };
}

/**
 * فحص إبطال حيّ فوق توكن اجتاز تحقّق Supabase أصلاً:
 * هل ما يزال هذا المستخدم المُتحقَّق منه مسموحاً له بالدخول الآن؟
 * التجميد لا يُسقط هذا الإذن — يُغلق المنتدى/الشبكة عبر isUserFrozenLive.
 */
export async function isUserActiveLive(userId: string): Promise<boolean> {
  return (await getWifeUserRestrictionLive(userId)).loginAllowed;
}

/** تجميد المقر: المنتدى والخدمات الشبكية — بلا مسح للدعاوى أو المعاملات. */
export async function isUserFrozenLive(userId: string): Promise<boolean> {
  return (await getWifeUserRestrictionLive(userId)).frozen;
}

/**
 * يزرع صف profiles إن غاب — بلا الكتابة فوق حظر قائم.
 * الدخول/التسجيل يحتاجان صفاً حتى يعمل مسار الإدارة.
 */
export async function ensureLawyerProfileRow(
  userId: string,
  role: 'lawyer' = 'lawyer',
): Promise<void> {
  const id = userId.trim();
  if (!id) return;
  const admin = getSupabaseAdminClient();
  if (!admin) return;
  try {
    const existing = await fetchSingleUserRow('profiles', 'id,user_id', id);
    if (existing.kind === 'row' || existing.kind === 'unavailable') return;
    const now = new Date().toISOString();
    await admin.from('profiles').insert({
      id,
      role,
      is_banned: false,
      is_deleted: false,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
  } catch {
    /* أفضل جهد — الحظر يُقرأ من الصف إن وُجد */
  }
}

export function resetWifeUserStatusCacheForTests(): void {
  userStatusCache.clear();
}

/** بعد حظر/تفعيل من مقر القيادة — لا يبقى إذن الدخول المخزَّن */
export function invalidateWifeUserStatusCache(userId: string): void {
  const id = userId.trim();
  if (id) userStatusCache.delete(id);
}
