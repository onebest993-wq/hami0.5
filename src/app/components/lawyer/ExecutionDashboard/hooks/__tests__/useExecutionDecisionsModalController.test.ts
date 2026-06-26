import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDecisionsModalController } from '../useExecutionDecisionsModalController';

describe('useExecutionDecisionsModalController', () => {
    it('opens modal with boot tab and decision id', () => {
        let open = false;
        const { result } = renderHook(() =>
            useExecutionDecisionsModalController({
                showDecisionsModal: open,
                setShowDecisionsModal: (show) => {
                    open = show;
                },
            }),
        );

        act(() => {
            result.current.openDecisionsModalWithBoot({
                tab: 'appeals',
                decisionId: 'dec-9',
            });
        });

        expect(open).toBe(true);
        expect(result.current.decisionsModalBootListTab).toBe('appeals');
        expect(result.current.appealsModalScrollToDecisionId).toBe('dec-9');
    });
});
