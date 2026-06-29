import type { Session, User } from '@supabase/supabase-js';
import { UserRole } from '@/app/types/admin-types';

export const GUEST_LAWYER_ID = 'guest-lawyer-1';
export const DEV_MOCK_LAWYER_NAME = 'أحمد';
export const DEV_MOCK_LAWYER_EMAIL = 'ahmad.demo@hami.local';

/** جلسة محامٍ تجريبية ثابتة — للتطوير والتجربة بدون Supabase */
export function createGuestLawyerSession(): { user: User; session: Session } {
    const nowIso = new Date().toISOString();
    const user = {
        id: GUEST_LAWYER_ID,
        aud: 'authenticated',
        role: 'authenticated',
        email: DEV_MOCK_LAWYER_EMAIL,
        phone: '+964770000001',
        created_at: nowIso,
        updated_at: nowIso,
        email_confirmed_at: nowIso,
        app_metadata: {
            provider: 'email',
            providers: ['email'],
            systemRole: UserRole.LAWYER,
            role: 'lawyer',
        },
        user_metadata: {
            role: 'lawyer',
            accountType: 'lawyer',
            fullName: DEV_MOCK_LAWYER_NAME,
            name: DEV_MOCK_LAWYER_NAME,
            displayName: DEV_MOCK_LAWYER_NAME,
            systemRole: UserRole.LAWYER,
            phone: '+964770000001',
            locale: 'ar',
        },
    } as unknown as User;

    const session = {
        access_token: `dev-access-token-${GUEST_LAWYER_ID}`,
        token_type: 'bearer',
        expires_in: 60 * 60 * 24 * 365,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
        refresh_token: 'GUEST_REFRESH_TOKEN',
        user,
    } as unknown as Session;

    return { user, session };
}
