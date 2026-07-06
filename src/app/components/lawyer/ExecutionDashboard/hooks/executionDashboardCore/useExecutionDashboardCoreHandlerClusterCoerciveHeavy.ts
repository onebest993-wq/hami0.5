// @ts-nocheck
/** Coercive-heavy cluster: excludes dossier/admin handlers from the full bridge. */
import { useExecutionDashboardCoreHandlerClusterFoundation } from './useExecutionDashboardCoreHandlerClusterFoundation';
import { useExecutionDashboardCoreHandlerClusterSeizureCoercive } from './useExecutionDashboardCoreHandlerClusterSeizureCoercive';
import { useExecutionDashboardCoreHandlerClusterPartyLifecycle } from './useExecutionDashboardCoreHandlerClusterPartyLifecycle';
import { useExecutionDashboardCoreHandlerClusterEviction } from './useExecutionDashboardCoreHandlerClusterEviction';
import { useExecutionDashboardCoreHandlerClusterSeizureFollowup } from './useExecutionDashboardCoreHandlerClusterSeizureFollowup';
import type { ExecutionDashboardCoreHandlerClusterInput } from './executionDashboardCoreHandlerClusterTypes';

export function useExecutionDashboardCoreHandlerClusterCoerciveHeavy(
    c: ExecutionDashboardCoreHandlerClusterInput,
) {
    const foundation = useExecutionDashboardCoreHandlerClusterFoundation(c);
    const {
        firstActiveAppealDecisionId,
        removeJudicialCustodianEntry,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
        realEstateSeizureHandlers,
        thirdPartySeizureHandlers,
    } = foundation;

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
        removeJudicialCustodianEntry,
        pushTimelineEventBinding,
        pushTimelineEvent,
        propertyInlineSaveCtx,
        realEstateSeizureHandlers,
        thirdPartySeizureHandlers,
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
