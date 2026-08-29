import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetWifeRateLimitStoreForTests } from '../../../security/wifeRateLimitStore.ts';

const lookup = vi.fn();
const consume = vi.fn();
const updateUserById = vi.fn();
const signOut = vi.fn();
const confirmPassword = vi.fn();

vi.mock('../authOtpLookup.ts', () => ({
    lookupAuthOtpAccountByEmail: (...args: unknown[]) => lookup(...args),
}));

vi.mock('../authOtpStore.ts', () => ({
    consumeAuthOtpChallenge: (...args: unknown[]) => consume(...args),
}));

vi.mock('../authOtpPasswordConfirm.ts', () => ({
    confirmGoTruePasswordIsLive: (...args: unknown[]) => confirmPassword(...args),
}));

vi.mock('../../../security/supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: () => ({}),
    getGoTrueAdminApi: () => ({ updateUserById, signOut }),
}));

import { POST } from '../complete/route.ts';

function completeRequest(body: Record<string, unknown>): Request {
    return new Request('https://app.test/api/auth/otp/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.8' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/auth/otp/complete', () => {
    beforeEach(() => {
        resetWifeRateLimitStoreForTests();
        lookup.mockReset();
        consume.mockReset();
        updateUserById.mockReset();
        signOut.mockReset();
        confirmPassword.mockReset();
        lookup.mockResolvedValue({
            userId: 'user-1',
            email: 'a@b.co',
            phone: '07803344524',
            emailConfirmed: false,
        });
        consume.mockResolvedValue({ ok: true });
        updateUserById.mockResolvedValue({ error: null });
        signOut.mockResolvedValue({ error: null });
        confirmPassword.mockResolvedValue('live');
    });

    it('يرفض رمزاً غير صالح دون تحديث كلمة المرور', async () => {
        consume.mockResolvedValueOnce({ ok: false, error: 'invalid' });
        const res = await POST(
            completeRequest({
                email: 'a@b.co',
                code: '000000',
                purpose: 'password_reset',
                newPassword: 'Abcd1234!',
            }),
        );
        expect(res.status).toBe(400);
        expect(updateUserById).not.toHaveBeenCalled();
        expect(confirmPassword).not.toHaveBeenCalled();
    });

    it('يثبّت البريد بعد رمز صالح', async () => {
        const res = await POST(
            completeRequest({ email: 'a@b.co', code: '123456', purpose: 'email_confirm' }),
        );
        expect(res.status).toBe(200);
        expect(updateUserById).toHaveBeenCalledWith('user-1', { email_confirm: true });
        expect(signOut).not.toHaveBeenCalled();
        expect(confirmPassword).not.toHaveBeenCalled();
    });

    it('يغيّر كلمة المرور ويلغي الجلسات بعد رمز صالح', async () => {
        const res = await POST(
            completeRequest({
                email: 'a@b.co',
                code: '123456',
                purpose: 'password_reset',
                newPassword: 'Abcd1234!',
            }),
        );
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.passwordLive).toBe(true);
        expect(json.message).toMatch(/الأصلية/);
        expect(updateUserById).toHaveBeenCalledWith('user-1', { password: 'Abcd1234!' });
        expect(confirmPassword).toHaveBeenCalledWith('a@b.co', 'Abcd1234!');
        expect(signOut).toHaveBeenCalledWith('user-1', 'global');
    });

    it('يرفض الإكمال إذا الكلمة الجديدة لا تعمل كبديل حي', async () => {
        confirmPassword.mockResolvedValueOnce('failed');
        const res = await POST(
            completeRequest({
                email: 'a@b.co',
                code: '123456',
                purpose: 'password_reset',
                newPassword: 'Abcd1234!',
            }),
        );
        expect(res.status).toBe(500);
        expect(updateUserById).toHaveBeenCalled();
        expect(signOut).toHaveBeenCalledWith('user-1', 'global');
    });
});
