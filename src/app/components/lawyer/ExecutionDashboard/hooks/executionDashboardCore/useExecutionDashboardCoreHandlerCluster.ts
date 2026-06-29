/** Phase C Slice 22 — cluster handlers + persistence wiring (extracted from core) */
import { useExecutionDashboardCoreHandlerClusterFoundation } from './useExecutionDashboardCoreHandlerClusterFoundation';
import { useExecutionDashboardCoreHandlerClusterSeizureCoercive } from './useExecutionDashboardCoreHandlerClusterSeizureCoercive';
import { useExecutionDashboardCoreHandlerClusterDossier } from './useExecutionDashboardCoreHandlerClusterDossier';
import { useExecutionDashboardCoreHandlerClusterPartyLifecycle } from './useExecutionDashboardCoreHandlerClusterPartyLifecycle';
import { useExecutionDashboardCoreHandlerClusterEviction } from './useExecutionDashboardCoreHandlerClusterEviction';
import { useExecutionDashboardCoreHandlerClusterSeizureFollowup } from './useExecutionDashboardCoreHandlerClusterSeizureFollowup';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';
export type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerCluster(c: ExecutionDashboardCoreHandlerClusterInput) {
    const foundation = useExecutionDashboardCoreHandlerClusterFoundation(c);
    const {
        executionCopilotDecisions,
        firstActiveAppealDecisionId,
        removeJudicialCustodianEntry,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
        realEstateSeizureHandlers,
        thirdPartySeizureHandlers,
    } = foundation;

    const dossierBlock = useExecutionDashboardCoreHandlerClusterDossier(c, { pushTimelineEvent });
    const {
        dossierLifecycleActions,
        dossierMetaWorkflow,
        parentDossierPersistence,
        dossierFollowupHandlers,
    } = dossierBlock;

    const partyBlock = useExecutionDashboardCoreHandlerClusterPartyLifecycle(c, { pushTimelineEvent });
    const {
        debtorEmploymentHandler,
        stayHandlers,
        partyDeathHandlers,
        voluntaryPeriodHandlers,
        employeeAssignmentHandlers,
        publicationNoticeHandlers,
        notesTasksHandlers,
        appointmentHandler,
        paymentHandlers,
        notifyDebtorHandler,
        heirsNotificationHandlers,
        debtorSummonsCoerciveHandlers,
    } = partyBlock;

    const evictionBlock = useExecutionDashboardCoreHandlerClusterEviction(c, { pushTimelineEvent });
    const {
        gracePeriodEndHandler,
        evictionProceduresHandlers,
        evictionHeirsMemoHandlers,
        showResidentialEvictionGraceControl,
        showResidentialGraceEarlyEndRequest,
        residentialGraceAllowsFieldwork,
        showBreakInventoryRequest,
        evictionResidentialGraceHandlers,
        policeAssistanceHandlers,
        breakInventoryHandlers,
        guarantorFollowupHandlers,
        evictionFinancialHandlers,
        moduleExpenseHandlers,
    } = evictionBlock;

    const seizureFollowupBlock = useExecutionDashboardCoreHandlerClusterSeizureFollowup(c, { pushTimelineEvent });
    const {
        followupSeizureHandlers,
        seizureAssetModalHandlers,
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
    } = seizureFollowupBlock;

    const seizureCoercive = useExecutionDashboardCoreHandlerClusterSeizureCoercive(c, {
        pushTimelineEvent,
        focusSeizurePropertyInlineCompletion,
        focusSeizureMovableInlineCompletion,
        focusSeizureThirdPartyInlineCompletion,
        focusSeizureNoticeInlineCompletion,
    });

    const {
        coerciveActionBridge,
        coerciveActionHandlers,
        seizureReleaseHandlers,
        thirdPartyReceiveHandlers,
        standaloneMarkHandlers,
        salarySeizurePatch,
    } = seizureCoercive;

    return {
        firstActiveAppealDecisionId,
        executionCopilotDecisions,
        removeJudicialCustodianEntry,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
        realEstateSeizureHandlers,
        thirdPartySeizureHandlers,
        dossierLifecycleActions,
        dossierMetaWorkflow,
        parentDossierPersistence,
        dossierFollowupHandlers,
        debtorEmploymentHandler,
        stayHandlers,
        partyDeathHandlers,
        voluntaryPeriodHandlers,
        employeeAssignmentHandlers,
        publicationNoticeHandlers,
        notesTasksHandlers,
        appointmentHandler,
        paymentHandlers,
        notifyDebtorHandler,
        heirsNotificationHandlers,
        debtorSummonsCoerciveHandlers,
        gracePeriodEndHandler,
        evictionProceduresHandlers,
        evictionHeirsMemoHandlers,
        showResidentialEvictionGraceControl,
        showResidentialGraceEarlyEndRequest,
        residentialGraceAllowsFieldwork,
        showBreakInventoryRequest,
        evictionResidentialGraceHandlers,
        policeAssistanceHandlers,
        breakInventoryHandlers,
        guarantorFollowupHandlers,
        evictionFinancialHandlers,
        moduleExpenseHandlers,
        followupSeizureHandlers,
        seizureAssetModalHandlers,
        coerciveActionBridge,
        coerciveActionHandlers,
        seizureReleaseHandlers,
        thirdPartyReceiveHandlers,
        standaloneMarkHandlers,
        salarySeizurePatch,
    };
}

