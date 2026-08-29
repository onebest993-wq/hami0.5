import { beforeEach, describe, expect, it, vi } from 'vitest';

const { inMock, getClientMock } = vi.hoisted(() => ({
    inMock: vi.fn(),
    getClientMock: vi.fn(),
}));

vi.mock('../supabaseAdminClient.ts', () => ({
    getSupabaseAdminClient: (...a: unknown[]) => getClientMock(...a),
}));

import { attachHqQueueLiveNames } from '../headquartersQueueLiveNames.ts';

describe('attachHqQueueLiveNames', () => {
    beforeEach(() => {
        inMock.mockReset();
        getClientMock.mockReturnValue({
            from: () => ({
                select: () => ({
                    in: (...a: unknown[]) => inMock(...a),
                }),
            }),
        });
    });

    it('يلحق الاسم الحي من profiles دون لمس طلب التوثيق', async () => {
        inMock.mockResolvedValue({
            data: [{ id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', legal_display_name: 'علي حسن محمد' }],
            error: null,
        });
        const rows = await attachHqQueueLiveNames([
            {
                userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                status: 'pending',
                submittedAt: '',
                updatedAt: '',
                email: '',
                fullName: 'علي محمد حسن',
                familyName: '',
                phone: '',
                governorate: '',
                lawyerBarRoom: '',
                faceAssistOptedIn: false,
                hasIdFront: true,
                hasIdBack: true,
                hasFaceSelfie: false,
            },
        ]);
        expect(rows[0]?.liveFullName).toBe('علي حسن محمد');
        expect(rows[0]?.fullName).toBe('علي محمد حسن');
    });

    it('يبقي الطابور إن تعذّر الخادم', async () => {
        getClientMock.mockReturnValue({});
        const rows = await attachHqQueueLiveNames([
            {
                userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                status: 'pending',
                submittedAt: '',
                updatedAt: '',
                email: '',
                fullName: 'وجدان',
                familyName: '',
                phone: '',
                governorate: '',
                lawyerBarRoom: '',
                faceAssistOptedIn: false,
                hasIdFront: false,
                hasIdBack: false,
                hasFaceSelfie: false,
            },
        ]);
        expect(rows[0]?.fullName).toBe('وجدان');
        expect(rows[0]?.liveFullName).toBeUndefined();
    });
});
