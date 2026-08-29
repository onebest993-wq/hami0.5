import React, { Suspense } from 'react';
import { EXEC_OVERLAY_INNER_SILENT_FALLBACK } from '../executionDashboardLazyShellUi';
import { isGuarantorSummonsEligible } from './guarantorExternalUtils';
import {
    buildGuarantorNotificationFeature,
    buildUnifiedSummonsSafeHandlers,
} from './unifiedSummonsModalSafeHandlers';
import type { UnifiedSummonsModalContainerProps } from './UnifiedSummonsModalContainer.types';
import { UnifiedSummonsHubMountedPanel } from './UnifiedSummonsHubMountedPanel';

export const UnifiedSummonsModalContainer: React.FC<UnifiedSummonsModalContainerProps> = (props) => {
    const {
        showUnifiedSummonsModal,
        EXEC_OVERLAY_LAZY_FALLBACK: _EXEC_OVERLAY_LAZY_FALLBACK,
        handleNotifyDebtor,
        setSummonsHubInitialMainTab,
        setSummonsContextDebtorKey,
        onCloseUnifiedSummonsModal,
        setShowUnifiedSummonsModal,
        employeeAssignmentTabEnabled,
        activeDebtorIsEmployee,
        isEvictionExecutionModule,
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        pushTimelineEvent,
        handlePublicationNoticeRegister,
        handlePublicationNoticeTerminate,
        handlePublicationNoticeDebtorAttended,
        registerDebtorVoluntaryAttendance,
        activeDebtorNoticeScope,
        summoningRound,
        setTimelineEvents,
        summonsHubInitialMainTab,
    } = props;

    const safe = buildUnifiedSummonsSafeHandlers({
        handleNotifyDebtor,
        setSummonsHubInitialMainTab,
        setSummonsContextDebtorKey,
        onCloseUnifiedSummonsModal,
        setShowUnifiedSummonsModal,
        employeeAssignmentTabEnabled,
        activeDebtorIsEmployee,
        isEvictionExecutionModule,
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        pushTimelineEvent,
        handlePublicationNoticeRegister,
        handlePublicationNoticeTerminate,
        handlePublicationNoticeDebtorAttended,
        registerDebtorVoluntaryAttendance,
        activeDebtorNoticeScope,
        summoningRound,
        setTimelineEvents,
    });

    const guarantorNotificationFeature = buildGuarantorNotificationFeature({
        executionData,
        summonsHubInitialMainTab,
        persistExecutionMerge,
        pushTimelineEvent,
        nextTimelineId,
        showToast,
        isGuarantorSummonsEligible,
    });

    if (!showUnifiedSummonsModal) return null;

    return (
        <Suspense fallback={EXEC_OVERLAY_INNER_SILENT_FALLBACK}>
            <UnifiedSummonsHubMountedPanel
                {...props}
                safe={safe}
                guarantorNotificationFeature={guarantorNotificationFeature}
            />
        </Suspense>
    );
};
