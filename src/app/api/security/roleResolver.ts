/**
 * Server-side role resolution — NEVER trust JWT user_metadata for privileges.
 * Sources: ADMIN_UUID env, profiles.role (admin | moderator).
 */
import { UserRole } from '@/app/types/admin-types';
import { getSupabaseAdminClient } from './supabaseAdminClient.ts';

const ROLE_CACHE_TTL_MS = 60_000;
const roleCache = new Map<string, { role: string | null; expiresAt: number }>();

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
}

function isNonProductionNodeEnv(): boolean {
  return (process.env.NODE_ENV ?? '').toLowerCase() !== 'production';
}

export function getConfiguredAdminUuid(): string {
  const configured = (process.env.ADMIN_UUID ?? '').trim();
  if (configured) return configured;
  if (isNonProductionNodeEnv()) return 'admin-uuid-1';
  return '';
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

export async function isPlatformAdminUserId(userId: string): Promise<boolean> {
  if (!userId) return false;
  const adminUuid = getConfiguredAdminUuid();
  if (adminUuid && userId === adminUuid) return true;
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
  const role = await getProfileRole(userId);
  return role === 'lawyer' || role === 'moderator' || role === 'admin';
}

export async function resolveForumRoleForUser(userId: string): Promise<UserRole | null> {
  if (await isPlatformAdminUserId(userId)) return UserRole.SUPER_ADMIN;
  const role = await getProfileRole(userId);
  if (role === 'moderator') return UserRole.MODERATOR;
  return null;
}
