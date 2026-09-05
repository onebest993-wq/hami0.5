import { describe, expect, it, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    beginLawsuitVaultCommitHold,
    endLawsuitVaultCommitHold,
    isLawsuitVaultCommitHold,
    resetLawsuitVaultCommitHoldForTests,
    useLawsuitVaultCommitHold,
} from '@/app/runtime/lawsuitVaultCommitHold';

describe('lawsuitVaultCommitHold', () => {
    afterEach(() => {
        resetLawsuitVaultCommitHoldForTests();
    });

    it('nested begin/end keeps the hold until the last end', () => {
        expect(isLawsuitVaultCommitHold()).toBe(false);
        beginLawsuitVaultCommitHold();
        beginLawsuitVaultCommitHold();
        expect(isLawsuitVaultCommitHold()).toBe(true);
        endLawsuitVaultCommitHold();
        expect(isLawsuitVaultCommitHold()).toBe(true);
        endLawsuitVaultCommitHold();
        expect(isLawsuitVaultCommitHold()).toBe(false);
    });

    it('hook re-renders when hold starts and ends', () => {
        const { result } = renderHook(() => useLawsuitVaultCommitHold());
        expect(result.current).toBe(false);
        act(() => {
            beginLawsuitVaultCommitHold();
        });
        expect(result.current).toBe(true);
        act(() => {
            endLawsuitVaultCommitHold();
        });
        expect(result.current).toBe(false);
    });
});
