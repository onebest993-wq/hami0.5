import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';

const respond = vi.fn();
const getShareDetail = vi.fn();

vi.mock('@/app/services/caseShare/caseShareApiService', () => ({
    CaseShareApiService: {
        respond: (...args: unknown[]) => respond(...args),
        getShareDetail: (...args: unknown[]) => getShareDetail(...args),
    },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), error: vi.fn() },
}));

import { useCaseShareIncoming } from '@/app/components/lawyer/NotificationPanel/hooks/useCaseShareIncoming';

function makeShare(overrides: Partial<CaseShareRecord> = {}): CaseShareRecord {
    return {
        id: 'share-1',
        ownerId: 'owner-1',
        recipientId: 'user-1',
        ownerName: 'مالك',
        recipientName: 'مستلم',
        status: 'pending',
        maskedView: {
            title: 'قضية',
            documentsIncluded: false,
            sessionDurationMinutes: 60,
        },
        ...overrides,
    } as CaseShareRecord;
}

describe('useCaseShareIncoming', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        respond.mockResolvedValue(undefined);
    });

    it('hasContent=false عندما لا توجد مشاركات', () => {
        const { result } = renderHook(() =>
            useCaseShareIncoming({ userId: 'user-1', shares: [], onChanged: vi.fn() }),
        );
        expect(result.current.hasContent).toBe(false);
    });

    it('يجمع الطلبات الواردة للمستلم', () => {
        const shares = [makeShare({ recipientId: 'user-1', status: 'pending' })];
        const { result } = renderHook(() =>
            useCaseShareIncoming({ userId: 'user-1', shares, onChanged: vi.fn() }),
        );
        expect(result.current.hasContent).toBe(true);
        expect(result.current.pendingIncoming).toHaveLength(1);
    });

    it('respond يستدعي API ويعيد busyId', async () => {
        const onChanged = vi.fn();
        const shares = [makeShare({ id: 's1', recipientId: 'user-1', status: 'pending' })];
        const { result } = renderHook(() =>
            useCaseShareIncoming({ userId: 'user-1', shares, onChanged }),
        );

        await act(async () => {
            await result.current.respond(shares[0]!, 'accept');
        });

        expect(respond).toHaveBeenCalledWith('s1', 'accept', 'user-1');
        expect(onChanged).toHaveBeenCalled();
        expect(result.current.busyId).toBeNull();
    });
});
