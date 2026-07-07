// @ts-nocheck
/** Phase C Slice 31 — boot/props/static/computed tail for buildExecutionDashboardCoreRuntimeVars */
import { debug } from '@/app/utils/debug';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { syncRollingCalendarSessions } from '@/app/utils/visitationScheduleEngine';
import { shouldShowGuarantorExternalHub } from '../../components/guarantorExternalUtils';
import { mergeSimilarRecentTimelineEvent } from '@/app/utils/timelineDedup';
import type { ExecutionFile } from '@/app/types/execution';
import { guarantorFollowupAwaitingDetailsSave } from '@/app/types/execution';
import {
    readExecutorDecisionsArray,
    isExecutorRowEffectivelyApproved,
    appendEvictionExecutorRequest,
} from '@/app/utils/executorSeizureDecisionQueue';
import { hasActiveResidentialEvictionGrace } from '@/app/utils/residentialEvictionGrace';
import {
    EVICTION_WORKFLOW_BY_ACTION_ID,
    openBreakInventoryCompletion,
    openJudicialCustodianCompletion,
} from '@/app/utils/executorApprovalWorkflow';
import { daysRemainingUntilDeadline, isAssignmentDeadlinePassed } from '@/app/utils/employeeSummonsAssignment';
import { publicationNoticeDeadlineYmd } from '@/app/utils/publicationNoticeDebtor';
import { buildDebtorNoticePatchForKey, getDebtorNoticeStateForKey } from '@/app/utils/noticeDebtorScope';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import { useExecutionDashboardStore, isDebtorRowEmployee, debtorEmploymentToggleMenuLabel } from '@/app/stores';
import { bindHorizontalWheelToScroll } from '../../helpers';
import type { ExecutionDashboardProps } from '../../types';

export function buildExecutionDashboardCoreRuntimeTailInput(p: {
    boot: Record<string, unknown>;
    props: Pick<ExecutionDashboardProps, 'file' | 'executionId' | 'onClose' | 'onUpdate'>;
    specificDeliveryConvertedAmount: number | null;
    specificDeliveryFinancialized: boolean;
    financialStatus: unknown;
    daysRemainingInGracePeriod: number;
    statuteStatus: { daysRemaining?: number } | null | undefined;
    followupOrchestrator: Record<string, unknown>;
}) {
    const { boot, props, followupOrchestrator } = p;
    const { file, executionId, onClose, onUpdate } = props;
    const executionData = boot.executionData as ExecutionFile | null | undefined;
    const modals = boot.modals as { showCoerciveModal?: boolean } | undefined;

    return {
        EVICTION_WORKFLOW_BY_ACTION_ID,
        READY_FOR_COERCIVE: 'READY_FOR_COERCIVE',
        specificDeliveryConvertedAmount: p.specificDeliveryConvertedAmount,
        specificDeliveryFinancialized: p.specificDeliveryFinancialized,
        currentFileId: boot.currentFileId,
        file,
        executionData,
        executionDataId: executionData?.id,
        executionDataRef: boot.executionDataRef,
        executionId,
        onUpdate,
        onClose,
        viewExecutionData: boot.viewExecutionData,
        currentFile: boot.currentFile,
        activeSubFileId: boot.activeSubFileId,
        delegationParentFileId: boot.delegationParentFileId,
        activeTabId: boot.activeTabId,
        setActiveTabId: boot.setActiveTabId,
        childDossiers: boot.childDossiers,
        subFiles: boot.subFiles,
        hasChildDossiers: boot.hasChildDossiers,
        linkedDossierToView: boot.linkedDossierToView,
        setLinkedDossierToView: boot.setLinkedDossierToView,
        dossierFileKey: boot.dossierFileKey,
        parentDossierId: boot.parentDossierId,
        parentExecutionFile: boot.parentExecutionFile,
        decisionsStorageExecutionId: boot.decisionsStorageExecutionId,
        showDecisionsModal: boot.showDecisionsModal,
        setShowDecisionsModal: boot.setShowDecisionsModal,
        setExecutionStorageTick: boot.setExecutionStorageTick,
        bindHorizontalWheelToScroll,
        buildDebtorNoticePatchForKey,
        getDebtorNoticeStateForKey,
        getLocalTodayYmd,
        gracePeriodStart: followupOrchestrator.evictionResidentialGracePeriodStart,
        hasActiveResidentialEvictionGrace,
        isExecutorRowEffectivelyApproved,
        isInabaActive: boot.isInabaActive,
        isUnifiedTabActive: boot.isUnifiedTabActive,
        appendEvictionExecutorRequest,
        reconcileDossierLifecycle: boot.reconcileDossierLifecycle,
        resolveCalendarUserId,
        readExecutorDecisionsArray,
        mergeSimilarRecentTimelineEvent,
        syncRollingCalendarSessions,
        setShowCoerciveModal: boot.setShowCoerciveModal,
        showCoerciveModal: modals?.showCoerciveModal,
        showExtraCreditors: boot.showExtraCreditors,
        showExtraDebtors: boot.showExtraDebtors,
        setShowExtraCreditors: boot.setShowExtraCreditors,
        setShowExtraDebtors: boot.setShowExtraDebtors,
        toggleHeaderExpanded: boot.toggleHeaderExpanded,
        isHeaderExpanded: boot.isHeaderExpanded,
        useExecutionDashboardStore,
        voiceUserId: resolveCalendarUserId(null),
        partyBadgesExecutionId: boot.partyBadgesExecutionId,
        daysRemaining: p.statuteStatus?.daysRemaining ?? p.daysRemainingInGracePeriod,
        daysRemainingUntilDeadline,
        debtorEmploymentToggleMenuLabel,
        isDebtorRowEmployee,
        publicationNoticeDeadlineYmd,
        inabaCorrespondenceLog: boot.inabaCorrespondenceLog,
        inabaTargets: boot.inabaTargets,
        guarantorFollowupAwaitingDetailsSave,
        executionAppealBanner: boot.executionAppealBanner,
        vacateDeadline: followupOrchestrator.evictionVacateDeadlineLocal,
        residentialGracePeriodSaved: Boolean(
            followupOrchestrator.evictionResidentialGracePeriodStart &&
                followupOrchestrator.evictionVacateDeadlineLocal,
        ),
        isAssignmentDeadlinePassed,
        debtorSummonsMarkerLocal: boot.debtorSummonsMarkerLocal,
        setDebtorSummonsMarkerLocal: boot.setDebtorSummonsMarkerLocal,
        openBreakInventoryCompletion,
        openJudicialCustodianCompletion,
        setShowNotesModal: boot.setShowNotesModal,
        setShowPaymentModal: boot.setShowPaymentModal,
        isHistoricalMode: boot.isHistoricalMode,
        shouldShowGuarantorExternalHub,
        timelineDebtorMetadata,
        financialStatus: p.financialStatus,
        debug,
    };
}
