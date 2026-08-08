import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    SEIZURE_INLINE_FOCUS_EVENT,
    resolveGoverningMovableDecision,
} from '@/app/components/lawyer/ExecutionDashboard/utils/seizureInlineFocusUtils';
import { useSeizureInlineFocusBridge } from '@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureInlineFocusBridge';

describe('seizureInlineFocusUtils', () => {
    it('resolveGoverningMovableDecision prefers focused decision id', () => {
        const decisions = [
            { id: 'dec-old', seizureSubtype: 'movable_auction', requestKind: 'seizure' },
            { id: 'dec-new', seizureSubtype: 'movable', requestKind: 'seizure' },
        ];
        const hit = resolveGoverningMovableDecision('ex-1', decisions, 'dec-new');
        expect(String(hit?.id)).toBe('dec-new');
    });
});

describe('useSeizureInlineFocusBridge', () => {
    it('tracks movable inline focus and expands sections', () => {
        const setAdditional = vi.fn();
        const setMaximum = vi.fn();
        const { result } = renderHook(() =>
            useSeizureInlineFocusBridge({
                executionIds: ['ex-1'],
                setAdditionalSeizureExpanded: setAdditional,
                setMaximumSeizureExpanded: setMaximum,
            }),
        );

        act(() => {
            window.dispatchEvent(
                new CustomEvent(SEIZURE_INLINE_FOCUS_EVENT.movable, {
                    detail: { executionId: 'ex-1', decisionId: 'dec-m1' },
                }),
            );
        });

        expect(result.current.inlineFocusMovableDecisionId).toBe('dec-m1');
        expect(setAdditional).toHaveBeenCalledWith(true);
        expect(setMaximum).toHaveBeenCalledWith(true);
    });
});
