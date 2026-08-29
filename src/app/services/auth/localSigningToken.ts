/**
 * توكن التوقيع عندما getSession() فارغ أو لم يُحمَّل بعد.
 * لا يخلط HMAC العميل مع توقيع BFF — يوفّر المادة فقط.
 */
import {
    readDevMockAccessToken,
    readPersistedSupabaseAuth,
} from '@/app/utils/authStorage';
import {
    createDevUnlockLawyerSession,
    isExplicitDevUnlock,
} from '@/app/services/auth/devUnlockSession';
import { isExplicitLocalGuest } from '@/app/services/auth/localGuestSession';
import { getDevMockLawyerSession } from '@/app/services/auth/devMockLawyerAuth';
import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';

function trimToken(value: string | null | undefined): string | null {
    const token = value?.trim() ?? '';
    return token || null;
}

/** JWT مخزَّن أو توكن تطوير مكتوب بعد الإقلاع — بلا انتظار عميل Supabase. */
export function readStoredAccessToken(): string | null {
    const persisted = trimToken(readPersistedSupabaseAuth().session?.access_token);
    if (persisted) return persisted;
    return trimToken(readDevMockAccessToken());
}

/**
 * جلسة الواجهة المحلية (شِل مفتوح / ضيف صريح / دخول مطور).
 * الإنتاج يبقي الرايات مغلقة؛ الخادم يرفض `dev-access-token-*` هناك.
 */
export function readDevShellAccessToken(): string | null {
    if (isExplicitDevUnlock()) {
        return trimToken(createDevUnlockLawyerSession().session.access_token);
    }
    if (isShellAuthBypassed() || isExplicitLocalGuest()) {
        return trimToken(getDevMockLawyerSession().session.access_token);
    }
    return null;
}

export function readClientAccessTokenFallback(): string | null {
    return readStoredAccessToken() ?? readDevShellAccessToken();
}
