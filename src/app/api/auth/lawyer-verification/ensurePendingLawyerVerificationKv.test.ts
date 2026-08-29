import { beforeEach, describe, expect, it, vi } from 'vitest';

const { kvGetMock, kvSetMock, prefixMapMock, getUserByIdMock, fromMock } = vi.hoisted(() => ({
    kvGetMock: vi.fn(),
    kvSetMock: vi.fn(),
    prefixMapMock: vi.fn(),
    getUserByIdMock: vi.fn(),
    fromMock: vi.fn(),
}));

vi.mock('../../security/kvStoreAdmin.ts', () => ({
    kvGet: (...a: unknown[]) => kvGetMock(...a),
    kvSet: (...a: unknown[]) => kvSetMock(...a),
    kvReadUserStatusMapByPrefix: (...a: unknown[]) => prefixMapMock(...a),
}));

vi.mock('../../security/supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: () => ({ from: (...a: unknown[]) => fromMock(...a) }),
    getGoTrueAdminApi: () => ({ getUserById: (...a: unknown[]) => getUserByIdMock(...a) }),
}));

import {
    ensurePendingLawyerVerificationKv,
    seedMissingPendingLawyerVerifications,
} from './ensurePendingLawyerVerificationKv';

const UID = '49d464e5-bd75-4105-bdb9-fd18fc647854';

describe('ensurePendingLawyerVerificationKv', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        kvSetMock.mockResolvedValue(undefined);
        kvGetMock.mockResolvedValue(null);
        prefixMapMock.mockResolvedValue({ map: new Map(), capped: false });
        getUserByIdMock.mockResolvedValue({ data: { user: { email: 'new@lawyer.com' } } });
        fromMock.mockReturnValue({
            select: () => ({
                eq: () => Promise.resolve({ data: [], error: null }),
            }),
        });
    });

    it('يزرع صف معلّق إن غاب ولا يكتب فوق صف قائم', async () => {
        expect(await ensurePendingLawyerVerificationKv({ userId: UID, email: 'new@lawyer.com' })).toBe(
            true,
        );
        expect(kvSetMock).toHaveBeenCalledTimes(1);
        expect(kvSetMock.mock.calls[0]?.[0]).toBe(`lawyer-verification:${UID}`);
        expect(kvSetMock.mock.calls[0]?.[1]).toMatchObject({
            userId: UID,
            status: 'pending',
            email: 'new@lawyer.com',
            hasIdFront: false,
            hasIdBack: false,
        });

        kvGetMock.mockResolvedValueOnce({ userId: UID, status: 'active' });
        kvSetMock.mockClear();
        expect(await ensurePendingLawyerVerificationKv({ userId: UID, email: 'new@lawyer.com' })).toBe(
            false,
        );
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('لا يزرع معلّقاً فوق اعتماد المقر في app_metadata', async () => {
        expect(
            await ensurePendingLawyerVerificationKv({
                userId: UID,
                email: 'ok@gmail.com',
                appVerificationStatus: 'active',
            }),
        ).toBe(false);
        expect(kvGetMock).not.toHaveBeenCalled();
        expect(kvSetMock).not.toHaveBeenCalled();
    });

    it('يزرع محامين بلا صف KV ويتجاوز المعتمدين في app_metadata', async () => {
        const gapId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
        const activeId = 'bbbbbbbb-cccc-4ddd-8eee-ffffffffffff';
        prefixMapMock.mockResolvedValue({
            map: new Map([[UID, { status: 'pending', kycName: '' }]]),
            capped: false,
        });
        fromMock.mockReturnValue({
            select: () => ({
                eq: () =>
                    Promise.resolve({
                        data: [
                            { id: UID, legal_display_name: 'موجود', created_at: '2026-08-01T00:00:00.000Z' },
                            { id: gapId, legal_display_name: '', created_at: '2026-08-26T19:46:02.712Z' },
                            { id: activeId, legal_display_name: 'معتمد', created_at: '2026-08-01T00:00:00.000Z' },
                        ],
                        error: null,
                    }),
            }),
        });
        getUserByIdMock.mockImplementation(async (id: string) => {
            if (id === activeId) {
                return { data: { user: { email: 'a@b.c', app_metadata: { verification_status: 'active' } } } };
            }
            return { data: { user: { email: 'gap@lawyer.com' } } };
        });
        kvGetMock.mockImplementation(async (key: string) => {
            if (String(key).includes(UID)) return { status: 'pending' };
            return null;
        });

        const planted = await seedMissingPendingLawyerVerifications();
        expect(planted).toBe(1);
        expect(kvSetMock).toHaveBeenCalledTimes(1);
        expect(kvSetMock.mock.calls[0]?.[0]).toBe(`lawyer-verification:${gapId}`);
        expect(kvSetMock.mock.calls[0]?.[1]).toMatchObject({
            email: 'gap@lawyer.com',
            status: 'pending',
            hasIdFront: false,
        });
    });
});
