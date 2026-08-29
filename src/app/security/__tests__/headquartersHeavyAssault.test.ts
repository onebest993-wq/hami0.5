/**
 * محاكي هجوم ثقيل على مقر القيادة — دفاعي فقط.
 * كل موجة ترسل طلبات مرفوضة أصلاً وتتوقع 401/403/429 دون لمس قاعدة البيانات.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HAMI_PLATFORM_ADMIN_UUID } from '@/app/constants/hamiPlatformAdminId';
import { wifeJsonResponse } from '@/app/api/security/wifeSecurityHeaders.ts';
import {
    headquartersDoorPhraseMatches,
    resetHeadquartersDoorLockForTests,
} from '@/app/domain/admin/headquartersHiddenDoor';

const {
    requireWifeUserMock,
    isAdminRequestMock,
    isAdminUserIdMock,
    isAdminDeviceTrustedMock,
    isValidDeviceFingerprintMock,
    assertSameOriginMock,
    verifyCsrfTokenMock,
    extractUserTokenMock,
    isTokenAuthorizedMock,
    getVerifiedTokenSubjectMock,
    getClientMock,
    consumeRateMock,
    kvSetMock,
    kvGetMock,
    sendAdminMailMock,
    createOtpMock,
    consumeOtpMock,
    trustDeviceMock,
    burnOpenOtpMock,
    isAdminDeviceStepUpFreshMock,
} = vi.hoisted(() => ({
    requireWifeUserMock: vi.fn(),
    isAdminRequestMock: vi.fn(),
    isAdminUserIdMock: vi.fn(),
    isAdminDeviceTrustedMock: vi.fn(),
    isValidDeviceFingerprintMock: vi.fn(),
    assertSameOriginMock: vi.fn(),
    verifyCsrfTokenMock: vi.fn(),
    extractUserTokenMock: vi.fn(),
    isTokenAuthorizedMock: vi.fn(),
    getVerifiedTokenSubjectMock: vi.fn(),
    getClientMock: vi.fn(),
    consumeRateMock: vi.fn(),
    kvSetMock: vi.fn(),
    kvGetMock: vi.fn(),
    sendAdminMailMock: vi.fn(),
    createOtpMock: vi.fn(),
    consumeOtpMock: vi.fn(),
    trustDeviceMock: vi.fn(),
    burnOpenOtpMock: vi.fn(),
    isAdminDeviceStepUpFreshMock: vi.fn(),
}));

vi.mock('@/app/api/security/bffAuth.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/security/bffAuth.ts')>();
    return {
        ...actual,
        requireWifeUser: (...a: unknown[]) => requireWifeUserMock(...a),
    };
});

vi.mock('@/app/api/security/adminCheck.ts', () => ({
    isAdminRequest: (...a: unknown[]) => isAdminRequestMock(...a),
    isAdminUserId: (...a: unknown[]) => isAdminUserIdMock(...a),
}));

vi.mock('@/app/api/security/adminOtpStore.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/security/adminOtpStore.ts')>();
    return {
        ...actual,
        isAdminDeviceTrusted: (...a: unknown[]) => isAdminDeviceTrustedMock(...a),
        isValidDeviceFingerprint: (...a: unknown[]) => isValidDeviceFingerprintMock(...a),
        isAdminDeviceStepUpFresh: (...a: unknown[]) => isAdminDeviceStepUpFreshMock(...a),
        createAdminOtpChallenge: (...a: unknown[]) => createOtpMock(...a),
        consumeAdminOtpChallenge: (...a: unknown[]) => consumeOtpMock(...a),
        trustAdminDevice: (...a: unknown[]) => trustDeviceMock(...a),
        burnOpenAdminOtpChallenges: (...a: unknown[]) => burnOpenOtpMock(...a),
    };
});

vi.mock('@/app/api/security/wifeSameOrigin.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/security/wifeSameOrigin.ts')>();
    return {
        ...actual,
        assertSameOriginRequest: (...a: unknown[]) => assertSameOriginMock(...a),
    };
});

vi.mock('@/app/api/security/wifeCsrfVerify.ts', () => ({
    verifyCsrfToken: (...a: unknown[]) => verifyCsrfTokenMock(...a),
}));

vi.mock('@/app/api/security/wifeValidator.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/security/wifeValidator.ts')>();
    return {
        ...actual,
        extractUserTokenFromRequest: (...a: unknown[]) => extractUserTokenMock(...a),
        isTokenAuthorized: (...a: unknown[]) => isTokenAuthorizedMock(...a),
        getVerifiedTokenSubject: (...a: unknown[]) => getVerifiedTokenSubjectMock(...a),
        wifeUnauthorizedResponse: () =>
            new Response(JSON.stringify({ ok: false, error: 'Unauthorized user' }), { status: 401 }),
    };
});

vi.mock('@/app/api/security/supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: (...a: unknown[]) => getClientMock(...a),
    getGoTrueAdminApi: (client: { auth?: { admin?: unknown } }) =>
        (client?.auth as { admin?: unknown } | undefined)?.admin ?? {
            updateUserById: async () => ({}),
            getUserById: async () => ({ data: {}, error: null }),
            listUsers: async () => ({ data: { users: [] }, error: null }),
        },
}));

vi.mock('@/app/api/security/wifeRateLimitStore.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/api/security/wifeRateLimitStore.ts')>();
    return {
        ...actual,
        consumeRateLimitSlot: (...a: unknown[]) => consumeRateMock(...a),
    };
});

vi.mock('@/app/api/security/kvStoreAdmin.ts', () => ({
    kvGet: (...a: unknown[]) => kvGetMock(...a),
    kvSet: (...a: unknown[]) => kvSetMock(...a),
    kvGetByPrefix: vi.fn(async () => []),
    kvReadHqVerificationQueueByPrefix: vi.fn(async () => ({ rows: [], capped: false })),
    kvDel: vi.fn(),
}));

vi.mock('@/app/api/security/adminMailer.ts', () => ({
    resolveAdminMasterEmail: () => 'hami.apps@proton.me',
    maskAdminMailbox: (email: string) => email.replace(/(.{2}).+(@.+)/, '$1***$2'),
    isAdminMailerConfigured: () => false,
    hqMailerChannel: () => 'none',
    hqMailerBlockReason: () => 'تعذّر إرسال رمز المقر إلى البريد الرسمي',
    sendAdminMail: (...a: unknown[]) => sendAdminMailMock(...a),
    HQ_OTP_MAIL_UNCONFIGURED_AR: 'تعذّر إرسال رمز المقر إلى البريد الرسمي',
}));

vi.mock('@/app/api/security/headquartersAccountNotify.ts', () => ({
    notifyHeadquartersAccountStatus: vi.fn(async () => undefined),
    notifyHeadquartersForumStatus: vi.fn(async () => undefined),
    notifyHeadquartersSystemMessage: vi.fn(async () => true),
    notifyHeadquartersVerificationStatus: vi.fn(async () => undefined),
    notifyHeadquartersCredentialStatus: vi.fn(async () => undefined),
    notifyHeadquartersRoleStatus: vi.fn(async () => undefined),
    notifyHeadquartersModeration: vi.fn(async () => undefined),
}));

vi.mock('@/app/services/notifications/notificationServerBlob', () => ({
    appendIncomingNotificationServer: vi.fn(async () => {
        throw new Error('HQ assault: client system append must not persist');
    }),
}));

vi.mock('@/app/api/security/sanitizer.ts', () => ({
    sanitizePayload: (v: unknown) => v,
    isJsonObjectRecord: (v: unknown) => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
}));

import { GET as usersGet } from '@/app/api/admin/users/route.ts';
import { GET as statsGet } from '@/app/api/admin/stats/route.ts';
import { GET as statusGet } from '@/app/api/admin/status/route.ts';
import { GET as consultationsGet, POST as consultationsPost } from '@/app/api/admin/consultations/route.ts';
import { GET as auditGet } from '@/app/api/admin/audit/route.ts';
import { GET as devicesGet, POST as devicesPost } from '@/app/api/admin/devices/route.ts';
import { POST as banPost } from '@/app/api/admin/ban/route.ts';
import { POST as rolePost } from '@/app/api/admin/role/route.ts';
import { GET as accountGet, POST as accountPost } from '@/app/api/admin/account/route.ts';
import { POST as notifyPost } from '@/app/api/admin/notify/route.ts';
import { POST as notificationsAppendPost } from '@/app/api/notifications/append/route.ts';
import { POST as otpDevUnlockPost } from '@/app/api/admin/otp/dev-unlock/route.ts';
import { GET as forumStatsGet } from '@/app/api/forum/stats/route.ts';
import { GET as forumReportsGet, POST as forumReportsPost } from '@/app/api/forum/reports/route.ts';
import { GET as forumBanGet, POST as forumBanPost } from '@/app/api/forum/ban/route.ts';
import { POST as lawsAddPost } from '@/app/api/laws/add/route.ts';
import { POST as lawsClearPost } from '@/app/api/laws/clear/route.ts';
import { POST as lawsImportPost } from '@/app/api/laws/import-bundle/route.ts';
import { GET as verificationGet, PATCH as verificationPatch, POST as verificationPost } from '@/app/api/auth/lawyer-verification/route.ts';
import { POST as otpRequestPost } from '@/app/api/admin/otp/request/route.ts';
import { POST as otpVerifyPost } from '@/app/api/admin/otp/verify/route.ts';
import { GET as otpStatusGet } from '@/app/api/admin/otp/status/route.ts';
import { GET as adminVerifyGet } from '@/app/api/admin/verify/route.ts';
import { POST as auditLogPost } from '@/app/api/audit/log/route.ts';
import { GET as sessionGet } from '@/app/api/auth/session/route.ts';
import { EXECUTION_LAW_CANONICAL_NAME } from '@/app/constants/iraqiLawCatalog';
import {
    HEADQUARTERS_DOOR_FAIL_MAX,
    HEADQUARTERS_DOOR_FAIL_WINDOW_MS,
} from '@/app/domain/admin/headquartersHiddenDoor';

const LAWYER = 'cccccccc-dddd-4eee-8fff-000000000001';
const VICTIM = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const DEVICE = 'assault-device-01';

function jsonReq(url: string, body?: unknown, method: 'GET' | 'POST' | 'PATCH' = 'POST'): Request {
    return new Request(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Origin: 'https://app.test',
            'x-wife-device-id': DEVICE,
        },
        body: method === 'GET' || body === undefined ? undefined : JSON.stringify(body),
    });
}

function unauthGate(): { ok: false; response: Response } {
    return { ok: false, response: wifeJsonResponse(401, { ok: false, error: 'Unauthorized user' }) };
}

function forbiddenStatuses(status: number): boolean {
    return status === 401 || status === 403 || status === 429;
}

const HQ_READS: Array<() => Promise<Response>> = [
    () => usersGet(jsonReq('https://app.test/api/admin/users', undefined, 'GET')),
    () => statsGet(jsonReq('https://app.test/api/admin/stats', undefined, 'GET')),
    () => statusGet(jsonReq('https://app.test/api/admin/status', undefined, 'GET')),
    () => consultationsGet(jsonReq('https://app.test/api/admin/consultations', undefined, 'GET')),
    () => auditGet(jsonReq('https://app.test/api/admin/audit', undefined, 'GET')),
    () => devicesGet(jsonReq('https://app.test/api/admin/devices', undefined, 'GET')),
    () => forumStatsGet(jsonReq('https://app.test/api/forum/stats', undefined, 'GET')),
    () => forumReportsGet(jsonReq('https://app.test/api/forum/reports', undefined, 'GET')),
    () => forumBanGet(jsonReq('https://app.test/api/forum/ban', undefined, 'GET')),
    () =>
        verificationGet(
            jsonReq('https://app.test/api/auth/lawyer-verification?scope=pending', undefined, 'GET'),
        ),
    () =>
        verificationGet(
            jsonReq('https://app.test/api/auth/lawyer-verification?scope=all', undefined, 'GET'),
        ),
    () =>
        verificationGet(
            jsonReq(
                `https://app.test/api/auth/lawyer-verification?scope=dossier&userId=${VICTIM}`,
                undefined,
                'GET',
            ),
        ),
    () =>
        accountGet(
            jsonReq(`https://app.test/api/admin/account?targetUserId=${VICTIM}`, undefined, 'GET'),
        ),
];

const HQ_MUTATIONS: Array<() => Promise<Response>> = [
    () =>
        banPost(
            jsonReq('https://app.test/api/admin/ban', {
                targetUserId: VICTIM,
                updates: { is_banned: true },
            }),
        ),
    () =>
        rolePost(
            jsonReq('https://app.test/api/admin/role', {
                targetUserId: VICTIM,
                role: 'moderator',
            }),
        ),
    () =>
        accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'set_password',
                targetUserId: VICTIM,
                password: 'HamiLaw9x',
            }),
        ),
    () =>
        accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'freeze',
                targetUserId: VICTIM,
                durationHours: 24,
            }),
        ),
    () =>
        notifyPost(
            jsonReq('https://app.test/api/admin/notify', {
                scope: 'users',
                userIds: [VICTIM],
                title: 'تنبيه',
                message: 'نص النظام',
            }),
        ),
    () => consultationsPost(jsonReq('https://app.test/api/admin/consultations', { postId: 'p1' })),
    () =>
        consultationsPost(
            jsonReq('https://app.test/api/admin/consultations', { postId: 'p1', action: 'pin' }),
        ),
    () =>
        devicesPost(
            jsonReq('https://app.test/api/admin/devices', {
                action: 'revoke',
                deviceId: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
            }),
        ),
    () =>
        devicesPost(
            jsonReq('https://app.test/api/admin/devices', {
                action: 'revoke_current',
            }),
        ),
    () =>
        forumBanPost(
            jsonReq('https://app.test/api/forum/ban', {
                action: 'ban',
                userId: VICTIM,
                userName: 'Victim',
                reason: 'flood',
            }),
        ),
    () =>
        forumReportsPost(
            jsonReq('https://app.test/api/forum/reports', { action: 'dismiss', reportId: 'r1' }),
        ),
    () =>
        forumReportsPost(
            jsonReq('https://app.test/api/forum/reports', {
                action: 'dismiss_comment',
                reportId: 'cr1',
            }),
        ),
    () =>
        lawsAddPost(
            jsonReq('https://app.test/api/laws/add', {
                law_name: EXECUTION_LAW_CANONICAL_NAME,
                article_number: '1',
                content: 'x',
            }),
        ),
    () =>
        lawsClearPost(
            jsonReq('https://app.test/api/laws/clear', {
                law_name: EXECUTION_LAW_CANONICAL_NAME,
            }),
        ),
    () =>
        lawsImportPost(
            jsonReq('https://app.test/api/laws/import-bundle', {
                law_name: EXECUTION_LAW_CANONICAL_NAME,
                articles: [{ article_number: '1', content: 'x' }],
            }),
        ),
    () =>
        forumBanPost(
            jsonReq('https://app.test/api/forum/ban', {
                action: 'unban',
                userId: VICTIM,
            }),
        ),
    () =>
        forumReportsPost(
            jsonReq('https://app.test/api/forum/reports', {
                action: 'delete_post',
                postId: 'p1',
                reportId: 'r1',
            }),
        ),
    () =>
        verificationPatch(
            jsonReq(
                'https://app.test/api/auth/lawyer-verification',
                { userId: VICTIM, status: 'active' },
                'PATCH',
            ),
        ),
    () =>
        accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'lock_login',
                targetUserId: VICTIM,
            }),
        ),
    () =>
        accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'unfreeze',
                targetUserId: VICTIM,
            }),
        ),
    () =>
        accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'unlock_login',
                targetUserId: VICTIM,
            }),
        ),
    () =>
        notificationsAppendPost(
            jsonReq('https://app.test/api/notifications/append', {
                title: 'تنبيه المقر',
                message: 'تم تجميد حسابك',
                type: 'system_alert',
                category: 'system',
            }),
        ),
    () =>
        otpDevUnlockPost(
            jsonReq('https://app.test/api/admin/otp/dev-unlock', {
                deviceFingerprint: DEVICE,
            }),
        ),
    () =>
        accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'soft_delete',
                targetUserId: VICTIM,
            }),
        ),
    () =>
        accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'restore',
                targetUserId: VICTIM,
            }),
        ),
    () =>
        accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'revoke_sessions',
                targetUserId: VICTIM,
            }),
        ),
    () =>
        accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'forum_ban',
                targetUserId: VICTIM,
                reason: 'إساءة',
            }),
        ),
    () =>
        forumReportsPost(
            jsonReq('https://app.test/api/forum/reports', {
                action: 'delete_comment',
                commentId: 'c1',
                reportId: 'cr1',
            }),
        ),
];

describe('مقر القيادة — محاكي هجوم ثقيل', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: LAWYER });
        isAdminRequestMock.mockResolvedValue(false);
        isAdminUserIdMock.mockResolvedValue(false);
        isValidDeviceFingerprintMock.mockReturnValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(false);
        isAdminDeviceStepUpFreshMock.mockResolvedValue(true);
        consumeRateMock.mockResolvedValue(true);
        getClientMock.mockImplementation(() => {
            throw new Error('HQ assault: service client must not run after a rejected gate');
        });
        kvSetMock.mockRejectedValue(new Error('HQ assault: KV write must not run'));
        kvGetMock.mockResolvedValue(null);
        sendAdminMailMock.mockResolvedValue({ ok: true, mode: 'dev-log' });
        createOtpMock.mockResolvedValue({ code: '234569', expiresAt: new Date().toISOString() });
        consumeOtpMock.mockResolvedValue({ ok: true });
        trustDeviceMock.mockResolvedValue({ ok: true, expiresAt: new Date().toISOString() });
        burnOpenOtpMock.mockResolvedValue(undefined);
        assertSameOriginMock.mockReturnValue(true);
        verifyCsrfTokenMock.mockResolvedValue(false);
        extractUserTokenMock.mockReturnValue('tok');
        isTokenAuthorizedMock.mockResolvedValue(true);
        getVerifiedTokenSubjectMock.mockResolvedValue(LAWYER);
        resetHeadquartersDoorLockForTests();
    });

    afterEach(() => {
        resetHeadquartersDoorLockForTests();
    });

    it('الموجة 1 — بلا جلسة WIFE: كل قراءات وكتابات المقر تُرفض ولا تلمس التخزين', async () => {
        requireWifeUserMock.mockResolvedValue(unauthGate());
        const results = await Promise.all([...HQ_READS, ...HQ_MUTATIONS].map((run) => run()));
        expect(results).toHaveLength(HQ_READS.length + HQ_MUTATIONS.length);
        for (const res of results) {
            expect(forbiddenStatuses(res.status)).toBe(true);
        }
        expect(getClientMock).not.toHaveBeenCalled();
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('الموجة 2 — محامٍ موقّع WIFE: كل سطح المقر يُرفض 403', async () => {
        const results = await Promise.all([...HQ_READS, ...HQ_MUTATIONS].map((run) => run()));
        expect(results).toHaveLength(HQ_READS.length + HQ_MUTATIONS.length);
        expect(results.every((res) => res.status === 403)).toBe(true);
        expect(getClientMock).not.toHaveBeenCalled();
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('الموجة 3 — مدير بلا جهاز OTP: القراءات تُرفض Trusted device', async () => {
        isAdminRequestMock.mockResolvedValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(false);
        const res = await usersGet(jsonReq('https://app.test/api/admin/users', undefined, 'GET'));
        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toMatchObject({ error: 'Trusted device required' });
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('الموجة 4 — 80 طلباً متوازياً لحظر جماعي من محامٍ: صفر كتابة', async () => {
        const shots = await Promise.all(
            Array.from({ length: 80 }, () =>
                banPost(
                    jsonReq('https://app.test/api/admin/ban', {
                        targetUserId: VICTIM,
                        updates: { is_banned: true, role: 'admin', is_deleted: true },
                    }),
                ),
            ),
        );
        expect(shots).toHaveLength(80);
        expect(shots.every((res) => res.status === 403)).toBe(true);
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('الموجة 5 — حظر/دور/توثيق مدير المنصّة حتى مع بوابة موثّقة', async () => {
        isAdminRequestMock.mockResolvedValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(true);
        getClientMock.mockReturnValue({
            from: () => ({
                update: () => ({
                    eq: vi.fn().mockResolvedValue({ error: null }),
                }),
            }),
        });
        kvGetMock.mockResolvedValue({
            userId: HAMI_PLATFORM_ADMIN_UUID,
            status: 'pending',
        });

        const ban = await banPost(
            jsonReq('https://app.test/api/admin/ban', { targetUserId: HAMI_PLATFORM_ADMIN_UUID }),
        );
        const role = await rolePost(
            jsonReq('https://app.test/api/admin/role', {
                targetUserId: HAMI_PLATFORM_ADMIN_UUID,
                role: 'lawyer',
            }),
        );
        const roleAdmin = await rolePost(
            jsonReq('https://app.test/api/admin/role', {
                targetUserId: VICTIM,
                role: 'admin',
            }),
        );
        const verify = await verificationPatch(
            jsonReq(
                'https://app.test/api/auth/lawyer-verification',
                { userId: HAMI_PLATFORM_ADMIN_UUID, status: 'active' },
                'PATCH',
            ),
        );
        const account = await accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'set_password',
                targetUserId: HAMI_PLATFORM_ADMIN_UUID,
                password: 'HamiLaw9x',
            }),
        );
        expect(ban.status).toBe(403);
        expect(role.status).toBe(403);
        expect(roleAdmin.status).toBe(400);
        expect(verify.status).toBe(403);
        expect(account.status).toBe(403);
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('الموجة 6 — CSRF/أصل أجنبي على إقلاع OTP + فيضان الرمز', async () => {
        assertSameOriginMock.mockReturnValue(false);
        const cross = await otpRequestPost(
            jsonReq('https://app.test/api/admin/otp/request', { deviceFingerprint: DEVICE }),
        );
        expect(cross.status).toBe(403);
        expect(createOtpMock).not.toHaveBeenCalled();

        assertSameOriginMock.mockReturnValue(true);
        verifyCsrfTokenMock.mockResolvedValue(false);
        isAdminUserIdMock.mockResolvedValue(true);
        const csrf = await otpRequestPost(
            jsonReq('https://app.test/api/admin/otp/request', { deviceFingerprint: DEVICE }),
        );
        expect(csrf.status).toBe(403);
        expect(createOtpMock).not.toHaveBeenCalled();

        verifyCsrfTokenMock.mockResolvedValue(true);
        isAdminUserIdMock.mockResolvedValue(false);
        const notAdmin = await otpVerifyPost(
            jsonReq('https://app.test/api/admin/otp/verify', {
                deviceFingerprint: DEVICE,
                code: '123456',
            }),
        );
        expect(notAdmin.status).toBe(403);

        isAdminUserIdMock.mockResolvedValue(true);
        consumeRateMock.mockResolvedValueOnce(false);
        const flooded = await otpRequestPost(
            jsonReq('https://app.test/api/admin/otp/request', { deviceFingerprint: DEVICE }),
        );
        expect(flooded.status).toBe(429);
        expect(createOtpMock).not.toHaveBeenCalled();
        expect(sendAdminMailMock).not.toHaveBeenCalled();
    });

    it('الموجة 7 — تزوير سجل hq: من المتصفح', async () => {
        getClientMock.mockReturnValue({
            from: () => ({
                insert: vi.fn().mockResolvedValue({ error: null }),
            }),
        });
        const res = await auditLogPost(
            jsonReq('https://app.test/api/audit/log', { action: 'hq:user.freeze' }),
        );
        expect(res.status).toBe(403);
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('الموجة 8 — ثماني عبارات خاطئة تقفل الباب ثم تُرفض العبارة الصحيحة أثناء القفل', async () => {
        const t0 = 1_000_000;
        for (let i = 0; i < HEADQUARTERS_DOOR_FAIL_MAX; i += 1) {
            expect(await headquartersDoorPhraseMatches('xxxxxxxxxxxxx', t0)).toBe(false);
        }
        expect(await headquartersDoorPhraseMatches('mortal shell2', t0 + 1)).toBe(false);
        expect(
            await headquartersDoorPhraseMatches('mortal shell2', t0 + HEADQUARTERS_DOOR_FAIL_WINDOW_MS + 1),
        ).toBe(true);
    });

    it('الموجة 9 — فحص الجلسة المجهول لا ينفجر 401', async () => {
        const res = await sessionGet(new Request('https://app.test/api/auth/session'));
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ ok: true, user: null, isAdmin: false });
    });

    it('الموجة 10 — انتحال requesterId / حظر النفس / حظر منتدى غير UUID بعد بوابة موثّقة', async () => {
        isAdminRequestMock.mockResolvedValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(true);
        const updateEq = vi.fn().mockResolvedValue({ error: null });
        const upsert = vi.fn().mockResolvedValue({ error: null });
        getClientMock.mockReturnValue({
            from: () => ({
                update: () => ({ eq: updateEq }),
                upsert,
                delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
            }),
        });

        const spoof = await banPost(
            jsonReq('https://app.test/api/admin/ban', {
                requesterId: HAMI_PLATFORM_ADMIN_UUID,
                targetUserId: VICTIM,
            }),
        );
        const selfBan = await banPost(
            jsonReq('https://app.test/api/admin/ban', { targetUserId: LAWYER }),
        );
        const selfRole = await rolePost(
            jsonReq('https://app.test/api/admin/role', { targetUserId: LAWYER, role: 'moderator' }),
        );
        const badUuid = await forumBanPost(
            jsonReq('https://app.test/api/forum/ban', {
                action: 'ban',
                userId: 'not-a-uuid',
                userName: 'x',
                reason: 'x',
            }),
        );
        const forumAdmin = await forumBanPost(
            jsonReq('https://app.test/api/forum/ban', {
                action: 'ban',
                userId: HAMI_PLATFORM_ADMIN_UUID,
                userName: 'x',
                reason: 'x',
            }),
        );
        const forumUnbanAdmin = await forumBanPost(
            jsonReq('https://app.test/api/forum/ban', {
                action: 'unban',
                userId: HAMI_PLATFORM_ADMIN_UUID,
            }),
        );
        expect(spoof.status).toBe(403);
        expect(selfBan.status).toBe(400);
        expect(selfRole.status).toBe(400);
        expect(badUuid.status).toBe(400);
        expect(forumAdmin.status).toBe(403);
        expect(forumUnbanAdmin.status).toBe(403);
        expect(getClientMock).not.toHaveBeenCalled();
        expect(updateEq).not.toHaveBeenCalled();
        expect(upsert).not.toHaveBeenCalled();
    });

    it('الموجة 11 — OTP بصمة مخالفة + status/verify لأصل أجنبي أو غير مدير', async () => {
        isAdminUserIdMock.mockResolvedValue(true);
        verifyCsrfTokenMock.mockResolvedValue(true);
        const mismatch = await otpRequestPost(
            jsonReq('https://app.test/api/admin/otp/request', { deviceFingerprint: 'otherdevice99' }),
        );
        expect(mismatch.status).toBe(400);
        expect(createOtpMock).not.toHaveBeenCalled();

        isAdminUserIdMock.mockResolvedValue(false);
        const statusLawyer = await otpStatusGet(
            jsonReq(`https://app.test/api/admin/otp/status?deviceFingerprint=${DEVICE}`, undefined, 'GET'),
        );
        expect(statusLawyer.status).toBe(403);
        expect(isAdminDeviceTrustedMock).not.toHaveBeenCalled();

        assertSameOriginMock.mockReturnValue(false);
        const verifyCross = await adminVerifyGet(
            jsonReq('https://app.test/api/admin/verify', undefined, 'GET'),
        );
        expect(verifyCross.status).toBe(403);
        const otpStatusCross = await otpStatusGet(
            jsonReq(`https://app.test/api/admin/otp/status?deviceFingerprint=${DEVICE}`, undefined, 'GET'),
        );
        expect(otpStatusCross.status).toBe(403);
    });

    it('الموجة 12 — استيراد قوانين: محامٍ مرفوض وحجم زائد بعد بوابة موثّقة', async () => {
        const asLawyer = await lawsImportPost(
            jsonReq('https://app.test/api/laws/import-bundle', {
                law_name: EXECUTION_LAW_CANONICAL_NAME,
                articles: Array.from({ length: 801 }, (_, i) => ({
                    article_number: String(i + 1),
                    content: 'x',
                })),
            }),
        );
        expect(asLawyer.status).toBe(403);
        expect(getClientMock).not.toHaveBeenCalled();

        isAdminRequestMock.mockResolvedValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(true);
        const oversized = await lawsImportPost(
            jsonReq('https://app.test/api/laws/import-bundle', {
                law_name: EXECUTION_LAW_CANONICAL_NAME,
                articles: Array.from({ length: 801 }, (_, i) => ({
                    article_number: String(i + 1),
                    content: 'x',
                })),
            }),
        );
        expect(oversized.status).toBe(400);
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('الموجة 13 — إعادة استخدام رمز OTP بعد الاستهلاك الذري', async () => {
        isAdminUserIdMock.mockResolvedValue(true);
        verifyCsrfTokenMock.mockResolvedValue(true);
        consumeOtpMock
            .mockResolvedValueOnce({ ok: true })
            .mockResolvedValueOnce({ ok: false, error: 'رمز غير صالح أو منتهٍ' });

        const first = await otpVerifyPost(
            jsonReq('https://app.test/api/admin/otp/verify', {
                deviceFingerprint: DEVICE,
                code: '847291',
            }),
        );
        const replay = await otpVerifyPost(
            jsonReq('https://app.test/api/admin/otp/verify', {
                deviceFingerprint: DEVICE,
                code: '847291',
            }),
        );
        expect(first.status).toBe(200);
        expect(replay.status).toBe(400);
        expect(trustDeviceMock).toHaveBeenCalledTimes(1);
        expect(consumeOtpMock).toHaveBeenCalledTimes(2);
    });

    it('الموجة 14 — فيضان مختلط 60 طلباً على الحظر والدور والاستيراد', async () => {
        const shots = await Promise.all([
            ...Array.from({ length: 20 }, () =>
                banPost(jsonReq('https://app.test/api/admin/ban', { targetUserId: VICTIM })),
            ),
            ...Array.from({ length: 20 }, () =>
                rolePost(
                    jsonReq('https://app.test/api/admin/role', { targetUserId: VICTIM, role: 'moderator' }),
                ),
            ),
            ...Array.from({ length: 20 }, () =>
                lawsImportPost(
                    jsonReq('https://app.test/api/laws/import-bundle', {
                        law_name: EXECUTION_LAW_CANONICAL_NAME,
                        articles: [{ article_number: '1', content: 'x' }],
                    }),
                ),
            ),
        ]);
        expect(shots).toHaveLength(60);
        expect(shots.every((res) => res.status === 403)).toBe(true);
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('الموجة 15 — تزوير hq: بأشكال الإملاء وحمولة فارغة بعد بوابة موثّقة', async () => {
        getClientMock.mockReturnValue({
            from: () => ({ insert: vi.fn().mockResolvedValue({ error: null }) }),
        });
        const mixed = await auditLogPost(
            jsonReq('https://app.test/api/audit/log', { action: 'HQ:user.freeze' }),
        );
        expect(mixed.status).toBe(403);
        expect(getClientMock).not.toHaveBeenCalled();

        isAdminRequestMock.mockResolvedValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(true);
        const emptyBan = await banPost(jsonReq('https://app.test/api/admin/ban', {}));
        const emptyRole = await rolePost(jsonReq('https://app.test/api/admin/role', { role: 'moderator' }));
        expect(emptyBan.status).toBe(400);
        expect(emptyRole.status).toBe(400);
    });

    it('الموجة 16 — verify بلا توكن يبقى 401 ولا يمنح isAdmin', async () => {
        extractUserTokenMock.mockReturnValue(null);
        const res = await adminVerifyGet(
            jsonReq('https://app.test/api/admin/verify', undefined, 'GET'),
        );
        expect(res.status).toBe(401);
        const body = (await res.json()) as { isAdmin?: boolean };
        expect(body.isAdmin).toBeUndefined();
    });

    it('الموجة 17 — حد المعدّل بعد بوابة موثّقة: 429 بلا قاعدة بيانات', async () => {
        isAdminRequestMock.mockResolvedValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(true);
        consumeRateMock.mockResolvedValue(false);
        const ban = await banPost(jsonReq('https://app.test/api/admin/ban', { targetUserId: VICTIM }));
        const role = await rolePost(
            jsonReq('https://app.test/api/admin/role', { targetUserId: VICTIM, role: 'moderator' }),
        );
        const forum = await forumBanPost(
            jsonReq('https://app.test/api/forum/ban', {
                action: 'ban',
                userId: VICTIM,
                userName: 'x',
                reason: 'x',
            }),
        );
        expect(ban.status).toBe(429);
        expect(role.status).toBe(429);
        expect(forum.status).toBe(429);
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('الموجة 18 — تعيين جماعي: is_deleted/role لا يدخلان تحديث الحظر', async () => {
        isAdminRequestMock.mockResolvedValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(true);
        let captured: Record<string, unknown> | undefined;
        getClientMock.mockReturnValue({
            from: () => ({
                update: (payload: Record<string, unknown>) => {
                    captured = payload;
                    return { eq: vi.fn().mockResolvedValue({ error: null }) };
                },
                select: () => ({
                    eq: () => ({
                        maybeSingle: vi.fn().mockResolvedValue({
                            data: {
                                id: VICTIM,
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
                insert: vi.fn().mockResolvedValue({ error: null }),
            }),
            auth: { admin: { updateUserById: vi.fn().mockResolvedValue({}) } },
        });
        const res = await banPost(
            jsonReq('https://app.test/api/admin/ban', {
                targetUserId: VICTIM,
                updates: { is_banned: true, is_deleted: true, role: 'admin', is_platform_admin: true },
            }),
        );
        expect(res.status).toBe(200);
        expect(captured).toMatchObject({ is_banned: true, is_active: false, status: 'suspended' });
        expect(captured).not.toHaveProperty('is_deleted');
        expect(captured).not.toHaveProperty('role');
        expect(captured).not.toHaveProperty('is_platform_admin');
    });

    it('الموجة 19 — خمس فشل OTP تحرق التحدي المفتوح ولا توثّق الجهاز', async () => {
        isAdminUserIdMock.mockResolvedValue(true);
        verifyCsrfTokenMock.mockResolvedValue(true);
        consumeOtpMock.mockResolvedValue({ ok: false, error: 'رمز غير صالح أو منتهٍ' });
        let failSlots = 0;
        consumeRateMock.mockImplementation(async (key: unknown) => {
            if (String(key).startsWith('admin-otp-fail:')) {
                failSlots += 1;
                return failSlots <= 5;
            }
            return true;
        });
        const shots = [];
        for (let i = 0; i < 6; i += 1) {
            shots.push(
                await otpVerifyPost(
                    jsonReq('https://app.test/api/admin/otp/verify', {
                        deviceFingerprint: DEVICE,
                        code: '000000',
                    }),
                ),
            );
        }
        expect(shots.every((res) => res.status === 400)).toBe(true);
        expect(burnOpenOtpMock).toHaveBeenCalledTimes(1);
        expect(trustDeviceMock).not.toHaveBeenCalled();
    });

    it('الموجة 20 — رمز جلسة مسروق/غير مُصرَّح على إقلاع OTP', async () => {
        isTokenAuthorizedMock.mockResolvedValue(false);
        const requestOtp = await otpRequestPost(
            jsonReq('https://app.test/api/admin/otp/request', { deviceFingerprint: DEVICE }),
        );
        const verifyOtp = await otpVerifyPost(
            jsonReq('https://app.test/api/admin/otp/verify', {
                deviceFingerprint: DEVICE,
                code: '123456',
            }),
        );
        expect(requestOtp.status).toBe(401);
        expect(verifyOtp.status).toBe(401);
        expect(createOtpMock).not.toHaveBeenCalled();
        expect(consumeOtpMock).not.toHaveBeenCalled();
    });

    it('الموجة 21 — مصفوفة JSON وإجراء منتدى مجهول بعد بوابة موثّقة', async () => {
        isAdminRequestMock.mockResolvedValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(true);
        const arrayBan = await banPost(jsonReq('https://app.test/api/admin/ban', [VICTIM]));
        const unknownForum = await forumBanPost(
            jsonReq('https://app.test/api/forum/ban', { action: 'explode', userId: VICTIM }),
        );
        const unknownReport = await forumReportsPost(
            jsonReq('https://app.test/api/forum/reports', { action: 'purge_all' }),
        );
        expect(arrayBan.status).toBe(400);
        expect(unknownForum.status).toBe(400);
        expect(unknownReport.status).toBe(400);
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('الموجة 21ب — حظر بمدة مزوّرة أو منشور غير UUID بعد بوابة موثّقة بلا قاعدة', async () => {
        isAdminRequestMock.mockResolvedValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(true);
        getClientMock.mockClear();
        const badHours = await forumBanPost(
            jsonReq('https://app.test/api/forum/ban', {
                action: 'ban',
                userId: VICTIM,
                userName: 'Victim',
                reason: 'flooding',
                durationHours: 99,
            }),
        );
        const pastExpiry = await forumBanPost(
            jsonReq('https://app.test/api/forum/ban', {
                action: 'ban',
                userId: VICTIM,
                userName: 'Victim',
                reason: 'flooding',
                expiresAt: '2020-01-01T00:00:00.000Z',
            }),
        );
        const badPost = await consultationsPost(
            jsonReq('https://app.test/api/admin/consultations', { postId: 'p1', action: 'pin' }),
        );
        expect(badHours.status).toBe(400);
        expect(pastExpiry.status).toBe(400);
        expect(badPost.status).toBe(400);
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('الموجة 22 — تزوير تدقيق hq: بأحرف كاملة العرض وصفرية العرض', async () => {
        const fullwidth = await auditLogPost(
            jsonReq('https://app.test/api/audit/log', { action: 'ｈｑ：user.freeze' }),
        );
        const zwsp = await auditLogPost(
            jsonReq('https://app.test/api/audit/log', { action: '\u200bhq:user.freeze' }),
        );
        const spaced = await auditLogPost(
            jsonReq('https://app.test/api/audit/log', { action: 'hq :user.freeze' }),
        );
        expect(fullwidth.status).toBe(403);
        expect(zwsp.status).toBe(403);
        expect(spaced.status).toBe(403);
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('الموجة 23 — طلب توثيق محامٍ لا يستبدل userId بجسد الطلب', async () => {
        kvSetMock.mockResolvedValue(undefined);
        kvGetMock.mockResolvedValue(null);
        const preview = `data:image/jpeg;base64,${'A'.repeat(80)}`;
        const res = await verificationPost(
            jsonReq('https://app.test/api/auth/lawyer-verification', {
                userId: HAMI_PLATFORM_ADMIN_UUID,
                hasIdFront: true,
                idFrontPreview: preview,
                idBackPreview: preview,
            }),
        );
        expect(res.status).toBe(200);
        expect(kvSetMock).toHaveBeenCalledTimes(1);
        const key = String(kvSetMock.mock.calls[0]?.[0] ?? '');
        const record = kvSetMock.mock.calls[0]?.[1] as { userId?: string };
        expect(key).toContain(LAWYER);
        expect(key).not.toContain(HAMI_PLATFORM_ADMIN_UUID);
        expect(record.userId).toBe(LAWYER);
    });

    it('الموجة 24 — باب المقر يرفض الهوموغليف وUUID المدير بحروف كبيرة يبقى محمياً', async () => {
        expect(await headquartersDoorPhraseMatches('1')).toBe(false);
        expect(await headquartersDoorPhraseMatches('mort\u0430l shell2')).toBe(false);
        expect(await headquartersDoorPhraseMatches('mortal\u200bshell2')).toBe(false);

        isAdminRequestMock.mockResolvedValue(true);
        isAdminDeviceTrustedMock.mockResolvedValue(true);
        const upper = await banPost(
            jsonReq('https://app.test/api/admin/ban', {
                targetUserId: HAMI_PLATFORM_ADMIN_UUID.toUpperCase(),
            }),
        );
        expect(upper.status).toBe(403);
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('الموجة 25 — GET حالة OTP يتخطى CSRF ويبقى مرفوضاً لغير المدير', async () => {
        verifyCsrfTokenMock.mockResolvedValue(false);
        isAdminUserIdMock.mockResolvedValue(false);
        const res = await otpStatusGet(
            jsonReq(`https://app.test/api/admin/otp/status?deviceFingerprint=${DEVICE}`, undefined, 'GET'),
        );
        expect(res.status).toBe(403);
        expect(verifyCsrfTokenMock).not.toHaveBeenCalled();
        expect(isAdminDeviceTrustedMock).not.toHaveBeenCalled();
    });

    it('الموجة 26 — انتحال إشعار نظام المقر وتدقيق غير مدرج وإضبارة توثيق الغير', async () => {
        const fakeAlert = await notificationsAppendPost(
            jsonReq('https://app.test/api/notifications/append', {
                title: 'تنبيه المقر',
                message: 'تم تجميد حسابك',
                type: 'system_alert',
                category: 'system',
            }),
        );
        const fakeAudit = await auditLogPost(
            jsonReq('https://app.test/api/audit/log', {
                action: 'ADMIN_PURGE_ALL',
                details: { forged: true },
            }),
        );
        const dossier = await verificationGet(
            jsonReq(
                `https://app.test/api/auth/lawyer-verification?scope=dossier&userId=${VICTIM}`,
                undefined,
                'GET',
            ),
        );
        const accountDossier = await accountGet(
            jsonReq(`https://app.test/api/admin/account?targetUserId=${VICTIM}`, undefined, 'GET'),
        );
        expect(fakeAlert.status).toBe(403);
        expect(fakeAudit.status).toBe(400);
        expect(dossier.status).toBe(403);
        expect(accountDossier.status).toBe(403);
        expect(getClientMock).not.toHaveBeenCalled();
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('الموجة 27 — 40 انتحال إشعار نظام متوازٍ من محامٍ: صفر كتابة', async () => {
        const shots = await Promise.all(
            Array.from({ length: 40 }, () =>
                notificationsAppendPost(
                    jsonReq('https://app.test/api/notifications/append', {
                        title: 'تنبيه المقر',
                        message: 'تجميد',
                        type: 'system_alert',
                        category: 'system',
                    }),
                ),
            ),
        );
        expect(shots).toHaveLength(40);
        expect(shots.every((res) => res.status === 403)).toBe(true);
        expect(kvSetMock).not.toHaveBeenCalled();
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('الموجة 28 — إقلاع مقر التطوير بلا حامل يُرفض ولا يثق بالجهاز', async () => {
        const res = await otpDevUnlockPost(
            jsonReq('https://app.test/api/admin/otp/dev-unlock', { deviceFingerprint: DEVICE }),
        );
        expect(res.status === 403 || res.status === 404).toBe(true);
        expect(trustDeviceMock).not.toHaveBeenCalled();
    });
});
