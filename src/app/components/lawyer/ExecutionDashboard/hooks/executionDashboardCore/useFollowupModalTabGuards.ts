import { useEffect, useLayoutEffect } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { bindHorizontalWheelToScroll } from '@/app/components/lawyer/ExecutionDashboard/helpers';
import type { FollowupUnifiedModalTab } from '../../followupModalTabTypes';
import { resolveLegacyFollowupTabRuntimeRedirect } from '../../utils/followupLegacyTabNormalization';

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
            const nextTab = (hideCoerciveTabsForDebtorAgent ? 'other_party' : 'correspondences') as FollowupUnifiedModalTab;
            if (nextTab !== unifiedModalTab) setUnifiedModalTab(nextTab);
            return;
        }
        if (unifiedModalTab !== 'seizure_requests') return;
        if (!seizureMatrix.hideSeizureTab && !hideFollowupSeizureRequestsTab) return;
        const fallback = (effectiveFollowupSectionTabOrder[0] ?? 'correspondences') as FollowupUnifiedModalTab;
        if (fallback !== unifiedModalTab) setUnifiedModalTab(fallback);
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
        const legacyRedirect = resolveLegacyFollowupTabRuntimeRedirect({
            unifiedModalTab,
            effectiveFollowupSectionTabOrder,
            hideFollowupCoerciveTab,
        });
        if (legacyRedirect && legacyRedirect !== unifiedModalTab) {
            setUnifiedModalTab(legacyRedirect);
        }
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
        const nextTab = (hideFollowupCoerciveTab ? fallback : 'coercive') as FollowupUnifiedModalTab;
        if (nextTab !== unifiedModalTab) setUnifiedModalTab(nextTab);
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
        const fallback = (effectiveFollowupSectionTabOrder[0] ?? 'coercive') as FollowupUnifiedModalTab;
        if (fallback !== unifiedModalTab) setUnifiedModalTab(fallback);
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
