// @ts-nocheck
/** Phase C — تجميع تبويبات محضر المتابعة + تخصص الإضبارة */
import { useCallback, useMemo, useState, type MutableRefObject } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import {
    applyDebtorDeathFollowupOverlay,
} from '@/app/utils/partyDeathClaimPolicy';
import {
    resolveExecutionDomainContext,
} from '@/app/utils/executionDomainIsolation';
import { isCustodyRemovalExecutionClaim } from '@/app/utils/executionClaimIsolation';
import { useFollowupModalPersistNavigation } from '../useFollowupModalPersistNavigation';
import {
    useExecutionDashboardEmployeeCompulsoryBannerReset,
    useExecutionDashboardEmployeePersonalTabUnlockHydrate,
} from './useExecutionDashboardRuntimeSyncEffects';

export type FollowupModalTabId =
    | 'personal'
    | 'coercive'
    | 'seizure_requests'
    | 'correspondences'
    | 'admin'
    | 'dossier_controls'
    | 'other_party';

export type UseExecutionDashboardFollowupTabAssemblyParams = {
    executionData: ExecutionFile | null | undefined;
    viewExecutionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string | undefined;
    claimType: string | undefined;
    activeDebtorIsDeceased: boolean;
    activeDebtorIsLegalEntity: boolean;
    activeDebtorIsEmployee: boolean;
    followupModalDebtorIsEmployee: boolean;
    followupModalDebtorIsDeceased: boolean;
    followupModalSpecializationEffective: {
        hidePersonalCoerciveFollowupTab?: boolean;
        hideFollowupCoerciveTab?: boolean;
        hideFollowupSeizureRequestsTab?: boolean;
    };
    modalShowEmployeeAssignmentCoerciveBlock: boolean;
    followupAssignmentWorkspaceCtx: { activeDebtorKey?: string | null };
    primaryDebtorWorkspaceKey: string | undefined;
    employeeAssignmentPhaseForCoercive: string | undefined;
    employeeCompulsoryBannerDismissed: boolean;
    setEmployeeCompulsoryBannerDismissed: (dismissed: boolean) => void;
    showUnifiedExecutionModal: boolean;
    unifiedModalTab: string;
    setUnifiedModalTab: (tab: string) => void;
    dossierFileKey: string;
    setShowUnifiedExecutionModal: (show: boolean) => void;
    followupModalBodyScrollRef: MutableRefObject<HTMLDivElement | null>;
    followupModalSectionTabsRef: MutableRefObject<HTMLDivElement | null>;
    followupModalOpenGenerationRef: MutableRefObject<number>;
    seizureMatrixRef: MutableRefObject<unknown>;
    openSeizureRequestsTabRef: MutableRefObject<(() => void) | null>;
    hideCoerciveTabsForDebtorAgent: boolean;
};

export function useExecutionDashboardFollowupTabAssembly({
    executionData,
    viewExecutionData,
    executionId,
    decisionsStorageExecutionId,
    claimType,
    activeDebtorIsDeceased,
    activeDebtorIsLegalEntity,
    activeDebtorIsEmployee,
    followupModalDebtorIsEmployee,
    followupModalDebtorIsDeceased,
    followupModalSpecializationEffective,
    modalShowEmployeeAssignmentCoerciveBlock,
    followupAssignmentWorkspaceCtx,
    primaryDebtorWorkspaceKey,
    employeeAssignmentPhaseForCoercive,
    employeeCompulsoryBannerDismissed,
    setEmployeeCompulsoryBannerDismissed,
    showUnifiedExecutionModal,
    unifiedModalTab,
    setUnifiedModalTab,
    dossierFileKey,
    setShowUnifiedExecutionModal,
    followupModalBodyScrollRef,
    followupModalSectionTabsRef,
    followupModalOpenGenerationRef,
    seizureMatrixRef,
    openSeizureRequestsTabRef,
    hideCoerciveTabsForDebtorAgent,
}: UseExecutionDashboardFollowupTabAssemblyParams) {
    const executionDomainContext = useMemo(
        () =>
            resolveExecutionDomainContext(
                executionData as Record<string, unknown> | null | undefined,
                decisionsStorageExecutionId ?? executionId,
            ),
        [executionData, decisionsStorageExecutionId, executionId],
    );

    const followupSpecialization = executionDomainContext.flags;

    const followupSpecializationEffective = useMemo(
        () => applyDebtorDeathFollowupOverlay(followupSpecialization, Boolean(activeDebtorIsDeceased)),
        [followupSpecialization, activeDebtorIsDeceased],
    );

    const showPersonalCoerciveFollowupTab =
        !followupSpecializationEffective.hidePersonalCoerciveFollowupTab;

    const showSalarySeizureInFollowupModal = followupModalDebtorIsEmployee;
    const followupSalarySeizureLabel =
        followupModalDebtorIsDeceased && followupModalDebtorIsEmployee
            ? 'حجز مستحقات ومكافأة نهاية الخدمة'
            : 'طلب حجز راتب (١/٥)';

    useExecutionDashboardEmployeeCompulsoryBannerReset(
        employeeAssignmentPhaseForCoercive,
        setEmployeeCompulsoryBannerDismissed,
    );

    const showEmployeeCompulsoryProceduresBanner =
        employeeAssignmentPhaseForCoercive === 'absent_declared' && !employeeCompulsoryBannerDismissed;

    const activeFollowupDebtorKey = String(
        followupAssignmentWorkspaceCtx.activeDebtorKey ??
            primaryDebtorWorkspaceKey ??
            executionId ??
            '',
    );

    const [personalTabUnlockByDebtor, setPersonalTabUnlockByDebtor] = useState<Record<string, boolean>>({});

    const employeePersonalTabUnlockStorageKey = useMemo(() => {
        const ex = String(decisionsStorageExecutionId ?? executionData?.id ?? executionId ?? '').trim();
        return ex ? `hami:employee_personal_unlock:${ex}` : '';
    }, [decisionsStorageExecutionId, executionData?.id, executionId]);

    useExecutionDashboardEmployeePersonalTabUnlockHydrate(
        employeePersonalTabUnlockStorageKey,
        setPersonalTabUnlockByDebtor,
    );

    const custodyRemovalClaimActive = useMemo(
        () =>
            isCustodyRemovalExecutionClaim(
                viewExecutionData as Record<string, unknown> | null | undefined,
                String(claimType || '').trim() || undefined,
            ),
        [viewExecutionData, claimType],
    );

    const employeeCoerciveDetentionRestricted =
        Boolean(activeDebtorIsEmployee) && !custodyRemovalClaimActive;

    const modalEmployeeCoerciveDetentionRestricted =
        Boolean(followupModalDebtorIsEmployee) && !custodyRemovalClaimActive;

    const modalShowPersonalCoerciveFollowupTab =
        !followupModalSpecializationEffective.hidePersonalCoerciveFollowupTab ||
        modalShowEmployeeAssignmentCoerciveBlock;

    const personalTabLockedForEmployee =
        employeeCoerciveDetentionRestricted &&
        !Boolean(personalTabUnlockByDebtor[activeFollowupDebtorKey]);

    const modalPersonalTabLockedForEmployee =
        modalEmployeeCoerciveDetentionRestricted &&
        !Boolean(personalTabUnlockByDebtor[activeFollowupDebtorKey]) &&
        !followupModalSpecializationEffective.hidePersonalCoerciveFollowupTab;

    const followupTabsRestricted = activeDebtorIsLegalEntity || hideCoerciveTabsForDebtorAgent;

    const followupSectionTabOrder = useMemo(
        () =>
            [
                ...(showPersonalCoerciveFollowupTab && !followupTabsRestricted
                    ? (['personal'] as const)
                    : []),
                ...(followupSpecialization.hideFollowupCoerciveTab || followupTabsRestricted
                    ? []
                    : (['coercive'] as const)),
                ...(followupTabsRestricted ? [] : (['seizure_requests'] as const)),
                'correspondences',
                'admin',
                'dossier_controls',
                'other_party',
            ] as const,
        [
            showPersonalCoerciveFollowupTab,
            followupSpecialization.hideFollowupCoerciveTab,
            followupTabsRestricted,
        ],
    );

    const {
        openFollowupModalPersisted,
        closeFollowupModalPersisted,
        persistFollowupModalViewport,
        goFollowupSectionTabByDelta,
    } = useFollowupModalPersistNavigation({
        showUnifiedExecutionModal,
        unifiedModalTab,
        setUnifiedModalTab,
        followupSectionTabOrder,
        dossierFileKey,
        setShowUnifiedExecutionModal,
        followupModalBodyScrollRef,
        followupModalSectionTabsRef,
        followupModalOpenGenerationRef,
        seizureMatrixRef,
        openSeizureRequestsTabRef,
    });

    const followupModalTabs = useMemo(() => {
        const tabs: Array<{ id: FollowupModalTabId; label: string }> = [];
        if (modalShowPersonalCoerciveFollowupTab && !followupTabsRestricted) {
            tabs.push({
                id: 'personal',
                label: modalPersonalTabLockedForEmployee
                    ? '🔒 التنفيذ الجبري الشخصي'
                    : 'التنفيذ الجبري الشخصي',
            });
        }
        if (!followupModalSpecializationEffective.hideFollowupCoerciveTab && !followupTabsRestricted) {
            tabs.push({ id: 'coercive', label: 'الإجراءات الجبرية' });
        }
        if (!followupTabsRestricted && !followupModalSpecializationEffective.hideFollowupSeizureRequestsTab) {
            tabs.push({ id: 'seizure_requests', label: 'طلبات الحجز المالية' });
        }
        tabs.push(
            { id: 'correspondences', label: 'المخاطبات' },
            { id: 'admin', label: 'نماذج الطلبات' },
            { id: 'dossier_controls', label: 'التحكم في الإضبارة' },
            { id: 'other_party', label: 'تحركات الطرف الآخر' },
        );
        return tabs;
    }, [
        modalShowPersonalCoerciveFollowupTab,
        modalPersonalTabLockedForEmployee,
        modalShowEmployeeAssignmentCoerciveBlock,
        followupModalSpecializationEffective.hideFollowupCoerciveTab,
        followupModalSpecializationEffective.hideFollowupSeizureRequestsTab,
        followupTabsRestricted,
    ]);

    const isFollowupTabActive = useCallback(
        (tabId: FollowupModalTabId) => {
            if (tabId === 'coercive') {
                if (followupModalSpecializationEffective.hideFollowupCoerciveTab) return false;
                return (
                    unifiedModalTab === 'coercive' ||
                    (unifiedModalTab === 'personal' && !modalShowPersonalCoerciveFollowupTab)
                );
            }
            return unifiedModalTab === tabId;
        },
        [
            unifiedModalTab,
            modalShowPersonalCoerciveFollowupTab,
            followupModalSpecializationEffective.hideFollowupCoerciveTab,
        ],
    );

    return {
        executionDomainContext,
        followupSpecialization,
        followupSpecializationEffective,
        showPersonalCoerciveFollowupTab,
        showSalarySeizureInFollowupModal,
        followupSalarySeizureLabel,
        showEmployeeCompulsoryProceduresBanner,
        activeFollowupDebtorKey,
        personalTabUnlockByDebtor,
        setPersonalTabUnlockByDebtor,
        employeePersonalTabUnlockStorageKey,
        custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted,
        modalEmployeeCoerciveDetentionRestricted,
        modalShowPersonalCoerciveFollowupTab,
        personalTabLockedForEmployee,
        modalPersonalTabLockedForEmployee,
        followupTabsRestricted,
        followupSectionTabOrder,
        followupModalTabs,
        isFollowupTabActive,
        openFollowupModalPersisted,
        closeFollowupModalPersisted,
        persistFollowupModalViewport,
        goFollowupSectionTabByDelta,
    };
}
