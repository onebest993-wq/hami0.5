/**
 * Auth Onboarding Adversarial Assault
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    validateTrustedRegistrationEmail,
    validateRegistrationPasswordSecure,
    validateIraqiLawyerPhoneSecure,
    validateLawyerRegistrationCredentials,
} from '@/app/services/auth/registrationCredentialsSecurity';
import { resolvePasswordResetRedirectTo } from './passwordResetRedirectAllowlist.ts';
import { HAMI_PLATFORM_ADMIN_UUID } from '@/app/constants/hamiPlatformAdminId';
import {
    canUseForumNetworkFeatures,
    canUseNetworkFeatures,
    resolveLawyerVerificationStatus,
} from '@/app/services/auth/lawyerAccountStatus';
import { resolveHqDirectoryKycStatus } from '@/app/domain/admin/hqUserPresence';
import {
    assertLegalTermsAcceptedOrThrow,
    clearLegalTermsAcceptance,
    hasAcceptedCurrentLegalTerms,
    LEGAL_TERMS_ACCEPTANCE_VERSION,
    markLegalTermsAccepted,
} from '@/app/services/auth/legalTermsAcceptance';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import { resetWifeRateLimitStoreForTests } from '../security/wifeRateLimitStore.ts';

const {
    kvGetMock,
    kvSetMock,
    requireWifeUserMock,
    canAccessLawyerForumUserIdMock,
    isForumModeratorUserIdMock,
    isAdminRequestMock,
    getSupabaseAdminClientMock,
    profilesUpdateEqMock,
    adminUpdateUserByIdMock,
    invalidateCsrfMock,
    invalidateWifeSessionsMock,
    revokeTokenSessionsMock,
    deriveCryptoMock,
} = vi.hoisted(() => ({
    kvGetMock: vi.fn(),
    kvSetMock: vi.fn(),
    requireWifeUserMock: vi.fn(),
    canAccessLawyerForumUserIdMock: vi.fn(),
    isForumModeratorUserIdMock: vi.fn(),
    isAdminRequestMock: vi.fn(),
    getSupabaseAdminClientMock: vi.fn(),
    profilesUpdateEqMock: vi.fn(),
    adminUpdateUserByIdMock: vi.fn(),
    invalidateCsrfMock: vi.fn(),
    invalidateWifeSessionsMock: vi.fn(),
    revokeTokenSessionsMock: vi.fn(),
    deriveCryptoMock: vi.fn(),
}));

vi.mock('../security/kvStoreAdmin.ts', () => ({
    kvGet: (...a: unknown[]) => kvGetMock(...a),
    kvSet: (...a: unknown[]) => kvSetMock(...a),
    kvGetByPrefix: vi.fn(async () => []),
    kvReadHqVerificationQueueByPrefix: vi.fn(async () => ({ rows: [], capped: false })),
}));

vi.mock('../security/bffAuth.ts', () => ({
    requireWifeUser: (...a: unknown[]) => requireWifeUserMock(...a),
    unwrapWifeUser: (r: unknown) => r,
}));

vi.mock('../security/roleResolver.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../security/roleResolver.ts')>();
    return {
        ...actual,
        canAccessLawyerForumUserId: (...a: unknown[]) => canAccessLawyerForumUserIdMock(...a),
        isForumModeratorUserId: (...a: unknown[]) => isForumModeratorUserIdMock(...a),
    };
});

vi.mock('../security/wifeValidator.ts', () => ({
    extractUserTokenFromRequest: () => 'tok',
    recordWifeRejection: vi.fn(),
}));

vi.mock('../security/adminCheck.ts', () => ({
    isAdminRequest: (...a: unknown[]) => isAdminRequestMock(...a),
    isAdminUserId: vi.fn(async () => false),
}));

vi.mock('../security/adminOtpStore.ts', () => ({
    isValidDeviceFingerprint: () => true,
    isAdminDeviceTrusted: vi.fn(async () => true),
}));

vi.mock('../security/supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: (...a: unknown[]) => getSupabaseAdminClientMock(...a),
    getGoTrueAdminApi: (client: { auth?: { admin?: { updateUserById?: unknown } } }) =>
        client?.auth?.admin ?? { updateUserById: adminUpdateUserByIdMock },
}));

vi.mock('../security/csrfServerStore.ts', () => ({
    invalidateCsrfForSubject: (...a: unknown[]) => invalidateCsrfMock(...a),
}));

vi.mock('../security/wifeSessionServerStore.ts', () => ({
    invalidateWifeSessionsForSubject: (...a: unknown[]) => invalidateWifeSessionsMock(...a),
}));

vi.mock('../security/stolenTokenServer.ts', () => ({
    revokeTokenSessionsForSubject: (...a: unknown[]) => revokeTokenSessionsMock(...a),
    extractDeviceIdFromRequest: () => '',
    registerTokenSessionServer: vi.fn(async () => true),
}));

vi.mock('../security/cryptoWrapServer.ts', () => ({
    deriveClientCryptoWrapCredential: (...a: unknown[]) => deriveCryptoMock(...a),
}));

vi.mock('../security/sanitizer.ts', () => ({
    sanitizePayload: (v: unknown) => v,
    isJsonObjectRecord: (v: unknown) => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
}));

import { POST as signupPost } from './signup/route.ts';
import { POST as loginPost } from './login/route.ts';
import { POST as forgotPost } from './forgot-password/route.ts';
import { POST as banPost } from '../admin/ban/route.ts';
import { POST as verificationPost } from './lawyer-verification/route.ts';
import { requireForumAuth } from '../forum/_auth.ts';
import { authAdminBypassLogin } from '@/app/context/authProviderRuntime';

const originalFetch = globalThis.fetch;

function jsonReq(url: string, body: unknown, headers: Record<string, string> = {}): Request {
    const payload =
        body &&
        typeof body === 'object' &&
        !Array.isArray(body) &&
        (url.includes('/api/auth/login') || url.includes('/api/auth/signup'))
            ? { termsVersion: LEGAL_TERMS_ACCEPTANCE_VERSION, ...(body as Record<string, unknown>) }
            : body;
    return new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-forwarded-proto': 'https', ...headers },
        body: JSON.stringify(payload),
    });
}

function stubAuthEnv(): void {
    process.env.NODE_ENV = 'test';
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    delete process.env.PASSWORD_RESET_ALLOWED_ORIGINS;
    delete process.env.PUBLIC_APP_URL;
    delete process.env.SITE_URL;
}

function stubGoTrueSignupSuccess(userId = 'attacker-new-1'): void {
    deriveCryptoMock.mockResolvedValue('wrap-cred');
    kvSetMock.mockResolvedValue(undefined);
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('/auth/v1/signup')) {
            const body = JSON.parse(String(init?.body ?? '{}')) as {
                email?: string; password?: string; data?: Record<string, unknown>;
            };
            (globalThis as { __lastSignupBody?: typeof body }).__lastSignupBody = body;
            return new Response(JSON.stringify({
                access_token: 'access-atk', refresh_token: 'refresh-atk', expires_in: 3600,
                user: { id: userId, email: body.email },
            }), { status: 200 });
        }
        return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;
}

function stubGoTrueRecover(): void {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('/auth/v1/recover')) {
            (globalThis as { __lastRecoverBody?: unknown }).__lastRecoverBody = JSON.parse(String(init?.body ?? '{}'));
            return new Response('{}', { status: 200 });
        }
        return new Response('{}', { status: 404 });
    }) as unknown as typeof fetch;
}

function stubRejectingLogin(): void {
    globalThis.fetch = vi.fn(async () =>
        new Response(JSON.stringify({ error_description: 'Invalid login credentials' }), { status: 400 }),
    ) as unknown as typeof fetch;
}

describe('WAVE A — Credential weapons against registration', () => {
    it.each([
        ['mailinator.com', 'a@mailinator.com'],
        ['tempmail.com', 'x@tempmail.com'],
        ['yopmail.com', 'z@yopmail.com'],
        ['unknown-corp.io', 'ceo@unknown-corp.io'],
        ['evil.com', 'admin@evil.com'],
    ])('rejects untrusted/disposable email domain %s', (_domain, email) => {
        expect(validateTrustedRegistrationEmail(email)).not.toBeNull();
    });

    it.each([
        'password', 'Password1', '12345678', 'aaaaaaaa', 'short', 'كلمةسر12ab',
        "pass'OR'1'='1", '<script>alert(1)</script>Aa1',
    ])('rejects weak/injection password %s', (password) => {
        expect(validateRegistrationPasswordSecure(password)).not.toBeNull();
    });

    it.each(['07700000000', '07712345678', '0512345678', '07711111111', '+9647700000000'])(
        'rejects fake/invalid Iraqi phone %s',
        (phone) => expect(validateIraqiLawyerPhoneSecure(phone)).not.toBeNull(),
    );

    it('rejects XSS/injection in full registration payload', () => {
        expect(validateLawyerRegistrationCredentials({
            email: 'legit@gmail.com', password: 'SecureLaw9', phone: '07701234567',
            fullName: 'علي <img src=x onerror=alert(1)> حسن', familyName: 'العلي',
            governorate: 'بغداد', lawyerBarRoom: 'غرفة بغداد',
        })).not.toBeNull();
    });

    it('BFF signup rejects disposable email before GoTrue', async () => {
        stubAuthEnv(); resetWifeRateLimitStoreForTests(); stubGoTrueSignupSuccess();
        const res = await signupPost(jsonReq('https://app.test/api/auth/signup', {
            email: 'skip@mailinator.com', password: 'SecureLaw9', data: { role: 'admin' },
        }));
        expect(res.status).toBe(400);
        expect((await res.json()).code).toBe('EMAIL_REJECTED');
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });

    it('BFF signup rejects weak password before GoTrue', async () => {
        stubAuthEnv(); resetWifeRateLimitStoreForTests(); stubGoTrueSignupSuccess();
        const res = await signupPost(jsonReq('https://app.test/api/auth/signup',
            { email: 'ok@gmail.com', password: '12345678' }, { 'x-forwarded-for': '203.0.113.50' }));
        expect(res.status).toBe(400);
        expect((await res.json()).code).toBe('PASSWORD_REJECTED');
    });
});

describe('WAVE B — Privilege escalation via signup metadata', () => {
    const ESC_USER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
    beforeEach(() => {
        stubAuthEnv(); resetWifeRateLimitStoreForTests(); stubGoTrueSignupSuccess(ESC_USER);
        (globalThis as { __lastSignupBody?: unknown }).__lastSignupBody = undefined;
    });
    afterEach(() => { globalThis.fetch = originalFetch; vi.clearAllMocks(); });

    it('strips admin role to lawyer and forces pending', async () => {
        const res = await signupPost(jsonReq('https://app.test/api/auth/signup', {
            email: 'esc@gmail.com', password: 'SecureLaw9',
            data: { role: 'admin', accountType: 'admin', verificationStatus: 'active', isSuperAdmin: true },
        }, { 'x-forwarded-for': '203.0.113.51' }));
        expect(res.status).toBe(200);
        const last = (globalThis as { __lastSignupBody?: { data?: Record<string, unknown> } }).__lastSignupBody;
        expect(last?.data?.role).toBe('lawyer');
        expect(last?.data?.accountType).toBe('lawyer');
        expect(last?.data?.verificationStatus).toBe('pending');
        expect((await res.json()).verificationStatus).toBe('pending');
    });

    it('seeds pending KV verification so forum cannot fail-open', async () => {
        await signupPost(jsonReq('https://app.test/api/auth/signup',
            { email: 'kv@gmail.com', password: 'SecureLaw9', data: {} },
            { 'x-forwarded-for': '203.0.113.52' }));
        expect(kvSetMock).toHaveBeenCalled();
        const [key, record] = kvSetMock.mock.calls[0] as [string, { status: string }];
        expect(key).toBe(`lawyer-verification:${ESC_USER}`);
        expect(record.status).toBe('pending');
    });
});

describe('WAVE C — KYC skip to forum', () => {
    beforeEach(() => {
        requireWifeUserMock.mockReset();
        canAccessLawyerForumUserIdMock.mockReset();
        isForumModeratorUserIdMock.mockReset();
        kvGetMock.mockReset();
    });

    it('denies forum with session but no KV', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'skip-kyc-1' });
        canAccessLawyerForumUserIdMock.mockResolvedValue(true);
        isForumModeratorUserIdMock.mockResolvedValue(false);
        kvGetMock.mockResolvedValue(null);
        const res = await requireForumAuth(new Request('https://app.test/api/forum/posts'));
        expect('response' in res && res.response.status).toBe(403);
    });

    it('denies forum when pending', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'pending-1' });
        canAccessLawyerForumUserIdMock.mockResolvedValue(true);
        kvGetMock.mockResolvedValue({ status: 'pending', userId: 'pending-1' });
        const res = await requireForumAuth(new Request('https://app.test/api/forum/posts'));
        expect('response' in res && res.response.status).toBe(403);
    });

    it('denies forum when status is garbage', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'garbage-1' });
        canAccessLawyerForumUserIdMock.mockResolvedValue(true);
        kvGetMock.mockResolvedValue({ status: 'superuser', userId: 'garbage-1' });
        const res = await requireForumAuth(new Request('https://app.test/api/forum/posts'));
        expect('response' in res && res.response.status).toBe(403);
    });

    it('denies forum when KV throws', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'kv-down-1' });
        canAccessLawyerForumUserIdMock.mockResolvedValue(true);
        kvGetMock.mockRejectedValue(new Error('kv down'));
        const res = await requireForumAuth(new Request('https://app.test/api/forum/posts'));
        expect('response' in res && res.response.status).toBe(503);
    });

    it('allows only active KV', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'active-1' });
        canAccessLawyerForumUserIdMock.mockResolvedValue(true);
        isForumModeratorUserIdMock.mockResolvedValue(false);
        kvGetMock.mockResolvedValue({ status: 'active', userId: 'active-1' });
        const res = await requireForumAuth(new Request('https://app.test/api/forum/posts'));
        expect(res).toMatchObject({ ok: true, userId: 'active-1' });
    });
});

describe('WAVE D — Forge verification', () => {
    beforeEach(() => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'forge-1' });
        kvGetMock.mockReset();
        kvSetMock.mockReset();
        kvGetMock.mockResolvedValue(null);
        kvSetMock.mockResolvedValue(undefined);
    });

    it('rejects missing ID front', async () => {
        const res = await verificationPost(jsonReq('https://app.test/api/auth/lawyer-verification', {
            hasIdFront: false, ocrNameMatch: true, email: 'f@gmail.com',
        }));
        expect(res.status).toBe(400);
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('rejects junk preview', async () => {
        const res = await verificationPost(jsonReq('https://app.test/api/auth/lawyer-verification', {
            hasIdFront: true, idFrontPreview: 'not-an-image-' + 'x'.repeat(80), ocrNameMatch: true,
        }));
        expect(res.status).toBe(400);
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('strips client OCR and keeps pending', async () => {
        const preview = 'data:image/png;base64,' + 'A'.repeat(80);
        const res = await verificationPost(jsonReq('https://app.test/api/auth/lawyer-verification', {
            hasIdFront: true, idFrontPreview: preview, idBackPreview: preview, ocrNameMatch: true, ocrSnippet: 'fake', status: 'active',
        }));
        expect(res.status).toBe(200);
        const [, record] = kvSetMock.mock.calls[0] as [
            string,
            { status: string; ocrNameMatch?: unknown; ocrSnippet?: unknown },
        ];
        expect(record.status).toBe('pending');
        expect(record.ocrNameMatch).toBeNull();
        expect(record.ocrSnippet).toBeUndefined();
    });

    it('refuses to demote an already-active KV row', async () => {
        const preview = 'data:image/png;base64,' + 'A'.repeat(80);
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'forge-active-1' });
        kvGetMock.mockResolvedValue({
            userId: 'forge-active-1',
            status: 'active',
            idFrontPreview: preview,
            idBackPreview: preview,
        });
        const res = await verificationPost(jsonReq('https://app.test/api/auth/lawyer-verification', {
            idFrontPreview: preview, idBackPreview: preview, status: 'pending',
        }));
        expect(res.status).toBe(409);
        await expect(res.json()).resolves.toMatchObject({ code: 'VERIFICATION_ALREADY_ACTIVE' });
        expect(kvSetMock).not.toHaveBeenCalled();
    });
});

describe('WAVE E — Password-reset redirect assault', () => {
    beforeEach(() => { stubAuthEnv(); resetWifeRateLimitStoreForTests(); stubGoTrueRecover(); });
    afterEach(() => { globalThis.fetch = originalFetch; });

    it.each([
        'https://evil.example/steal', 'https://hami.legal.evil.com/phish',
        'http://169.254.169.254/latest/meta-data', 'javascript:alert(1)', 'data:text/html,hi',
    ])('allowlist blocks %s', (redirectTo) => {
        expect(resolvePasswordResetRedirectTo(redirectTo, new Request('https://app.hami.legal'))).toBe('');
    });

    it('forgot-password never forwards evil redirect_to', async () => {
        const res = await forgotPost(jsonReq('https://app.test/api/auth/forgot-password',
            { email: 'victim@gmail.com', redirectTo: 'https://evil.example/x' },
            { 'x-forwarded-for': '203.0.113.60', origin: 'https://app.hami.legal' }));
        expect(res.status).toBe(200);
        const recover = (globalThis as { __lastRecoverBody?: { redirect_to?: string; email?: string } }).__lastRecoverBody;
        expect(recover?.email).toBe('victim@gmail.com');
        expect(recover?.redirect_to).toBeUndefined();
        expect(JSON.stringify(recover ?? {})).not.toContain('evil');
    });
});

describe('WAVE F — Admin ban abuse', () => {
    const ADMIN_OP = '11111111-2222-4333-8444-555555555555';
    const VICTIM_A = 'aaaaaaaa-bbbb-4ccc-8ddd-111111111111';
    const VICTIM_B = 'aaaaaaaa-bbbb-4ccc-8ddd-222222222222';
    const VICTIM_C = 'aaaaaaaa-bbbb-4ccc-8ddd-333333333333';

    beforeEach(() => {
        stubAuthEnv();
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: ADMIN_OP });
        isAdminRequestMock.mockResolvedValue(true);
        invalidateCsrfMock.mockResolvedValue(undefined);
        invalidateWifeSessionsMock.mockResolvedValue(undefined);
        revokeTokenSessionsMock.mockResolvedValue(undefined);
        adminUpdateUserByIdMock.mockResolvedValue({ data: {}, error: null });
        profilesUpdateEqMock.mockResolvedValue({ error: null });
        getSupabaseAdminClientMock.mockReturnValue({
            from: () => ({
                update: (updates: unknown) => {
                    (globalThis as { __banUpdates?: unknown }).__banUpdates = updates;
                    return { eq: profilesUpdateEqMock };
                },
                select: () => ({
                    eq: (_column: string, id: string) => ({
                        maybeSingle: async () => ({
                            data: {
                                id,
                                role: 'lawyer',
                                status: 'active',
                                created_at: '2020-01-01T00:00:00.000Z',
                                is_banned: false,
                                is_active: true,
                                is_deleted: false,
                            },
                            error: null,
                        }),
                    }),
                }),
            }),
            auth: { admin: { updateUserById: adminUpdateUserByIdMock, getUserById: async () => ({ data: { user: { id: 'x' } }, error: null }) } },
        });
    });
    afterEach(() => {
        globalThis.fetch = originalFetch;
        delete process.env.SUPABASE_URL;
        delete process.env.SUPABASE_ANON_KEY;
    });

    it('strips role elevation from updates', async () => {
        const res = await banPost(jsonReq('https://app.test/api/admin/ban', {
            requesterId: ADMIN_OP, targetUserId: VICTIM_A,
            updates: { role: 'admin', is_banned: true, isSuperAdmin: true },
        }, { 'x-wife-device-id': 'admin-device-aaaa' }));
        expect(res.status).toBe(200);
        const updates = (globalThis as { __banUpdates?: Record<string, unknown> }).__banUpdates;
        expect(updates?.role).toBeUndefined();
        expect(updates?.is_banned).toBe(true);
    });

    it('يجمّد الشبكة دون طرد الجلسات أو حظر GoTrue', async () => {
        await banPost(jsonReq('https://app.test/api/admin/ban', {
            requesterId: ADMIN_OP, targetUserId: VICTIM_B, updates: { is_banned: true },
        }, { 'x-wife-device-id': 'admin-device-aaaa' }));
        expect(revokeTokenSessionsMock).not.toHaveBeenCalled();
        expect(adminUpdateUserByIdMock).toHaveBeenCalledWith(VICTIM_B, expect.objectContaining({ ban_duration: 'none' }));
    });

    it('rejects self-ban', async () => {
        const res = await banPost(jsonReq('https://app.test/api/admin/ban', {
            requesterId: ADMIN_OP, targetUserId: ADMIN_OP, updates: { is_banned: true },
        }, { 'x-wife-device-id': 'admin-device-aaaa' }));
        expect(res.status).toBe(400);
    });

    it('rejects non-admin', async () => {
        isAdminRequestMock.mockResolvedValue(false);
        const res = await banPost(jsonReq('https://app.test/api/admin/ban', {
            requesterId: ADMIN_OP, targetUserId: VICTIM_C,
        }, { 'x-wife-device-id': 'admin-device-aaaa' }));
        expect(res.status).toBe(403);
    });
});

describe('WAVE G — Client onboarding gate cheats', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
        clearLegalTermsAcceptance();
        window.localStorage.clear();
    });
    afterEach(() => { vi.unstubAllEnvs(); clearLegalTermsAcceptance(); });

    it('blocks without legal terms', () => {
        expect(hasAcceptedCurrentLegalTerms()).toBe(false);
        expect(() => assertLegalTermsAcceptedOrThrow()).toThrow(/الشروط/);
    });

    it('rejects forged terms version', () => {
        window.localStorage.setItem('hami:legal:terms-accepted:v1',
            JSON.stringify({ version: 'v0-forged', acceptedAt: new Date().toISOString() }));
        expect(hasAcceptedCurrentLegalTerms()).toBe(false);
    });

    it('accepts current version only', () => {
        markLegalTermsAccepted();
        expect(hasAcceptedCurrentLegalTerms()).toBe(true);
        expect(LEGAL_TERMS_ACCEPTANCE_VERSION).toBeTruthy();
    });

    it('fail-closes network without verification', () => {
        expect(resolveLawyerVerificationStatus('fresh-attacker')).toBe('pending');
        expect(canUseNetworkFeatures('fresh-attacker')).toBe(false);
    });

    it('guest never gets network features', () => {
        expect(canUseNetworkFeatures(GUEST_LAWYER_ID)).toBe(false);
        expect(canUseNetworkFeatures(null)).toBe(false);
    });

    it('admin bypass gated by DEV build', async () => {
        const setUser = vi.fn();
        const setSession = vi.fn();
        const setIsLoading = vi.fn();
        if (import.meta.env.DEV) {
            await authAdminBypassLogin({ setUser, setSession, setIsLoading });
            expect(setUser).toHaveBeenCalled();
            const userArg = setUser.mock.calls[0]?.[0] as { id?: string; email?: string } | undefined;
            expect(userArg?.id).toBe(HAMI_PLATFORM_ADMIN_UUID);
            expect(userArg?.email).toBe('hami.apps@proton.me');
        } else {
            await expect(
                authAdminBypassLogin({ setUser, setSession, setIsLoading }),
            ).rejects.toThrow(/bypass/i);
        }
    });
});

describe('WAVE H — Credential stuffing / signup flood', () => {
    beforeEach(() => { stubAuthEnv(); resetWifeRateLimitStoreForTests(); stubRejectingLogin(); });
    afterEach(() => { globalThis.fetch = originalFetch; resetWifeRateLimitStoreForTests(); });

    it('halts password spray on one mailbox', async () => {
        const statuses: number[] = [];
        for (let i = 0; i < 12; i++) {
            statuses.push((await loginPost(jsonReq('https://app.test/api/auth/login',
                { email: 'spray@example.com', password: `Attempt${i}x` },
                { 'x-forwarded-for': `198.51.100.${i}` }))).status);
        }
        expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
        expect(statuses.slice(10).every((s) => s === 429)).toBe(true);
    });

    it('halts signup flood from one IP', async () => {
        stubGoTrueSignupSuccess();
        const statuses: number[] = [];
        for (let i = 0; i < 14; i++) {
            statuses.push((await signupPost(jsonReq('https://app.test/api/auth/signup',
                { email: `flood${i}@gmail.com`, password: 'SecureLaw9' },
                { 'x-forwarded-for': '203.0.113.99' }))).status);
        }
        expect(statuses.filter((s) => s === 429).length).toBeGreaterThanOrEqual(1);
        expect(statuses.slice(0, 12).every((s) => s === 200)).toBe(true);
    });

    it('rejects login without the current terms version', async () => {
        const res = await loginPost(
            jsonReq('https://app.test/api/auth/login', {
                email: 'spray@example.com',
                password: 'Attempt0x',
                termsVersion: '',
            }),
        );
        expect(res.status).toBe(400);
        await expect(res.json()).resolves.toMatchObject({ code: 'TERMS_REQUIRED' });
        expect(globalThis.fetch).not.toHaveBeenCalled();
    });
});

describe('WAVE I — Redirect allowlist matrix', () => {
    it('allows only first-party hosts and app schemes', () => {
        const req = new Request('https://app.hami.legal/api/auth/forgot-password', {
            headers: { origin: 'https://app.hami.legal' },
        });
        expect(resolvePasswordResetRedirectTo('https://app.hami.legal/reset', req)).toContain('hami.legal');
        expect(resolvePasswordResetRedirectTo('iq.hami.legal://auth/reset', req)).toContain('iq.hami.legal://');
        expect(resolvePasswordResetRedirectTo('https://attacker.hami.legal.tk', req)).toBe('');
    });
});

describe('WAVE J — Hidden onboarding gaps', () => {
    const APPROVED = '49d464e5-bd75-4105-bdb9-fd18fc647854';

    beforeEach(() => {
        kvGetMock.mockReset();
        kvSetMock.mockReset();
        kvGetMock.mockResolvedValue(null);
        kvSetMock.mockResolvedValue(undefined);
        requireWifeUserMock.mockReset();
        canAccessLawyerForumUserIdMock.mockReset();
        isForumModeratorUserIdMock.mockReset();
    });

    it('ensurePending لا يزرع معلّقاً فوق app_metadata=active', async () => {
        const { ensurePendingLawyerVerificationKv } = await import(
            './lawyer-verification/ensurePendingLawyerVerificationKv.ts'
        );
        expect(
            await ensurePendingLawyerVerificationKv({
                userId: APPROVED,
                email: 'ok@gmail.com',
                appVerificationStatus: 'active',
            }),
        ).toBe(false);
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('ensurePending يزرع معلّقاً لحساب بلا صف وبلا اعتماد مقر', async () => {
        const { ensurePendingLawyerVerificationKv } = await import(
            './lawyer-verification/ensurePendingLawyerVerificationKv.ts'
        );
        expect(
            await ensurePendingLawyerVerificationKv({
                userId: APPROVED,
                email: 'gap@gmail.com',
            }),
        ).toBe(true);
        expect(kvSetMock).toHaveBeenCalledWith(
            `lawyer-verification:${APPROVED}`,
            expect.objectContaining({ status: 'pending', hasIdFront: false, hasIdBack: false }),
        );
    });

    it('دليل المقر: غياب صف KV لا يخفي اعتماد app_metadata', () => {
        expect(resolveHqDirectoryKycStatus(undefined, true, 'active')).toBe('active');
        expect(resolveHqDirectoryKycStatus(undefined, true, 'pending')).toBe('pending');
        expect(resolveHqDirectoryKycStatus(undefined, true, 'none')).toBe('none');
        expect(resolveHqDirectoryKycStatus('pending', true, 'active')).toBe('pending');
    });

    it('المنتدى يبقى fail-closed بلا KV حتى لو الواجهة رأت app_metadata=active', async () => {
        expect(
            canUseForumNetworkFeatures(APPROVED, {}, { verification_status: 'active' }),
        ).toBe(true);
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: APPROVED });
        canAccessLawyerForumUserIdMock.mockResolvedValue(true);
        isForumModeratorUserIdMock.mockResolvedValue(false);
        kvGetMock.mockResolvedValue(null);
        const res = await requireForumAuth(new Request('https://app.test/api/forum/posts'));
        expect('response' in res && res.response.status).toBe(403);
        if ('response' in res) {
            await expect(res.response.json()).resolves.toMatchObject({
                code: 'FORUM_VERIFICATION_REQUIRED',
            });
        }
    });
});

describe('WAVE K — Resubmit / demotion / stale rejection', () => {
    const APPROVED = '49d464e5-bd75-4105-bdb9-fd18fc647854';
    const preview = 'data:image/png;base64,' + 'A'.repeat(80);

    beforeEach(() => {
        kvGetMock.mockReset();
        kvSetMock.mockReset();
        kvGetMock.mockResolvedValue(null);
        kvSetMock.mockResolvedValue(undefined);
        requireWifeUserMock.mockReset();
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: APPROVED });
    });

    it('POST لا يخفض KV active', async () => {
        kvGetMock.mockResolvedValue({
            userId: APPROVED,
            status: 'active',
            idFrontPreview: preview,
            idBackPreview: preview,
        });
        const res = await verificationPost(
            jsonReq('https://app.test/api/auth/lawyer-verification', {
                idFrontPreview: preview,
                idBackPreview: preview,
            }),
        );
        expect(res.status).toBe(409);
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('السجل المحلي pending يتقدّم على app_metadata rejected البالي', async () => {
        const { writeLawyerVerificationPending, resetLawyerVerificationStoreForTests } = await import(
            '@/app/services/auth/lawyerVerificationStore'
        );
        resetLawyerVerificationStoreForTests();
        writeLawyerVerificationPending(APPROVED, {
            email: 'a@b.com',
            fullName: 'علي محمد حسن',
            familyName: 'العلي',
            phone: '07719876543',
            governorate: 'بغداد',
            lawyerBarRoom: 'غرفة محاميي بغداد',
            idFrontDataUrl: null,
            idBackDataUrl: null,
            faceSelfieDataUrl: null,
            faceAssistOptedIn: false,
        });
        expect(
            resolveLawyerVerificationStatus(APPROVED, {}, { verification_status: 'rejected' }),
        ).toBe('pending');
        expect(
            canUseNetworkFeatures(APPROVED, {}, { verification_status: 'rejected' }),
        ).toBe(false);
    });
});
