import type { Session, User } from '@supabase/supabase-js';
import { UserRole } from '@/app/types/admin-types';

export const GUEST_LAWYER_ID = 'guest-lawyer-1';

export function createGuestLawyerSession(): { user: User; session: Session } {
    const nowIso = new Date().toISOString();
    const user = {
        id: GUEST_LAWYER_ID,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'guest@hami.local',
        phone: '',
        created_at: nowIso,
        updated_at: nowIso,
        app_metadata: {
            provider: 'email',
            providers: ['email'],
            systemRole: UserRole.LAWYER,
        },
        user_metadata: {
            role: 'lawyer',
            fullName: 'محامٍ تجريبي',
            systemRole: UserRole.LAWYER,
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
