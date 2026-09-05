import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecure = vi.fn();
const listForUser = vi.fn();
const getById = vi.fn();
const canReachCollaborationNetwork = vi.fn(() => false);

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: (...args: unknown[]) => fetchSecure(...args),
    },
}));

vi.mock('../caseShareRepository', () => ({
    CaseShareRepository: {
        listForUser: (...args: unknown[]) => listForUser(...args),
        getById: (...args: unknown[]) => getById(...args),
        createShare: vi.fn(),
        updateStatus: vi.fn(),
        endSession: vi.fn(),
    },
}));

vi.mock('../caseShareNetworkGuard', () => ({
    assertRecipientInNetwork: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/app/services/settings/collaborationNetworkGate', () => ({
    canReachCollaborationNetwork: () => canReachCollaborationNetwork(),
    COLLABORATION_NETWORK_OFF: 'COLLABORATION_NETWORK_OFF',
    assertCollaborationNetworkReachable: () => {
        if (!canReachCollaborationNetwork()) throw new Error('COLLABORATION_NETWORK_OFF');
    },
}));

vi.mock('../lawyerNetworkRepository', () => ({
    listNetworkColleagues: vi.fn(async () => [{ id: 'c1', name: 'زميل', relation: 'both' }]),
}));

import { CaseShareApiService } from '../caseShareApiService';
import { listNetworkColleagues } from '../lawyerNetworkRepository';
import { defaultConsultVisibleFields } from '../caseShareTypes';

describe('CaseShareApiService — بوابة التعاون', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        canReachCollaborationNetwork.mockReturnValue(false);
        listForUser.mockResolvedValue([{ id: 'local-1' }]);
        getById.mockResolvedValue({ id: 'local-detail' });
    });

    it('listShares لا يوقّع WIFE عند قطع الاتصال ويقرأ المستودع المحلي', async () => {
        await expect(CaseShareApiService.listShares('user-1')).resolves.toEqual([{ id: 'local-1' }]);
        expect(fetchSecure).not.toHaveBeenCalled();
        expect(listForUser).toHaveBeenCalledWith('user-1', { summary: true });
    });

    it('listNetworkColleagues لا يلمس شبكة المتابعة عند القطع', async () => {
        await expect(CaseShareApiService.listNetworkColleagues('user-1')).resolves.toEqual([]);
        expect(listNetworkColleagues).not.toHaveBeenCalled();
    });

    it('createShare يرفض الإرسال بلا شبكة تعاون', async () => {
        await expect(
            CaseShareApiService.createShare({
                recipientId: 'r1',
                recipientName: 'زميل',
                source: {
                    module: 'lawsuit',
                    dossierId: 'd1',
                    title: 'دعوى',
                    caseNumbers: [],
                    partyNames: [],
                    courtLabel: '',
                    courtProvince: '',
                    narrativeText: '',
                    documentCount: 0,
                    catalog: [],
                },
                visibleFields: defaultConsultVisibleFields('lawsuit'),
                ownerId: 'o1',
                ownerName: 'مالك',
            }),
        ).rejects.toThrow('COLLABORATION_NETWORK_OFF');
        expect(fetchSecure).not.toHaveBeenCalled();
    });
});
