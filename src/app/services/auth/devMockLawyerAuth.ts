import type { Session, User } from '@supabase/supabase-js';
import { createGuestLawyerSession } from '@/app/utils/guestLawyerSession';
import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';

let cachedGuest: ReturnType<typeof createGuestLawyerSession> | null = null;

export function getDevMockLawyerSession(): ReturnType<typeof createGuestLawyerSession> {
    if (!cachedGuest) cachedGuest = createGuestLawyerSession();
    return cachedGuest;
}

/** مستخدم تجريبي ثابت عند غياب الجلسة (تطوير / VITE_SHELL_AUTH_OPEN) */
export function resolveDevMockLawyerUser(user: User | null | undefined): User | null {
    if (user?.id) return user;
    if (!isShellAuthBypassed()) return null;
    return getDevMockLawyerSession().user;
}

export function resolveDevMockLawyerSession(
    session: Session | null | undefined,
    user: User | null | undefined,
): Session | null {
    if (session) return session;
    const resolvedUser = resolveDevMockLawyerUser(user);
    if (!resolvedUser) return null;
    return getDevMockLawyerSession().session;
}
