import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HAMI_PLATFORM_ADMIN_UUID } from '@/app/api/security/roleResolver.ts';

const {
    gateMock,
    listUsersMock,
    fetchUserMock,
    banFlagsMock,
    consumeRateMock,
    getClientMock,
    profilesUpdateEqMock,
    isWifeProdMock,
    requireWifeUserMock,
    extractUserTokenMock,
    getVerifiedTokenSubjectMock,
    isAdminUserIdMock,
    listStatsMock,
    listConsultationsMock,
    deleteConsultationMock,
    setFlagsMock,
    listAuditMock,
    listDevicesMock,
    revokeDeviceMock,
    revokeCurrentDeviceMock,
    loadStatusMock,
    updateUserByIdMock,
    auditMock,
} = vi.hoisted(() => ({
    gateMock: vi.fn(),
    listUsersMock: vi.fn(),
    fetchUserMock: vi.fn(),
    banFlagsMock: vi.fn(),
    consumeRateMock: vi.fn(),
    getClientMock: vi.fn(),
    profilesUpdateEqMock: vi.fn(),
    isWifeProdMock: vi.fn(),
    requireWifeUserMock: vi.fn(),
    extractUserTokenMock: vi.fn(() => 'tok'),
    getVerifiedTokenSubjectMock: vi.fn(async () => '11111111-2222-4333-8444-555555555555'),
    isAdminUserIdMock: vi.fn(),
    listStatsMock: vi.fn(),
    listConsultationsMock: vi.fn(),
    deleteConsultationMock: vi.fn(),
    setFlagsMock: vi.fn(),
    listAuditMock: vi.fn(),
    listDevicesMock: vi.fn(),
    revokeDeviceMock: vi.fn(),
    revokeCurrentDeviceMock: vi.fn(),
    loadStatusMock: vi.fn(),
    updateUserByIdMock: vi.fn(async () => ({ data: {}, error: null })),
    auditMock: vi.fn(async () => true),
}));

vi.mock('../../security/requireTrustedHeadquartersAdmin.ts', () => ({
    requireTrustedHeadquartersAdmin: (...a: unknown[]) => gateMock(...a),
}));

vi.mock('../../security/headquartersUsers.ts', () => ({
    listHeadquartersUsers: (...a: unknown[]) => listUsersMock(...a),
    fetchHeadquartersUser: (...a: unknown[]) => fetchUserMock(...a),
    readHeadquartersBanFlags: (...a: unknown[]) => banFlagsMock(...a),
}));

vi.mock('../../security/wifeRateLimitStore.ts', () => ({
    consumeRateLimitSlot: (...a: unknown[]) => consumeRateMock(...a),
}));

vi.mock('../../security/supabaseAdminClient.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../security/supabaseAdminClient.ts')>();
    return {
        ...actual,
        getSupabaseAdminClient: (...a: unknown[]) => getClientMock(...a),
    };
});

vi.mock('../../security/wifeStoreEnv.ts', () => ({
    isWifeProduction: (...a: unknown[]) => isWifeProdMock(...a),
    getWifeEnv: (name: string) => {
        const raw = process.env[name];
        return typeof raw === 'string' ? raw.trim() : '';
    },
}));

vi.mock('../../security/bffAuth.ts', () => ({
    requireWifeUser: (...a: unknown[]) => requireWifeUserMock(...a),
    unwrapWifeUser: (r: unknown) => r,
}));

vi.mock('../../security/adminCheck.ts', () => ({
    isAdminUserId: (...a: unknown[]) => isAdminUserIdMock(...a),
}));

vi.mock('../../security/wifeValidator.ts', () => ({
    extractUserTokenFromRequest: (...a: unknown[]) => extractUserTokenMock(...a),
    getVerifiedTokenSubject: (...a: unknown[]) => getVerifiedTokenSubjectMock(...a),
    wifeUnauthorizedResponse: () =>
        new Response(JSON.stringify({ ok: false, error: 'Unauthorized user' }), { status: 401 }),
}));

vi.mock('../../security/sanitizer.ts', () => ({
    sanitizePayload: (v: unknown) => v,
    isJsonObjectRecord: (v: unknown) => Boolean(v) && typeof v === 'object' && !Array.isArray(v),
}));

vi.mock('../../security/headquartersCourtStats.ts', () => ({
    listHeadquartersCourtStats: (...a: unknown[]) => listStatsMock(...a),
    listHeadquartersCourtStatsCached: (...a: unknown[]) => listStatsMock(...a),
}));

vi.mock('../../security/headquartersStatus.ts', () => ({
    loadHeadquartersStatus: (...a: unknown[]) => loadStatusMock(...a),
    emptyHeadquartersStatus: () => ({
        system: 'down',
        db: false,
        kvOk: false,
        pendingVerification: 0,
        pendingReports: 0,
        usersTotal: 0,
        usersFrozen: 0,
    }),
}));

vi.mock('../../security/headquartersStatusCache.ts', () => ({
    loadHeadquartersStatusCached: (...a: unknown[]) => loadStatusMock(...a),
}));

vi.mock('../../security/headquartersConsultationsQuery.ts', () => ({
    listHeadquartersConsultations: (...a: unknown[]) => listConsultationsMock(...a),
    deleteHeadquartersConsultation: (...a: unknown[]) => deleteConsultationMock(...a),
    setHeadquartersPostFlags: (...a: unknown[]) => setFlagsMock(...a),
}));

vi.mock('../../security/headquartersAuditQuery.ts', () => ({
    listHeadquartersAudit: (...a: unknown[]) => listAuditMock(...a),
}));

vi.mock('../../security/adminOtpStore.ts', () => ({
    listAdminTrustedDevices: (...a: unknown[]) => listDevicesMock(...a),
    revokeAdminTrustedDevice: (...a: unknown[]) => revokeDeviceMock(...a),
    revokeAdminTrustedDeviceByFingerprint: (...a: unknown[]) => revokeCurrentDeviceMock(...a),
}));

vi.mock('../../security/csrfServerStore.ts', () => ({
    invalidateCsrfForSubject: vi.fn(async () => undefined),
}));

vi.mock('../../security/wifeSessionServerStore.ts', () => ({
    invalidateWifeSessionsForSubject: vi.fn(async () => undefined),
}));

vi.mock('../../security/stolenTokenServer.ts', () => ({
    revokeTokenSessionsForSubject: vi.fn(async () => undefined),
}));

vi.mock('../../security/headquartersAudit.ts', () => ({
    recordHeadquartersAudit: (...a: unknown[]) => auditMock(...a),
}));

vi.mock('../../security/headquartersAccountNotify.ts', () => ({
    notifyHeadquartersAccountStatus: vi.fn(async () => undefined),
    notifyHeadquartersForumStatus: vi.fn(async () => undefined),
    notifyHeadquartersSystemMessage: vi.fn(async () => true),
    notifyHeadquartersVerificationStatus: vi.fn(async () => undefined),
    notifyHeadquartersCredentialStatus: vi.fn(async () => undefined),
    notifyHeadquartersRoleStatus: vi.fn(async () => undefined),
    notifyHeadquartersModeration: vi.fn(async () => undefined),
}));

import { GET as usersGet } from '../users/route.ts';
import { POST as rolePost } from '../role/route.ts';
import { POST as banPost } from '../ban/route.ts';
import { GET as verifyGet } from '../verify/route.ts';
import { GET as statsGet } from '../stats/route.ts';
import { GET as statusGet } from '../status/route.ts';
import { GET as consultationsGet, POST as consultationsPost } from '../consultations/route.ts';
import { POST as accountPost } from '../account/route.ts';
import { GET as auditGet } from '../audit/route.ts';
import { GET as devicesGet, POST as devicesPost } from '../devices/route.ts';
import { POST as forumBanPost } from '../../forum/ban/route.ts';

const ADMIN = '11111111-2222-4333-8444-555555555555';
const TARGET = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function jsonReq(url: string, body?: unknown, method: 'GET' | 'POST' = 'POST'): Request {
    const origin = new URL(url).origin;
    return new Request(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-wife-device-id': 'admin-device-aaaa',
            Origin: origin,
        },
        body: method === 'GET' || body === undefined ? undefined : JSON.stringify(body),
    });
}

describe('مقر القيادة عن بعد — BFF', () => {
    beforeEach(() => {
        listStatsMock.mockClear();
        loadStatusMock.mockClear();
        listUsersMock.mockClear();
        listConsultationsMock.mockClear();
        deleteConsultationMock.mockClear();
        setFlagsMock.mockClear();
        listAuditMock.mockClear();
        listDevicesMock.mockClear();
        revokeDeviceMock.mockClear();
        revokeCurrentDeviceMock.mockClear();
        gateMock.mockResolvedValue({ ok: true, userId: ADMIN, deviceFingerprint: 'admin-device-aaaa' });
        consumeRateMock.mockResolvedValue(true);
        isWifeProdMock.mockReturnValue(false);
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: ADMIN });
        extractUserTokenMock.mockReset();
        extractUserTokenMock.mockReturnValue('tok');
        getVerifiedTokenSubjectMock.mockReset();
        getVerifiedTokenSubjectMock.mockResolvedValue(ADMIN);
        isAdminUserIdMock.mockReset();
        isAdminUserIdMock.mockResolvedValue(false);
        profilesUpdateEqMock.mockResolvedValue({ error: null });
        updateUserByIdMock.mockClear();
        auditMock.mockClear();
        getClientMock.mockReturnValue({
            from: () => ({
                update: () => ({ eq: profilesUpdateEqMock }),
                insert: vi.fn(async () => ({ error: null })),
            }),
            auth: {
                admin: {
                    updateUserById: updateUserByIdMock,
                    signOut: vi.fn(async () => ({ error: null })),
                },
            },
        });
        fetchUserMock.mockResolvedValue({
            id: TARGET,
            email: 't@t.t',
            fullName: 'هدف',
            familyName: '',
            phone: '',
            governorate: '',
            lawyerBarRoom: '',
            role: 'lawyer',
            status: 'active',
            createdAt: '2020-01-01T00:00:00.000Z',
            freezeUntil: null,
            verificationStatus: 'none',
        });
        listUsersMock.mockResolvedValue({
            users: [
                {
                    id: TARGET,
                    email: 't@t.t',
                    fullName: 'هدف',
                    role: 'lawyer',
                    status: 'active',
                    createdAt: '2020-01-01T00:00:00.000Z',
                },
            ],
            matched: 1,
            usersTotal: 1,
            offset: 0,
            limit: 50,
            hasMore: false,
            matchedExact: true,
            capped: false,
        });
        listStatsMock.mockResolvedValue([{ court: 'بغداد', lawsuits: 2, transactions: 1 }]);
        loadStatusMock.mockResolvedValue({
            system: 'connected',
            db: true,
            kvOk: true,
            pendingVerification: 2,
            verificationApproved: 4,
            verificationRejected: 1,
            pendingReports: 1,
            pendingCommentReports: 2,
            usersTotal: 3,
            usersFrozen: 0,
            usersLocked: 0,
            usersActive: 3,
            usersLawyer: 2,
            usersModerator: 0,
            usersAdmin: 1,
            usersNew24h: 0,
            usersNew7d: 1,
            forumPosts: 10,
            forumComments: 4,
            forumBans: 0,
            forumBansActive: 0,
            forumDocuments: 1,
            forumPinned: 0,
            forumLocked: 0,
            contentPartial: false,
            contentGaps: [],
        });
        listConsultationsMock.mockResolvedValue([
            {
                id: 'post-1',
                name: 'سائل',
                content: 'استشارة',
                time: '١ آب',
                isLawyer: false,
                offers: [{ lawyerName: 'محامي', price: 0 }],
            },
        ]);
        deleteConsultationMock.mockResolvedValue('ok');
        setFlagsMock.mockResolvedValue('ok');
        listAuditMock.mockResolvedValue([
            {
                id: 'aud-1',
                action: 'hq:consultation.delete',
                actorId: ADMIN,
                targetId: 'post-1',
                createdAt: '2026-08-01T00:00:00.000Z',
                details: { targetId: 'post-1' },
            },
        ]);
        listDevicesMock.mockResolvedValue([
            {
                id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
                hint: 'abcd…wxyz',
                label: null,
                trustedAt: '2026-08-01T00:00:00.000Z',
                expiresAt: '2026-09-01T00:00:00.000Z',
                lastSeenAt: '2026-08-01T00:00:00.000Z',
                current: true,
                expired: false,
            },
        ]);
        revokeDeviceMock.mockResolvedValue('ok');
        revokeCurrentDeviceMock.mockResolvedValue('ok');
    });

    it('GET /api/admin/users يرفض بلا بوابة موثّقة', async () => {
        gateMock.mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ ok: false }), { status: 403 }),
        });
        const res = await usersGet(jsonReq('https://app.test/api/admin/users', undefined, 'GET'));
        expect(res.status).toBe(403);
        expect(listUsersMock).not.toHaveBeenCalled();
    });

    it('GET /api/admin/users يعيد القائمة بعد الجهاز الموثّق', async () => {
        const res = await usersGet(jsonReq('https://app.test/api/admin/users', undefined, 'GET'));
        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toContain('no-store');
        await expect(res.json()).resolves.toMatchObject({ ok: true, users: [expect.objectContaining({ id: TARGET })] });
    });

    it('POST /api/admin/role يرفض ترقية admin', async () => {
        const res = await rolePost(
            jsonReq('https://app.test/api/admin/role', { targetUserId: TARGET, role: 'admin' }),
        );
        expect(res.status).toBe(400);
        expect(profilesUpdateEqMock).not.toHaveBeenCalled();
    });

    it('POST /api/admin/role يرفض تغيير مدير المنصّة', async () => {
        const res = await rolePost(
            jsonReq('https://app.test/api/admin/role', {
                targetUserId: HAMI_PLATFORM_ADMIN_UUID,
                role: 'lawyer',
            }),
        );
        expect(res.status).toBe(403);
    });

    it('POST /api/admin/role يرفض تغيير حساب إدارة', async () => {
        profilesUpdateEqMock.mockClear();
        fetchUserMock.mockResolvedValueOnce({
            id: TARGET,
            email: 't@t.t',
            fullName: 'هدف',
            familyName: '',
            phone: '',
            governorate: '',
            lawyerBarRoom: '',
            role: 'admin',
            status: 'active',
            createdAt: '2020-01-01T00:00:00.000Z',
            freezeUntil: null,
            verificationStatus: 'none',
        });
        const res = await rolePost(
            jsonReq('https://app.test/api/admin/role', { targetUserId: TARGET, role: 'moderator' }),
        );
        expect(res.status).toBe(403);
        expect(profilesUpdateEqMock).not.toHaveBeenCalled();
    });

    it('POST /api/admin/role يعيّن مشرفاً ويعيد الصف', async () => {
        fetchUserMock
            .mockResolvedValueOnce({
                id: TARGET,
                email: 't@t.t',
                fullName: 'هدف',
                role: 'lawyer',
                status: 'active',
                createdAt: '2020-01-01T00:00:00.000Z',
            })
            .mockResolvedValueOnce({
                id: TARGET,
                email: 't@t.t',
                fullName: 'هدف',
                role: 'moderator',
                status: 'active',
                createdAt: '2020-01-01T00:00:00.000Z',
            });
        const res = await rolePost(
            jsonReq('https://app.test/api/admin/role', { targetUserId: TARGET, role: 'moderator' }),
        );
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({
            ok: true,
            user: expect.objectContaining({ role: 'moderator' }),
        });
    });

    it('POST /api/admin/ban يرفض UUID غير صالح', async () => {
        const res = await banPost(jsonReq('https://app.test/api/admin/ban', { targetUserId: 'victim' }));
        expect(res.status).toBe(400);
    });

    it('POST /api/admin/ban يرفض حظر مدير المنصّة', async () => {
        const res = await banPost(
            jsonReq('https://app.test/api/admin/ban', { targetUserId: HAMI_PLATFORM_ADMIN_UUID }),
        );
        expect(res.status).toBe(403);
    });

    it('POST /api/admin/ban toggle يقلب من الخادم لا من العميل', async () => {
        banFlagsMock.mockResolvedValue({ frozen: false });
        const res = await banPost(
            jsonReq('https://app.test/api/admin/ban', {
                targetUserId: TARGET,
                toggle: true,
                updates: { role: 'admin', is_banned: false },
            }),
        );
        expect(res.status).toBe(200);
        expect(banFlagsMock).toHaveBeenCalled();
    });

    it('POST /api/admin/ban لا يرفع حظر GoTrue إن كان الدخول مقفولاً', async () => {
        fetchUserMock.mockResolvedValue({
            id: TARGET,
            email: 't@t.t',
            fullName: 'هدف',
            familyName: '',
            phone: '',
            governorate: '',
            lawyerBarRoom: '',
            role: 'lawyer',
            status: 'suspended',
            createdAt: '2020-01-01T00:00:00.000Z',
            freezeUntil: null,
            verificationStatus: 'none',
            loginBlocked: true,
        });
        const res = await banPost(
            jsonReq('https://app.test/api/admin/ban', {
                targetUserId: TARGET,
                updates: { is_banned: true },
            }),
        );
        expect(res.status).toBe(200);
        expect(updateUserByIdMock).not.toHaveBeenCalled();
    });

    it('POST /api/admin/ban يرفض حساب إدارة غير مدير المنصّة', async () => {
        fetchUserMock.mockResolvedValue({
            id: TARGET,
            email: 't@t.t',
            fullName: 'هدف',
            familyName: '',
            phone: '',
            governorate: '',
            lawyerBarRoom: '',
            role: 'admin',
            status: 'active',
            createdAt: '2020-01-01T00:00:00.000Z',
            freezeUntil: null,
            verificationStatus: 'none',
        });
        profilesUpdateEqMock.mockClear();
        const res = await banPost(
            jsonReq('https://app.test/api/admin/ban', {
                targetUserId: TARGET,
                updates: { is_banned: true },
            }),
        );
        expect(res.status).toBe(403);
        expect(profilesUpdateEqMock).not.toHaveBeenCalled();
    });

    it('POST /api/forum/ban يرفض حساب إدارة', async () => {
        fetchUserMock.mockResolvedValue({
            id: TARGET,
            email: 't@t.t',
            fullName: 'هدف',
            familyName: '',
            phone: '',
            governorate: '',
            lawyerBarRoom: '',
            role: 'admin',
            status: 'active',
            createdAt: '2020-01-01T00:00:00.000Z',
            freezeUntil: null,
            verificationStatus: 'none',
        });
        const res = await forumBanPost(
            jsonReq('https://app.test/api/forum/ban', {
                action: 'ban',
                userId: TARGET,
                userName: 'هدف',
                reason: 'إساءة',
            }),
        );
        expect(res.status).toBe(403);
        await expect(res.json()).resolves.toMatchObject({ error: 'لا يمكن تعديل حساب إدارة' });
    });

    it('GET /api/admin/verify في الإنتاج لا يكشف userId/role', async () => {
        isWifeProdMock.mockReturnValue(true);
        isAdminUserIdMock.mockResolvedValue(false);
        const res = await verifyGet(jsonReq('https://app.test/api/admin/verify', undefined, 'GET'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as Record<string, unknown>;
        expect(body).toEqual({ ok: true, isAdmin: false });
        expect(body.userId).toBeUndefined();
        expect(body.profileRole).toBeUndefined();
        expect(body.uuidMatches).toBeUndefined();
    });

    it('GET /api/admin/verify خارج الإنتاج أيضاً لا يكشف userId/role', async () => {
        isWifeProdMock.mockReturnValue(false);
        isAdminUserIdMock.mockResolvedValue(true);
        const res = await verifyGet(jsonReq('https://app.test/api/admin/verify', undefined, 'GET'));
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ ok: true, isAdmin: true });
    });

    it('GET /api/admin/verify يرفض بلا جلسة', async () => {
        extractUserTokenMock.mockReturnValue(null);
        const res = await verifyGet(jsonReq('https://app.test/api/admin/verify', undefined, 'GET'));
        expect(res.status).toBe(401);
        expect(isAdminUserIdMock).not.toHaveBeenCalled();
    });

    it('GET /api/admin/verify يمنح isAdmin من الجلسة دون توقيع WIFE', async () => {
        isWifeProdMock.mockReturnValue(true);
        isAdminUserIdMock.mockResolvedValue(true);
        const res = await verifyGet(jsonReq('https://app.test/api/admin/verify', undefined, 'GET'));
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ ok: true, isAdmin: true });
        expect(isAdminUserIdMock).toHaveBeenCalledWith(ADMIN, 'tok');
    });

    it('GET /api/admin/stats يرفض بلا بوابة موثّقة', async () => {
        gateMock.mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ ok: false }), { status: 403 }),
        });
        const res = await statsGet(jsonReq('https://app.test/api/admin/stats', undefined, 'GET'));
        expect(res.status).toBe(403);
        expect(listStatsMock).not.toHaveBeenCalled();
        expect(loadStatusMock).not.toHaveBeenCalled();
    });

    it('GET /api/admin/stats يعيد التجميع بعد الجهاز الموثّق', async () => {
        const res = await statsGet(jsonReq('https://app.test/api/admin/stats', undefined, 'GET'));
        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toContain('no-store');
        const body = await res.json();
        expect(body).toMatchObject({
            ok: true,
            courts: [{ court: 'بغداد', lawsuits: 2, transactions: 1 }],
        });
        expect(body).not.toHaveProperty('overview');
        expect(listStatsMock).toHaveBeenCalled();
        expect(loadStatusMock).not.toHaveBeenCalled();
    });

    it('GET /api/admin/status يرفض بلا بوابة موثّقة', async () => {
        gateMock.mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ ok: false }), { status: 403 }),
        });
        const res = await statusGet(jsonReq('https://app.test/api/admin/status', undefined, 'GET'));
        expect(res.status).toBe(403);
        expect(loadStatusMock).not.toHaveBeenCalled();
    });

    it('GET /api/admin/status يعيد نبض النظام بعد الجهاز الموثّق', async () => {
        const res = await statusGet(jsonReq('https://app.test/api/admin/status', undefined, 'GET'));
        expect(res.status).toBe(200);
        expect(res.headers.get('Cache-Control')).toContain('no-store');
        await expect(res.json()).resolves.toMatchObject({
            ok: true,
            system: 'connected',
            db: true,
            kvOk: true,
            pendingVerification: 2,
            verificationApproved: 4,
            pendingReports: 1,
            pendingCommentReports: 2,
            usersLawyer: 2,
            forumPosts: 10,
            mail: expect.objectContaining({
                configured: expect.any(Boolean),
                channel: expect.any(String),
                mailboxMasked: expect.any(String),
            }),
        });
    });

    it('GET /api/admin/consultations يرفض بلا بوابة موثّقة', async () => {
        gateMock.mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ ok: false }), { status: 403 }),
        });
        const res = await consultationsGet(
            jsonReq('https://app.test/api/admin/consultations', undefined, 'GET'),
        );
        expect(res.status).toBe(403);
        expect(listConsultationsMock).not.toHaveBeenCalled();
    });

    it('GET /api/admin/consultations يعيد المنشورات العامة بعد الجهاز الموثّق', async () => {
        const res = await consultationsGet(
            jsonReq('https://app.test/api/admin/consultations', undefined, 'GET'),
        );
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({
            ok: true,
            consultations: [expect.objectContaining({ id: 'post-1', name: 'سائل', offers: [{ lawyerName: 'محامي', price: 0 }] })],
        });
        expect(listConsultationsMock).toHaveBeenCalled();
    });

    it('POST /api/admin/consultations يرفض postId فارغ', async () => {
        const res = await consultationsPost(
            jsonReq('https://app.test/api/admin/consultations', { postId: '  ' }),
        );
        expect(res.status).toBe(400);
        expect(deleteConsultationMock).not.toHaveBeenCalled();
    });

    it('POST /api/admin/consultations يرفض postId غير UUID', async () => {
        getClientMock.mockClear();
        const res = await consultationsPost(
            jsonReq('https://app.test/api/admin/consultations', { postId: 'post-1' }),
        );
        expect(res.status).toBe(400);
        expect(deleteConsultationMock).not.toHaveBeenCalled();
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('POST /api/admin/consultations يحذف كمدير مقر', async () => {
        const res = await consultationsPost(
            jsonReq('https://app.test/api/admin/consultations', { postId: TARGET }),
        );
        expect(res.status).toBe(200);
        expect(deleteConsultationMock).toHaveBeenCalled();
    });

    it('POST /api/admin/consultations يعيد 404 إذا المنشور غير موجود', async () => {
        deleteConsultationMock.mockResolvedValueOnce('missing');
        const res = await consultationsPost(
            jsonReq('https://app.test/api/admin/consultations', { postId: TARGET }),
        );
        expect(res.status).toBe(404);
    });

    it('POST /api/admin/consultations يثبّت المنشور دون حذفه', async () => {
        const res = await consultationsPost(
            jsonReq('https://app.test/api/admin/consultations', { postId: TARGET, action: 'pin' }),
        );
        expect(res.status).toBe(200);
        expect(setFlagsMock).toHaveBeenCalledWith(expect.anything(), TARGET, { pinned: true, locked: undefined });
        expect(deleteConsultationMock).not.toHaveBeenCalled();
    });

    it('GET /api/admin/audit يرفض بلا بوابة موثّقة', async () => {
        gateMock.mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ ok: false }), { status: 403 }),
        });
        const res = await auditGet(jsonReq('https://app.test/api/admin/audit', undefined, 'GET'));
        expect(res.status).toBe(403);
        expect(listAuditMock).not.toHaveBeenCalled();
    });

    it('GET /api/admin/audit يعيد السجل بلا تفاصيل حسّاسة', async () => {
        const res = await auditGet(jsonReq('https://app.test/api/admin/audit', undefined, 'GET'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { entries?: Array<Record<string, unknown>> };
        expect(body.entries?.[0]).toMatchObject({
            id: 'aud-1',
            action: 'hq:consultation.delete',
            targetId: 'post-1',
            details: { targetId: 'post-1' },
        });
    });

    it('GET /api/admin/devices يرفض بلا بوابة موثّقة', async () => {
        gateMock.mockResolvedValue({
            ok: false,
            response: new Response(JSON.stringify({ ok: false }), { status: 403 }),
        });
        const res = await devicesGet(jsonReq('https://app.test/api/admin/devices', undefined, 'GET'));
        expect(res.status).toBe(403);
        expect(listDevicesMock).not.toHaveBeenCalled();
    });

    it('GET /api/admin/devices يعيد تلميح البصمة لا البصمة كاملة', async () => {
        const res = await devicesGet(jsonReq('https://app.test/api/admin/devices', undefined, 'GET'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { devices?: Array<Record<string, unknown>> };
        expect(body.devices?.[0]).toMatchObject({ id: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff', hint: 'abcd…wxyz' });
        expect(JSON.stringify(body)).not.toContain('device_fingerprint');
        expect(listDevicesMock).toHaveBeenCalledWith(
            expect.objectContaining({ userId: ADMIN, currentFingerprint: 'admin-device-aaaa' }),
        );
    });

    it('POST /api/admin/devices يسحب الثقة عن جهاز UUID', async () => {
        const res = await devicesPost(
            jsonReq('https://app.test/api/admin/devices', {
                action: 'revoke',
                deviceId: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
            }),
        );
        expect(res.status).toBe(200);
        expect(revokeDeviceMock).toHaveBeenCalledWith({
            userId: ADMIN,
            deviceId: 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff',
        });
        expect(revokeCurrentDeviceMock).not.toHaveBeenCalled();
    });

    it('POST /api/admin/devices يسحب ثقة الجهاز الحالي دون UUID', async () => {
        const res = await devicesPost(
            jsonReq('https://app.test/api/admin/devices', { action: 'revoke_current' }),
        );
        expect(res.status).toBe(200);
        expect(revokeCurrentDeviceMock).toHaveBeenCalledWith({
            userId: ADMIN,
            deviceFingerprint: 'admin-device-aaaa',
        });
        expect(revokeDeviceMock).not.toHaveBeenCalled();
    });

    it('POST /api/admin/devices يرفض معرّفاً غير UUID', async () => {
        const res = await devicesPost(
            jsonReq('https://app.test/api/admin/devices', { action: 'revoke', deviceId: 'device-1' }),
        );
        expect(res.status).toBe(400);
        expect(revokeDeviceMock).not.toHaveBeenCalled();
    });

    it('POST /api/admin/account يرفض UUID غير صالح', async () => {
        const res = await accountPost(
            jsonReq('https://app.test/api/admin/account', { action: 'revoke_sessions', targetUserId: 'victim' }),
        );
        expect(res.status).toBe(400);
    });

    it('POST /api/admin/account يرفض تعديل مدير المنصّة', async () => {
        const res = await accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'set_password',
                targetUserId: HAMI_PLATFORM_ADMIN_UUID,
                password: 'HamiLaw9x',
            }),
        );
        expect(res.status).toBe(403);
        expect(updateUserByIdMock).not.toHaveBeenCalled();
    });

    it('POST /api/admin/account يرفض تعديل الحساب الحالي', async () => {
        getClientMock.mockClear();
        const res = await accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'freeze',
                targetUserId: ADMIN,
                durationHours: 0,
            }),
        );
        expect(res.status).toBe(400);
        expect(getClientMock).not.toHaveBeenCalled();
    });

    it('POST /api/admin/account يغيّر كلمة السر دون تسجيلها في التدقيق', async () => {
        const password = 'HamiLaw9x';
        const res = await accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'set_password',
                targetUserId: TARGET,
                password,
            }),
        );
        expect(res.status).toBe(200);
        expect(updateUserByIdMock).toHaveBeenCalledWith(TARGET, { password });
        expect(auditMock).toHaveBeenCalled();
        const auditPayload = JSON.stringify(auditMock.mock.calls);
        expect(auditPayload).not.toContain(password);
        expect(auditPayload).toContain('user.set_password');
    });

    it('POST /api/admin/account يرفض تعديل حساب إدارة', async () => {
        profilesUpdateEqMock.mockClear();
        fetchUserMock.mockResolvedValueOnce({
            id: TARGET,
            email: 't@t.t',
            fullName: 'هدف',
            familyName: '',
            phone: '',
            governorate: '',
            lawyerBarRoom: '',
            role: 'admin',
            status: 'active',
            createdAt: '2020-01-01T00:00:00.000Z',
            freezeUntil: null,
            verificationStatus: 'none',
        });
        const res = await accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'freeze',
                targetUserId: TARGET,
                durationHours: 24,
            }),
        );
        expect(res.status).toBe(403);
        expect(profilesUpdateEqMock).not.toHaveBeenCalled();
    });

    it('POST /api/admin/account يعيد 404 إن غاب المستخدم', async () => {
        fetchUserMock.mockResolvedValueOnce(null);
        const res = await accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'revoke_sessions',
                targetUserId: TARGET,
            }),
        );
        expect(res.status).toBe(404);
    });

    it('POST /api/admin/account يجمّد مؤقتاً بمدة صريحة', async () => {
        const res = await accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'freeze',
                targetUserId: TARGET,
                durationHours: 24,
            }),
        );
        expect(res.status).toBe(200);
        expect(profilesUpdateEqMock).toHaveBeenCalled();
        expect(updateUserByIdMock).toHaveBeenCalledWith(TARGET, { ban_duration: 'none' });
        expect(auditMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'user.freeze_timed',
                details: { durationHours: 24 },
            }),
        );
    });

    it('POST /api/admin/account يقفل الدخول بمدة صريحة', async () => {
        const res = await accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'lock_login',
                targetUserId: TARGET,
                durationHours: 24,
            }),
        );
        expect(res.status).toBe(200);
        expect(profilesUpdateEqMock).toHaveBeenCalled();
        expect(updateUserByIdMock).toHaveBeenCalledWith(TARGET, { ban_duration: '24h' });
        expect(auditMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'user.lock_login_timed',
                details: { durationHours: 24 },
            }),
        );
    });

    it('POST /api/admin/account يحذف من الدليل ويقفل الدخول', async () => {
        const res = await accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'soft_delete',
                targetUserId: TARGET,
            }),
        );
        expect(res.status).toBe(200);
        expect(updateUserByIdMock).toHaveBeenCalledWith(TARGET, { ban_duration: '876000h' });
        expect(auditMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'user.soft_delete',
            }),
        );
    });

    it('POST /api/admin/account يرفض حظر منتدى بلا سبب', async () => {
        const res = await accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'forum_ban',
                targetUserId: TARGET,
                reason: 'لا',
            }),
        );
        expect(res.status).toBe(400);
    });

    it('POST /api/admin/account يضع علامة التوثيق العامة بقرار المقر لا اعتماد الهوية', async () => {
        let payload: Record<string, unknown> | null = null;
        getClientMock.mockReturnValue({
            from: () => ({
                update: (next: Record<string, unknown>) => {
                    payload = next;
                    return { eq: profilesUpdateEqMock };
                },
                insert: vi.fn(async () => ({ error: null })),
            }),
            auth: {
                admin: {
                    updateUserById: updateUserByIdMock,
                    signOut: vi.fn(async () => ({ error: null })),
                },
            },
        });
        fetchUserMock.mockResolvedValue({
            id: TARGET,
            email: 't@t.t',
            fullName: 'هدف',
            familyName: '',
            phone: '',
            governorate: '',
            lawyerBarRoom: '',
            role: 'lawyer',
            status: 'active',
            createdAt: '2020-01-01T00:00:00.000Z',
            freezeUntil: null,
            verificationStatus: 'pending',
            publicVerifiedBadge: true,
        });
        const res = await accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'public_badge',
                targetUserId: TARGET,
                shown: true,
            }),
        );
        expect(res.status).toBe(200);
        expect(payload?.public_verified_badge).toBe(true);
        expect(auditMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: 'user.public_badge',
                details: { shown: true },
            }),
        );
    });

    it('POST /api/admin/account يرفض علامة توثيق بلا shown صريح', async () => {
        profilesUpdateEqMock.mockClear();
        const res = await accountPost(
            jsonReq('https://app.test/api/admin/account', {
                action: 'public_badge',
                targetUserId: TARGET,
            }),
        );
        expect(res.status).toBe(400);
        expect(profilesUpdateEqMock).not.toHaveBeenCalled();
    });
});

describe('أمان المصدر — مقر القيادة', () => {
    it('المستودع لا يستدعي RPC من المتصفح', () => {
        const src = fs.readFileSync(
            path.join(process.cwd(), 'src/app/data/admin/SupabaseAdminRepository.ts'),
            'utf8',
        );
        expect(src).not.toContain('admin_list_users');
        expect(src).not.toContain('admin_change_user_role');
        expect(src).not.toContain('admin_toggle_user_status');
        expect(src).toContain('hqDirectorySearchParams');
        expect(src).toContain("cache: 'no-store'");
        expect(src).toContain('/api/admin/role');
        expect(src).not.toContain('/api/admin/ban');
        expect(src).toContain('/api/admin/account');
        expect(src).toContain('public_badge');
        expect(src).toContain('setPublicVerifiedBadge');
        expect(src).toContain('/api/admin/notify');
        expect(src).not.toContain('toggleUserStatus');
        expect(src).not.toMatch(/from ['"]@\/lib\/supabase['"]/);
        const directoryQuery = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/admin/hqDirectoryQuery.ts'),
            'utf8',
        );
        expect(directoryQuery).toContain('/api/admin/users');
        const directoryScaleSql = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260829030000_hq_directory_scale.sql'),
            'utf8',
        );
        expect(directoryScaleSql).toContain('hq_directory_identities');
        expect(directoryScaleSql).toContain('REVOKE ALL ON FUNCTION public.hq_directory_identities(uuid[]) FROM authenticated');
        expect(directoryScaleSql).toContain('GRANT EXECUTE ON FUNCTION public.hq_directory_identities(uuid[]) TO service_role');
        expect(directoryScaleSql).toContain('idx_profiles_hq_created_at');
    });

    it('طفرات القوانين وطابور التوثيق تمر من بوابة المقر', () => {
        const laws = fs.readFileSync(path.join(process.cwd(), 'src/app/api/laws/lawsAdminAuth.ts'), 'utf8');
        const verification = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/auth/lawyer-verification/route.ts'),
            'utf8',
        );
        expect(laws).toContain('requireTrustedHeadquartersAdmin');
        expect(verification).toContain('requireTrustedHeadquartersAdmin');
        expect(verification).toContain("scope === 'pending'");
        expect(verification).toContain("scope === 'all'");
        expect(verification).toContain('toHqQueueRecord');
        expect(verification).toContain('سبب الرفض مطلوب');
        expect(verification).toContain('kvReadHqVerificationQueueByPrefix');
        expect(verification).toContain('attachHqQueueLiveNames');
        expect(verification).toContain('hqLiveNameDivergesFromKyc');
        expect(verification).toContain('ID_DOCUMENTS_REQUIRED');
        expect(verification).toContain('toHqSelfStatusRecord');
        expect(verification).toContain('toHqDossierRecord');
        expect(verification).toContain('wifeJsonNoStore');
        expect(verification).not.toContain('kvGetByPrefix');
    });

    it('سطح المقر ليس عاماً: أصل اختياري + عميل أصلي + حزمة المحامي بلا المقر', () => {
        const originGate = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/security/headquartersOriginGate.ts'),
            'utf8',
        );
        const trusted = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/security/requireTrustedHeadquartersAdmin.ts'),
            'utf8',
        );
        const cookie = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/security/requireHeadquartersCookieAuth.ts'),
            'utf8',
        );
        const verify = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/admin/verify/route.ts'),
            'utf8',
        );
        const slug = fs.readFileSync(path.join(process.cwd(), 'src/app/api/vercelNodeHandler.ts'), 'utf8');
        const vite = fs.readFileSync(path.join(process.cwd(), 'vite.config.mts'), 'utf8');
        const pkg = fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8');
        expect(originGate).toContain('HAMI_HQ_HOSTS');
        expect(originGate).toContain('HAMI_HQ_ALLOW_THIS_DEPLOYMENT');
        expect(originGate).toContain('VERCEL_ENV');
        expect(originGate).toContain('isHeadquartersOnlyApiPath');
        expect(originGate).toContain('/api/auth/lawyer-verification');
        expect(originGate).toContain('rejectHeadquartersPublicSurface');
        expect(trusted).toContain('rejectHeadquartersPublicSurface');
        expect(trusted.indexOf('const surface = rejectHeadquartersPublicSurface')).toBeLessThan(
            trusted.indexOf('unwrapWifeUser(await requireWifeUser'),
        );
        expect(cookie).toContain('rejectHeadquartersPublicSurface');
        expect(cookie.indexOf('const surface = rejectHeadquartersPublicSurface')).toBeLessThan(
            cookie.indexOf('if (!assertSameOriginRequest'),
        );
        expect(verify).toContain('rejectHeadquartersPublicSurface');
        expect(slug).toContain('rejectHeadquartersPublicSurface');
        expect(slug).toContain('isHeadquartersOnlyApiPath');
        expect(vite).toContain('rejectHeadquartersPublicSurface');
        expect(vite).toContain('isHeadquartersOnlyApiPath');
        expect(pkg).toContain('guard-dist-no-hq-runtime.mjs');
        const capAndroid = fs.readFileSync(path.join(process.cwd(), 'scripts/cap-sync-android.mjs'), 'utf8');
        const capNative = fs.readFileSync(path.join(process.cwd(), 'scripts/cap-sync-native.mjs'), 'utf8');
        expect(capAndroid).toContain('guard-dist-no-hq-runtime.mjs');
        expect(capNative).toContain('guard-dist-no-hq-runtime.mjs');
        const hqVercel = fs.readFileSync(path.join(process.cwd(), 'vercel-hq.json'), 'utf8');
        const lawyerVercel = fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8');
        expect(hqVercel).toContain('build:hq:vercel');
        expect(hqVercel).toContain('dist-hq');
        expect(lawyerVercel).toContain('vercel-product-build.mjs');
        expect(lawyerVercel).not.toContain('build:hq:vercel');
        expect(lawyerVercel).toContain('"outputDirectory": "dist"');
        expect(lawyerVercel).toContain('"installCommand": "npm install --include=dev"');
        expect(hqVercel).toContain('"installCommand": "npm install --include=dev"');
        const pkgJson = JSON.parse(pkg) as {
            dependencies?: Record<string, string>;
        };
        expect(pkgJson.dependencies?.vite).toBeTruthy();
        expect(pkgJson.dependencies?.['@vitejs/plugin-react']).toBeTruthy();
        expect(pkg).toContain('build:hq:vercel');
    });

    it('إحصائيات واستشارات المقر تمر من البوابة الموثّقة', () => {
        const dash = fs.readFileSync(path.join(process.cwd(), 'src/app/components/AdminDashboard.tsx'), 'utf8');
        const stats = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/stats/route.ts'), 'utf8');
        const consultations = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/admin/consultations/route.ts'),
            'utf8',
        );
        expect(dash).toContain('HqCourtStatsPanel');
        expect(dash).toContain('admin-hq-shell.css');
        expect(dash).toContain('aria-label={label}');
        expect(dash).toContain('HqForumAdminPanel');
        expect(dash).not.toContain('HqConsultationsPanel');
        expect(dash).toContain('١–٦ للتنقّل');
        expect(dash).toContain('HqAuditLogPanel');
        expect(dash).toContain('HqTrustedDevicesPanel');
        expect(dash).toContain('mail={live.mail}');
        expect(dash).toContain('checking={live.system === \'checking\'}');
        expect(dash).toContain('HqKeepAlivePane');
        expect(dash).toContain('useHqTabKeepAlive');
        const keepAlive = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HqKeepAlivePane.tsx'),
            'utf8',
        );
        expect(keepAlive).toContain('HqPaneActiveContext');
        const liveReload = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/useHqLiveReload.ts'),
            'utf8',
        );
        expect(liveReload).toContain('dirtyRef');
        expect(liveReload).toContain('useHqPaneActive');
        expect(dash).toContain('إنهاء الجلسة');
        expect(dash).toContain('data-testid="hq-end-session"');
        expect(dash).toContain('endHeadquartersTrustedSession');
        expect(dash).toContain('handleEndSession');
        expect(dash).toContain('if (!revoked)');
        expect(dash).not.toContain('غادرت المقر.');
        expect(dash).not.toContain('بحث الدلالي');
        expect(dash).toContain('initialCreatedFilter');
        expect(dash).toContain('initialForumTab');
        expect(dash).toContain('initialFocus={reportFocus}');
        expect(dash).toContain('verificationStatus');
        expect(dash).not.toContain('aria-label="العودة"');
        expect(dash).toContain('liveOverview');
        expect(dash).toContain('hqReportsTotalOrDash');
        expect(dash).toContain('hqCountOrDash');
        expect(dash).toContain('initialRoleFilter');
        expect(dash).toContain('toHqLiveOverview');
        expect(dash).toContain('onWarm');
        expect(dash).not.toContain("activeTab === 'monitor' &&");
        expect(dash).not.toContain("activeTab === 'users' &&");
        expect(dash).not.toContain('useApp');
        const usersPanel = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HeadquartersPanel.tsx'),
            'utf8',
        );
        expect(usersPanel).toContain('HeadquartersUserRow');
        expect(usersPanel).toContain('HQ_DIRECTORY_RENDER_CAP');
        expect(usersPanel).toContain('HQ_DIRECTORY_PAGE_SIZE');
        expect(usersPanel).toContain('directoryQuery');
        expect(usersPanel).toContain('serverPaged');
        expect(usersPanel).toContain('hq-dir-item-open');
        expect(usersPanel).toContain('setQuery(\'\')');
        expect(usersPanel).not.toContain('setQuery(id)');
        expect(usersPanel).toContain('matchesHqUserQuery');
        const directoryMatch = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/admin/hqDirectoryMatch.ts'),
            'utf8',
        );
        expect(directoryMatch).toContain('previousLegalDisplayName');
        expect(directoryMatch).toContain('name_mismatch');
        expect(directoryMatch).toContain('hqLiveNameDivergesFromKyc');
        expect(usersPanel).not.toContain('HQ_FREEZE_DURATION_OPTIONS');
        expect(usersPanel).toContain('unfreezeAccount');
        expect(usersPanel).toContain('HqSystemNotifyComposer');
        expect(usersPanel).toContain('result.sent <= 0');
        expect(usersPanel).toContain("SmartToast.error('تعذّر إرسال إشعار النظام')");
        expect(usersPanel).not.toContain('الحذف من الدليل يُقفل الدخول');
        expect(usersPanel).toContain('lockLogin');
        expect(usersPanel).toContain('softDeleteAccount');
        expect(usersPanel).toContain('onLoadActivity');
        expect(usersPanel).not.toContain('مسح الحساب كلياً غير متاح');
        expect(usersPanel).toContain('initialRoleFilter');
        expect(usersPanel).toContain('initialCreatedFilter');
        expect(usersPanel).toContain('matchesHqUserCreatedFilter');
        expect(usersPanel).toContain('matchesHqUserStatusFilter');
        expect(usersPanel).toContain('resolveHqUserPresence');
        expect(usersPanel).toContain('قيد التدقيق');
        expect(usersPanel).toContain('بلا طلب');
        expect(usersPanel).toContain('معتمد');
        expect(usersPanel).toContain('isHqUserMutationLocked');
        expect(usersPanel).toContain('refreshing');
        expect(usersPanel).toContain('setPublicVerifiedBadge');
        expect(usersPanel).toContain('onTogglePublicBadge');
        const userRow = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HeadquartersUserRow.tsx'),
            'utf8',
        );
        expect(userRow).toContain('HQ_FREEZE_DURATION_OPTIONS');
        expect(userRow).toContain('onTogglePublicBadge');
        expect(userRow).toContain('hq-public-badge-');
        expect(userRow).toContain('previousLegalDisplayName');
        expect(userRow).toContain('الاسم السابق');
        expect(userRow).toContain('HqNameMismatchAlert');
        expect(userRow).toContain('hqDirectoryStatusLabel');
        expect(userRow).toContain('hq-dir-badge-unsubmitted');
        expect(userRow).toContain('hq-dir-card-actions');
        expect(userRow).toContain('aria-expanded');
        const hqHook = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/useHeadquarters.ts'),
            'utf8',
        );
        expect(hqHook).not.toContain('toggleStatus');
        expect(hqHook).toContain('HQ_DIRECTORY_LOAD_BUDGET_MS');
        expect(hqHook).toContain('HQ_DIRECTORY_QUERY_DEBOUNCE_MS');
        expect(hqHook).toContain('queryKey');
        expect(hqHook).toContain('raceDirectoryFetch');
        expect(hqHook).toContain('dispatchHqStatusRefresh');
        expect(hqHook).toContain('HQ_VERIFICATION_CHANGED_EVENT');
        expect(hqHook).toContain('useHqLiveReload');
        expect(hqHook).toContain('firstPaintInFlight');
        expect(hqHook).toContain('queuedLiveRef');
        expect(hqHook).toContain('setPublicVerifiedBadge');
        expect(hqHook).not.toMatch(/فشل حظر المنتدى',\s*false/);
        expect(hqHook).not.toMatch(/فشل رفع حظر المنتدى',\s*false/);
        const lawEntry = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/useAdminLawEntry.ts'),
            'utf8',
        );
        expect(lawEntry).toContain('dispatchHqStatusRefresh');
        expect(stats).toContain('requireTrustedHeadquartersAdmin');
        expect(stats).not.toContain('loadHeadquartersStatus');
        expect(stats).toContain('listHeadquartersCourtStatsCached');
        expect(stats).toContain('wifeJsonNoStore');
        const usersRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/users/route.ts'), 'utf8');
        expect(usersRoute).toContain('wifeJsonNoStore');
        expect(usersRoute).toContain('parseHqDirectoryListQuery');
        expect(usersRoute).not.toContain('wifeJsonResponse');
        expect(consultations).toContain('requireTrustedHeadquartersAdmin');
        expect(consultations).toContain('listHeadquartersConsultations');
        expect(consultations).toContain('deleteHeadquartersConsultation');
        expect(consultations).toContain('notifyHeadquartersModeration');
        expect(consultations).toContain('setHeadquartersPostFlags');
        expect(consultations).toContain('auditRecorded');
        expect(consultations).toContain('isPostgresUuidSubject');
        expect(consultations).not.toContain('ForumRepository');
        expect(consultations).not.toContain('deletePostAuthorized');
        expect(dash).toContain('useHeadquartersStatus');
        expect(dash).toContain('pendingVerification');
        expect(dash).toContain('pendingReports');
        expect(dash).toContain('tabFromShortcut');
        expect(dash).toContain('formatHqBadge');
        const forumStats = fs.readFileSync(path.join(process.cwd(), 'src/app/api/forum/stats/route.ts'), 'utf8');
        expect(forumStats).toContain('loadForumOfficialStats');
        expect(forumStats).not.toContain('getForumStats');
        const reportsInbox = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HqReportsInbox.tsx'),
            'utf8',
        );
        expect(reportsInbox).toContain('dispatchHqStatusRefresh');
        expect(reportsInbox).toContain('useHqLiveReload');
        expect(reportsInbox).toContain('useHqPanelLoad');
        expect(reportsInbox).toContain('dismiss_comment');
        expect(reportsInbox).toContain('delete_comment');
        expect(reportsInbox).toContain('sanitizeHqPostReportRows');
        expect(reportsInbox).not.toContain('reporterId');
        const forumPanel = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HqForumAdminPanel.tsx'),
            'utf8',
        );
        const verificationPanel = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/AdminLawyerVerificationRequests.tsx'),
            'utf8',
        );
        const consultPanel = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HqConsultationsPanel.tsx'),
            'utf8',
        );
        const statsPanel = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HqCourtStatsPanel.tsx'),
            'utf8',
        );
        const statsLive = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HqStatsLiveSections.tsx'),
            'utf8',
        );
        const statusLogic = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/security/headquartersStatus.ts'),
            'utf8',
        );
        expect(forumPanel).toContain('useHqPanelLoad');
        expect(forumPanel).toContain('useHqLiveReload');
        expect(forumPanel).toContain('setPostsEpoch');
        expect(forumPanel).toContain("onClick={() => setForumTab('bans')}");
        expect(forumPanel).toContain('expiresAt');
        expect(forumPanel).toContain('durationHours');
        expect(forumPanel).toContain('sanitizeHqBannedUserRows');
        expect(forumPanel).toContain('HqConsultationsPanel');
        expect(forumPanel).toContain("forumTab === 'posts'");
        expect(forumPanel).not.toContain('مسح الحساب كلياً غير متاح');
        expect(verificationPanel).toContain('useHqPanelLoad');
        expect(verificationPanel).toContain('useHqLiveReload');
        expect(verificationPanel).toContain("fetchLawyerVerifications('all'");
        expect(verificationPanel).toContain('HqVerificationRequestCard');
        expect(verificationPanel).toContain('hqVerificationCanApprove');
        expect(verificationPanel).toContain('dispatchHqVerificationChanged');
        expect(verificationPanel).toContain('بلا طلب');
        expect(verificationPanel).not.toContain('القبول يضع شارة الدليل');
        expect(verificationPanel).not.toContain('setLawyerVerificationStatus');
        expect(verificationPanel).not.toContain('idFrontPreview');
        expect(verificationPanel).not.toContain('object-cover');
        expect(consultPanel).toContain('useHqPanelLoad');
        expect(consultPanel).toContain("'pin'");
        expect(consultPanel).toContain('sanitizeHqConsultationRows');
        expect(consultPanel).toContain('replyCount');
        expect(consultPanel).toContain('dispatchHqStatusRefresh');
        expect(consultPanel).toContain('useHqLiveReload');
        expect(consultPanel).not.toContain('لم يتم الرد (متوقفة)');
        expect(statsPanel).toContain('useHqPanelLoad');
        expect(statsPanel).toContain('liveOverview');
        expect(statsPanel).toContain('dispatchHqStatusRefresh');
        expect(statsPanel).toContain('HqStatsLiveSections');
        expect(statsPanel).toContain('HqMailHealthStrip');
        expect(statsPanel).toContain('hq-ops');
        expect(statsPanel).toContain('آخر تحديث');
        expect(statsPanel).toContain('sanitizeHqCourtRows');
        expect(statsPanel).toContain('/api/admin/stats?fresh=1');
        expect(statsPanel).not.toContain('لا توجد دعاوى أو معاملات تنفيذ سحابية');
        expect(statsPanel).not.toContain('مزامنة الإضبارات');
        expect(statsLive).toContain('حسابات نشطة');
        expect(statsLive).toContain('توثيق معتمد');
        expect(statsLive).toContain('بلاغات تعليقات معلّقة');
        expect(statsLive).toContain('منشورات عامة');
        expect(statsLive).toContain('pendingHqReportsTotal');
        expect(statsLive).toContain('يحتاج إجراء الآن');
        expect(statsLive).toContain('حظر منتدى ساري');
        expect(statsLive).toContain('حسابات آخر 24 ساعة');
        expect(statsLive).toContain('hqAccountsSummary');
        expect(statsLive).toContain('foldId="accounts"');
        expect(statsLive).toContain('مقفل الدخول');
        expect(statsLive).toContain('hq-ops-cluster');
        const foldUi = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HqFold.tsx'),
            'utf8',
        );
        const foldHook = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/useHqFold.ts'),
            'utf8',
        );
        expect(foldUi).toContain('aria-expanded');
        expect(foldUi).toContain('طي القسم');
        expect(foldHook).toContain('sessionStorage');
        expect(foldHook).toContain('hami:hq-fold:v1');
        expect(foldHook).not.toContain('localStorage');
        const hqCss = fs.readFileSync(path.join(process.cwd(), 'src/styles/admin-hq-shell.css'), 'utf8');
        expect(hqCss).toContain('.hq-fold');
        expect(hqCss).toContain('.hq-fold-panel[hidden]');
        expect(hqCss).toContain('.hq-verify-card');
        expect(hqCss).toContain('.hq-verify-peek');
        expect(hqCss).toContain('object-fit: contain');
        const auditPanel = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HqAuditLogPanel.tsx'),
            'utf8',
        );
        expect(auditPanel).toContain('HqFold');
        expect(auditPanel).toContain('id="audit"');
        expect(auditPanel).toContain('useHqLiveReload');
        expect(auditPanel).toContain('hqAuditActionLabel');
        expect(auditPanel).toContain('hqAuditFactsCaption');
        const auditLabels = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/admin/hqAuditLabels.ts'),
            'utf8',
        );
        expect(auditLabels).toContain('حذف منشور');
        expect(auditLabels).toContain('تصحيح الاسم الثلاثي');
        expect(auditLabels).toContain('طلب التوثيق');
        expect(auditPanel).toContain('row.actorId');
        expect(auditLabels).toContain('من «');
        expect(auditPanel).not.toContain('حذف استشارة');
        expect(statusLogic).toContain('pendingCommentReports');
        expect(statusLogic).toContain('verificationApproved');
        expect(statusLogic).toContain('forumBansActive');
        expect(statusLogic).toContain('usersNew24h');
        expect(statusLogic).toContain("q.is('group_id', null)");
        expect(statusLogic).toContain("headCount(admin, 'forum_comments')");
        expect(statusLogic).toContain("columns = '*'");
        expect(statusLogic).not.toContain("columns = 'id'");
        expect(statusLogic).not.toContain('forum_posts!post_id!inner(group_id)');
        expect(statusLogic).toContain('contentPartial');
        expect(statusLogic).toContain('contentGaps');
        expect(statusLogic).toContain('usersLocked');
        expect(statusLogic).toContain('hqFrozenProfilesOrFilter');
        expect(statusLogic).toContain('emptyHeadquartersStatus');
        expect(statusLogic).toContain('kvReadJsonStatusByPrefix');
        expect(statusLogic).toContain('verificationCapped');
        expect(statusLogic).not.toContain('kvGetByPrefix');
        const hqUsersSrc = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/security/headquartersUsers.ts'),
            'utf8',
        );
        expect(hqUsersSrc).toContain('kycSubmittedName');
        expect(hqUsersSrc).toContain('listHeadquartersUsers');
        expect(hqUsersSrc).toContain('resolveHqDirectoryKycStatus');
        expect(hqUsersSrc).toContain('app.verification_status');
        expect(hqUsersSrc).not.toContain('user_metadata.verificationStatus');
        expect(hqUsersSrc).not.toContain('kvGetByPrefix');
        expect(hqUsersSrc).not.toContain('listUsers({ page');
        const hqDirSrc = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/security/headquartersDirectoryList.ts'),
            'utf8',
        );
        expect(hqDirSrc).toContain('kvReadUserStatusMapByKeys');
        expect(hqDirSrc).toContain('hq_directory_identities');
        expect(hqDirSrc).toContain('range(');
        expect(hqDirSrc).not.toContain('loadAuthIdentityMap');
        expect(hqDirSrc).not.toContain('kvReadUserStatusMapByPrefix');
        expect(hqDirSrc).not.toContain('listUsers(');
        const statusHook = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/useHeadquartersStatus.ts'),
            'utf8',
        );
        expect(statusHook).toContain('markHqStatusFetchFailed');
        expect(statusHook).toContain('markHqStatusFetched');
        expect(statusHook).toContain('fresh=1');
        expect(statusHook).toContain('AbortController');
        expect(statusHook).toContain('inflightRef.current = false');
        expect(statusHook).toContain('abortRef.current = null');
        const devicesPanel = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HqTrustedDevicesPanel.tsx'),
            'utf8',
        );
        expect(devicesPanel).toContain('وُثّق في');
        expect(devicesPanel).toContain('آخر دخول للمقر');
        expect(devicesPanel).toContain('تنتهي الثقة');
        expect(devicesPanel).toContain('formatHqRemaining');
        expect(devicesPanel).toContain('HqFold');
        expect(devicesPanel).not.toContain('device_fingerprint');
        const reportsRoute = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/forum/reports/route.ts'),
            'utf8',
        );
        const banRoute = fs.readFileSync(path.join(process.cwd(), 'src/app/api/forum/ban/route.ts'), 'utf8');
        expect(reportsRoute).toContain('listHeadquartersPendingReports');
        expect(reportsRoute).toContain('listHeadquartersPendingCommentReports');
        expect(reportsRoute).toContain('requireTrustedHeadquartersAdmin');
        expect(reportsRoute).toContain('isPostgresUuidSubject');
        expect(reportsRoute).toContain('loadPendingForumReport');
        expect(reportsRoute).toContain('listPendingPostReportNotices');
        expect(reportsRoute).toContain("action !== 'delete_post'");
        expect(reportsRoute).not.toContain('ForumRepository');
        expect(banRoute).toContain('listHeadquartersBannedUsers');
        expect(banRoute).toContain('requireTrustedHeadquartersAdmin');
        expect(banRoute).toContain('notifyHeadquartersForumStatus');
        expect(banRoute).toContain('resolveHeadquartersControlTarget');
        expect(banRoute).toContain('resolveHqForumBanExpiry');
        expect(banRoute).toContain('composeLawyerDirectoryName');
        expect(banRoute).not.toContain('ForumRepository');
        const cookieAuth = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/security/requireHeadquartersCookieAuth.ts'),
            'utf8',
        );
        expect(cookieAuth).toContain('verifyCsrfToken');
        expect(cookieAuth).toContain('assertSameOriginRequest');
        const otpClient = fs.readFileSync(
            path.join(process.cwd(), 'src/app/services/admin/adminHeadquartersOtpClient.ts'),
            'utf8',
        );
        expect(otpClient).toContain('CSRF_META_NAME');
        expect(otpClient).toContain('/api/admin/otp/csrf');
        expect(otpClient).toContain('setCsrfSessionTokenFromServer');
        expect(otpClient).toContain('x-wife-device-id');
        expect(otpClient).toContain("'unavailable'");
        expect(otpClient).not.toContain('revokeDeviceTrust');
        const otpStore = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/security/adminOtpStore.ts'),
            'utf8',
        );
        expect(otpStore).toContain('burnOpenAdminOtpChallenges');
        expect(otpStore).toContain('TRUST_TTL_MS_PROD');
        expect(otpStore).toContain('deviceFingerprintMatchesRequest');
        expect(otpStore).toContain('listAdminTrustedDevices');
        expect(otpStore).toContain('fingerprintHint');
        expect(otpStore).toContain('.limit(1)');
        const otpRequest = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/admin/otp/request/route.ts'),
            'utf8',
        );
        expect(otpRequest).toContain('isAdminMailerConfigured');
        expect(otpRequest).toContain('hqMailerBlockReason');
        expect(otpRequest).toContain('delivered: true');
        expect(otpRequest).toContain('mailMode: mail.mode');
        expect(otpRequest).not.toContain("mailMode: 'gotrue'");
        expect(otpRequest).not.toContain('sendHeadquartersMailboxOtp');
        expect(otpRequest).toContain('mailboxDigitsFromConfirmCode');
        expect(otpRequest).not.toContain('${challenge.code}');
        expect(otpRequest).not.toContain('devCode');
        expect(otpStore).toContain('randomInt(1, 10)');
        const otpMailer = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/security/adminMailer.ts'),
            'utf8',
        );
        expect(otpMailer).toContain('EMAIL_WEBHOOK_URL');
        expect(otpMailer).toContain('isHqSmtpConfigured');
        expect(otpMailer).toContain('hqMailerChannel');
        expect(otpMailer).not.toContain('signInWithOtp');
        const otpSmtp = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/security/adminMailerSmtp.ts'),
            'utf8',
        );
        expect(otpSmtp).toContain('EMAIL_SMTP_HOST');
        expect(otpSmtp).toContain('STARTTLS');
        const otpVerify = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/admin/otp/verify/route.ts'),
            'utf8',
        );
        expect(otpVerify).toContain('consumeAdminOtpChallenge');
        expect(otpVerify).toContain('otp.device_trusted');
        expect(otpVerify).toContain('auditRecorded');
        expect(otpVerify).toContain('wifeJsonResponse(400, { ok: false, error: consumed.error })');
        expect(otpVerify).not.toContain('wifeJsonResponse(401, { ok: false, error: consumed.error })');
        expect(otpVerify).not.toContain('deviceFingerprint.slice');
        expect(otpVerify).not.toContain('verifyHeadquartersMailboxOtp');
        const magicLinkTemplate = fs.readFileSync(
            path.join(process.cwd(), 'supabase/templates/magic_link.html'),
            'utf8',
        );
        expect(magicLinkTemplate).toContain('{{ .Token }}');
        expect(magicLinkTemplate).not.toContain('ConfirmationURL');
        const supabaseClient = fs.readFileSync(
            path.join(process.cwd(), 'src/lib/supabaseClient.js'),
            'utf8',
        );
        expect(supabaseClient).toContain('scrubBrokenAuthHashFromAddress');
        const otpGate = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/RequireTrustedDevice.tsx'),
            'utf8',
        );
        expect(otpGate).toContain("setPhase('verify')");
        expect(otpGate).toContain('beginHold');
        expect(otpGate).toContain("probe === 'trusted'");
        expect(otpGate).toContain('isDeviceTrustedLocally');
        expect(otpGate).toContain("probe === 'unavailable'");
        expect(otpGate).toContain('تعذّر التحقق من الجهاز الموثّق');
        expect(otpGate).toContain('admin-otp-session-login');
        expect(otpGate).toContain('admin-otp-retry-probe');
        expect(otpGate).not.toContain('completeWithCode(result.devCode');
        const deviceIdSrc = fs.readFileSync(path.join(process.cwd(), 'src/app/security/deviceId.ts'), 'utf8');
        expect(deviceIdSrc).toContain('document.cookie');
        expect(deviceIdSrc).toContain('persistDeviceId');
        const hiddenDoor = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HeadquartersHiddenDoor.tsx'),
            'utf8',
        );
        expect(hiddenDoor).toContain('BlankDocumentLayer');
        expect(hiddenDoor).toContain('beginHold');
        expect(hiddenDoor).toContain('allowDevShortcut');
        expect(hiddenDoor).toContain('import.meta.env.DEV');
        expect(hiddenDoor).not.toContain('hami-splash-logo');
        expect(hiddenDoor).not.toContain('HamiBootOverlay');
        expect(hiddenDoor).not.toContain('410 Gone');
        const otpStatus = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/admin/otp/status/route.ts'),
            'utf8',
        );
        expect(otpStatus).toContain('sessionRequired: true');
        expect(otpStatus).toContain('authGate.response.status === 401');
        const verifyRoute = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/admin/verify/route.ts'),
            'utf8',
        );
        expect(verifyRoute).toContain('assertSameOriginRequest');
        expect(verifyRoute).toContain('rejectHeadquartersPublicSurface');
        expect(verifyRoute).not.toContain('uuidConfigured');
        expect(verifyRoute).not.toContain('profileRole');
        const auditRoute = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/audit/log/route.ts'),
            'utf8',
        );
        expect(auditRoute).toContain('/^hq\\s*:/i');
        expect(auditRoute).toContain('CLIENT_AUDIT_ACTIONS');
        expect(auditRoute).toContain('clipClientAuditDetails');
        const roleRoute = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/admin/role/route.ts'),
            'utf8',
        );
        expect(roleRoute).toContain('revokeTokenSessionsForSubject');
        expect(banRoute).toContain('isPostgresUuidSubject');
        const networkFeatures = fs.readFileSync(
            path.join(process.cwd(), 'src/app/services/secureApiNetworkFeatures.ts'),
            'utf8',
        );
        expect(networkFeatures).toContain('isHamiPlatformAdminUserId');
        const forumAdminLoad = fs.readFileSync(
            path.join(process.cwd(), 'src/app/services/forum/loadForumSupabaseAdmin.ts'),
            'utf8',
        );
        expect(forumAdminLoad).toContain("import('@/app/api/security/supabaseAdminClient.ts')");
        expect(forumAdminLoad).not.toContain('@vite-ignore');
        const forumHydration = fs.readFileSync(
            path.join(process.cwd(), 'src/app/services/forum/forumRepositoryHydration.ts'),
            'utf8',
        );
        expect(forumHydration).toContain("typeof window === 'undefined'");
        const account = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/account/route.ts'), 'utf8');
        expect(account).toContain('auditRecorded');
        expect(account).toContain('requireTrustedHeadquartersAdmin');
        expect(account).toContain('stepUp: true');
        expect(account).toContain('resolveHeadquartersControlTarget');
        expect(account).toContain('rejectHeadquartersTargetId');
        expect(account).toContain('set_password');
        expect(account).toContain('validateHeadquartersAccountPassword');
        expect(account).toContain('notifyHeadquartersAccountStatus');
        expect(account).toContain('notifyHeadquartersCredentialStatus');
        expect(account).toContain('liftGoTrueLoginBan');
        expect(account).toContain('lock_login');
        expect(account).toContain('soft_delete');
        expect(account).toContain('public_badge');
        expect(account).toContain('publicVerifiedBadgeProfileUpdates');
        expect(account).toContain('user.public_badge');
        expect(account).toContain('allowSelf: true');
        expect(account).not.toContain('goTrueBanDuration(durationHours)');
        expect(account).not.toContain('details: { password');
        const notifyHq = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/notify/route.ts'), 'utf8');
        expect(notifyHq).toContain('requireTrustedHeadquartersAdmin');
        expect(notifyHq).toContain('notifyHeadquartersSystemMessage');
        expect(notifyHq).not.toContain('is_deleted: true');
        const auditHq = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/audit/route.ts'), 'utf8');
        expect(auditHq).toContain('requireTrustedHeadquartersAdmin');
        expect(auditHq).toContain('listHeadquartersAudit');
        expect(auditHq).toContain('details: row.details');
        const auditGrant = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260828180000_audit_logs_service_role_grant.sql'),
            'utf8',
        );
        expect(auditGrant).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.audit_logs TO service_role');
        expect(auditGrant).toContain('REVOKE ALL ON TABLE public.audit_logs FROM PUBLIC, anon, authenticated');
        const bffGrant = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260828190000_grant_service_role_bff_tables.sql'),
            'utf8',
        );
        expect(bffGrant).toContain('forum_posts');
        expect(bffGrant).toContain('lawsuit_files');
        expect(bffGrant).toContain('execution_files');
        expect(bffGrant).toContain('lawyer_settings');
        expect(bffGrant).toContain('calendar_tombstones');
        expect(bffGrant).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO service_role');
        const lawyerSettingsLock = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260828200000_lawyer_settings_deny_clients.sql'),
            'utf8',
        );
        expect(lawyerSettingsLock).toContain('deny_clients_lawyer_settings');
        expect(lawyerSettingsLock).toContain('REVOKE ALL ON TABLE public.lawyer_settings FROM anon');
        expect(lawyerSettingsLock).toContain('FORCE ROW LEVEL SECURITY');
        const metaStrip = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260828210000_strip_client_verification_status_metadata.sql'),
            'utf8',
        );
        expect(metaStrip).toContain("ARRAY['fullName', 'phone', 'avatar_url', 'familyName', 'governorate', 'lawyerBarRoom']");
        expect(metaStrip).toContain('OLD.raw_user_meta_data');
        expect(metaStrip).not.toContain(
            "ARRAY['fullName', 'phone', 'avatar_url', 'familyName', 'governorate', 'lawyerBarRoom', 'verificationStatus']",
        );
        const kycAppMeta = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260828230000_kyc_strip_user_meta_sync_app_metadata.sql'),
            'utf8',
        );
        expect(kycAppMeta).toContain('raw_app_meta_data');
        expect(kycAppMeta).toContain('verification_status');
        expect(kycAppMeta).not.toContain('OLD.raw_user_meta_data');
        const publicBadgeSql = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260828240000_profiles_public_verified_badge.sql'),
            'utf8',
        );
        expect(publicBadgeSql).toContain('public_verified_badge');
        expect(publicBadgeSql).toContain('profiles_update_own_safe');
        expect(publicBadgeSql).toContain('Frozen on client UPDATE');
        const displayNameSql = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260829010000_legal_display_name_once.sql'),
            'utf8',
        );
        expect(displayNameSql).toContain('legal_display_name_corrections');
        expect(displayNameSql).toContain('trg_zz_legal_display_name_once');
        expect(displayNameSql).toContain('hq:user.display_name_correct');
        const displayNameApi = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/auth/display-name/route.ts'),
            'utf8',
        );
        expect(displayNameApi).toContain('correctDisplayNameOnce');
        expect(displayNameApi).toContain('requireWifeUser');
        expect(displayNameApi).toContain('recordHeadquartersAudit');
        expect(displayNameApi).toContain('user.display_name_correct');
        const connectionSql = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260829020000_hq_connection_signals.sql'),
            'utf8',
        );
        expect(connectionSql).toContain('host(s.ip)');
        expect(connectionSql).toContain('hq_connection_signals');
        expect(connectionSql).not.toContain('latitude');
        expect(connectionSql).not.toContain('geolocation');
        expect(connectionSql).toContain('deny_clients_hq_connection_signals');
        const connectionDomain = fs.readFileSync(
            path.join(process.cwd(), 'src/app/domain/admin/hqConnectionSignal.ts'),
            'utf8',
        );
        expect(connectionDomain).not.toContain('navigator.geolocation');
        expect(connectionDomain).not.toContain('x-vercel-ip-latitude');
        const activityUi = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/HeadquartersUserActivity.tsx'),
            'utf8',
        );
        expect(activityUi).toContain('نوع الجهاز');
        expect(activityUi).toContain('عنوان الشبكة');
        expect(activityUi).toContain('مكان الشبكة');
        expect(activityUi).not.toContain('user_agent');
        const loginRoute = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/auth/login/route.ts'),
            'utf8',
        );
        expect(loginRoute).toContain('recordHeadquartersConnectionSignal');
        const publicBadgeGet = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/auth/public-verified-badge/route.ts'),
            'utf8',
        );
        expect(publicBadgeGet).toContain('requireWifeUser');
        expect(publicBadgeGet).not.toContain('requireTrustedHeadquartersAdmin');
        expect(publicBadgeGet).toContain('public_verified_badge');
        const markHook = fs.readFileSync(
            path.join(process.cwd(), 'src/app/hooks/useAccreditedLawyerMark.ts'),
            'utf8',
        );
        expect(markHook).toContain('peekPublicVerifiedBadge');
        expect(markHook).not.toContain('resolveLawyerVerificationStatus');
        expect(markHook).not.toContain('user_metadata');
        const searchPathLock = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260828201000_lock_update_updated_at_search_path.sql'),
            'utf8',
        );
        expect(searchPathLock).toContain('SET search_path = public');
        const forceRls = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260828220000_force_rls_all_public_tables.sql'),
            'utf8',
        );
        expect(forceRls).toContain('FORCE ROW LEVEL SECURITY');
        const addLawEdge = fs.readFileSync(path.join(process.cwd(), 'supabase/functions/add-law/index.ts'), 'utf8');
        expect(addLawEdge).toContain('status: 410');
        expect(addLawEdge).not.toContain('.from("iraqi_laws")');
        const clearLawEdge = fs.readFileSync(
            path.join(process.cwd(), 'supabase/functions/clear-laws/index.ts'),
            'utf8',
        );
        expect(clearLawEdge).toContain('status: 410');
        expect(clearLawEdge).not.toContain('.from("iraqi_laws")');
        const listLawEdge = fs.readFileSync(path.join(process.cwd(), 'supabase/functions/list-laws/index.ts'), 'utf8');
        expect(listLawEdge).toContain('status: 410');
        expect(listLawEdge).not.toContain('.from("iraqi_laws")');
        const banHonesty = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/ban/route.ts'), 'utf8');
        expect(banHonesty).not.toContain('isProd');
        expect(banHonesty).not.toMatch(/error:\s*isProd/);
        const notifyHonesty = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/notify/route.ts'), 'utf8');
        expect(notifyHonesty).not.toContain('isProd');
        const verifyHonesty = fs.readFileSync(
            path.join(process.cwd(), 'src/app/api/auth/lawyer-verification/route.ts'),
            'utf8',
        );
        expect(verifyHonesty).not.toContain('error instanceof Error ? error.message');
        expect(verifyHonesty).toContain('app_metadata: { verification_status: status }');
        expect(verifyHonesty).not.toContain('user_metadata: { verificationStatus: status }');
        const lawsAddHonesty = fs.readFileSync(path.join(process.cwd(), 'src/app/api/laws/add/route.ts'), 'utf8');
        expect(lawsAddHonesty).not.toContain('details: error.message');
        const capHonesty = fs.readFileSync(
            path.join(process.cwd(), 'src/app/services/notifications/notificationLimits.ts'),
            'utf8',
        );
        expect(capHonesty).toContain("appendedBy === 'server'");
        const edgeOwnership = fs.readFileSync(
            path.join(process.cwd(), 'supabase/functions/make-server-f09713ba/kvProxyKeyOwnership.ts'),
            'utf8',
        );
        expect(edgeOwnership).not.toContain('community:posts:');
        const edgeKvProxy = fs.readFileSync(
            path.join(process.cwd(), 'supabase/functions/make-server-f09713ba/index.tsx'),
            'utf8',
        );
        expect(edgeKvProxy).toContain("app.post('/make-server-f09713ba/kv-proxy'");
        expect(edgeKvProxy).toContain('410');
        expect(edgeKvProxy).not.toContain("WIFE_DISABLE_EDGE_KV_PROXY");
        const devicesHq = fs.readFileSync(path.join(process.cwd(), 'src/app/api/admin/devices/route.ts'), 'utf8');
        expect(devicesHq).toContain('requireTrustedHeadquartersAdmin');
        expect(devicesHq).toContain('listAdminTrustedDevices');
        expect(devicesHq).toContain('revokeAdminTrustedDevice');
        expect(devicesHq).toContain('revokeAdminTrustedDeviceByFingerprint');
        expect(devicesHq).toContain('revoke_current');
        const loginGate = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/AdminHeadquartersAccess.tsx'),
            'utf8',
        );
        expect(loginGate).toContain('title={null}');
        expect(loginGate).toContain('hint={null}');
        expect(loginGate).toContain('showCharsetHint={false}');
        expect(loginGate).toContain('onSuccess={onLoggedIn}');
        expect(loginGate).not.toContain('مقر القيادة — دخول المدير');
        expect(loginGate).not.toContain('ستُطلب خطوة تحقق');
        const hqShell = fs.readFileSync(path.join(process.cwd(), 'src/app/HqRuntimeShell.tsx'), 'utf8');
        expect(hqShell).toContain("from '@/app/components/admin/hqDoorSession'");
        expect(hqShell).toContain('writeHqDoorSession');
        expect(hqShell).toContain('clearHqDoorSession');
        expect(hqShell).toContain('hqVerifiedUserIdRef');
        expect(hqShell).toContain('keepLiveSession');
        expect(hqShell).toContain('hqVerifyEpoch');
        expect(hqShell).toContain('hqPostLoginHold');
        expect(hqShell).toContain('hqDevBypass');
        expect(hqShell).toContain('hqDevSessionReady');
        expect(hqShell).toContain('viaDevShortcut');
        expect(hqShell).toContain('bootstrapHeadquartersDevSession');
        expect(hqShell).toContain('runHqDevBootstrap');
        expect(hqShell).toContain('sessionOk');
        expect(hqShell).toContain('clearSecureApiAuthPause');
        expect(hqShell).toContain('clearWifeSignAuthCircuit');
        expect(hqShell.indexOf('bootstrapHeadquartersDevSession')).toBeLessThan(
            hqShell.lastIndexOf('setHqDoorUnlocked(true)'),
        );
        expect(hqShell).toContain('computeHqNeedsLogin');
        expect(hqShell).toContain('setHqPostLoginHold(true)');
        expect(hqShell).toContain('onLoggedIn');
        expect(hqShell).toContain('onLogout={lockDoor}');
        expect(hqShell).toContain("import('@/app/surface/inner')");
        expect(hqShell).toContain('clearPlainDocumentSurface()');
        const hqInner = fs.readFileSync(path.join(process.cwd(), 'src/app/surface/inner.tsx'), 'utf8');
        expect(hqInner).toContain('pending && !allowed');
        expect(hqInner).toContain('if (needsLogin)');
        expect(hqInner.indexOf('if (skipTrustedDevice)')).toBeLessThan(hqInner.indexOf('if (pending && !allowed)'));
        expect(hqInner.indexOf('if (allowed) {')).toBeLessThan(hqInner.indexOf('if (needsLogin)'));
        expect(hqInner).toContain('onLoggedIn');
        expect(hqInner).toContain('skipTrustedDevice');
        expect(hqInner).toContain('devSessionReady');
        expect(hqInner).toContain('skipLiveProbe');
        const hqStatusHook = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/useHeadquartersStatus.ts'),
            'utf8',
        );
        expect(hqStatusHook).toContain('peekPrimedHeadquartersStatus');
        const hqBoot = fs.readFileSync(
            path.join(process.cwd(), 'src/app/services/admin/hqDevSessionBootstrap.ts'),
            'utf8',
        );
        expect(hqBoot).toContain('warmLiveHeadquartersApis');
        const hqWarm = fs.readFileSync(
            path.join(process.cwd(), 'src/app/services/admin/hqDevSessionWarm.ts'),
            'utf8',
        );
        expect(hqWarm).toContain('warmLiveHeadquartersApis');
        expect(hqWarm).toContain('primeHeadquartersLiveStatus');
        expect(hqWarm).toContain('/api/admin/status');
        expect(hqWarm).toContain('primeHeadquartersCourts');
        expect(hqWarm).toContain('primeHeadquartersAudit');
        expect(hqWarm).toContain('primeHeadquartersDevices');
        const hqGate = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/RequireTrustedDevice.tsx'),
            'utf8',
        );
        expect(hqGate).toContain('warmLiveHeadquartersApis');
        const signInForm = fs.readFileSync(
            path.join(process.cwd(), 'src/app/bootstrap/lawyerAuth/LawyerSignInForm.tsx'),
            'utf8',
        );
        expect(signInForm).toContain('FormData');
        expect(signInForm).toContain('onSuccess?.()');
        expect(signInForm).toContain('noValidate');
        const manifest = fs.readFileSync(path.join(process.cwd(), 'src/app/api/vercelRouteManifest.ts'), 'utf8');
        expect(manifest).toContain('admin/audit');
        expect(manifest).toContain('admin/devices');
        expect(manifest).toContain('admin/account');
        expect(manifest).toContain('admin/notify');
        expect(manifest).toContain('admin/otp/dev-unlock');
        expect(manifest).toContain('auth/account-gate');
        const freezeSql = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260827190000_profiles_freeze_until.sql'),
            'utf8',
        );
        expect(freezeSql).toContain('freeze_until');
        expect(freezeSql).toContain('profiles_update_own_safe');
    });

    it('الهجرة تسحب EXECUTE من authenticated', () => {
        const sql = fs.readFileSync(
            path.join(
                process.cwd(),
                'supabase/migrations/20260826000000_revoke_client_admin_headquarters_rpcs.sql',
            ),
            'utf8',
        );
        expect(sql).toMatch(/DROP FUNCTION IF EXISTS public\.admin_list_users\(\)/);
        expect(sql).toMatch(/admin_change_user_role/);
        expect(sql).toMatch(/admin_toggle_user_status/);
    });

    it('دالة تجميع المحاكم تُمنح لـ service_role فقط', () => {
        const sql = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260826020000_headquarters_court_counts_rpc.sql'),
            'utf8',
        );
        expect(sql).toContain('headquarters_court_counts');
        expect(sql).toContain('REVOKE ALL ON FUNCTION public.headquarters_court_counts() FROM anon');
        expect(sql).toContain('REVOKE ALL ON FUNCTION public.headquarters_court_counts() FROM authenticated');
        expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.headquarters_court_counts() TO service_role');
    });

    it('يسحب EXECUTE is_platform_admin من العملاء', () => {
        const sql = fs.readFileSync(
            path.join(process.cwd(), 'supabase/migrations/20260827020000_revoke_client_is_platform_admin.sql'),
            'utf8',
        );
        expect(sql).toContain('REVOKE EXECUTE ON FUNCTION public.is_platform_admin() FROM authenticated');
        expect(sql).toContain('GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role');
    });
});
