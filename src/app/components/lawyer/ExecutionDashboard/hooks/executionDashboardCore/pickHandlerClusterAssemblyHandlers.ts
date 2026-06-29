// @ts-nocheck
/** Phase C Slice 23 — handlers من handler cluster لحقيبة scope assembly */
const HANDLER_CLUSTER_ASSEMBLY_HANDLER_KEYS = [
    'notesTasksHandlers',
    'paymentHandlers',
    'notifyDebtorHandler',
    'heirsNotificationHandlers',
    'debtorSummonsCoerciveHandlers',
    'gracePeriodEndHandler',
    'evictionHeirsMemoHandlers',
    'evictionResidentialGraceHandlers',
    'policeAssistanceHandlers',
    'breakInventoryHandlers',
    'guarantorFollowupHandlers',
    'evictionFinancialHandlers',
    'moduleExpenseHandlers',
    'followupSeizureHandlers',
    'seizureAssetModalHandlers',
    'coerciveActionBridge',
    'coerciveActionHandlers',
    'seizureReleaseHandlers',
    'thirdPartyReceiveHandlers',
    'standaloneMarkHandlers',
    'salarySeizurePatch',
    'thirdPartySeizureHandlers',
    'realEstateSeizureHandlers',
    'dossierFollowupHandlers',
    'debtorEmploymentHandler',
    'stayHandlers',
    'partyDeathHandlers',
    'voluntaryPeriodHandlers',
    'employeeAssignmentHandlers',
    'publicationNoticeHandlers',
    'appointmentHandler',
    'propertyInlineSaveCtx',
    'parentDossierPersistence',
    'removeJudicialCustodianEntry',
    'pushTimelineEventBinding',
    'dossierLifecycleActions',
    'dossierMetaWorkflow',
    'evictionProceduresHandlers',
] as const;

export function pickHandlerClusterAssemblyHandlers(
    handlerCluster: Record<string, unknown>,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of HANDLER_CLUSTER_ASSEMBLY_HANDLER_KEYS) {
        if (key in handlerCluster) out[key] = handlerCluster[key];
    }
    return out;
}

export function pickHandlerClusterRestExtras(handlerCluster: Record<string, unknown>) {
    return {
        showResidentialEvictionGraceControl: handlerCluster.showResidentialEvictionGraceControl,
        showResidentialGraceEarlyEndRequest: handlerCluster.showResidentialGraceEarlyEndRequest,
        residentialGraceAllowsFieldwork: handlerCluster.residentialGraceAllowsFieldwork,
        showBreakInventoryRequest: handlerCluster.showBreakInventoryRequest,
        firstActiveAppealDecisionId: handlerCluster.firstActiveAppealDecisionId,
    };
}
