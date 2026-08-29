import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HAMI_PLATFORM_ADMIN_UUID } from '@/app/constants/hamiPlatformAdminId';

const {
    kvGetMock,
    kvSetMock,
    kvQueueMock,
    gateMock,
    requireWifeUserMock,
    consumeRateMock,
    updateUserByIdMock,
} = vi.hoisted(() => ({
    kvGetMock: vi.fn(),
    kvSetMock: vi.fn(),
    kvQueueMock: vi.fn(),
    gateMock: vi.fn(),
    requireWifeUserMock: vi.fn(),
    consumeRateMock: vi.fn(),
    updateUserByIdMock: vi.fn(async () => ({})),
}));

vi.mock('../../security/kvStoreAdmin.ts', () => ({
    kvGet: (...a: unknown[]) => kvGetMock(...a),
    kvSet: (...a: unknown[]) => kvSetMock(...a),
    kvReadHqVerificationQueueByPrefix: (...a: unknown[]) => kvQueueMock(...a),
}));

vi.mock('../../security/requireTrustedHeadquartersAdmin.ts', () => ({
    requireTrustedHeadquartersAdmin: (...a: unknown[]) => gateMock(...a),
}));

vi.mock('../../security/bffAuth.ts', () => ({
    requireWifeUser: (...a: unknown[]) => requireWifeUserMock(...a),
    unwrapWifeUser: (r: unknown) => r,
}));

vi.mock('../../security/wifeRateLimitStore.ts', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../security/wifeRateLimitStore.ts')>();
    return {
        ...actual,
        consumeRateLimitSlot: (...a: unknown[]) => consumeRateMock(...a),
    };
});

vi.mock('../../security/supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: () => ({}),
    getGoTrueAdminApi: () => ({ updateUserById: (...a: unknown[]) => updateUserByIdMock(...a) }),
}));

vi.mock('../../security/headquartersAudit.ts', () => ({
    recordHeadquartersAudit: vi.fn(async () => undefined),
}));

vi.mock('../../security/headquartersAccountNotify.ts', () => ({
    notifyHeadquartersVerificationStatus: vi.fn(async () => undefined),
}));

import { GET, PATCH, POST } from './route.ts';

const LAWYER = 'cccccccc-dddd-4eee-8fff-000000000001';
const TARGET = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const preview = `data:image/png;base64,${'A'.repeat(80)}`;

function jsonReq(url: string, body?: unknown, method: 'GET' | 'PATCH' | 'POST' = 'GET'): Request {
    return new Request(url, {
        method,
        headers: { 'Content-Type': 'application/json', Origin: 'https://app.test' },
        body: method === 'GET' || body === undefined ? undefined : JSON.stringify(body),
    });
}

describe('lawyer-verification HQ queue + decide', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        gateMock.mockResolvedValue({ ok: true, userId: LAWYER });
        consumeRateMock.mockResolvedValue(true);
        kvSetMock.mockResolvedValue(undefined);
        kvQueueMock.mockResolvedValue({ rows: [], capped: false });
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: LAWYER });
    });

    it('GET all يمرّ من القارئ الخفيف ويعيد capped', async () => {
        kvQueueMock.mockResolvedValue({
            rows: [
                {
                    userId: TARGET,
                    status: 'pending',
                    submittedAt: '2026-08-01T00:00:00.000Z',
                    updatedAt: '2026-08-01T00:00:00.000Z',
                    rejectionReason: '',
                    email: 'a@b.c',
                    fullName: 'وجدان',
                    familyName: 'علي',
                    phone: '07800000000',
                    governorate: 'كربلاء',
                    lawyerBarRoom: 'كربلاء',
                    faceAssistOptedIn: 'false',
                    hasIdFront: 'true',
                    hasIdBack: 'true',
                    hasFaceSelfie: 'false',
                },
            ],
            capped: true,
        });
        const res = await GET(jsonReq('https://app.test/api/auth/lawyer-verification?scope=all'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as {
            records: Array<Record<string, unknown>>;
            capped: boolean;
        };
        expect(body.capped).toBe(true);
        expect(body.records).toHaveLength(1);
        expect(body.records[0]?.hasIdFront).toBe(true);
        expect(body.records[0]?.hasIdBack).toBe(true);
        expect(JSON.stringify(body)).not.toContain('data:image');
        expect(kvGetMock).not.toHaveBeenCalled();
    });

    it('GET self لا يعيد معاينات الهوية', async () => {
        kvGetMock.mockResolvedValue({
            userId: LAWYER,
            status: 'pending',
            idFrontPreview: preview,
            idBackPreview: preview,
            hasIdFront: true,
            hasIdBack: true,
        });
        const res = await GET(jsonReq('https://app.test/api/auth/lawyer-verification?scope=self'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { record: Record<string, unknown> };
        expect(body.record.status).toBe('pending');
        expect(body.record).not.toHaveProperty('idFrontPreview');
        expect(JSON.stringify(body)).not.toContain('data:image');
    });

    it('GET dossier يعقّم SVG', async () => {
        kvGetMock.mockResolvedValue({
            userId: TARGET,
            status: 'pending',
            idFrontPreview: 'data:image/svg+xml;base64,PHN2Zz4=',
            idBackPreview: preview,
            hasIdFront: true,
            hasIdBack: true,
        });
        const res = await GET(
            jsonReq(`https://app.test/api/auth/lawyer-verification?scope=dossier&userId=${TARGET}`),
        );
        expect(res.status).toBe(200);
        const body = (await res.json()) as { record: { idFrontPreview: string | null; idBackPreview: string | null } };
        expect(body.record.idFrontPreview).toBeNull();
        expect(body.record.idBackPreview).toContain('data:image/png');
    });

    it('PATCH active بلا وثائق صحيحة يُرفض ولا يكتب', async () => {
        kvGetMock.mockResolvedValue({
            userId: TARGET,
            status: 'pending',
            hasIdFront: true,
            hasIdBack: true,
        });
        const res = await PATCH(
            jsonReq(
                'https://app.test/api/auth/lawyer-verification',
                { userId: TARGET, status: 'active' },
                'PATCH',
            ),
        );
        expect(res.status).toBe(400);
        const body = (await res.json()) as { code?: string };
        expect(body.code).toBe('ID_DOCUMENTS_REQUIRED');
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('PATCH active مع الوجه والظهر ينجح بلا صور في الاستجابة', async () => {
        kvGetMock.mockResolvedValue({
            userId: TARGET,
            status: 'pending',
            email: 'a@b.c',
            fullName: 'وجدان',
            familyName: 'علي',
            phone: '07800000000',
            governorate: 'كربلاء',
            lawyerBarRoom: 'كربلاء',
            faceAssistOptedIn: false,
            hasIdFront: true,
            hasIdBack: true,
            idFrontPreview: preview,
            idBackPreview: preview,
            ocrNameMatch: true,
            ocrSnippet: 'fake',
        });
        const res = await PATCH(
            jsonReq(
                'https://app.test/api/auth/lawyer-verification',
                { userId: TARGET, status: 'active' },
                'PATCH',
            ),
        );
        expect(res.status).toBe(200);
        expect(kvSetMock).toHaveBeenCalledTimes(1);
        const stored = kvSetMock.mock.calls[0]?.[1] as { status: string; ocrNameMatch: unknown; ocrSnippet?: unknown };
        expect(stored.status).toBe('active');
        expect(stored.ocrNameMatch).toBeNull();
        expect(stored.ocrSnippet).toBeUndefined();
        const body = (await res.json()) as { record: Record<string, unknown> };
        expect(body.record.status).toBe('active');
        expect(body.record).not.toHaveProperty('idFrontPreview');
        expect(JSON.stringify(body)).not.toContain('data:image');
        const { notifyHeadquartersVerificationStatus } = await import(
            '../../security/headquartersAccountNotify.ts'
        );
        expect(notifyHeadquartersVerificationStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: TARGET,
                status: 'active',
            }),
        );
        expect(updateUserByIdMock).toHaveBeenCalledWith(
            TARGET,
            expect.objectContaining({
                app_metadata: { verification_status: 'active' },
            }),
        );
    });

    it('PATCH لا يمسّ مدير المنصّة', async () => {
        const res = await PATCH(
            jsonReq(
                'https://app.test/api/auth/lawyer-verification',
                { userId: HAMI_PLATFORM_ADMIN_UUID, status: 'active' },
                'PATCH',
            ),
        );
        expect(res.status).toBe(403);
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('POST لا يخفض حساباً معتمداً إلى معلّق', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: TARGET });
        kvGetMock.mockResolvedValue({
            userId: TARGET,
            status: 'active',
            submittedAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
            email: 'a@b.c',
            fullName: 'علي',
            familyName: 'حسن',
            phone: '07701234567',
            governorate: 'بغداد',
            lawyerBarRoom: 'غرفة',
            faceAssistOptedIn: false,
            hasIdFront: true,
            hasIdBack: true,
            hasFaceSelfie: false,
            idFrontPreview: preview,
            idBackPreview: preview,
            ocrNameMatch: null,
        });
        const res = await POST(
            jsonReq(
                'https://app.test/api/auth/lawyer-verification',
                { idFrontPreview: preview, idBackPreview: preview, email: 'a@b.c' },
                'POST',
            ),
        );
        expect(res.status).toBe(409);
        await expect(res.json()).resolves.toMatchObject({ code: 'VERIFICATION_ALREADY_ACTIVE' });
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('POST بعد الرفض يعيد معلّقاً ويحدّث app_metadata', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: TARGET });
        kvGetMock.mockResolvedValue({
            userId: TARGET,
            status: 'rejected',
            submittedAt: '2026-08-01T00:00:00.000Z',
            updatedAt: '2026-08-01T00:00:00.000Z',
            rejectionReason: 'وثائق غير واضحة',
            email: 'a@b.c',
            fullName: 'علي',
            familyName: 'حسن',
            phone: '07701234567',
            governorate: 'بغداد',
            lawyerBarRoom: 'غرفة',
            faceAssistOptedIn: false,
            hasIdFront: true,
            hasIdBack: true,
            hasFaceSelfie: false,
            idFrontPreview: preview,
            idBackPreview: preview,
            ocrNameMatch: null,
        });
        const res = await POST(
            jsonReq(
                'https://app.test/api/auth/lawyer-verification',
                {
                    idFrontPreview: preview,
                    idBackPreview: preview,
                    email: 'a@b.c',
                    fullName: 'علي محمد حسن',
                },
                'POST',
            ),
        );
        expect(res.status).toBe(200);
        expect(kvSetMock).toHaveBeenCalledWith(
            `lawyer-verification:${TARGET}`,
            expect.objectContaining({ status: 'pending' }),
        );
        const stored = kvSetMock.mock.calls[0]?.[1] as Record<string, unknown>;
        expect(stored).not.toHaveProperty('rejectionReason');
        expect(updateUserByIdMock).toHaveBeenCalledWith(
            TARGET,
            expect.objectContaining({
                app_metadata: { verification_status: 'pending' },
            }),
        );
    });
});
