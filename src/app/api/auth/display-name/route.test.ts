import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requireWifeUserMock, readPolicyMock, correctMock, auditMock, kvGetMock } = vi.hoisted(() => ({
    requireWifeUserMock: vi.fn(),
    readPolicyMock: vi.fn(),
    correctMock: vi.fn(),
    auditMock: vi.fn(async () => true),
    kvGetMock: vi.fn(async () => null),
}));

vi.mock('../../security/bffAuth.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../security/bffAuth.ts')>();
    return {
        ...actual,
        requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
    };
});

vi.mock('../../security/wifeRateLimitStore.ts', () => ({
    consumeRateLimitSlot: vi.fn(async () => true),
}));

vi.mock('../../security/displayNameCorrection.ts', () => ({
    readDisplayNamePolicy: (...args: unknown[]) => readPolicyMock(...args),
    correctDisplayNameOnce: (...args: unknown[]) => correctMock(...args),
}));

vi.mock('../../security/headquartersAudit.ts', () => ({
    recordHeadquartersAudit: (...args: unknown[]) => auditMock(...args),
}));

vi.mock('../../security/kvStoreAdmin.ts', () => ({
    kvGet: (...args: unknown[]) => kvGetMock(...args),
}));

import { GET, PATCH } from './route';

function req(method: string, body?: unknown): Request {
    return new Request('https://app.test/api/auth/display-name', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body == null ? undefined : JSON.stringify(body),
    });
}

describe('/api/auth/display-name', () => {
    beforeEach(() => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' });
        readPolicyMock.mockReset();
        correctMock.mockReset();
        auditMock.mockReset();
        auditMock.mockResolvedValue(true);
        kvGetMock.mockReset();
        kvGetMock.mockResolvedValue(null);
    });

    it('GET يعيد السياسة', async () => {
        readPolicyMock.mockResolvedValue({
            fullName: 'علي محمد حسن',
            previousFullName: null,
            previousVisibleUntil: null,
            correctionUsed: false,
            canCorrect: true,
            correctedAt: null,
        });
        const res = await GET(req('GET'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { ok: boolean; canCorrect: boolean; fullName: string };
        expect(body.ok).toBe(true);
        expect(body.canCorrect).toBe(true);
        expect(body.fullName).toBe('علي محمد حسن');
    });

    it('PATCH يرفض التصحيح الثاني', async () => {
        correctMock.mockResolvedValue({ ok: false, status: 409, error: 'يمكن تصحيح الاسم مرة واحدة فقط' });
        const res = await PATCH(req('PATCH', { fullName: 'اسم آخر' }));
        expect(res.status).toBe(409);
        const body = (await res.json()) as { ok: boolean; error: string };
        expect(body.ok).toBe(false);
        expect(body.error).toContain('مرة واحدة');
        expect(auditMock).not.toHaveBeenCalled();
    });

    it('PATCH يختم تصحيح الاسم ويذكر طلب التوثيق عند الاختلاف', async () => {
        correctMock.mockResolvedValue({
            ok: true,
            policy: {
                fullName: 'علي حسن محمد',
                previousFullName: 'علي محمد حسن',
                previousVisibleUntil: '2026-09-20T00:00:00.000Z',
                correctionUsed: true,
                canCorrect: false,
                correctedAt: '2026-08-20T00:00:00.000Z',
            },
        });
        kvGetMock.mockResolvedValue({ fullName: 'علي محمد علي' });
        const res = await PATCH(req('PATCH', { fullName: 'علي حسن محمد' }));
        expect(res.status).toBe(200);
        expect(auditMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'user.display_name_correct',
                details: expect.objectContaining({
                    from: 'علي محمد حسن',
                    to: 'علي حسن محمد',
                    kycName: 'علي محمد علي',
                }),
            }),
        );
    });
});
