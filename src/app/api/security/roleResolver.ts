/**
 * Server-side role resolution — NEVER trust JWT user_metadata for privileges.
 * Sources: ADMIN_UUID env, canonical UUID, master admin email via GoTrue, profiles.role.
 */
import { UserRole } from '@/app/types/admin-types';
import { HAMI_PLATFORM_ADMIN_UUID } from '@/app/constants/hamiPlatformAdminId.ts';
import { getGoTrueAdminApi, getSupabaseAdminClient } from './supabaseAdminClient.ts';

export { HAMI_PLATFORM_ADMIN_UUID, isHamiPlatformAdminUserId } from '@/app/constants/hamiPlatformAdminId.ts';

const ROLE_CACHE_TTL_MS = 60_000;
const roleCache = new Map<string, { role: string | null; expiresAt: number }>();
const emailCache = new Map<string, { email: string | null; expiresAt: number }>();

const DEFAULT_PLATFORM_ADMIN_EMAIL = 'hami.apps@proton.me';

type ProfileRoleRow = {
  role?: unknown;
  is_banned?: unknown;
  is_deleted?: unknown;
  is_active?: unknown;
};

function normalizeRole(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed || null;
}

function readCachedRole(userId: string): string | null | undefined {
  const cached = roleCache.get(userId);
  if (!cached) return undefined;
  if (Date.now() >= cached.expiresAt) {
    roleCache.delete(userId);
    return undefined;
  }
  return cached.role;
}

function writeCachedRole(userId: string, role: string | null): void {
  roleCache.set(userId, { role, expiresAt: Date.now() + ROLE_CACHE_TTL_MS });
}

function isInactiveProfile(row: ProfileRoleRow | null | undefined): boolean {
  if (!row) return true;
  if (row.is_banned === true) return true;
  if (row.is_deleted === true) return true;
  if (row.is_active === false) return true;
  return false;
}

/** Test-only */
export function resetRoleResolverCacheForTests(): void {
  roleCache.clear();
  emailCache.clear();
}

/** بعد حظر/تغيير دور من مقر القيادة — لا يبقى الدور القديم 60 ثانية */
export function invalidateProfileRoleCache(userId: string): void {
  const id = userId.trim();
  if (id) {
    roleCache.delete(id);
    emailCache.delete(id);
  }
}

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function idsEqual(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

export function getConfiguredAdminUuid(): string {
  const configured = (process.env.ADMIN_UUID ?? '').trim();
  if (configured) return configured;
  // لا نرجع admin-uuid-1 الوهمي — يمنع رفض المدير الحقيقي بصمت
  return HAMI_PLATFORM_ADMIN_UUID;
}

/** بريد مدير المنصّة — نفس مصدر OTP المقر، مع الافتراضي المتفق عليه */
export function getConfiguredAdminEmails(): string[] {
  const emails = new Set<string>();
  const fromEnv = (process.env.ADMIN_MASTER_EMAIL ?? '').trim();
  const fromVite = (process.env.VITE_ADMIN_MASTER_EMAIL ?? '').trim();
  if (fromEnv) emails.add(normalizeEmail(fromEnv));
  if (fromVite) emails.add(normalizeEmail(fromVite));
  emails.add(DEFAULT_PLATFORM_ADMIN_EMAIL);
  return [...emails];
}

export function isConfiguredAdminEmail(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email ?? '');
  if (!normalized.includes('@')) return false;
  return getConfiguredAdminEmails().includes(normalized);
}

function readCachedEmail(userId: string): string | null | undefined {
  const cached = emailCache.get(userId);
  if (!cached) return undefined;
  if (Date.now() >= cached.expiresAt) {
    emailCache.delete(userId);
    return undefined;
  }
  return cached.email;
}

function writeCachedEmail(userId: string, email: string | null): void {
  emailCache.set(userId, { email, expiresAt: Date.now() + ROLE_CACHE_TTL_MS });
}

async function readGoTrueEmailForUserId(userId: string): Promise<string | null> {
  const cached = readCachedEmail(userId);
  if (cached !== undefined) return cached;

  const admin = getSupabaseAdminClient();
  if (!admin) {
    writeCachedEmail(userId, null);
    return null;
  }

  try {
    const { data, error } = await getGoTrueAdminApi(admin).getUserById(userId);
    if (error || !data?.user?.email) {
      writeCachedEmail(userId, null);
      return null;
    }
    const email = normalizeEmail(data.user.email);
    writeCachedEmail(userId, email);
    return email;
  } catch {
    writeCachedEmail(userId, null);
    return null;
  }
}

export async function getProfileRole(userId: string): Promise<string | null> {
  if (!userId) return null;

  const cached = readCachedRole(userId);
  if (cached !== undefined) return cached;

  const admin = getSupabaseAdminClient();
  if (!admin) {
    writeCachedRole(userId, null);
    return null;
  }

  const { data, error } = await admin
    .from('profiles')
    .select('role, is_banned, is_deleted, is_active')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) {
    writeCachedRole(userId, null);
    return null;
  }

  const profile = data as ProfileRoleRow;
  const role = isInactiveProfile(profile) ? null : normalizeRole(profile.role);
  writeCachedRole(userId, role);
  return role;
}

export async function isPlatformAdminUserId(userId: string, liveEmail?: string | null): Promise<boolean> {
  if (!userId) return false;
  const adminUuid = getConfiguredAdminUuid();
  if (adminUuid && idsEqual(userId, adminUuid)) return true;
  if (idsEqual(userId, HAMI_PLATFORM_ADMIN_UUID)) return true;
  if (isConfiguredAdminEmail(liveEmail)) {
    writeCachedEmail(userId, normalizeEmail(liveEmail ?? ''));
    return true;
  }
  const email = await readGoTrueEmailForUserId(userId);
  if (email && isConfiguredAdminEmail(email)) return true;
  const role = await getProfileRole(userId);
  return role === 'admin';
}

export async function isForumModeratorUserId(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (await isPlatformAdminUserId(userId)) return true;
  const role = await getProfileRole(userId);
  return role === 'moderator';
}

export async function canAccessLawyerForumUserId(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (await isPlatformAdminUserId(userId)) return true;
  const role = await getProfileRole(userId);
  return role === 'lawyer' || role === 'moderator' || role === 'admin';
}

export async function resolveForumRoleForUser(userId: string): Promise<UserRole | null> {
  if (await isPlatformAdminUserId(userId)) return UserRole.SUPER_ADMIN;
  const role = await getProfileRole(userId);
  if (role === 'moderator') return UserRole.MODERATOR;
  return null;
}
