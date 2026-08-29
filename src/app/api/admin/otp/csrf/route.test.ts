import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
    requireHeadquartersCookieAuthMock,
    issueCsrfTokenForSubjectMock,
} = vi.hoisted(() => ({
    requireHeadquartersCookieAuthMock: vi.fn(),
    issueCsrfTokenForSubjectMock: vi.fn(),
}));

vi.mock('../../../security/requireHeadquartersCookieAuth.ts', () => ({
    requireHeadquartersCookieAuth: (...a: unknown[]) => requireHeadquartersCookieAuthMock(...a),
}));

vi.mock('../../../security/csrfServerStore.ts', () => ({
    issueCsrfTokenForSubject: (...a: unknown[]) => issueCsrfTokenForSubjectMock(...a),
}));

import { GET } from './route.ts';

function req(): Request {
    return new Request('https://app.test/api/admin/otp/csrf', { method: 'GET' });
}

describe('GET /api/admin/otp/csrf', () => {
    beforeEach(() => {
        requireHeadquartersCookieAuthMock.mockResolvedValue({
            ok: true,
            userId: 'admin-1',
            token: 'tok',
        });
        issueCsrfTokenForSubjectMock.mockResolvedValue('issuedHeadquartersCsrfTok01');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('يرفض بلا جلسة مدير', async () => {
        requireHeadquartersCookieAuthMock.mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ ok: false, error: 'Unauthorized user' }), { status: 401 }),
        });
        const res = await GET(req());
        expect(res.status).toBe(401);
        expect(issueCsrfTokenForSubjectMock).not.toHaveBeenCalled();
    });

    it('يصدر CSRF مربوطاً بالمدير ويضع الكوكي', async () => {
        const res = await GET(req());
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ ok: true, csrfToken: 'issuedHeadquartersCsrfTok01' });
        expect(issueCsrfTokenForSubjectMock).toHaveBeenCalledWith('admin-1');
        const setCookie = res.headers.get('set-cookie') ?? '';
        expect(setCookie).toMatch(/hami_csrf_token=/);
        expect(setCookie).toMatch(/HttpOnly/i);
    });

    it('يرجع 503 إذا تعذر حفظ الرمز', async () => {
        issueCsrfTokenForSubjectMock.mockResolvedValue(null);
        const res = await GET(req());
        expect(res.status).toBe(503);
        await expect(res.json()).resolves.toMatchObject({ ok: false });
    });
});
