import { describe, expect, it, vi, afterEach } from 'vitest';
import { setWifeNativeFetchForTests, resetWifeNativeFetchForTests } from '@/app/security/wifeNativeFetch';
import { DeviceTrustService } from '@/app/domain/admin/deviceTrust';
import { requestAdminHeadquartersOtp, fetchAdminDeviceTrustStatus, verifyAdminHeadquartersOtp } from '@/app/services/admin/adminHeadquartersOtpClient';

const ISSUED_CSRF = 'serverIssuedCsrfToken01aa';

const { setCsrfSessionTokenFromServer } = vi.hoisted(() => ({
    setCsrfSessionTokenFromServer: vi.fn(),
}));

vi.mock('@/app/domain/admin/deviceTrust', () => ({
    DeviceTrustService: {
        getDeviceFingerprint: () => 'testdevicefingerprint01',
        trustThisDevice: vi.fn(),
        revokeDeviceTrust: vi.fn(),
    },
}));

vi.mock('@/app/security/csrfSession', () => ({
    setCsrfSessionTokenFromServer: (...args: unknown[]) => setCsrfSessionTokenFromServer(...args),
}));

function jsonRes(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('requestAdminHeadquartersOtp', () => {
    afterEach(() => {
        resetWifeNativeFetchForTests();
        setCsrfSessionTokenFromServer.mockClear();
        vi.mocked(DeviceTrustService.trustThisDevice).mockClear();
        vi.mocked(DeviceTrustService.revokeDeviceTrust).mockClear();
        vi.restoreAllMocks();
    });

    it('refreshes HQ CSRF then posts to /api/admin/otp/request with the issued token', async () => {
        const nativeFetch = vi.fn(async (url: string) => {
            if (String(url).includes('/api/admin/otp/csrf')) {
                return jsonRes({ ok: true, csrfToken: ISSUED_CSRF });
            }
            return jsonRes({ ok: true, delivered: true, destinationHint: 'ha***@proton.me' });
        });
        setWifeNativeFetchForTests(nativeFetch);
        await expect(requestAdminHeadquartersOtp()).resolves.toMatchObject({
            ok: true,
            delivered: true,
            destinationHint: 'ha***@proton.me',
        });
        expect(nativeFetch.mock.calls.map((call) => call[0])).toEqual([
            '/api/admin/otp/csrf',
            '/api/admin/otp/request',
        ]);
        const csrfInit = nativeFetch.mock.calls[0][1] as RequestInit;
        expect(csrfInit.method).toBe('GET');
        expect(csrfInit.credentials).toBe('include');
        expect(new Headers(csrfInit.headers).get('x-csrf-token')).toBeNull();

        const [url, init] = nativeFetch.mock.calls[1] as [string, RequestInit];
        expect(url).toBe('/api/admin/otp/request');
        expect(init.credentials).toBe('include');
        expect(new Headers(init.headers).get('authorization')).toBeNull();
        expect(new Headers(init.headers).get('x-csrf-token')).toBe(ISSUED_CSRF);
        expect(new Headers(init.headers).get('x-wife-device-id')).toBe('testdevicefingerprint01');
        expect(setCsrfSessionTokenFromServer).toHaveBeenCalledWith(ISSUED_CSRF);
    });

    it('translates Unauthorized user into an Arabic session hint', async () => {
        setWifeNativeFetchForTests(
            vi.fn().mockResolvedValue(
                jsonRes({ ok: false, error: 'Unauthorized user' }, 401),
            ),
        );
        const result = await requestAdminHeadquartersOtp();
        expect(result.ok).toBe(false);
        expect(result.sessionRequired).toBe(true);
        expect(result.error).toContain('سجّل الدخول');
        expect(result.error).not.toMatch(/Unauthorized user/i);
    });

    it('translates Forbidden origin into an Arabic same-host hint', async () => {
        setWifeNativeFetchForTests(
            vi.fn().mockResolvedValue(
                jsonRes({ ok: false, error: 'Forbidden origin' }, 403),
            ),
        );
        const result = await requestAdminHeadquartersOtp();
        expect(result.ok).toBe(false);
        expect(result.error).toContain('127.0.0.1:8080');
        expect(result.error).not.toMatch(/Forbidden origin/i);
    });

    it('translates CSRF validation failed into Arabic and does not leak English', async () => {
        const nativeFetch = vi.fn(async (url: string) => {
            if (String(url).includes('/api/admin/otp/csrf')) {
                return jsonRes({ ok: true, csrfToken: ISSUED_CSRF });
            }
            return jsonRes({ ok: false, error: 'CSRF validation failed' }, 403);
        });
        setWifeNativeFetchForTests(nativeFetch);
        const result = await requestAdminHeadquartersOtp();
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(/فشل التحقق الأمني/);
        expect(result.error).not.toMatch(/CSRF validation failed/i);
        expect(nativeFetch.mock.calls.filter((call) => call[0] === '/api/admin/otp/request')).toHaveLength(2);
    });

    it('retries OTP request once after a CSRF 403 with a fresh token', async () => {
        let requestHits = 0;
        const nativeFetch = vi.fn(async (url: string) => {
            if (String(url).includes('/api/admin/otp/csrf')) {
                return jsonRes({ ok: true, csrfToken: `${ISSUED_CSRF}${requestHits}` });
            }
            requestHits += 1;
            if (requestHits === 1) {
                return jsonRes({ ok: false, error: 'CSRF validation failed' }, 403);
            }
            return jsonRes({ ok: true, delivered: true, destinationHint: 'ha***@proton.me' });
        });
        setWifeNativeFetchForTests(nativeFetch);
        await expect(requestAdminHeadquartersOtp()).resolves.toMatchObject({
            ok: true,
            delivered: true,
        });
        const postHeaders = new Headers((nativeFetch.mock.calls[3][1] as RequestInit).headers);
        expect(postHeaders.get('x-csrf-token')).toBe(`${ISSUED_CSRF}1`);
    });

    it('does not treat a rejected OTP code as a missing lawyer session', async () => {
        const nativeFetch = vi.fn(async (url: string) => {
            if (String(url).includes('/api/admin/otp/csrf')) {
                return jsonRes({ ok: true, csrfToken: ISSUED_CSRF });
            }
            return jsonRes({ ok: false, error: 'رمز غير صالح أو منتهٍ' }, 400);
        });
        setWifeNativeFetchForTests(nativeFetch);
        const result = await verifyAdminHeadquartersOtp('123459');
        expect(result.ok).toBe(false);
        expect(result.sessionRequired).toBe(false);
        expect(result.error).toMatch(/رمز غير صالح/);
    });

    it('does not treat a 401 OTP rejection body as a missing lawyer session', async () => {
        const nativeFetch = vi.fn(async (url: string) => {
            if (String(url).includes('/api/admin/otp/csrf')) {
                return jsonRes({ ok: true, csrfToken: ISSUED_CSRF });
            }
            return jsonRes({ ok: false, error: 'رمز غير صالح أو منتهٍ' }, 401);
        });
        setWifeNativeFetchForTests(nativeFetch);
        const result = await verifyAdminHeadquartersOtp('123459');
        expect(result.ok).toBe(false);
        expect(result.sessionRequired).toBe(false);
    });

    it('treats a 401 device-trust probe as a missing server session', async () => {
        setWifeNativeFetchForTests(
            vi.fn().mockResolvedValue(
                jsonRes({ ok: false, error: 'Unauthorized user' }, 401),
            ),
        );
        await expect(fetchAdminDeviceTrustStatus()).resolves.toBe('session_required');
    });

    it('treats a 200 sessionRequired probe as a missing server session without throwing', async () => {
        setWifeNativeFetchForTests(
            vi.fn().mockResolvedValue(
                jsonRes({ ok: true, trusted: false, sessionRequired: true }, 200),
            ),
        );
        await expect(fetchAdminDeviceTrustStatus()).resolves.toBe('session_required');
        expect(DeviceTrustService.revokeDeviceTrust).not.toHaveBeenCalled();
    });

    it('treats an explicit trusted:false probe as untrusted without clearing the local cache', async () => {
        setWifeNativeFetchForTests(
            vi.fn().mockResolvedValue(jsonRes({ ok: true, trusted: false }, 200)),
        );
        await expect(fetchAdminDeviceTrustStatus()).resolves.toBe('untrusted');
        expect(DeviceTrustService.revokeDeviceTrust).not.toHaveBeenCalled();
    });

    it('does not clear local trust when the device-trust probe is unavailable', async () => {
        setWifeNativeFetchForTests(
            vi.fn().mockResolvedValue(jsonRes({ ok: false, error: 'Internal admin OTP status error' }, 500)),
        );
        await expect(fetchAdminDeviceTrustStatus()).resolves.toBe('unavailable');
        expect(DeviceTrustService.revokeDeviceTrust).not.toHaveBeenCalled();
    });

    it('marks the device trusted when the server probe succeeds', async () => {
        setWifeNativeFetchForTests(
            vi.fn().mockResolvedValue(jsonRes({ ok: true, trusted: true }, 200)),
        );
        await expect(fetchAdminDeviceTrustStatus()).resolves.toBe('trusted');
        expect(DeviceTrustService.trustThisDevice).toHaveBeenCalledWith('testdevicefingerprint01');
        expect(DeviceTrustService.revokeDeviceTrust).not.toHaveBeenCalled();
    });

    it('shows the Auth email rate-limit body on 429 instead of a RESEND hint', async () => {
        const nativeFetch = vi.fn(async (url: string) => {
            if (String(url).includes('/api/admin/otp/csrf')) {
                return jsonRes({ ok: true, csrfToken: ISSUED_CSRF });
            }
            return jsonRes(
                {
                    ok: false,
                    error:
                        'بريد التحقق بلغ حد الإرسال. انتظر نحو ساعة ثم اضغط «أرسل رمز التحقق» مرة واحدة. لا تفتح رابط الرسالة.',
                },
                429,
            );
        });
        setWifeNativeFetchForTests(nativeFetch);
        const result = await requestAdminHeadquartersOtp();
        expect(result.ok).toBe(false);
        expect(result.error).toContain('حد الإرسال');
        expect(result.error).not.toMatch(/RESEND/i);
    });

    it('translates mailer 503 into an Arabic mailbox hint', async () => {
        const nativeFetch = vi.fn(async (url: string) => {
            if (String(url).includes('/api/admin/otp/csrf')) {
                return jsonRes({ ok: true, csrfToken: ISSUED_CSRF });
            }
            return jsonRes({ ok: false, error: 'Mailer not configured' }, 503);
        });
        setWifeNativeFetchForTests(nativeFetch);
        const result = await requestAdminHeadquartersOtp();
        expect(result.ok).toBe(false);
        expect(result.error).toContain('البريد الرسمي');
    });
});
