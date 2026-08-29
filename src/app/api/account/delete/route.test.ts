import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
    requireWifeUserMock,
    rpcMock,
    deleteUserMock,
    wipeUserStorageObjectsMock,
    isAdminUserIdMock,
    invalidateCsrfMock,
    invalidateWifeMock,
    revokeTokenMock,
} = vi.hoisted(() => ({
    requireWifeUserMock: vi.fn(),
    rpcMock: vi.fn(),
    deleteUserMock: vi.fn(),
    wipeUserStorageObjectsMock: vi.fn(),
    isAdminUserIdMock: vi.fn(),
    invalidateCsrfMock: vi.fn(),
    invalidateWifeMock: vi.fn(),
    revokeTokenMock: vi.fn(),
}));

vi.mock('@/app/api/security/bffAuth', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/security/bffAuth')>();
    return {
        ...actual,
        requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
    };
});

vi.mock('@/app/api/security/supabaseAdminClient', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/security/supabaseAdminClient')>();
    return {
        ...actual,
        getSupabaseAdminClient: () => ({
            rpc: (...args: unknown[]) => rpcMock(...args),
            auth: { admin: { deleteUser: (...args: unknown[]) => deleteUserMock(...args) } },
        }),
    };
});

vi.mock('@/app/api/settings/wipe/wipeUserStorageObjects', () => ({
    wipeUserStorageObjects: (...args: unknown[]) => wipeUserStorageObjectsMock(...args),
}));

vi.mock('@/app/api/security/adminCheck', () => ({
    isAdminUserId: (...args: unknown[]) => isAdminUserIdMock(...args),
}));

vi.mock('@/app/api/security/csrfServerStore.ts', () => ({
    invalidateCsrfForSubject: (...args: unknown[]) => invalidateCsrfMock(...args),
}));

vi.mock('@/app/api/security/wifeSessionServerStore.ts', () => ({
    invalidateWifeSessionsForSubject: (...args: unknown[]) => invalidateWifeMock(...args),
}));

vi.mock('@/app/api/security/stolenTokenServer.ts', () => ({
    revokeTokenSessionsForSubject: (...args: unknown[]) => revokeTokenMock(...args),
}));

import { ACCOUNT_DELETE_CONFIRMATION, POST } from './route';

function request(body: unknown): Request {
    return new Request('http://localhost/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('account delete route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'user-1' });
        isAdminUserIdMock.mockResolvedValue(false);
        rpcMock.mockResolvedValue({
            data: { legalRows: 2, totalDeleted: 2 },
            error: null,
        });
        wipeUserStorageObjectsMock.mockResolvedValue({
            deleted: 1,
            buckets: { vault: 1 },
        });
        deleteUserMock.mockResolvedValue({ data: { user: null }, error: null });
        invalidateCsrfMock.mockResolvedValue(undefined);
        invalidateWifeMock.mockResolvedValue(undefined);
        revokeTokenMock.mockResolvedValue(undefined);
    });

    it('يرفض تأكيداً خاطئاً', async () => {
        const res = await POST(request({ confirmation: 'wrong', version: 1 }));
        expect(res.status).toBe(400);
        expect(rpcMock).not.toHaveBeenCalled();
        expect(deleteUserMock).not.toHaveBeenCalled();
    });

    it('يمنع حذف حساب الإدارة', async () => {
        isAdminUserIdMock.mockResolvedValueOnce(true);
        const res = await POST(
            request({ confirmation: ACCOUNT_DELETE_CONFIRMATION, version: 1 }),
        );
        expect(res.status).toBe(403);
        expect(rpcMock).not.toHaveBeenCalled();
        expect(deleteUserMock).not.toHaveBeenCalled();
    });

    it('لا يحذف الهوية إن فشل مسح قاعدة البيانات', async () => {
        rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });
        const res = await POST(
            request({ confirmation: ACCOUNT_DELETE_CONFIRMATION, version: 1 }),
        );
        const body = await res.json();
        expect(res.status).toBe(500);
        expect(body.code).toBe('ACCOUNT_DELETE_DATABASE_FAILED');
        expect(deleteUserMock).not.toHaveBeenCalled();
    });

    it('يمسح البيانات ثم يحذف مستخدم المصادقة', async () => {
        const res = await POST(
            request({ confirmation: ACCOUNT_DELETE_CONFIRMATION, version: 1, userId: 'victim' }),
        );
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.authDeleted).toBe(true);
        expect(rpcMock).toHaveBeenCalledWith('wipe_user_application_data', {
            p_user_id: 'user-1',
        });
        expect(deleteUserMock).toHaveBeenCalledWith('user-1');
        expect(invalidateCsrfMock).toHaveBeenCalledWith('user-1');
        expect(invalidateWifeMock).toHaveBeenCalledWith('user-1');
        expect(revokeTokenMock).toHaveBeenCalledWith('user-1');
    });
});
