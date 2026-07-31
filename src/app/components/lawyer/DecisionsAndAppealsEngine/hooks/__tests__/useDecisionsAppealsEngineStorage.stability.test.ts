/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDecisionsAppealsEngineStorage } from '../useDecisionsAppealsEngineStorage';

describe('useDecisionsAppealsEngineStorage stability', () => {
    it('does not exceed safe render count on bootstrap with empty storage', () => {
        let renderCount = 0;
        const { result } = renderHook(() => {
            renderCount += 1;
            return useDecisionsAppealsEngineStorage({
                executionId: 'e2e-console-hygiene-1',
                executionDataForSync: {
                    id: 'e2e-console-hygiene-1',
                    claimType: 'استحصال دين مالي',
                },
            });
        });

        act(() => {
            void result.current.decisions;
        });

        expect(renderCount).toBeLessThan(25);
    });
});
