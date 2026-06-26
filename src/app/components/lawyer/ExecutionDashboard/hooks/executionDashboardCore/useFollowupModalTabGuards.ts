import { useEffect, useLayoutEffect } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { bindHorizontalWheelToScroll } from '@/app/components/lawyer/ExecutionDashboard/helpers';
import type { FollowupUnifiedModalTab } from '../../followupModalTabTypes';

export type UseFollowupModalTabGuardsParams = {
    showUnifiedExecutionModal: boolean;
    unifiedModalTab: FollowupUnifiedModalTab;
    setUnifiedModalTab: Dispatch<SetStateAction<FollowupUnifiedModalTab>>;
    effectiveFollowupSectionTabOrder: readonly string[];
    seizureMatrix: { hideSeizureTab: boolean };
    hideFollowupCoerciveTab: boolean;
    hideFollowupSeizureRequestsTab: boolean;
    followupTabsRestricted: boolean;
    restrictedFollowupTabIds: ReadonlySet<string>;
    hideCoerciveTabsForDebtorAgent: boolean;
    showPersonalCoerciveFollowupTab: boolean;
    setShowSolidaryCoerciveTargetModal: (open: boolean) => void;
    setSolidaryCoerciveActionPending: (action: string | null) => void;
    followupModalChipTablistRef: RefObject<HTMLDivElement | null>;
    followupModalDebtorTabsRef: RefObject<HTMLDivElement | null>;
    isSolidaryLiability: boolean;
    solidaryDebtorCount: number;
};

/** تصحيح التبويبات + تنظيف modals عند إغلاق محضر المتابعة */
export function useFollowupModalTabGuards({
    showUnifiedExecutionModal,
    unifiedModalTab,
    setUnifiedModalTab,
    effectiveFollowupSectionTabOrder,
    seizureMatrix,
    hideFollowupCoerciveTab,
    hideFollowupSeizureRequestsTab,
    followupTabsRestricted,
    restrictedFollowupTabIds,
    hideCoerciveTabsForDebtorAgent,
    showPersonalCoerciveFollowupTab,
    setShowSolidaryCoerciveTargetModal,
    setSolidaryCoerciveActionPending,
    followupModalChipTablistRef,
    followupModalDebtorTabsRef,
    isSolidaryLiability,
    solidaryDebtorCount,
}: UseFollowupModalTabGuardsParams) {
    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        if (followupTabsRestricted && !restrictedFollowupTabIds.has(unifiedModalTab)) {
            setUnifiedModalTab(hideCoerciveTabsForDebtorAgent ? 'other_party' : 'correspondences');
            return;
        }
        if (unifiedModalTab !== 'seizure_requests') return;
        if (!seizureMatrix.hideSeizureTab && !hideFollowupSeizureRequestsTab) return;
        const fallback = (effectiveFollowupSectionTabOrder[0] ?? 'correspondences') as FollowupUnifiedModalTab;
        setUnifiedModalTab(fallback);
    }, [
        showUnifiedExecutionModal,
        unifiedModalTab,
        seizureMatrix.hideSeizureTab,
        hideFollowupSeizureRequestsTab,
        effectiveFollowupSectionTabOrder,
        followupTabsRestricted,
        restrictedFollowupTabIds,
        hideCoerciveTabsForDebtorAgent,
        setUnifiedModalTab,
    ]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        if (unifiedModalTab !== 'financial') return;
        const fallback = effectiveFollowupSectionTabOrder[0] ?? 'coercive';
        setUnifiedModalTab(hideFollowupCoerciveTab ? (fallback as FollowupUnifiedModalTab) : 'coercive');
    }, [
        effectiveFollowupSectionTabOrder,
        hideFollowupCoerciveTab,
        showUnifiedExecutionModal,
        unifiedModalTab,
        setUnifiedModalTab,
    ]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        if (showPersonalCoerciveFollowupTab || unifiedModalTab !== 'personal') return;
        const fallback = effectiveFollowupSectionTabOrder[0] ?? 'coercive';
        setUnifiedModalTab(hideFollowupCoerciveTab ? (fallback as FollowupUnifiedModalTab) : 'coercive');
    }, [
        effectiveFollowupSectionTabOrder,
        hideFollowupCoerciveTab,
        showPersonalCoerciveFollowupTab,
        showUnifiedExecutionModal,
        unifiedModalTab,
        setUnifiedModalTab,
    ]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        if (!hideFollowupCoerciveTab || unifiedModalTab !== 'coercive') return;
        setUnifiedModalTab((effectiveFollowupSectionTabOrder[0] ?? 'coercive') as FollowupUnifiedModalTab);
    }, [
        effectiveFollowupSectionTabOrder,
        hideFollowupCoerciveTab,
        showUnifiedExecutionModal,
        unifiedModalTab,
        setUnifiedModalTab,
    ]);

    useEffect(() => {
        if (showUnifiedExecutionModal) return;
        setShowSolidaryCoerciveTargetModal(false);
        setSolidaryCoerciveActionPending(null);
    }, [showUnifiedExecutionModal, setSolidaryCoerciveActionPending, setShowSolidaryCoerciveTargetModal]);

    useLayoutEffect(() => {
        if (!showUnifiedExecutionModal) return;
        const cleanups: Array<() => void> = [];
        const chips = followupModalChipTablistRef.current;
        const debtors = followupModalDebtorTabsRef.current;
        if (chips) cleanups.push(bindHorizontalWheelToScroll(chips));
        if (debtors) cleanups.push(bindHorizontalWheelToScroll(debtors));
        return () => cleanups.forEach((u) => u());
    }, [
        showUnifiedExecutionModal,
        isSolidaryLiability,
        solidaryDebtorCount,
        followupModalChipTablistRef,
        followupModalDebtorTabsRef,
    ]);
}
