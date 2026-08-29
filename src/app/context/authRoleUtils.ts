import type { User } from '@supabase/supabase-js';
import { UserRole } from '@/app/types/admin-types';

/**
 * أدوات الدور — ملف منفصل عن AuthContext حتى لا يكسر React Fast Refresh
 * (تصدير دوال غير-مكونات من نفس ملف الـ Provider يُبطل HMR ويسبب Maximum update depth).
 */

function getSystemRoleFromMetadata(meta: Record<string, unknown>): UserRole | null {
    const systemRole = meta.systemRole;
    if (typeof systemRole === 'string') {
        if (systemRole === UserRole.SUPER_ADMIN) return UserRole.SUPER_ADMIN;
        if (systemRole === UserRole.LAWYER) return UserRole.LAWYER;
    }
    const legacyRole = meta.role;
    if (legacyRole === 'admin') return UserRole.SUPER_ADMIN;
    if (legacyRole === 'lawyer') return UserRole.LAWYER;
    return null;
}

export function isSuperAdminUser(user: User | null): boolean {
    if (!user) return false;
    const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
    if (getSystemRoleFromMetadata(appMeta) === UserRole.SUPER_ADMIN) return true;
    const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
    return getSystemRoleFromMetadata(userMeta) === UserRole.SUPER_ADMIN;
}

export function userHasRole(user: User | null, role: 'lawyer' | 'admin'): boolean {
    if (!user) return false;
    if (role === 'admin') return isSuperAdminUser(user);
    return !isSuperAdminUser(user);
}
