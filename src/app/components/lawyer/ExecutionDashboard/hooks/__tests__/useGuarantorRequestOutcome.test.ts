import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGuarantorRequestOutcome } from '../useGuarantorRequestOutcome';

describe('useGuarantorRequestOutcome', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('يفتح نموذج إكمال الكفيل عند موافقة المنفذ', () => {
        const showToast = vi.fn();
        const guarantorSpy = vi.fn();
        window.addEventListener('hami-open-guarantor-details', guarantorSpy);

        renderHook(() =>
            useGuarantorRequestOutcome({
                executionDataId: 'exec-1',
                executionId: 'exec-1',
                showToast,
            }),
        );

        window.dispatchEvent(
            new CustomEvent('hami-execution-decision-outcome', {
                detail: {
                    executionId: 'exec-1',
                    decisionId: 'dec-g',
                    requestKind: 'guarantor_request',
                    outcome: 'approved',
                },
            }),
        );

        expect(showToast).toHaveBeenCalled();
        expect(guarantorSpy).toHaveBeenCalled();

        window.removeEventListener('hami-open-guarantor-details', guarantorSpy);
    });
});
