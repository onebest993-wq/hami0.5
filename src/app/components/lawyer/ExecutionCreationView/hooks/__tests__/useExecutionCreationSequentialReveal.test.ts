import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useExecutionCreationSequentialReveal } from '../useExecutionCreationSequentialReveal';

describe('useExecutionCreationSequentialReveal', () => {
    it('keeps later fields visible when an earlier step is re-committed', () => {
        const { result } = renderHook(() =>
            useExecutionCreationSequentialReveal({
                docType: 'قرارات وأحكام المحاكم',
                hasAmountStep: true,
                showLawyerFees: false,
            }),
        );

        act(() => {
            result.current.commitStep('directorate');
            result.current.commitStep('fileNumber');
        });
        expect(result.current.isRevealed('docType')).toBe(true);

        act(() => {
            result.current.commitStep('directorate', { focusNext: false });
        });
        expect(result.current.isRevealed('docType')).toBe(true);
        expect(result.current.isRevealed('fileNumber')).toBe(true);
    });
});
