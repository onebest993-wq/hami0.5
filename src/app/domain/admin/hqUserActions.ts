import type { AdminUser } from '@/app/domain/admin/AdminUser';
import { isHamiPlatformAdminUserId } from '@/app/constants/hamiPlatformAdminId';

/** حسابات لا تُجمَّد ولا تُغيَّر كلمتها ولا يُنزع دورها من واجهة المقر. */
export function isHqUserMutationLocked(user: Pick<AdminUser, 'id' | 'role'>): boolean {
    if (user.role === 'admin') return true;
    return isHamiPlatformAdminUserId(user.id);
}

export function isHqAccountLoginLocked(user: Pick<AdminUser, 'isDeleted' | 'loginBlocked' | 'loginUntil'>): boolean {
    if (user.isDeleted || user.loginBlocked) return true;
    if (!user.loginUntil) return false;
    const until = Date.parse(user.loginUntil);
    return Number.isFinite(until) && until > Date.now();
}
