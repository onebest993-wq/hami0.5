import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    isAdminUserIdMock,
    extractUserTokenMock,
    isTokenAuthorizedMock,
    getVerifiedTokenSubjectMock,
    verifyCsrfTokenMock,
    assertSameOriginMock,
} = vi.hoisted(() => ({
    isAdminUserIdMock: vi.fn(),
    extractUserTokenMock: vi.fn(),
    isTokenAuthorizedMock: vi.fn(),
    getVerifiedTokenSubjectMock: vi.fn(),
    verifyCsrfTokenMock: vi.fn(),
    assertSameOriginMock: vi.fn(),
}));

vi.mock('../adminCheck.ts', () => ({
    isAdminUserId: (...a: unknown[]) => isAdminUserIdMock(...a),
}));

vi.mock('../wifeSameOrigin.ts', () => ({
    assertSameOriginRequest: (...a: unknown[]) => assertSameOriginMock(...a),
}));

vi.mock('../wifeCsrfVerify.ts', () => ({
    verifyCsrfToken: (...a: unknown[]) => verifyCsrfTokenMock(...a),
}));

vi.mock('../wifeValidator.ts', () => ({
    extractUserTokenFromRequest: (...a: unknown[]) => extractUserTokenMock(...a),
    isTokenAuthorized: (...a: unknown[]) => isTokenAuthorizedMock(...a),
    getVerifiedTokenSubject: (...a: unknown[]) => getVerifiedTokenSubjectMock(...a),
    wifeUnauthorizedResponse: () =>
        new Response(JSON.stringify({ ok: false, error: 'Unauthorized user' }), { status: 401 }),
}));

import { requireHeadquartersCookieAuth } from '../requireHeadquartersCookieAuth.ts';

function req(method = 'POST'): Request {
    return new Request('https://app.test/api/admin/otp/request', { method });
}

describe('requireHeadquartersCookieAuth', () => {
    beforeEach(() => {
        assertSameOriginMock.mockReturnValue(true);
        extractUserTokenMock.mockReturnValue('tok');
        isTokenAuthorizedMock.mockResolvedValue(true);
        verifyCsrfTokenMock.mockResolvedValue(true);
        getVerifiedTokenSubjectMock.mockResolvedValue('admin-1');
        isAdminUserIdMock.mockResolvedValue(true);
    });
    afterEach(() => {
        vi.clearAllMocks();
        delete process.env.HAMI_HQ_HOSTS;
        delete process.env.HAMI_HQ_ALLOW_THIS_DEPLOYMENT;
        delete process.env.VERCEL_ENV;
    });

    it('يرفض أصلاً أجنبياً', async () => {
        assertSameOriginMock.mockReturnValue(false);
        const gate = await requireHeadquartersCookieAuth(req());
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(403);
        await expect(gate.response.json()).resolves.toMatchObject({ error: 'Forbidden origin' });
    });

    it('يرفض CSRF على POST', async () => {
        verifyCsrfTokenMock.mockResolvedValue(false);
        const gate = await requireHeadquartersCookieAuth(req());
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(403);
        await expect(gate.response.json()).resolves.toMatchObject({ error: 'CSRF validation failed' });
    });

    it('يرفض غير المدير', async () => {
        isAdminUserIdMock.mockResolvedValue(false);
        const gate = await requireHeadquartersCookieAuth(req());
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(403);
    });

    it('يأذن لمدير بنفس الأصل وCSRF', async () => {
        const gate = await requireHeadquartersCookieAuth(req());
        expect(gate).toEqual({ ok: true, userId: 'admin-1', token: 'tok' });
    });

    it('GET يتخطى CSRF ويبقى يفحص المدير', async () => {
        verifyCsrfTokenMock.mockResolvedValue(false);
        const gate = await requireHeadquartersCookieAuth(req('GET'));
        expect(gate).toEqual({ ok: true, userId: 'admin-1', token: 'tok' });
        expect(verifyCsrfTokenMock).not.toHaveBeenCalled();
    });

    it('يرفض رمزاً غير مُصرَّح', async () => {
        isTokenAuthorizedMock.mockResolvedValue(false);
        const gate = await requireHeadquartersCookieAuth(req());
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(401);
        expect(verifyCsrfTokenMock).not.toHaveBeenCalled();
    });

    it('يرفض عميل okhttp بـ 404 قبل CSRF', async () => {
        const gate = await requireHeadquartersCookieAuth(
            new Request('https://app.test/api/admin/otp/request', {
                method: 'POST',
                headers: { 'user-agent': 'okhttp/4.12.0' },
            }),
        );
        expect(gate.ok).toBe(false);
        if (gate.ok) return;
        expect(gate.response.status).toBe(404);
        expect(extractUserTokenMock).not.toHaveBeenCalled();
        expect(assertSameOriginMock).not.toHaveBeenCalled();
    });
});
