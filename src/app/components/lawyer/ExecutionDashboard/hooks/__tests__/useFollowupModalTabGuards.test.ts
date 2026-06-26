import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFollowupModalTabGuards } from '../executionDashboardCore/useFollowupModalTabGuards';
import type { FollowupUnifiedModalTab } from '../../followupModalTabTypes';

const baseParams = () => ({
    showUnifiedExecutionModal: true,
    unifiedModalTab: 'seizure_requests' as FollowupUnifiedModalTab,
    setUnifiedModalTab: vi.fn(),
    effectiveFollowupSectionTabOrder: ['correspondences', 'coercive'] as const,
    seizureMatrix: { hideSeizureTab: true },
    hideFollowupCoerciveTab: false,
    hideFollowupSeizureRequestsTab: false,
    followupTabsRestricted: false,
    restrictedFollowupTabIds: new Set<string>(),
    hideCoerciveTabsForDebtorAgent: false,
    showPersonalCoerciveFollowupTab: true,
    setShowSolidaryCoerciveTargetModal: vi.fn(),
    setSolidaryCoerciveActionPending: vi.fn(),
    followupModalChipTablistRef: { current: null },
    followupModalDebtorTabsRef: { current: null },
    isSolidaryLiability: false,
    solidaryDebtorCount: 1,
});

describe('useFollowupModalTabGuards', () => {
    it('redirects seizure_requests when seizure tab is hidden', () => {
        const setUnifiedModalTab = vi.fn();
        renderHook(() =>
            useFollowupModalTabGuards({
                ...baseParams(),
                setUnifiedModalTab,
            }),
        );
        expect(setUnifiedModalTab).toHaveBeenCalledWith('correspondences');
    });

    it('cleans solidary modals when followup modal closes', () => {
        const setShowSolidaryCoerciveTargetModal = vi.fn();
        const setSolidaryCoerciveActionPending = vi.fn();
        const { rerender } = renderHook(
            (open: boolean) =>
                useFollowupModalTabGuards({
                    ...baseParams(),
                    showUnifiedExecutionModal: open,
                    setShowSolidaryCoerciveTargetModal,
                    setSolidaryCoerciveActionPending,
                }),
            { initialProps: true },
        );
        rerender(false);
        expect(setShowSolidaryCoerciveTargetModal).toHaveBeenCalledWith(false);
        expect(setSolidaryCoerciveActionPending).toHaveBeenCalledWith(null);
    });
});
