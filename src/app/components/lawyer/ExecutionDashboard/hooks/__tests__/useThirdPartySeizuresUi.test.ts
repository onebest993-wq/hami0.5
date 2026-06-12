import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useThirdPartySeizuresUi } from '@/app/components/lawyer/ExecutionDashboard/hooks/useThirdPartySeizuresUi';
import type { ExecutionFile, ThirdPartySeizure } from '@/app/types/execution';

describe('useThirdPartySeizuresUi', () => {
    it('syncs from executionData.thirdPartySeizures', () => {
        const initial: ThirdPartySeizure[] = [
            { id: 'a1', thirdPartyName: 'بنك', status: 'notified' },
        ];
        const { result, rerender } = renderHook(
            ({ data }: { data: ExecutionFile | null }) => useThirdPartySeizuresUi(data),
            {
                initialProps: {
                    data: { id: 'ex-1', thirdPartySeizures: initial } as ExecutionFile,
                },
            }
        );

        expect(result.current.thirdPartySeizuresUi).toEqual(initial);

        const next: ThirdPartySeizure[] = [
            { id: 'b2', thirdPartyName: 'شركة', status: 'replied', replyStatus: 'acknowledged' },
        ];
        rerender({ data: { id: 'ex-1', thirdPartySeizures: next } as ExecutionFile });
        expect(result.current.thirdPartySeizuresUi).toEqual(next);
    });

    it('applyThirdPartySeizuresFromPatch updates local state', () => {
        const { result } = renderHook(() => useThirdPartySeizuresUi(null));
        const patch = {
            thirdPartySeizures: [{ id: 'x1', thirdPartyName: 'جهة', status: 'notified' }],
        };

        act(() => {
            result.current.applyThirdPartySeizuresFromPatch(patch);
        });

        expect(result.current.thirdPartySeizuresUi).toEqual(patch.thirdPartySeizures);
    });
});
