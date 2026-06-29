import type { Session, User } from '@supabase/supabase-js';
import {
    clearDevMockAuth,
    readDevMockAccessToken,
    readDevMockUser,
    readPersistedSupabaseAuth,
} from '@/app/utils/authStorage';
import { getDevMockLawyerSession } from '@/app/services/auth/devMockLawyerAuth';
import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';
import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';

export type AuthBootState = { user: User | null; session: Session | null };

const EMPTY_AUTH: AuthBootState = { user: null, session: null };

function devMockBootState(): AuthBootState | null {
    const devUser = readDevMockUser();
    const devToken = readDevMockAccessToken();
    if (!devUser || !devToken) return null;
    if (import.meta.env.PROD && !isShellAuthBypassed()) {
        clearDevMockAuth();
        return null;
    }
    return {
        user: devUser,
        session: {
            access_token: devToken,
            token_type: 'bearer',
            expires_in: 60 * 60,
            expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
            refresh_token: 'DEV_REFRESH_TOKEN',
            user: devUser,
        } as Session,
    };
}

/** حالة المصادقة الأولية — بدون ضيف تلقائي في الإنتاج */
export function resolveInitialAuthState(): AuthBootState {
    if (isBffAuthEnabled()) {
        return isShellAuthBypassed() ? getDevMockLawyerSession() : EMPTY_AUTH;
    }

    const persisted = readPersistedSupabaseAuth();
    if (persisted.user && persisted.session) {
        return { user: persisted.user, session: persisted.session };
    }

    const devMock = devMockBootState();
    if (devMock) return devMock;

    return isShellAuthBypassed() ? getDevMockLawyerSession() : EMPTY_AUTH;
}

/** بعد تسجيل الخروج أو غياب جلسة — ضيف فقط في وضع التطوير/التجاوز */
export function shouldApplyGuestFallbackSession(): boolean {
    return isShellAuthBypassed();
}
