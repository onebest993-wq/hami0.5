import { getSupabaseAuthConfigFromEnv } from '../../security/sessionCookie.ts';
import { revokeGoTrueSession } from '../goTrueSession.ts';

export type AuthOtpPasswordConfirmResult = 'live' | 'failed' | 'skipped';

/**
 * بعد Admin updateUserById: يمنح جلسة بالكلمة الجديدة ثم يلغيها.
 * skipped = لا إعداد GoTrue للتحقق (اختبار/خادم ناقص).
 */
export async function confirmGoTruePasswordIsLive(
    email: string,
    password: string,
): Promise<AuthOtpPasswordConfirmResult> {
    const cfg = getSupabaseAuthConfigFromEnv();
    if (!cfg) return 'skipped';
    try {
        const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
                apikey: cfg.key,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        const data = (await res.json().catch(() => null)) as { access_token?: unknown } | null;
        const token = typeof data?.access_token === 'string' ? data.access_token.trim() : '';
        if (!res.ok || !token) return 'failed';
        await revokeGoTrueSession(token, { scope: 'global' });
        return 'live';
    } catch {
        return 'failed';
    }
}
