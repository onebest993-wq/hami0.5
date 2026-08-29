import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.fn();
const getUserById = vi.fn();
const kvGet = vi.fn();

vi.mock('../../../security/supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: () => ({ rpc }),
    getGoTrueAdminApi: () => ({ getUserById }),
}));

vi.mock('../../../security/kvStoreAdmin.ts', () => ({
    kvGet: (...args: unknown[]) => kvGet(...args),
}));

import { lookupAuthOtpAccountByEmail, readPhoneFromUnknown } from '../authOtpLookup.ts';

describe('lookupAuthOtpAccountByEmail', () => {
    beforeEach(() => {
        rpc.mockReset();
        getUserById.mockReset();
        kvGet.mockReset();
        rpc.mockResolvedValue({ data: 'user-1', error: null });
        getUserById.mockResolvedValue({
            data: {
                user: {
                    id: 'user-1',
                    email: 'a@b.co',
                    email_confirmed_at: '2026-01-01T00:00:00.000Z',
                    phone: '',
                    user_metadata: {},
                },
            },
        });
        kvGet.mockResolvedValue({ phone: '07803344524' });
    });

    it('يقرأ الرقم من سجل التحقق إن غاب عن GoTrue', async () => {
        const account = await lookupAuthOtpAccountByEmail('a@b.co');
        expect(account?.phone).toBe('07803344524');
        expect(kvGet).toHaveBeenCalledWith('lawyer-verification:user-1');
    });

    it('يفضّل رقم GoTrue على سجل التحقق', async () => {
        getUserById.mockResolvedValueOnce({
            data: {
                user: {
                    id: 'user-1',
                    email: 'a@b.co',
                    phone: '07901112233',
                    user_metadata: { phone: '07800000000' },
                    email_confirmed_at: null,
                },
            },
        });
        const account = await lookupAuthOtpAccountByEmail('a@b.co');
        expect(account?.phone).toBe('07901112233');
        expect(kvGet).not.toHaveBeenCalled();
    });
});

describe('readPhoneFromUnknown', () => {
    it('يستخرج الهاتف من كائن أو نص', () => {
        expect(readPhoneFromUnknown({ phone: ' 0780 ' })).toBe('0780');
        expect(readPhoneFromUnknown('0781')).toBe('0781');
        expect(readPhoneFromUnknown(null)).toBeNull();
    });
});
