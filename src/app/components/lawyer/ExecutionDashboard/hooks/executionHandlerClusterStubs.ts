// @ts-nocheck
/** Placeholders until execution-core-handlers loads on first interaction. */
const noop = () => undefined;
const noopAsync = async () => undefined;

function handlerLeaf(): unknown {
    const fn = (..._args: unknown[]) => undefined;
    return new Proxy(fn, {
        get(_target, prop) {
            if (prop === 'then') return undefined;
            if (prop === Symbol.toPrimitive) return () => '';
            return handlerLeaf();
        },
        apply() {
            return undefined;
        },
    });
}

const HANDLER_STUB = handlerLeaf();

const REST_EXTRA_DEFAULTS = {
    showResidentialEvictionGraceControl: false,
    showResidentialGraceEarlyEndRequest: false,
    residentialGraceAllowsFieldwork: false,
    showBreakInventoryRequest: false,
    firstActiveAppealDecisionId: null as string | null,
};

/** Keys consumed by pickHandlerClusterAssemblyHandlers + rest extras */
const ASSEMBLY_HANDLER_KEYS = [
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

function buildStubCluster(): Record<string, unknown> {
    const out: Record<string, unknown> = {
        pushTimelineEvent: noop,
        ...REST_EXTRA_DEFAULTS,
    };
    for (const key of ASSEMBLY_HANDLER_KEYS) {
        out[key] = HANDLER_STUB;
    }
    return out;
}

export const EXECUTION_HANDLER_CLUSTER_STUBS: Record<string, unknown> = buildStubCluster();

export function isExecutionHandlerClusterStub(cluster: Record<string, unknown>): boolean {
    return cluster === EXECUTION_HANDLER_CLUSTER_STUBS;
}
