import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    requireWifeUserMock,
    rpcMock,
    wipeUserStorageObjectsMock,
} = vi.hoisted(() => ({
    requireWifeUserMock: vi.fn(),
    rpcMock: vi.fn(),
    wipeUserStorageObjectsMock: vi.fn(),
}));

vi.mock('@/app/api/security/bffAuth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/security/bffAuth')>();
    return {
        ...actual,
        requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
    };
});

vi.mock('@/app/api/security/supabaseAdminClient', () => ({
    getSupabaseAdminClient: () => ({ rpc: (...args: unknown[]) => rpcMock(...args) }),
}));

vi.mock('./wipeUserStorageObjects', () => ({
    wipeUserStorageObjects: (...args: unknown[]) => wipeUserStorageObjectsMock(...args),
}));

import { POST, SETTINGS_WIPE_CONFIRMATION } from './route';

function request(body: unknown): Request {
    return new Request('http://localhost/api/settings/wipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('settings cloud wipe route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'user-1' });
        rpcMock.mockResolvedValue({
            data: { legalRows: 3, settingsRows: 1, totalDeleted: 4 },
            error: null,
        });
        wipeUserStorageObjectsMock.mockResolvedValue({
            deleted: 2,
            buckets: { vault: 2 },
        });
    });

    it('يتطلب تأكيداً ثابتاً وإصدار العقد', async () => {
        const res = await POST(request({ confirmation: 'wrong', version: 1 }));

        expect(res.status).toBe(400);
        expect(rpcMock).not.toHaveBeenCalled();
    });

    it('يربط RPC حصراً بهوية الجلسة الموثقة', async () => {
        const res = await POST(
            request({ confirmation: SETTINGS_WIPE_CONFIRMATION, version: 1, userId: 'victim' }),
        );

        expect(res.status).toBe(200);
        expect(rpcMock).toHaveBeenCalledWith('wipe_user_application_data', {
            p_user_id: 'user-1',
        });
        expect(wipeUserStorageObjectsMock).toHaveBeenCalledWith(expect.anything(), 'user-1');
    });

    it('لا يبدأ مسح التخزين إن فشلت معاملة قاعدة البيانات', async () => {
        rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });

        const res = await POST(
            request({ confirmation: SETTINGS_WIPE_CONFIRMATION, version: 1 }),
        );
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.code).toBe('WIPE_DATABASE_FAILED');
        expect(wipeUserStorageObjectsMock).not.toHaveBeenCalled();
    });

    it('يصرّح بالنتيجة الجزئية ولا يعلن نجاحاً كاذباً عند فشل التخزين', async () => {
        wipeUserStorageObjectsMock.mockRejectedValueOnce(new Error('storage down'));

        const res = await POST(
            request({ confirmation: SETTINGS_WIPE_CONFIRMATION, version: 1 }),
        );
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.ok).toBe(false);
        expect(body.partial).toBe(true);
        expect(body.code).toBe('WIPE_STORAGE_PARTIAL');
        expect(body.receipt.database.totalDeleted).toBe(4);
    });
});
