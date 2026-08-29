import { kvGet } from '../../security/kvStoreAdmin.ts';
import { getGoTrueAdminApi, getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';

export type AuthOtpAccount = {
    userId: string;
    email: string;
    phone: string | null;
    emailConfirmed: boolean;
};

export function readPhoneFromUnknown(value: unknown): string | null {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const phone = (value as { phone?: unknown }).phone;
    return typeof phone === 'string' && phone.trim() ? phone.trim() : null;
}

async function readVerificationRecordPhone(userId: string): Promise<string | null> {
    try {
        return readPhoneFromUnknown(await kvGet(`lawyer-verification:${userId}`));
    } catch {
        return null;
    }
}

export async function lookupAuthOtpAccountByEmail(email: string): Promise<AuthOtpAccount | null> {
    const admin = getSupabaseAdminClient();
    if (!admin) return null;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed.includes('@')) return null;

    const { data, error } = await admin.rpc('hq_lookup_auth_email', { p_email: trimmed });
    const userId = typeof data === 'string' ? data.trim() : '';
    if (error || !userId) return null;

    const { data: packed } = await getGoTrueAdminApi(admin).getUserById(userId);
    const user = packed?.user;
    if (!user?.id) return null;

    const goTruePhone =
        (typeof (user as { phone?: unknown }).phone === 'string'
            ? String((user as { phone?: string }).phone).trim()
            : '') || readPhoneFromUnknown(user.user_metadata);

    const phone = goTruePhone || (await readVerificationRecordPhone(user.id));

    return {
        userId: user.id,
        email: (user.email ?? trimmed).trim().toLowerCase(),
        phone: phone || null,
        emailConfirmed: Boolean(user.email_confirmed_at),
    };
}
