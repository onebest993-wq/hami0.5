// @ts-nocheck
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    createCriminalStorePersistStorage,
    criminalStorePartialize,
    CRIMINAL_STORE_PERSIST_VERSION,
    CRIMINAL_STORE_KEY,
} from './criminalStorePersistOptions';
import {
    ensureStageJourneyOnCase,
    normalizeDefendantPersonalFields,
    normalizeTrialChargeFieldsOnCase,
    resolveInvestigationCaseNumberSnapshot,
    sanitizeMergeTimelineEvents,
    sanitizeMergedCasesTexts,
} from './criminalStorePersistSupport';
import { migrateCriminalPersistState } from './criminalStorePersistMigrate';
import { installCriminalStorePersistMergeListener } from './criminalStorePersistMerge';
import type {
    CassationProceeding,
    CassationType,
    CaseStage,
    DefendantPersonalStage,
    JudicialAppellantType,
    JudicialCassationAppealPath,
    JudicialDecision,
    JourneyNode,
    JourneyTransitionKind,
    ProceduralNode,
    ProceduralTransitionActionId,
    ProsecutionInterventionBasis,
    SeveranceReason,
} from '@/app/types/criminal';
import type { CriminalCaseUserRole } from './complainantCassationGovernance';
import {
    applyPublicRightAfterPrivateWaiver,
    makePublicRightComplainant,
    isPublicRightComplainantName,
} from './publicProsecutionGovernance';
import { isStageExpirationReason, type StageExpirationReason } from './stageExpirationReasons';
import {
    buildTrashLabel,
    normalizeTrashBin,
    type CriminalTrashItem,
    type CriminalTrashItemKind,
    type ProceduralSubItemTrashSnapshot,
} from './criminalCaseTrash';
import {
    makeEmptyGuarantorDetails,
    normalizeGuarantorDetails,
    type GuarantorDetails,
    type GuarantorPerson,
} from './criminalGuarantorModel';
import { normalizeSeizedAssets, type SeizedAsset } from './criminalSeizedAssetModel';
import {
    classifyAssetSeizurePartyKind,
    normalizeOurRepresentation,
    resolveOurRepresentationFromCaseRecord,
    resolveProceduralDefendantId,
    resolveProceduralDefendantIds,
    type OurRepresentation,
} from './criminalProceduralPartyUtils';
import { caseMutationBlocked, isMergedDossierCase, timelineEventAllowedWhenFrozen } from './criminalCaseMutationPolicy';
import { computeObjectionDeadlineFromNotifiedDate } from './criminalDateUtils';
import { applyTimelineEventInsertion } from './criminalTimelineEventInsertEngine';
import {
    applyCompleteInvestigationLetter,
    applyInvestigationLogExhibitLifecycleUpdate,
    applyInvestigationLogInsertion,
    applyInvestigationLogUpdate,
    applyStatementInsertion,
    applyStatementUpdate,
} from './criminalInvestigationMutationEngine';
import {
    isInternalCaseIdentifier,
    looksLikeRealCaseReference,
    resolveCriminalCaseDisplayLabel,
    resolveOfficialCaseNumber,
    sanitizeCaseReferenceField,
} from './criminalCaseReferenceUtils';
import { resolveMergedCaseIds } from './criminalCaseMergeUtils';
import { isCorruptTimelineEvent } from './criminalCaseTimelineUtils';
import { createCriminalId as createId } from './criminalIdUtils';
import {
    finalizeDraftComplainantsCounterComplaint,
    makeEmptyComplainant,
    makeEmptyLocation,
    makeInitialDraft,
    normalizeCriminalCaseLocation,
    normalizeSocialInquiryReport,
} from './criminalCaseDraftFactory';
import {
    computeAppealDeadline,
    normalizeTrialSessions,
    presenceTypeFromSession,
    trialVerdictOutcomeLabel,
    type AddTrialSessionInput,
    type FinalizeTrialVerdictInput,
    type TrialSession,
    type TrialVerdictOutcome,
    validateAddTrialSessionInput,
    validateTrialSessionIsoDate,
    validateTrialSessionPreparatoryInput,
    hasPendingTrialSession,
    validateTrialSessionNumberUnique,
    mapStageFinalKindToTrialOutcome,
    mapDecisionPresenceToTrialVerdictPresence,
    resolveCassationRemandRetrialPivotDate,
    type TrialSessionPreparatoryDecisionInput,
} from './trialSessionsEngine';

export type {
    AddTrialSessionInput,
    FinalizeTrialVerdictInput,
    TrialSession,
    TrialSessionVerdict,
    TrialSessionStatus,
    TrialVerdictOutcome,
    TrialWitnessExpert,
    TrialSessionPreparatoryDecisionInput,
} from './trialSessionsEngine';
import { buildTrialSessionPreparatoryJudicialDecision } from './trialSessionPreparatoryDecisionEngine';
import {
    createTrialDepositionId,
    normalizeTrialDeposition,
    normalizeTrialDepositions,
    type AddTrialDepositionInput,
    type TrialDeposition,
    type UpdateTrialDepositionPatch,
    validateAddTrialDepositionInput,
} from './trialDepositionsEngine';

export type {
    AddTrialDepositionInput,
    TrialDeposition,
    TrialDepositionComparison,
    TrialDepositionCrossExam,
    UpdateTrialDepositionPatch,
} from './trialDepositionsEngine';
import {
    buildChargeModificationEntry,
    normalizeChargeModifications,
    resolveCurrentAccusationArticleFromCase,
    resolveReferralArticleFromCase,
    seedTrialChargeFieldsOnReferral,
    validateModifyTrialChargeInput,
    type ModifyTrialChargeInput,
    type TrialChargeModification,
} from './trialChargeEngine';

export type { ModifyTrialChargeInput, TrialChargeModification } from './trialChargeEngine';
import { sanitizeContentHighlights } from './statementContentHighlights';
import { buildActiveParties, buildAllParties } from './partyContextFilter';
import type { CriminalActionParty, InvestigationClosureReason } from './criminalStageUtils';
import {
    advanceActionToNextPhase,
    appendSubItem,
    createProceduralId,
    deleteContainerFromTree,
    duplicateSubItemInTree,
    insertNestedContainer,
    insertRootContainer,
    mapContainerTree,
    findContainerInTree,
    migrateLegacyPathsToContainers,
    moveContainerInTree,
    moveSubItemInTree,
    normalizeColor,
    normalizeFollowUpDate,
    normalizeIcon,
    normalizeProceduralTags,
    normalizeProceduralContainers,
    removeSubItemFromTree,
    reorderRootContainers,
    updateSubItemInTree,
    type ProceduralActionItem,
    type ProceduralActionStatus,
    type ProceduralContainer,
    type ProceduralNoteItem,
    type ProceduralSubItem,
    type ProceduralSubItemPatch,
} from './proceduralContainersEngine';
import {
    appendProceduralAudit,
    buildSandboxTemplateRoots,
    cloneContainerWithNewIds,
    normalizeProceduralCanvasAudit,
    SANDBOX_TEMPLATES,
    type ProceduralCanvasAuditEntry,
    type SandboxTemplateId,
} from './proceduralSandboxToolkit';
import { normalizeProceduralItemLink } from './proceduralItemLink';
import {
    lawyerRequestToJudicialDecision,
    coalesceJudicialDecisions,
    findJudicialDecisionByRef,
    decisionAlreadyHasCassationAppeal,
    decisionHasActiveAppealOfPath,
    findJudicialDecisionStoreIndex,
    hasJudicialAppealBeenFiledOnPath,
    mergeJudicialDecisionAppeals,
    mergeJudicialDecisionsFromRequests,
    normalizeJudicialDecision,
} from './judicialDecisionsEngine';
import {
    isLawyerRequestJudgeOrder,
    resolveInitialLawyerOrderAppealability,
} from './requestActionEngine';
import { formatAppealResultLabel, resolveAppealResultCategory } from './decisionAppealPeriodEngine';
import {
    applyCassationFiling,
    isUnderInterventionReview,
    migrateLegacyCassationToProceeding,
    recordCassationResult,
    stageConclusionToCassationPayload,
    resolvePersonalBeneficiaryIds,
    type InitiateCassationPayload,
    type RecordCassationResultPayload,
} from './cassationEngine';
import {
    resolvePersonalStageTargets,
    scopeStageConclusionTargets,
} from './criminalCaseGovernance';
import type { InvestigationDefendantStatus } from '@/app/types/investigationDefendant';
import { DEFAULT_INVESTIGATION_DEFENDANT_STATUS } from '@/app/types/investigationDefendant';
import {
    applyInvestigationClosureFromRequest,
    applyInvestigationClosureFromStageConclusion,
    applyInvestigationPurgeAfterCassation,
    caseAllowsDefendantSeverance,
    caseAllowsSeveranceOrDossierStrike,
    filterSeveranceSelectableDefendants,
    validateDefendantSeveranceSelection,
    endInvestigationTemporaryClosureOnCase,
    investigationDossierIsSealed,
    investigationDossierMaterialMutationBlocked,
    otherEvidenceMutationBlocked,
    investigationPurgeDecisionAllowsCassationAppeal,
    investigationLogsMutationBlocked,
    investigationStatementsMutationBlocked,
    normalizeInvestigationDefendantStatus,
    patchDefendantsInvestigationStatus,
    reopenInvestigationDefendantsOnCase,
    requiresInvestigationPurgeDefendantScope,
    resolveInvestigationClosureDefendantIds,
    resolvePurgeCassationRestoreDefendantIds,
    validateInvestigationPurgeCassationResult,
} from './investigationDefendantPurge';
import { makeEmptyDefendant } from './criminalDefendantFactory';
import {
    filterUnknownDefendantsFromPartyIds,
    getIdentifiedDefendants,
    hasIdentifiedDefendant,
    hasUnrevealedUnknownDefendants,
    coerceDefendantFullName,
    convertIdentifiedDefendantToUnknown,
    convertUnknownDefendantToIdentifiedShell,
    canMarkDraftDefendantAsUnknown,
    inferUnknownDefendantJuvenileContext,
    isDefendantIdentityUnknown,
    isEmptyDefendantShell,
    isStatementFromUnknownDefendant,
    makeUnknownIdentityDefendant,
    nextUnknownDefendantIndex,
    pruneEmptyDefendantShells,
    repairUnknownDefendantCaseRecord,
    resolveDefendantFullName,
    syncUnknownDefendantCaseFlag,
    UNKNOWN_DEFENDANT_ACTION_BLOCKED_MESSAGE,
    syncUnknownDefendantsJuvenileContext,
    validateRevealDefendantIdentityPayload,
    type RevealDefendantIdentityPayload,
} from './criminalUnknownDefendant';
import { isDefendantTargetRequestTemplate } from './requestPartySelection';
import {
    applyJuvenileSocialInquiryReferralOnDefendants,
    buildJuvenileInvestigationReferralJudicialDecision,
    investigationJuvenileDetentionAuthorityLabel,
    isJuvenileJudgeDecisionTemplate,
    JUVENILE_INVESTIGATION_COURT_NAME,
    JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE,
    JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE,
    JUVENILE_TRIAL_COURT_NAME,
    resolveInvestigationReferralStageLabel,
    storedStageFromInvestigationReferralTarget,
    SOCIAL_INQUIRY_REFERRAL_TEMPLATE,
    syncJuvenileInvestigationCaseFlags,
    investigationReferralScopeMixesJuvenileAndAdult,
    type InvestigationReferralTargetStage,
} from './juvenileInvestigationRules';
import {
    applyComplainantOfficeClientToggle,
    applyDefendantOfficeClientToggle,
    syncDraftOfficeRepresentation,
} from './criminalOfficeClient';
import {
    isLawyerRequestFinalStatus,
    isLawyerRequestPending,
} from './lawyerRequestStatusMachine';
import type {
    CreateLawyerRequestInput,
    CreateLawyerRequestResult,
    FinalizeLawyerRequestInput,
} from './lawyerRequestsEngine';
import {
    stripLawyerRequestDecisionPatch,
    validateCreateLawyerRequestInput,
    canAddLawyerRequestFollowUpMargin,
    canEditLawyerRequestAttachments,
    validateFinalizeLawyerRequestInput,
} from './lawyerRequestsEngine';
import {
    buildInitialOrderEnforcement,
    normalizeOrderEnforcementTracking,
} from './orderEnforcementEngine';
import type { OrderEnforcementTracking } from '@/app/types/criminal';
import { validateDetentionExtensionEnd } from './detentionEngine';
import {
    isComplaintCourtReferralTemplate,
    isDefendantBailTemplate,
    isDetentionDecisionTemplate,
    isJudicialDefendantStatusDocumentationOnly,
    INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE,
    isInvestigationPurgeDecisionTemplate,
    isInvestigationMergeJudicialTemplate,
    isInvestigationSeveranceJudicialTemplate,
    isInvestigationStructuralCassationTemplate,
    isJudicialDecisionTemplate,
    normalizeProceduralRequestTemplate,
    resolveStoredRequestTypeFields,
} from './proceduralRequestTypes';
import {
    applyComplaintCourtReferralToCase,
    restoreComplaintCourtReferralOnQuash,
    shouldRestoreCourtAfterReferralQuash,
} from './complaintCourtReferralEngine';
import {
    buildCassationHistoricalBadge,
    type RecordJudicialCassationResultPayload,
} from './cassationJudicialForm';
import { applyProceduralCassationEffects, isProceduralCassationResult } from './proceduralCassationResults';
import {
    buildSeverancePartyIdMaps,
    buildSeveredDefendantNameSet,
    partitionInvestigationLogsForSeverance,
    partitionJudicialDecisionsForSeverance,
    partitionLawyerRequestsForSeverance,
    partitionTimelineEventsForSeverance,
    remapInvestigationLogForSeveredChild,
    remapJudicialDecisionForSeveredChild,
    remapLawyerRequestForSeveredChild,
    remapTimelineEventForSeveredChild,
    statementBelongsToSeveredDefendantsByName,
} from './severanceMigrationEngine';
import {
    revertSeveranceAfterCassationAnnulment,
    stampSeveranceDecisionLinkage,
} from './severanceCassationEngine';
import {
    buildSeveredChildStageJourney,
    isSeveranceReasonValue,
    resolveCriminalCaseForDisplay,
    severanceReasonLabel,
} from './caseSeveranceView';
import {
    defaultPersonalStage,
    isTerminalPersonalStage,
    personalStageForDecision,
} from './partyPersonalStage';
import {
    appendStageJourneyNode,
    appendStageJourneyPhaseOverlay,
    buildInitialStageJourney,
    findTransitionOption,
    forkStageJourneyFromCurrent,
    formatJourneyPathDisplayLabel,
    getCurrentJourneyNode,
    isJourneyTenureArchived,
    journeyNodeLabel,
    journeyNodeLabelForAppend,
    migrateProceduralNodesToStageJourney,
    proceduralActionFromConclusion,
    repairSameCourtRemandJourneyNodes,
    resolveCurrentJourneyNodeId,
    resolveJourneyTransitionMeta,
    sanitizeJourneyNodeLabelsForJuvenileScope,
} from './stageJourney';
import {
    buildReferralMetaForPendingOrder,
    resolvePendingJourneyOrder,
} from './journeyOrderApplyEngine';
import {
    mergeCorrectionAppealTrack,
    mergeInterventionAppealTrack,
    mergeOrdinaryAppealTrack,
    migrateVerdictCardsOnCase,
    normalizeVerdictCards,
    patchVerdictCardInList,
    resolveVerdictCardsLifecycle,
    upsertVerdictCardFromConclusion,
    type VerdictCard,
    type VerdictCorrectionAppealTrack,
    type VerdictInterventionAppealTrack,
    type VerdictOrdinaryAppealTrack,
} from './verdictCardsEngine';
import {
    applyVerdictCassationResultEffects,
    buildVerdictOrdinaryAppealPatch,
    type VerdictCassationResultSaveInput,
} from './verdictCassationResultEngine';
import {
    buildStageConclusionFromForm,
    enrichVerdictCardFromForm,
    inferDecisionCaseTypeFromContext,
    resolveAbsentiaObjectionDeadline,
    validateStageFinalDecisionForm,
    type StageFinalDecisionFormPayload,
} from './stageFinalDecisionEngine';
import {
    applyReferralClassificationOverride,
    isMisdemeanorType,
    resolveCaseSovereignContext,
    syncCaseSovereignContext,
    type MisdemeanorType,
} from './caseClassificationEngine';
import {
    buildProceduralRouteLawyerRequest,
    formatProceduralRouteDescription,
    isProceduralStageRouteActionId,
    proceduralRouteTimelineCategory,
} from './trialReferralOrdersEngine';
import type { ProceduralStageRouteActionId } from './trialReferralOrdersEngine';
import {
    hasJuvenileAccused,
    isDetentionArrestCategory,
    isInvestigationDetentionCategory,
    isLockedInvestigationTimelineEvent,
    isValidCriminalStage,
    isValidJuvenileDetentionPlacement,
    isValidSocialInquiryWorkflowStatus,
    juvenileDetentionPlacementLabel,
    isPrivateRightWaiverTimelineCategory,
    isTimelineNextDateInvalid,
    legacyRoleFromRepresentation,
    normalizeLegacyCriminalStage,
    normalizeTimelineCategoryForDisplay,
    resolveCaseStageFromRecord,
    resolveTimelineEventTitle,
    storedStageFromCaseStage,
    syncStoredStageFromJourneyCaseStage,
    caseStageFromStoredStage,
    INVESTIGATION_LOCK_MUTATION_ERROR,
    formatInvestigationDepositLocation,
    formatCriminalStageLabel,
    isInvestigationStoredStage,
    shouldUseJuvenileTrialJourneyLabels,
} from './criminalStageUtils';
import {
    CASE_IDENTITY_CORRECTION_CATEGORY,
    caseIdentityCorrectionBlocked,
    caseHeaderMetadataEditBlocked,
    identityCorrectionTimelineDescription,
    validateDepositionCorrectionInput,
    validateIdentityCorrectionInput,
    validateIdentityCorrectionReason,
    validatePartyPhoneCorrection,
} from './caseIdentityCorrectionEngine';
import {
    syncCaseCourtNameCorrection,
    syncCaseLegalArticleCorrection,
    syncCasePartyNameCorrection,
} from './caseIdentitySyncEngine';

export type {
    CassationAppeal,
    CassationAppealResult,
    CassationAppealRemandTarget,
    CaseStage,
    CriminalCaseSeverance,
    Defendant,
    JourneyNode,
    ProceduralTransitionActionId,
    StageJourneyNode,
} from '@/app/types/criminal';
export type { RecordCassationResultOutcome, RecordCassationResultPayload } from './cassationEngine';
export type { RecordJudicialCassationResultPayload } from './cassationJudicialForm';
export type {
    GuarantorBailKind,
    GuarantorPerson,
    GuarantorDetails,
} from './criminalGuarantorModel';
export {
    makeEmptyGuarantorDetails,
    normalizeGuarantorDetails,
    isGuarantorForfeited,
} from './criminalGuarantorModel';
export type { SeizedAsset } from './criminalSeizedAssetModel';
export { normalizeSeizedAssets } from './criminalSeizedAssetModel';
export type { OurRepresentation } from './criminalProceduralPartyUtils';
export {
    classifyAssetSeizurePartyKind,
    resolveOurRepresentationFromCaseRecord,
    resolveProceduralDefendantId,
    resolveProceduralDefendantIds,
} from './criminalProceduralPartyUtils';
export {
    isInternalCaseIdentifier,
    looksLikeRealCaseReference,
    resolveCriminalCaseDisplayLabel,
    resolveOfficialCaseNumber,
    sanitizeCaseReferenceField,
} from './criminalCaseReferenceUtils';
export { resolveMergedCaseIds } from './criminalCaseMergeUtils';
export { isCorruptTimelineEvent } from './criminalCaseTimelineUtils';
import {
    MergeValidationError,
    prepareMergedCaseTransaction,
    revertCaseMergeAfterCassationAnnulment,
} from './caseMergeMigration';
import { findCaseInStore } from './caseMergeTimeline';
export { MergeValidationError } from './caseMergeMigration';
export type { MergeValidationCode } from './caseMergeMigration';

export type {
    CriminalLawyerRole,
    PhysicalLocation,
    CriminalCaseStage,
    CrimeType,
    DefendantStatus,
    InvestigationPapersAt,
    CriminalComplainant,
    DetentionHistory,
    InAbsentiaDetails,
    SocialInquiryWorkflowStatus,
    JuvenileDetentionPlacement,
    SocialInquiryReport,
    CriminalDefendant,
    DefendantAgeCategory,
    StatementHighlightColor,
    StatementContentHighlight,
    Statement,
    OtherEvidenceItem,
    TimelineEvent,
    LegalArticleChange,
    ExhibitLifecycleStatus,
    InvestigationLog,
    LawyerRequest,
    StageConclusion,
    CriminalCaseLocation,
    CriminalCaseDraft,
    CriminalDossierStatus,
    InvestigationDossierClosureKind,
    InvestigationDossierClosure,
    CriminalCase,
    JudicialSeveranceDraft,
    PendingSeveranceContext,
} from './criminalCaseModel';
export type { CriminalCaseUserRole } from './complainantCassationGovernance';

export function validateInvestigationSeveranceTargets(
    defendants: CriminalDefendant[] | undefined,
    targetIds: string[],
): string | null {
    return validateDefendantSeveranceSelection(defendants, targetIds);
}

function normalizeStatementGiverName(name: string): string {
    return String(name ?? '')
        .trim()
        .replace(/\s+/g, ' ');
}

function statementBelongsToSeveredDefendants(
    statement: Statement,
    severedNames: Set<string>,
): boolean {
    return statementBelongsToSeveredDefendantsByName(statement, severedNames);
}

function scrubRemovedPartyIdsFromLawyerRequests(
    requests: LawyerRequest[] | undefined,
    removedIds: Set<string>,
): LawyerRequest[] {
    return (Array.isArray(requests) ? requests : []).map((req) => {
        const nextIds = (Array.isArray(req.defendantIds) ? req.defendantIds : [])
            .map((x) => String(x ?? '').trim())
            .filter((id) => id && !removedIds.has(id));
        return {
            ...req,
            defendantIds: nextIds.length ? nextIds : undefined,
        };
    });
}

function scrubRemovedPartyIdsFromJudicialDecisions(
    decisions: JudicialDecision[] | undefined,
    removedIds: Set<string>,
): JudicialDecision[] {
    return (Array.isArray(decisions) ? decisions : []).map((d) => {
        const defendantIds = (Array.isArray(d.defendantIds) ? d.defendantIds : [])
            .map((x) => String(x ?? '').trim())
            .filter((id) => id && !removedIds.has(id));
        const beneficiaryPartyIds = (Array.isArray(d.beneficiaryPartyIds) ? d.beneficiaryPartyIds : [])
            .map((x) => String(x ?? '').trim())
            .filter((id) => id && !removedIds.has(id));
        return {
            ...d,
            defendantIds: defendantIds.length ? defendantIds : undefined,
            beneficiaryPartyIds: beneficiaryPartyIds.length ? beneficiaryPartyIds : undefined,
        };
    });
}

function appendJudicialSeveranceRequestOnParent(
    caseRecord: CriminalCase,
    ctx: PendingSeveranceContext,
    linkage?: { childCaseId: string; parentDefendantIds: string[] },
): CriminalCase {
    const draft = ctx.judicialSeveranceDraft;
    if (!draft) return caseRecord;
    const requestDate = String(draft.requestDate ?? '').trim();
    const lawyerNoteBase = String(draft.lawyerNote ?? '').trim();
    if (!requestDate || !lawyerNoteBase) return caseRecord;
    const severedNames = ctx.defendantSnapshots
        .map((d) => resolveDefendantFullName(d))
        .filter(Boolean)
        .join('، ');
    const lawyerNote = severedNames
        ? `${lawyerNoteBase}\nالمتهمون المشمولون: ${severedNames}`
        : lawyerNoteBase;
    const request: LawyerRequest = {
        id: createId(),
        requestDate,
        type: INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE,
        lawyerNote,
        status: 'executed',
        defendantIds: undefined,
        proceduralTemplate: INVESTIGATION_SEVERANCE_JUDICIAL_TEMPLATE,
        isAppealable: draft.isAppealable === true,
        isLocked: true,
        decisionArchived: true,
        judgeMargin: lawyerNote,
        decisionDate: requestDate,
    };
    const nodeId = resolveCurrentJourneyNodeId(caseRecord.stageJourney);
    const stamped = stampProceduralNodeId(request, nodeId);
    const reqs = Array.isArray(caseRecord.lawyerRequests) ? caseRecord.lawyerRequests : [];
    let nextCase: CriminalCase = { ...caseRecord, lawyerRequests: [...reqs, stamped] };
    nextCase = upsertJudicialDecisionOnCase(nextCase, stamped);
    if (linkage?.childCaseId && linkage.parentDefendantIds?.length) {
        nextCase = stampSeveranceDecisionLinkage(nextCase, {
            childCaseId: linkage.childCaseId,
            parentDefendantIds: linkage.parentDefendantIds,
            sourceRequestId: stamped.id,
        });
    }
    return nextCase;
}

type CriminalStoreState = {
    draft: CriminalCaseDraft;
    casesById: Record<string, CriminalCase>;
    /** سياق تفريق الدعوى الجاري — null عند عدم وجود عملية تفريق. */
    pendingSeveranceContext: PendingSeveranceContext | null;
    setBasicField: <K extends keyof CriminalCaseDraft['basics']>(
        key: K,
        value: CriminalCaseDraft['basics'][K],
    ) => void;
    setLocationField: <K extends keyof CriminalCaseLocation>(key: K, value: CriminalCaseLocation[K]) => void;
    addComplainant: () => void;
    deleteComplainant: (id: string) => void;
    setComplainantField: (
        id: string,
        key:
            | 'fullName'
            | 'address'
            | 'phone'
            | 'isJuvenile'
            | 'isUnderSeven'
            | 'birthDate'
            | 'guardianName'
            | 'guardianRelationship',
        value: string | boolean,
    ) => void;
    toggleDraftComplainantOfficeClient: (id: string, next: boolean) => void;
    /** ربط يدوي: شكوى المشتكي ضد متهمين محددين (أو الجميع عند `[]`). `undefined` = بدون توجيه متقابل. */
    setDraftComplainantCounterComplaintTargets: (
        complainantId: string,
        targetDefendantIds: string[] | undefined,
    ) => void;
    updateCaseComplainantJuvenile: (
        caseId: string,
        complainantId: string,
        data: { isJuvenile?: boolean; birthDate?: string; guardianName?: string; guardianRelationship?: string },
    ) => void;
    setUnknownDefendant: (value: boolean) => void;
    addUnknownDefendant: () => void;
    toggleDraftDefendantIdentityUnknown: (defendantId: string, unknown: boolean) => void;
    revealDefendantIdentity: (
        caseId: string,
        defendantId: string,
        payload: RevealDefendantIdentityPayload,
    ) => string | null;
    addDefendant: () => void;
    deleteDefendant: (id: string) => void;
    setDefendantField: (
        id: string,
        key:
            | 'fullName'
            | 'address'
            | 'birthYear'
            | 'status'
            | 'detentionAuthority'
            | 'detentionExpiryDate'
            | 'isJuvenile'
            | 'isUnderSeven'
            | 'birthDate'
            | 'guardianName'
            | 'guardianRelationship',
        value: string | boolean,
    ) => void;
    toggleDraftDefendantOfficeClient: (id: string, next: boolean) => void;
    updateCaseDefendantGuarantor: (caseId: string, defendantId: string, patch: Partial<GuarantorDetails>) => void;
    updateCaseDefendantJuvenile: (
        caseId: string,
        defendantId: string,
        data: { isJuvenile?: boolean; birthDate?: string; guardianName?: string; guardianRelationship?: string },
    ) => void;
    updateCaseDefendantAgeCategory: (
        caseId: string,
        defendantId: string,
        category: DefendantAgeCategory,
    ) => void;
    updateJuvenileSocialInquiryReport: (caseId: string, defendantId: string, report: SocialInquiryReport) => void;
    addStatement: (caseId: string, statement: Statement) => void;
    addOtherEvidenceItem: (caseId: string, item: OtherEvidenceItem) => string | null;
    removeOtherEvidenceItem: (caseId: string, itemId: string) => string | null;
    moveOtherEvidenceToTrash: (caseId: string, itemId: string) => string | null;
    updateStatement: (caseId: string, statementId: string, updatedData: Partial<Omit<Statement, 'id'>>) => void;
    addTimelineEvent: (caseId: string, event: TimelineEvent) => void;
    deleteTimelineEvent: (caseId: string, eventId: string) => void;
    deleteStatement: (caseId: string, statementId: string) => void;
    moveStatementToTrash: (caseId: string, statementId: string) => string | null;
    addInvestigationLog: (caseId: string, log: InvestigationLog) => void;
    updateInvestigationLog: (caseId: string, logId: string, updatedData: Partial<Omit<InvestigationLog, 'id'>>) => void;
    /** إكمال كتاب/تقرير — لا تعديل رجعي للحالة. */
    completeInvestigationLetter: (
        caseId: string,
        logId: string,
        payload: { responseNotes?: string; receivedDate?: string },
    ) => string | null;
    /** تحديث دورة حياة مبرز فقط. */
    updateInvestigationLogExhibitLifecycle: (
        caseId: string,
        logId: string,
        lifecycle: ExhibitLifecycleStatus,
    ) => string | null;
    deleteInvestigationLog: (caseId: string, logId: string) => void;
    moveInvestigationLogToTrash: (caseId: string, logId: string) => string | null;
    setProceduralContainers: (caseId: string, containers: ProceduralContainer[]) => void;
    addRootProceduralContainer: (
        caseId: string,
        input: { title: string; color: string; icon: string },
    ) => void;
    updateProceduralContainer: (
        caseId: string,
        containerId: string,
        patch: Partial<
            Pick<ProceduralContainer, 'title' | 'color' | 'icon' | 'collapsed' | 'pathStatus' | 'pathEndedAt'>
        >,
    ) => void;
    deleteProceduralContainer: (caseId: string, containerId: string) => void;
    moveProceduralContainerToTrash: (caseId: string, containerId: string) => string | null;
    reorderRootProceduralContainers: (caseId: string, fromId: string, toId: string) => void;
    addProceduralSubItem: (caseId: string, parentId: string, item: ProceduralSubItem) => void;
    updateProceduralSubItem: (
        caseId: string,
        parentId: string,
        itemId: string,
        patch: ProceduralSubItemPatch,
    ) => void;
    deleteProceduralSubItem: (caseId: string, parentId: string, itemId: string) => void;
    moveProceduralSubItemToTrash: (caseId: string, parentId: string, itemId: string) => string | null;
    duplicateProceduralSubItem: (caseId: string, parentId: string, itemId: string) => void;
    moveProceduralSubItem: (
        caseId: string,
        fromParentId: string,
        toParentId: string,
        itemId: string,
        toIndex: number,
    ) => void;
    moveProceduralContainer: (
        caseId: string,
        containerId: string,
        newParentId: string | null,
        toIndex: number,
    ) => void;
    advanceProceduralActionPhase: (
        caseId: string,
        parentId: string,
        actionId: string,
        opts?: { spawnChildTitle?: string; spawnChildColor?: string; spawnChildIcon?: string },
    ) => void;
    recordProceduralCanvasAudit: (caseId: string, summary: string) => void;
    applyProceduralSandboxTemplate: (caseId: string, templateId: SandboxTemplateId) => void;
    duplicateProceduralContainer: (caseId: string, containerId: string) => void;
    addOrUpdateRequest: (caseId: string, request: LawyerRequest) => void;
    /** إنشاء طلب جديد — حالة قيد النظر فقط (منفصل زمنياً عن هامش القاضي). */
    createLawyerRequest: (caseId: string, input: CreateLawyerRequestInput) => CreateLawyerRequestResult;
    /** تدوين هامش القاضي وقفل الطلب — بعد صدور القرار لاحقاً. */
    finalizeLawyerRequest: (caseId: string, requestId: string, input: FinalizeLawyerRequestInput) => string | null;
    /** إغلاق التوقيف النشط — إطلاق سراح بكفالة (وكيل المتهم). */
    releaseDefendantsFromDetention: (caseId: string, defendantIds: string[]) => string | null;
    /** تمديد توقيف على نفس البطاقة — تحديث تاريخ الانتهاء دون إنشاء قرار جديد. */
    extendDetentionOnDecision: (caseId: string, decisionId: string, newEndDate: string) => string | null;
    /** توثيق إطلاق سراح على البطاقة — إغلاق العداد وتحديث حالة المتهم. */
    documentDetentionReleaseOnDecision: (caseId: string, decisionId: string) => string | null;
    updateOrderEnforcementOnDecision: (
        caseId: string,
        decisionId: string,
        patch: Partial<OrderEnforcementTracking>,
    ) => string | null;
    updateLawyerRequest: (caseId: string, requestId: string, updatedData: Partial<Omit<LawyerRequest, 'id'>>) => void;
    deleteLawyerRequest: (caseId: string, requestId: string) => void;
    moveLawyerRequestToTrash: (caseId: string, requestId: string) => string | null;
    moveJudicialDecisionToTrash: (caseId: string, decisionRef: string) => string | null;
    restoreTrashItem: (caseId: string, trashItemId: string) => string | null;
    purgeTrashItem: (caseId: string, trashItemId: string) => string | null;
    addTrialSession: (caseId: string, sessionData: AddTrialSessionInput) => string | null;
    updateTrialSession: (caseId: string, sessionId: string, sessionData: AddTrialSessionInput) => string | null;
    documentTrialSessionPreparatoryDecision: (
        caseId: string,
        input: {
            sessionId?: string;
            session: AddTrialSessionInput;
            preparatory: TrialSessionPreparatoryDecisionInput;
        },
    ) => string | null;
    postponeTrialSession: (
        caseId: string,
        sessionId: string,
        nextDate: string,
        reason: string,
        prepNote: string,
    ) => string | null;
    finalizeTrialVerdict: (caseId: string, sessionId: string, verdictData: FinalizeTrialVerdictInput) => string | null;
    /** ربط جلسة المرافعة بقرار ختامي صادر عبر StageFinalDecisionModal — دون إعادة إصدار القرار. */
    syncTrialSessionVerdictFromStageFinal: (
        caseId: string,
        sessionId: string,
        input: { kind: string; issuedAt: string; presenceType?: string },
    ) => string | null;
    updateVerdictCardDraft: (caseId: string, cardId: string, draft: string) => void;
    patchVerdictCardOrdinaryAppeal: (
        caseId: string,
        cardId: string,
        patch: Partial<VerdictOrdinaryAppealTrack>,
    ) => void;
    recordVerdictCardCassationResult: (
        caseId: string,
        cardId: string,
        input: import('./verdictCassationResultEngine').VerdictCassationResultSaveInput,
    ) => string | null;
    patchVerdictCardInterventionAppeal: (
        caseId: string,
        cardId: string,
        patch: Partial<VerdictInterventionAppealTrack>,
    ) => void;
    patchVerdictCardCorrectionAppeal: (
        caseId: string,
        cardId: string,
        patch: Partial<VerdictCorrectionAppealTrack>,
    ) => void;
    /** منظومة إصدار القرار الختامي — نموذج ديناميكي + بطاقة ذكية. */
    registerStageFinalDecision: (
        caseId: string,
        payload: StageFinalDecisionFormPayload,
        meta: { defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'] },
    ) => string | null;
    recordVerdictAbsentiaPublication: (caseId: string, cardId: string, publicationDate: string) => string | null;
    recordVerdictAbsentiaObjection: (caseId: string, cardId: string) => string | null;
    refreshVerdictCardLifecycles: (caseId: string) => void;
    ensureCaseSovereignContext: (caseId: string) => void;
    addTrialDeposition: (caseId: string, input: AddTrialDepositionInput) => string | null;
    updateTrialDeposition: (caseId: string, depositionId: string, patch: UpdateTrialDepositionPatch) => string | null;
    deleteTrialDeposition: (caseId: string, depositionId: string) => string | null;
    modifyTrialChargeDescription: (caseId: string, input: ModifyTrialChargeInput) => string | null;
    addRequestMargin: (caseId: string, requestId: string, text: string) => void;
    toggleRequestStar: (caseId: string, requestId: string) => void;
    addRequestAttachment: (caseId: string, requestId: string, name: string) => void;
    removeRequestAttachment: (caseId: string, requestId: string, attachmentId: string) => void;
    fileJudicialDecisionAppeal: (
        caseId: string,
        decisionId: string,
        payload: {
            appellantType: JudicialAppellantType;
            appellantIds: string[];
            targetDefendantIds: string[];
            filedAt?: string;
            appellantManualLabel?: string;
            appealPath?: JudicialCassationAppealPath;
        },
    ) => string | null;
    declareJudicialDecisionFinal: (
        caseId: string,
        decisionId: string,
        payload: {
            declarerType: JudicialAppellantType;
            declarerIds: string[];
            declarerManualLabel?: string;
            declaredAt?: string;
        },
    ) => string | null;
    patchJudicialDecisionLifecycle: (
        caseId: string,
        decisionId: string,
        patch: Partial<
            Pick<
                JudicialDecision,
                | 'decisionPresenceType'
                | 'decisionCaseType'
                | 'decisionAppealability'
                | 'isAppealed'
                | 'appealResult'
                | 'isJudgmentFinalDeclared'
                | 'judgmentFinalDeclaredAt'
                | 'judgmentFinalDeclaredByLabel'
                | 'judgmentFinalDeclaredByIds'
                | 'cassationPapersReceivedAt'
                | 'interventionCassationPending'
                | 'cassationCorrectionPending'
            >
        >,
    ) => string | null;
    recordJudicialAppealResult: (
        caseId: string,
        decisionId: string,
        appealId: string,
        payload: RecordJudicialCassationResultPayload,
    ) => string | null;
    updateCaseDefendantStatus: (caseId: string, defendantId: string, status: DefendantStatus) => void;
    /**
     * ⚖️ شكوى متقابلة — يُحدّث الحالة الإجرائية لمشتكٍ يَكتسب صفة المتهم،
     * مع الحفاظ على بقاء سجله داخل مصفوفة `complainants` (لا نقل/تخريب للداتا).
     * يُحدّث `accusedStatus` و`accusedDetentionHistoryLog` بصورة منفصلة عن سجله كمشتكي.
     */
    updateCrossComplainantAccusedStatus: (
        caseId: string,
        complainantId: string,
        status: DefendantStatus,
    ) => void;
    /**
     * 💀 تسجيل وفاة المشتكي المتقابل بصفته متهماً — يَقفل سجله الفرعي
     * (accusedIsPartyRecordLocked + accusedPersonalStage='lawsuit_dropped_death')
     * مع توثيق الحدث على السجل الزمني. لا يَنقل الكائن من مصفوفة المشتكين.
     */
    registerCrossComplainantAccusedDeath: (
        caseId: string,
        complainantId: string,
        date?: string,
    ) => void;
    /**
     * 📦 حجز الأموال على مشتكٍ متقابل «هارب» — مقابل addDefendantSeizedAssets.
     * يُخزَّن على حقل `accusedSeizedAssets` ضمن سجل المشتكي نفسه.
     */
    addCrossComplainantSeizedAssets: (
        caseId: string,
        complainantId: string,
        assets: Array<Omit<SeizedAsset, 'id' | 'createdAt'> & { id?: string; createdAt?: string }>,
        sourceRequestId?: string,
    ) => void;
    updateCrossComplainantSeizedAsset: (
        caseId: string,
        complainantId: string,
        assetId: string,
        patch: Partial<Pick<SeizedAsset, 'description' | 'referenceNumber' | 'seizureDate' | 'notes'>>,
    ) => void;
    releaseCrossComplainantSeizedAssets: (
        caseId: string,
        complainantId: string,
        assetIds?: string[],
    ) => void;
    confirmBailAfterAppeal: (caseId: string, defendantIds?: string[]) => void;
    fileInAbsentiaObjection: (caseId: string, defendantId: string) => void;
    /**
     * يضيف صنفاً (أو أكثر) من الأموال المحجوزة على متهم هارب.
     * يُستخدم داخل قرار «حجز الأموال» (إجراء قاضٍ منفّذ).
     * كل صنف يلتقط `sourceRequestId` لربطه بقرار القاضي.
     */
    addDefendantSeizedAssets: (
        caseId: string,
        defendantId: string,
        assets: Array<Omit<SeizedAsset, 'id' | 'createdAt'> & { id?: string; createdAt?: string }>,
        sourceRequestId?: string,
    ) => void;
    /** يُعدّل صنف حجز واحد (تصحيح خطأ — قبل/بعد فك الحجز لا يهم). */
    updateDefendantSeizedAsset: (
        caseId: string,
        defendantId: string,
        assetId: string,
        patch: Partial<Pick<SeizedAsset, 'description' | 'referenceNumber' | 'seizureDate' | 'notes'>>,
    ) => void;
    /** يفكّ الحجز عن صنف واحد أو عدة أصناف (أو جميعها إذا تُرك `assetIds` فارغاً). */
    releaseDefendantSeizedAssets: (caseId: string, defendantId: string, assetIds?: string[]) => void;
    updateBailForfeiture: (caseId: string, defendantId: string, data: { forfeitureNote?: string }) => void;
    updateCasePhysicalLocation: (caseId: string, location: PhysicalLocation, customName?: string) => void;
    setDraftArticle3Offense: (value: boolean) => void;
    setDraftMutualComplaint: (value: boolean) => void;
    setDraftPublicProsecutionComplainant: (value: boolean) => void;
    setDraftArticleIncludesPublicRight: (value: boolean) => void;
    setDraftCrimeDiscoveryDate: (value: string) => void;
    applyInvestigationReferral: (
        caseId: string,
        payload: {
            targetCaseStage: InvestigationReferralTargetStage;
            courtName: string;
            courtCaseNumber: string;
            publicProsecutionNumber?: string;
            referralLegalArticle?: string;
            decisionDate: string;
            decisionDetails: string;
            defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'];
            defendantIds: string[];
            defendantStatusesByDefendantId?: Record<string, 'detained' | 'bailed' | 'fugitive'>;
            /** إلزامي عند الإحالة إلى محكمة الجنح. */
            referralMisdemeanorType?: MisdemeanorType;
        },
    ) => void;
    /** إحالة المتهمين النشطين إلى إضبارة محكمة موضوع جديدة. */
    referInvestigationDefendantToTrial: (
        caseId: string,
        payload: {
            defendantIds: string[];
            targetCaseStage: InvestigationReferralTargetStage;
            courtName: string;
            courtCaseNumber: string;
            decisionDate: string;
            decisionDetails: string;
            defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'];
            publicProsecutionNumber?: string;
            referralLegalArticle?: string;
            referralMisdemeanorType?: MisdemeanorType;
        },
    ) => string | null;
    registerPartyDeath: (caseId: string, defendantId: string, date?: string) => void;
    /** @alias registerPartyDeath */
    recordPartyDeath: (caseId: string, defendantId: string, date?: string) => void;
    /** تفريق الدعاوى — إنشاء إضبارة ابنة ونقل المتهمين المحددين من الأم. */
    severCase: (
        parentCaseId: string,
        payload: {
            defendantIds: string[];
            severanceReason: SeveranceReason;
            date: string;
            details: string;
        },
    ) => string | null;
    referAndGenerateCase: (
        currentCaseId: string,
        targetCourt: string,
        decisionDetails: StageConclusion,
        referralMeta?: { courtName: string; caseNumber: string },
    ) => string | null;
    reopenClosedCase: (caseId: string, reopenReason: string) => void;
    /** إنهاء الغلق المؤقت وإعادة تفعيل الإضبارة التحقيقية. */
    endInvestigationTemporaryClosure: (caseId: string) => string | null;
    /** @deprecated — استخدم initiateCassationProceeding */
    sendCaseToCassation: (
        caseId: string,
        data: { cassationNumber: string; sentDate: string; panelName: string },
    ) => void;
    initiateCassationProceeding: (caseId: string, payload: InitiateCassationPayload) => void;
    updateCaseLocation: (
        caseId: string,
        newLocationType: 'police' | 'court',
        newLocationName: string,
        reason: string,
    ) => void;
    correctCasePartyName: (
        caseId: string,
        payload: {
            partyKind: 'complainant' | 'defendant';
            partyId: string;
            newFullName: string;
            newPhone?: string;
            newAddress?: string;
            reason: string;
        },
    ) => string | null;
    correctCaseCourtName: (
        caseId: string,
        payload: { newCourtName: string; reason: string; scope: 'investigation' | 'trial' },
    ) => string | null;
    correctCaseDepositionLocation: (
        caseId: string,
        payload: { papersAt: InvestigationPapersAt; entityName: string; reason: string },
    ) => string | null;
    correctCaseLegalArticle: (caseId: string, payload: { newArticle: string; reason: string }) => string | null;
    correctCaseReferenceNumbers: (
        caseId: string,
        payload: { courtCaseNumber?: string; publicProsecutionNumber?: string; reason: string },
    ) => string | null;
    updateCaseStage: (caseId: string, stage: CriminalCaseStage) => void;
    updateLegalArticle: (caseId: string, change: LegalArticleChange) => void;
    waivePrivateRight: (caseId: string, waiverDate: string) => void;
    /** ضم الإضبارة التابعة (child) في الإضبارة الأم النشطة (parent) */
    mergeCases: (parentCaseId: string, childCaseId: string, mergeReason: string) => void;
    severJuvenileDefendantToJuvenileCourt: (caseId: string, defendantId: string, date: string, details: string) => string | null;
    /** قرار ختامي مع نطاق متهمين — يحدّث personalStage للمستهدفين فقط. */
    issueStageDecision: (
        caseId: string,
        conclusion: StageConclusion,
        referral?: { stage: CriminalCaseStage; courtName: string; caseNumber: string },
    ) => string | null;
    /** مزامنة مسار الرأس مع قرار إحالة/انتقال مسجّل ولم يُطبَّق بعد. */
    applyPendingJourneyOrder: (caseId: string) => string | null;
    recordCassationResult: (caseId: string, payload: RecordCassationResultPayload) => string | null;
    /** عرض مشتق للإضبارة (وراثة الأم للتابعة). */
    getCaseForDisplay: (caseId: string) => CriminalCase | null;
    /** أطراف أحياء فقط — إفادات، طلبات، توقيف، كفالة. */
    getActiveParties: (caseId: string) => CriminalActionParty[];
    /** جميع الأطراف مع علامة المتوفى — أدلة، طب عدلي، مبرزات. */
    getAllParties: (caseId: string) => CriminalActionParty[];
    concludeStage: (
        caseId: string,
        conclusion: StageConclusion,
        referral?: { stage: CriminalCaseStage; courtName: string; caseNumber: string },
    ) => string | null;
    referCaseToTrial: (
        caseId: string,
        referralData: { decisionNumber: string; decisionDate: string },
        newCourtData: { stage: CriminalCaseStage; courtName: string; caseNumber: string },
    ) => string | null;
    createCaseFromDraft: () => string;
    deleteCase: (id: string) => void;
    resetDraft: () => void;
    /**
     * يفتح عملية تفريق الدعوى: يلتقط لقطة المتهمين، يضع السياق في الحالة،
     * ويُعيد تهيئة المسودّة لإحضار شاشة «إضبارة جديدة» فارغة مع المتهمين فقط.
     * يُعيد `true` عند النجاح و`false` إذا تعذّر الإجراء (الأم غير موجودة / لم يُحدَّد متهمون).
     */
    beginSeveranceFromDossier: (
        parentCaseId: string,
        defendantIds: string[],
        options?: {
            judicialSeveranceDraft?: JudicialSeveranceDraft;
            severanceReason?: SeveranceReason;
            severanceReasonDetail?: string;
        },
    ) => boolean;
    /**
     * يُنفّذ تفريق الدعوى الكامل:
     *   أ) ينشئ الإضبارة الجديدة من المسودّة الحالية.
     *   ب) يحذف المتهمين المنقولين من الإضبارة الأم نهائياً.
     *   ج) يُرحّل (يُغيّر caseId) أي طلب/قرار/إفادة/حدث تايم‑لاين/سجل تحقيق
     *      كان مرتبطاً حصرياً بهؤلاء المتهمين فقط.
     * يُعيد معرّف الإضبارة الجديدة عند النجاح، أو `null` عند فشل التحقق.
     */
    commitSeveranceFromDossier: () => string | null;
    /** يحفظ مسودّة التفريق ويُفرّغ مسودّة الإضبارة العادية (عند الخروج دون إتمام الشطر). */
    stashPendingSeveranceForm: () => void;
    /** يستأنف تعبئة الإضبارة المفرّقة في المسودّة النشطة. */
    resumePendingSeveranceForm: () => boolean;
    /**
     * يُجهّز مسودّة «إضبارة جديدة» العادية فقط — لا يمسّ formDraft المعلّقة للتفريق.
     * يُستدعى قبل فتح النموذج العام (أرشيف / زر إضافة ملف).
     */
    prepareNormalCriminalCaseForm: () => void;
    /** يلغي عملية التفريق المعلّقة ويُصفّر المسودّة. */
    cancelPendingSeverance: () => void;
    /** يحدّث سبب التفريق في السياق المعلّق (اختياري). */
    setPendingSeveranceReason: (reason?: SeveranceReason, detail?: string) => void;
};

function pruneCounterComplaintTargetsAfterPartyRemoval(
    complainants: CriminalComplainant[],
    removedPartyId: string,
): CriminalComplainant[] {
    const rid = String(removedPartyId ?? '').trim();
    if (!rid) return complainants;
    return complainants.map((c) => {
        const raw = c.counterComplaintTargetDefendantIds;
        if (raw === undefined) return c;
        const next = (Array.isArray(raw) ? raw : []).filter((id) => String(id ?? '').trim() !== rid);
        if (!next.length) {
            const { counterComplaintTargetDefendantIds: _drop, ...rest } = c;
            return { ...rest, counterComplaintTargetDefendantIds: undefined };
        }
        return { ...c, counterComplaintTargetDefendantIds: next };
    });
}

function isCourtStageValue(v: string): v is CriminalCaseStage {
    return isValidCriminalStage(v);
}

function applyPersonalStagesToDefendants(
    caseRecord: CriminalCase,
    defendantIds: string[],
    personalStage: DefendantPersonalStage,
    patch?: Partial<Pick<CriminalDefendant, 'status' | 'isPartyRecordLocked'>>,
): CriminalCase {
    const idSet = new Set(
        (Array.isArray(defendantIds) ? defendantIds : []).map((x) => String(x ?? '').trim()).filter(Boolean),
    );
    if (!idSet.size) return caseRecord;
    const nextDefendants = (Array.isArray(caseRecord.defendants) ? caseRecord.defendants : []).map((d) => {
        if (!idSet.has(d.id)) return normalizeDefendantPersonalFields(d);
        return normalizeDefendantPersonalFields({
            ...d,
            personalStage,
            ...patch,
        });
    });
    return { ...caseRecord, defendants: nextDefendants };
}

function applyPersonalStagesFromConclusion(caseRecord: CriminalCase, conclusion: StageConclusion): CriminalCase {
    const quashTypes = new Set([
        'cassation_quash_remand',
        'cassation_quash_acquit_release',
        'cassation_quash_investigation',
        'cassation_quash_trial_misdemeanor',
        'cassation_quash_trial_felony',
    ]);
    let ids: string[];
    if (quashTypes.has(conclusion.decisionType)) {
        ids = resolvePersonalBeneficiaryIds(
            caseRecord,
            conclusion.sharedObjectiveGrounds269b === true,
            conclusion.targetDefendantIds ?? conclusion.defendantIds,
        );
    } else {
        ids = resolvePersonalStageTargets(caseRecord, conclusion);
    }
    if (!ids.length) return caseRecord;
    const ps = personalStageForDecision(conclusion.decisionType, conclusion.expirationReason);
    if (!ps) return caseRecord;
    const statusPatch =
        ps === 'lawsuit_dropped_death'
            ? ({ status: 'متوفى' as DefendantStatus, isPartyRecordLocked: true } as const)
            : conclusion.decisionType === 'conviction' ||
                conclusion.decisionType === 'acquittal' ||
                conclusion.decisionType === 'release'
              ? ({ status: mapDecisionStatusToDefendantStatus(conclusion.defendantStatusAtDecision) } as const)
              : undefined;
    return applyPersonalStagesToDefendants(caseRecord, ids, ps, statusPatch);
}

function allDefendantsTerminal(defendants: CriminalDefendant[]): boolean {
    const list = Array.isArray(defendants) ? defendants : [];
    if (!list.length) return false;
    return list.every((d) => isTerminalPersonalStage(d.personalStage ?? defaultPersonalStage()));
}

function resolveArticleAtReferralFromCase(c: CriminalCase): string {
    const history = Array.isArray(c.legalArticleHistory) ? c.legalArticleHistory : [];
    if (history.length) {
        return String(history[history.length - 1]?.article ?? '').trim();
    }
    return String(c.basics?.legalArticle ?? '').trim();
}

function applyTrialChargeReferralSeed(caseRecord: CriminalCase): CriminalCase {
    const articleAtReferral = resolveArticleAtReferralFromCase(caseRecord);
    const seeded = seedTrialChargeFieldsOnReferral(articleAtReferral, {
        referralArticle: caseRecord.referralArticle,
        currentAccusationArticle: caseRecord.currentAccusationArticle,
    });
    if (!seeded) return caseRecord;
    return {
        ...caseRecord,
        referralArticle: seeded.referralArticle,
        currentAccusationArticle: seeded.currentAccusationArticle,
        chargeModifications: normalizeChargeModifications(caseRecord.chargeModifications),
    };
}

/** نسخة مستقلة من المسودة — تمنع تشارك المراجع بين الأضابير في casesById */
function prepareDraftSnapshotForCaseCreation(nextDraft: CriminalCaseDraft): CriminalCaseDraft {
    const caseSnapshot = cloneDraftSnapshot(nextDraft);
    const prunedDefendants = pruneEmptyDefendantShells(caseSnapshot.defendants);
    let snapshotWithUnknown: CriminalCaseDraft = {
        ...caseSnapshot,
        defendants: prunedDefendants,
        unknownDefendant: hasUnrevealedUnknownDefendants(prunedDefendants),
    };

    if (snapshotWithUnknown.isPublicProsecutionComplainant === true) {
        return {
            ...snapshotWithUnknown,
            complainants: [makePublicRightComplainant()],
            isMutualComplaint: false,
            articleIncludesPublicRight: false,
        };
    }

    const defendantIds = (Array.isArray(snapshotWithUnknown.defendants) ? snapshotWithUnknown.defendants : [])
        .map((d) => String(d.id ?? '').trim())
        .filter(Boolean);
    const finalizedComplainants = finalizeDraftComplainantsCounterComplaint(
        Array.isArray(snapshotWithUnknown.complainants) ? snapshotWithUnknown.complainants : [],
        defendantIds,
    );
    const complainantsForCase = finalizedComplainants.map((c) => {
        const { counterComplaintTargetDefendantIds: _targets, ...rest } = c;
        return rest;
    });
    return {
        ...snapshotWithUnknown,
        complainants: complainantsForCase,
        isMutualComplaint: snapshotWithUnknown.isMutualComplaint === true,
    };
}

function seedCriminalCaseFromDraftSnapshot(
    snapshotWithUnknown: CriminalCaseDraft,
    caseId: string,
    nowDate: string,
): CriminalCase {
    const storedStage = String(snapshotWithUnknown.basics.stage ?? '').trim();
    const resolvedCaseStage = caseStageFromStoredStage(storedStage) ?? 'investigation';
    let seededCase: CriminalCase = applyTrialChargeReferralSeed({
        id: caseId,
        createdAt: new Date().toISOString(),
        ...snapshotWithUnknown,
        location: normalizeCriminalCaseLocation(snapshotWithUnknown.location),
        statements: Array.isArray(snapshotWithUnknown.statements) ? snapshotWithUnknown.statements : [],
        timelineEvents: Array.isArray(snapshotWithUnknown.timelineEvents) ? snapshotWithUnknown.timelineEvents : [],
        investigationLogs: Array.isArray(snapshotWithUnknown.investigationLogs)
            ? snapshotWithUnknown.investigationLogs
            : [],
        proceduralContainers: Array.isArray(snapshotWithUnknown.proceduralContainers)
            ? snapshotWithUnknown.proceduralContainers
            : [],
        proceduralCanvasAudit: Array.isArray(snapshotWithUnknown.proceduralCanvasAudit)
            ? snapshotWithUnknown.proceduralCanvasAudit
            : [],
        lawyerRequests: Array.isArray(snapshotWithUnknown.lawyerRequests) ? snapshotWithUnknown.lawyerRequests : [],
        trials: normalizeTrialSessions(snapshotWithUnknown.trials),
        trialDepositions: normalizeTrialDepositions(snapshotWithUnknown.trialDepositions),
        legalArticleHistory: snapshotWithUnknown.basics.legalArticle.trim()
            ? [
                  {
                      id: createId(),
                      article: snapshotWithUnknown.basics.legalArticle.trim(),
                      changedAtDate: nowDate,
                      changedBy: 'trial_court',
                  },
              ]
            : [],
        dossierStatus: 'active',
        mergedCasesTexts: [],
        mergedCaseIds: [],
        caseStage: resolvedCaseStage,
        courtCaseNumber: String(snapshotWithUnknown.location.caseNumber ?? '').trim() || undefined,
        stageJourney: buildInitialStageJourney(),
    });
    seededCase = syncJuvenileInvestigationCaseFlags(seededCase);
    seededCase = syncCaseSovereignContext(seededCase);
    return {
        ...seededCase,
        defendants: (Array.isArray(seededCase.defendants) ? seededCase.defendants : []).map((d) =>
            normalizeDefendantPersonalFields(d),
        ),
    };
}

function cloneDraftSnapshot(draft: CriminalCaseDraft): CriminalCaseDraft {
    return {
        ...draft,
        basics: { ...draft.basics },
        location: { ...draft.location },
        complainants: (Array.isArray(draft.complainants) ? draft.complainants : []).map((c) => ({ ...c })),
        defendants: (Array.isArray(draft.defendants) ? draft.defendants : []).map((d) => ({
            ...d,
            detentionHistoryLog: Array.isArray(d.detentionHistoryLog)
                ? d.detentionHistoryLog.map((h) => ({ ...h }))
                : [],
        })),
        statements: Array.isArray(draft.statements) ? draft.statements.map((s) => ({ ...s })) : [],
        otherEvidenceItems: Array.isArray((draft as any).otherEvidenceItems)
            ? (draft as any).otherEvidenceItems.map((it: any) => ({ ...it }))
            : [],
        timelineEvents: Array.isArray(draft.timelineEvents) ? draft.timelineEvents.map((e) => ({ ...e })) : [],
        investigationLogs: Array.isArray(draft.investigationLogs)
            ? draft.investigationLogs.map((l) => ({ ...l }))
            : [],
        proceduralContainers: Array.isArray(draft.proceduralContainers)
            ? draft.proceduralContainers.map((c) => ({
                  ...c,
                  subItems: Array.isArray(c.subItems) ? [...c.subItems] : [],
              }))
            : [],
        proceduralCanvasAudit: Array.isArray(draft.proceduralCanvasAudit)
            ? draft.proceduralCanvasAudit.map((e) => ({ ...e }))
            : [],
        lawyerRequests: Array.isArray(draft.lawyerRequests) ? draft.lawyerRequests.map((r) => ({ ...r })) : [],
        trials: normalizeTrialSessions((draft as CriminalCaseDraft).trials),
        trialDepositions: normalizeTrialDepositions((draft as CriminalCaseDraft).trialDepositions),
    };
}

function copyComplainantsForSeveranceDraft(
    parentComplainants: CriminalComplainant[] | undefined,
): CriminalComplainant[] {
    const source = Array.isArray(parentComplainants) ? parentComplainants : [];
    const copied = source
        .map((c) => {
            const {
                counterComplaintTargetDefendantIds: _targets,
                isCrossComplaint: _cross,
                ...rest
            } = c;
            return {
                ...rest,
                id: createId(),
                fullName: String(rest.fullName ?? '').trim(),
            };
        })
        .filter((c) => c.fullName);
    return copied.length ? copied : [makeEmptyComplainant()];
}

function buildSeveranceDraftFromParent(
    parent: CriminalCase,
    draftDefendants: CriminalDefendant[],
): CriminalCaseDraft {
    const role = String(parent.basics?.role ?? '').trim();
    const ourRepresentation = normalizeOurRepresentation(
        String(parent.basics?.ourRepresentation ?? ''),
        role,
    );
    const parentStage = String(parent.basics?.stage ?? '').trim();
    return {
        ...makeInitialDraft(),
        basics: {
            role,
            ourRepresentation,
            stage: (parentStage || 'مرحلة التحقيق') as CriminalCaseStage,
            legalArticle: String(parent.basics?.legalArticle ?? '').trim(),
            crimeType: String(parent.basics?.crimeType ?? '').trim(),
        },
        location: normalizeCriminalCaseLocation(parent.location ?? makeEmptyLocation()),
        complainants: copyComplainantsForSeveranceDraft(parent.complainants),
        defendants: draftDefendants,
        unknownDefendant:
            draftDefendants.some((d) => isDefendantIdentityUnknown(d)) ||
            parent.unknownDefendant === true,
        isMutualComplaint: parent.isMutualComplaint === true,
        isArticle3Offense: parent.isArticle3Offense === true,
        crimeDiscoveryDate: String(parent.crimeDiscoveryDate ?? '').trim(),
        physicalLocation: parent.physicalLocation ?? 'custom',
        physicalLocationCustomName: String(parent.physicalLocationCustomName ?? '').trim(),
    };
}

function requiresDetentionAuthority(status: DefendantStatus | ''): boolean {
    return status === 'موقوف' || status === 'ملقى القبض عليه' || status === 'psychiatric_eval' || status === 'juvenile_detention';
}

function requiresDetentionExpiryDate(status: DefendantStatus | ''): boolean {
    return status === 'موقوف';
}

/**
 * 🔎 يُصنّف مُعرّف طَرف داخل قرار «حجز الأموال» وما شابه:
 *   - 'defendant' عندما يَنتمي لـ `defendants`.
 *   - 'complainant' عندما يَنتمي لـ `complainants` (بالعادة مُشتكي متقابل).
 *   - 'unknown' عندما لا يَتطابق مع أيٍّ منهما (بَيانات تَالفة أو مَحذوفة).
 *
 * يُوفِّر بَديلاً صَريحاً لأيّ كود يَفترض خَطأً «defendantId يَعني متهم حَتماً».
 */
function assertInvestigationTimelineMutable(target: CriminalCase, event?: TimelineEvent, eventId?: string): void {
    if (!target.isInvestigationLocked) return;
    const list = Array.isArray(target.timelineEvents) ? target.timelineEvents : [];
    const hit =
        event ??
        (eventId ? list.find((e) => e.id === eventId) : undefined);
    if (!hit) {
        const category = String((event as { category?: string } | undefined)?.category ?? '').trim();
        if (category && isLockedInvestigationTimelineEvent(category, String((event as { type?: string })?.type ?? ''))) {
            throw new Error(INVESTIGATION_LOCK_MUTATION_ERROR);
        }
        return;
    }
    if (isLockedInvestigationTimelineEvent(String(hit.category ?? ''), String(hit.type ?? ''))) {
        throw new Error(INVESTIGATION_LOCK_MUTATION_ERROR);
    }
}

function stampProceduralNodeId<T extends { proceduralNodeId?: string }>(item: T, nodeId: string): T {
    if (!nodeId) return item;
    return { ...item, proceduralNodeId: nodeId };
}

function applyStageJourneyTransition(
    target: CriminalCase,
    option: {
        targetStage: CaseStage;
        transitionText: string;
        transitionKind: JourneyTransitionKind;
        startedAt: string;
        courtCaseNumber?: string;
        courtName?: string;
        storedStageOverride?: CriminalCaseStage;
    },
): { caseRecord: CriminalCase; activeNodeId: string } {
    const startedAt = String(option.startedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    const courtNum = String(option.courtCaseNumber ?? '').trim();
    const priorNodes = Array.isArray(target.stageJourney)
        ? target.stageJourney
        : buildInitialStageJourney();
    const nodes = appendStageJourneyNode(priorNodes, {
        stage: option.targetStage,
        label: journeyNodeLabelForAppend(
            option.targetStage,
            priorNodes,
            courtNum || target.courtCaseNumber,
            {
                juvenileTrialDisplay: option.storedStageOverride === 'محكمة الأحداث',
            },
        ),
        transitionText: option.transitionText,
        transitionKind: option.transitionKind,
        startedAt,
    });
    const activeNodeId = resolveCurrentJourneyNodeId(nodes);
    const storedStage = option.storedStageOverride ?? storedStageFromCaseStage(option.targetStage);
    let next: CriminalCase = {
        ...target,
        caseStage: option.targetStage,
        basics: { ...target.basics, stage: storedStage },
        stageJourney: nodes,
    };
    if (option.targetStage === 'misdemeanor' || option.targetStage === 'felony') {
        next = {
            ...next,
            courtCaseNumber: courtNum || next.courtCaseNumber,
            location: {
                ...next.location,
                courtName: String(option.courtName ?? '').trim() || next.location.courtName,
                caseNumber: courtNum || next.location.caseNumber,
            },
            isInvestigationLocked: true,
        };
    }
    if (option.targetStage === 'investigation') {
        next = { ...next, isInvestigationLocked: false };
    }
    if (option.targetStage === 'cassation') {
        next = { ...next, isSentToCassation: true };
    }
    return { caseRecord: next, activeNodeId };
}

function applyPrejudicialPostponement(caseRecord: CriminalCase, date: string, details: string): CriminalCase {
    const startedAt = String(date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const nodes = (Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : buildInitialStageJourney()).map(
        (n) => (n.status === 'current' ? { ...n, phaseOverlay: 'frozen_prejudicial' as const } : n),
    );
    const activeNodeId = resolveCurrentJourneyNodeId(nodes);
    const event = stampProceduralNodeId(
        {
            id: createId(),
            date: startedAt,
            type: 'decision',
            category: 'استئخار الدعوى — مادة 183',
            title: '⏳ استئخار جزائي',
            description: details,
        },
        activeNodeId,
    );
    return {
        ...caseRecord,
        stageJourney: nodes,
        isPrejudicialPostponed: true,
        isFrozen: true,
        finalDecision: undefined,
        timelineEvents: [...(Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []), event],
    };
}

function applyDefaultJudgmentArchive(caseRecord: CriminalCase, conclusion: StageConclusion): CriminalCase {
    const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details = String(conclusion.details ?? '').trim() || 'صدور حكم غيابي وأرشفة الدعوى.';
    const activeNodeId = resolveCurrentJourneyNodeId(caseRecord.stageJourney);
    const event = stampProceduralNodeId(
        {
            id: createId(),
            date,
            type: 'decision',
            category: 'حكم غيابي',
            title: '⚖️ حكم غيابي',
            description: details,
            defendantIds: conclusion.defendantIds,
        },
        activeNodeId,
    );
    return {
        ...caseRecord,
        isDefaultJudgmentArchived: true,
        isArchived: true,
        isFrozen: true,
        finalDecision: conclusion,
        timelineEvents: [...(Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []), event],
    };
}

function applyDefaultJudgmentOpposition(caseRecord: CriminalCase, conclusion: StageConclusion): CriminalCase {
    const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const stage = resolveCaseStageFromRecord(caseRecord);
    const courtNum = String(caseRecord.courtCaseNumber ?? caseRecord.location.caseNumber ?? '').trim();
    const nodes = appendStageJourneyNode(
        Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : buildInitialStageJourney(),
        {
            stage: stage === 'investigation' ? 'misdemeanor' : stage,
            label: 'محاكمة وجاهية — معارضة غيابية',
            transitionText: '🔓 طعن واعتراض معارضة غيابية',
            transitionKind: 'backward_reversal',
            startedAt: date,
            phaseOverlay: 'default_judgment_opposition',
        },
    );
    const activeNodeId = resolveCurrentJourneyNodeId(nodes);
    const event = stampProceduralNodeId(
        {
            id: createId(),
            date,
            type: 'decision',
            category: 'معارضة غيابية',
            title: '🔓 معارضة غيابية',
            description: String(conclusion.details ?? '').trim(),
            defendantIds: conclusion.defendantIds,
        },
        activeNodeId,
    );
    const trialStage = stage === 'investigation' ? 'misdemeanor' : stage;
    return {
        ...caseRecord,
        caseStage: trialStage,
        basics: {
            ...caseRecord.basics,
            stage: storedStageFromCaseStage(trialStage),
        },
        stageJourney: nodes,
        isDefaultJudgmentArchived: false,
        isArchived: false,
        isFrozen: false,
        finalDecision: undefined,
        timelineEvents: [...(Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []), event],
    };
}

function applyCaseSplitFugitiveReferral(
    target: CriminalCase,
    conclusion: StageConclusion,
    referral: { courtName: string; caseNumber: string; stage: 'محكمة الجنح' | 'محكمة الجنايات' },
): CriminalCase {
    const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details = String(conclusion.details ?? '').trim() || 'تجزئة الإضبارة وإحالة جزء منها.';
    const referredIds = (Array.isArray(conclusion.defendantIds) ? conclusion.defendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    const allDefs = Array.isArray(target.defendants) ? target.defendants : [];
    const investigationIds = allDefs
        .filter((d) => !referredIds.includes(d.id))
        .map((d) => d.id);
    const stageKey = referral.stage === 'محكمة الجنايات' ? 'felony' : 'misdemeanor';
    const courtNum = String(referral.caseNumber ?? '').trim();
    const courtName = String(referral.courtName ?? '').trim();
    const storedStage = storedStageFromCaseStage(stageKey);

    let base = ensureStageJourneyOnCase(target);
    const nodes = forkStageJourneyFromCurrent(base.stageJourney ?? buildInitialStageJourney(), {
        startedAt: date,
        transitionText: '✂️ تجزئة الإضبارة — متهم هارب / إحالة الباقين',
        branches: [
            {
                branchId: 'split-investigation',
                branchLabel: 'تحقيق — مسار الهارب',
                stage: 'investigation',
                label: 'تحقيق (مستمر بحق الهارب)',
                defendantIds: investigationIds.length ? investigationIds : undefined,
                transitionKind: 'parallel_fork',
            },
            {
                branchId: 'split-trial',
                branchLabel:
                    stageKey === 'felony'
                        ? 'جنايات — محالون'
                        : shouldUseJuvenileTrialJourneyLabels(allDefs, { defendantIds: referredIds })
                          ? 'أحداث — محالون'
                          : 'جنح — محالون',
                stage: stageKey,
                label: journeyNodeLabel(stageKey, courtNum, {
                    juvenileTrialDisplay: shouldUseJuvenileTrialJourneyLabels(allDefs, {
                        defendantIds: referredIds,
                    }),
                }),
                defendantIds: referredIds,
                transitionKind: 'parallel_fork',
            },
        ],
    });

    const trialNodeId = nodes.find((n) => n.branchId === 'split-trial' && n.status === 'current')?.id ?? '';
    const invNodeId = nodes.find((n) => n.branchId === 'split-investigation' && n.status === 'current')?.id ?? '';

    const trialEvent = stampProceduralNodeId(
        {
            id: createId(),
            date,
            type: 'decision',
            category: 'قرار تجزئة وإحالة',
            title: 'إحالة المتهمين غير الهاربين',
            description: `${details}\nالمحكمة: ${courtName || '—'} • رقم الدعوى: ${courtNum || '—'}`,
            defendantIds: referredIds.length ? referredIds : undefined,
        },
        trialNodeId,
    );
    const invEvent = stampProceduralNodeId(
        {
            id: createId(),
            date,
            type: 'decision',
            category: 'قرار تجزئة — استمرار التحقيق',
            title: 'استمرار التحقيق بحق الهارب',
            description: details,
            defendantIds: investigationIds.length ? investigationIds : undefined,
        },
        invNodeId,
    );

    let next: CriminalCase = {
        ...base,
        caseStage: stageKey,
        basics: { ...base.basics, stage: storedStage },
        courtCaseNumber: courtNum || base.courtCaseNumber,
        isInvestigationLocked: true,
        stageJourney: nodes,
        location: {
            ...base.location,
            courtName: courtName || base.location.courtName,
            caseNumber: courtNum || base.location.caseNumber,
        },
        finalDecision: conclusion,
        timelineEvents: [
            ...(Array.isArray(base.timelineEvents) ? base.timelineEvents : []),
            trialEvent,
            invEvent,
        ],
    };
    if (referredIds.length) {
        next = applyPersonalStagesToDefendants(next, referredIds, 'referred_to_trial', {
            status: mapDecisionStatusToDefendantStatus(conclusion.defendantStatusAtDecision),
        });
    }
    return next;
}

/**
 * يفحص ما إذا كان مصفوفة المعرّفات (defendantIds الخاصة بعنصر) منتمية حصراً إلى المجموعة `allowed`.
 * - عنصر بلا أي معرّفات لا يُعدّ «حصرياً» (يبقى في الإضبارة الأم) — احتراز ضد الترحيل غير المقصود.
 * - عنصر يحوي معرّفاً واحداً على الأقل خارج المجموعة لا يُرحَّل (مشترك).
 */
function itemIsExclusiveToDefendants(itemIds: string[] | undefined, allowed: Set<string>): boolean {
    const ids = (Array.isArray(itemIds) ? itemIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (!ids.length) return false;
    return ids.every((id) => allowed.has(id));
}

/**
 * يُقسّم قائمة عناصر إلى مجموعتين: (kept) لتبقى في الإضبارة الأم،
 * و (migrated) لتُرحَّل إلى الإضبارة الجديدة المُفرَّقة.
 */
function partitionItemsByDefendantsExclusive<T>(
    items: T[] | undefined,
    allowed: Set<string>,
    getIds: (item: T) => string[] | undefined,
): { kept: T[]; migrated: T[] } {
    const list = Array.isArray(items) ? items : [];
    const kept: T[] = [];
    const migrated: T[] = [];
    for (const item of list) {
        if (itemIsExclusiveToDefendants(getIds(item), allowed)) {
            migrated.push(item);
        } else {
            kept.push(item);
        }
    }
    return { kept, migrated };
}

function formatInvestigationReferralDescription(input: {
    details: string;
    courtName: string;
    courtLabel: string;
    courtCaseNumber: string;
    publicProsecutionNumber?: string;
    referralLegalArticle?: string;
    misdemeanorType?: MisdemeanorType;
}): string {
    const lines = [
        input.details,
        `المحكمة: ${String(input.courtName ?? '').trim() || input.courtLabel} • رقم دعوى المحكمة: ${String(input.courtCaseNumber ?? '').trim() || '—'}`,
    ];
    const pp = String(input.publicProsecutionNumber ?? '').trim();
    if (pp) lines.push(`رقم الادعاء العام: ${pp}`);
    const article = String(input.referralLegalArticle ?? '').trim();
    if (article) lines.push(`مادة الإحالة / الاتهام: ${article}`);
    if (input.misdemeanorType) {
        lines.push(
            `نوع الدعوى: ${input.misdemeanorType === 'موجزة' ? 'جنحة موجزة' : 'جنحة غير موجزة'}`,
        );
    }
    return lines.join('\n');
}

function applyReferralMetadataToCase(
    caseRecord: CriminalCase,
    meta?: {
        publicProsecutionNumber?: string;
        referralLegalArticle?: string;
        referralDecisionText?: string;
        referralTargetStage?: InvestigationReferralTargetStage;
        referralMisdemeanorType?: MisdemeanorType;
    },
): CriminalCase {
    const pp = String(meta?.publicProsecutionNumber ?? '').trim();
    const article = String(meta?.referralLegalArticle ?? '').trim();
    let next: CriminalCase = caseRecord;
    if (pp) {
        next = {
            ...next,
            location: { ...next.location, publicProsecutionNumber: pp },
        };
    }
    if (article) {
        next = {
            ...next,
            referralArticle: article,
            currentAccusationArticle: article,
            basics: { ...next.basics, legalArticle: article },
        };
    }
    if (meta?.referralTargetStage) {
        next = applyReferralClassificationOverride(
            next,
            meta.referralTargetStage,
            meta.referralMisdemeanorType,
        );
    }
    return applyTrialChargeReferralSeed(syncCaseSovereignContext(next, meta?.referralDecisionText));
}

function applyReferralStatusesToDefendants(
    caseRecord: CriminalCase,
    defendantIds: string[],
    defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'],
    defendantStatusesByDefendantId?: Record<string, 'detained' | 'bailed' | 'fugitive'>,
): CriminalCase {
    if (!defendantIds.length) return caseRecord;
    const perDefendant =
        defendantStatusesByDefendantId &&
        Object.keys(defendantStatusesByDefendantId).some((id) => defendantIds.includes(id));
    if (perDefendant) {
        let next = caseRecord;
        for (const defId of defendantIds) {
            const decisionStatus =
                defendantStatusesByDefendantId?.[defId] ?? defendantStatusAtDecision;
            next = applyPersonalStagesToDefendants(next, [defId], 'referred_to_trial', {
                status: mapDecisionStatusToDefendantStatus(decisionStatus),
            });
        }
        return next;
    }
    return applyPersonalStagesToDefendants(caseRecord, defendantIds, 'referred_to_trial', {
        status: mapDecisionStatusToDefendantStatus(defendantStatusAtDecision),
    });
}

function patchInvestigationReferralCase(
    target: CriminalCase,
    targetCaseStage: InvestigationReferralTargetStage,
    courtName: string,
    courtCaseNumber: string,
    decisionDate: string,
    decisionDetails: string,
    defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'],
    defendantIds: string[],
    referralMeta?: {
        publicProsecutionNumber?: string;
        referralLegalArticle?: string;
        referralMisdemeanorType?: MisdemeanorType;
        defendantStatusesByDefendantId?: Record<string, 'detained' | 'bailed' | 'fugitive'>;
    },
): CriminalCase {
    const invNum = resolveInvestigationCaseNumberSnapshot(target);
    const courtNum = String(courtCaseNumber ?? '').trim();
    const details = String(decisionDetails ?? '').trim() || 'تمت الإحالة إلى المحكمة المختصة.';
    const date = String(decisionDate ?? '').trim() || new Date().toISOString().slice(0, 10);
    const courtLabel = resolveInvestigationReferralStageLabel(targetCaseStage);
    const referralDescription = formatInvestigationReferralDescription({
        details,
        courtName: String(courtName ?? '').trim(),
        courtLabel,
        courtCaseNumber: courtNum,
        publicProsecutionNumber: referralMeta?.publicProsecutionNumber,
        referralLegalArticle: referralMeta?.referralLegalArticle,
        misdemeanorType:
            targetCaseStage === 'misdemeanor' ? referralMeta?.referralMisdemeanorType : undefined,
    });
    const actionId =
        targetCaseStage === 'felony'
            ? 'refer_felony'
            : targetCaseStage === 'juvenile'
              ? 'refer_misdemeanor'
              : 'refer_misdemeanor';
    const option = findTransitionOption('investigation', actionId);
    const meta = option
        ? resolveJourneyTransitionMeta(actionId, option)
        : {
              transitionKind: 'forward_referral' as const,
              transitionText:
                  targetCaseStage === 'felony'
                      ? 'قرار إحالة (محكمة الجنايات)'
                      : targetCaseStage === 'juvenile'
                        ? `قرار إحالة (${JUVENILE_TRIAL_COURT_NAME})`
                        : 'قرار إحالة (محكمة الجنح)',
          };
    const { scopedIds, remainingIds, isPartialReferral } = normalizeReferralDefendantIds(target, defendantIds);
    const effectiveScopedIds = scopedIds.length
        ? scopedIds
        : normalizeReferralDefendantIds(target, []).allDefIds;

    if (isPartialReferral) {
        let base = ensureStageJourneyOnCase(target);
        const nodes = forkStageJourneyFromCurrent(base.stageJourney ?? buildInitialStageJourney(), {
            startedAt: date,
            transitionText: meta.transitionText,
            branches: [
                {
                    branchId: 'partial-investigation',
                    branchLabel: 'تحقيق — مستمر',
                    stage: 'investigation',
                    label: 'تحقيق (إضبارة مستمرة)',
                    defendantIds: remainingIds,
                    transitionKind: 'parallel_fork',
                },
                {
                    branchId: 'partial-trial',
                    branchLabel:
                        targetCaseStage === 'felony'
                            ? 'جنايات — محالون'
                            : targetCaseStage === 'juvenile'
                              ? 'أحداث — محالون'
                              : 'جنح — محالون',
                    stage: targetCaseStage === 'juvenile' ? 'misdemeanor' : targetCaseStage,
                    label: journeyNodeLabel(
                        targetCaseStage === 'juvenile' ? 'juvenile' : targetCaseStage,
                        courtNum,
                    ),
                    defendantIds: scopedIds,
                    transitionKind: 'parallel_fork',
                },
            ],
        });
        const trialNodeId =
            nodes.find((n) => n.branchId === 'partial-trial' && n.status === 'current')?.id ?? '';
        const invNodeId =
            nodes.find((n) => n.branchId === 'partial-investigation' && n.status === 'current')?.id ?? '';
        const trialEvent = stampProceduralNodeId(
            {
                id: createId(),
                date,
                type: 'decision',
                category: 'قرار إحالة إلى محكمة الموضوع',
                title: `إحالة جزئية إلى ${courtLabel}`,
                description: referralDescription,
                defendantIds: scopedIds,
            },
            trialNodeId,
        );
        const invEvent = stampProceduralNodeId(
            {
                id: createId(),
                date,
                type: 'decision',
                category: 'استمرار التحقيق',
                title: 'استمرار التحقيق بحق باقي المتهمين',
                description: details,
                defendantIds: remainingIds,
            },
            invNodeId,
        );
        let next: CriminalCase = {
            ...base,
            caseStage: 'investigation',
            investigationCaseNumber: invNum !== '—' ? invNum : base.investigationCaseNumber,
            stageJourney: nodes,
            timelineEvents: [
                ...(Array.isArray(base.timelineEvents) ? base.timelineEvents : []),
                trialEvent,
                invEvent,
            ],
        };
        next = applyReferralStatusesToDefendants(
            next,
            scopedIds,
            defendantStatusAtDecision,
            referralMeta?.defendantStatusesByDefendantId,
        );
        return applyReferralMetadataToCase(next, {
            ...referralMeta,
            referralDecisionText: referralDescription,
            referralTargetStage: targetCaseStage,
        });
    }

    const journeyTargetStage: CaseStage =
        targetCaseStage === 'juvenile' ? 'misdemeanor' : targetCaseStage;
    const { caseRecord: withNodes, activeNodeId } = applyStageJourneyTransition(ensureStageJourneyOnCase(target), {
        targetStage: journeyTargetStage,
        storedStageOverride: storedStageFromInvestigationReferralTarget(targetCaseStage),
        transitionText: meta.transitionText,
        transitionKind: meta.transitionKind,
        startedAt: date,
        courtCaseNumber: courtNum,
        courtName,
    });
    const event: TimelineEvent = stampProceduralNodeId(
        {
            id: createId(),
            date,
            type: 'decision',
            category: 'قرار إحالة إلى محكمة الموضوع',
            title: `إحالة إلى ${courtLabel}`,
            description: referralDescription,
            defendantIds: effectiveScopedIds.length ? effectiveScopedIds : undefined,
        },
        activeNodeId,
    );
    const conclusion: StageConclusion = {
        id: createId(),
        stageType: 'investigation',
        decisionType: 'referral',
        date,
        details,
        defendantStatusAtDecision,
        defendantIds: effectiveScopedIds.length ? effectiveScopedIds : undefined,
        ...(referralMeta?.defendantStatusesByDefendantId
            ? { defendantStatusesByDefendantId: referralMeta.defendantStatusesByDefendantId }
            : {}),
    };
    let next = {
        ...withNodes,
        investigationCaseNumber: invNum !== '—' ? invNum : withNodes.investigationCaseNumber,
        isInvestigationLocked: true,
        finalDecision: conclusion,
        timelineEvents: [...(Array.isArray(withNodes.timelineEvents) ? withNodes.timelineEvents : []), event],
    };
    if (effectiveScopedIds.length) {
        next = applyReferralStatusesToDefendants(
            next,
            effectiveScopedIds,
            defendantStatusAtDecision,
            referralMeta?.defendantStatusesByDefendantId,
        );
    }
    return applyReferralMetadataToCase(next, {
        ...referralMeta,
        referralDecisionText: referralDescription,
        referralTargetStage: targetCaseStage,
    });
}

function referralPayloadValid(input: {
    courtName?: string;
    courtCaseNumber?: string;
    decisionDate?: string;
}): boolean {
    return Boolean(String(input.courtName ?? '').trim() && String(input.decisionDate ?? '').trim());
}

function stageCourtNumberForJourney(caseRecord: CriminalCase, stage: CaseStage): string {
    if (stage === 'investigation') {
        const inv = String(caseRecord.investigationCaseNumber ?? caseRecord.location.investigationDossierNumber ?? '').trim();
        return inv;
    }
    return String(caseRecord.courtCaseNumber ?? caseRecord.location.caseNumber ?? '').trim();
}

function partialRouteBranchLabel(
    stage: CaseStage,
    role: 'remain' | 'routed',
    juvenileTrialDisplay = false,
): string {
    if (stage === 'investigation') return role === 'remain' ? 'تحقيق — مستمر' : 'تحقيق — محالون';
    if (stage === 'felony') return role === 'remain' ? 'جنايات — مستمر' : 'جنايات — محالون';
    if (stage === 'misdemeanor') {
        if (juvenileTrialDisplay) {
            return role === 'remain' ? 'أحداث — مستمر' : 'أحداث — محالون';
        }
        return role === 'remain' ? 'جنح — مستمر' : 'جنح — محالون';
    }
    if (stage === 'cassation') return role === 'remain' ? 'تمييز — مستمر' : 'تمييز — محالون';
    return role === 'remain' ? 'مسار — مستمر' : 'مسار — محالون';
}

function unlockInvestigationOnCase(caseRecord: CriminalCase, prior: CriminalCase): CriminalCase {
    const invNum = resolveInvestigationCaseNumberSnapshot(prior);
    return {
        ...caseRecord,
        investigationCaseNumber: invNum !== '—' ? invNum : caseRecord.investigationCaseNumber,
        isInvestigationLocked: false,
    };
}

/**
 * محرّك موحّد لكل تحوّلات المسار (إحالة/إرجاع/تمييز/نقض/تصديق):
 * استقلالية العقدة المصدر، تفرع جزئي، وأرشفة المرحلة السابقة — كإحالة التحقيق.
 */
function applyProceduralRouteTransition(
    target: CriminalCase,
    actionId: ProceduralStageRouteActionId,
    transitionDate: string,
    notes: string,
    court?: { courtName?: string; courtCaseNumber?: string },
    defendantIds?: string[],
    defendantStatusAtDecision?: StageConclusion['defendantStatusAtDecision'],
): { caseRecord: CriminalCase; sourceProceduralNodeId: string; originStage: CaseStage } {
    const current = ensureStageJourneyOnCase(target);
    const originStage = resolveCaseStageFromRecord(current);
    const option = findTransitionOption(originStage, actionId);
    if (!option) {
        return { caseRecord: current, sourceProceduralNodeId: '', originStage };
    }

    const date = String(transitionDate ?? '').trim() || new Date().toISOString().slice(0, 10);
    const courtNum = String(court?.courtCaseNumber ?? '').trim();
    const courtName = String(court?.courtName ?? '').trim();
    const courtLabel =
        option.targetStage === 'felony'
            ? 'محكمة الجنايات'
            : option.targetStage === 'misdemeanor'
              ? 'محكمة الجنح'
              : option.targetStage === 'cassation'
                ? 'محكمة التمييز'
                : 'مرحلة التحقيق';
    const description = formatProceduralRouteDescription(actionId, {
        details: String(notes ?? '').trim(),
        courtName,
        courtCaseNumber: courtNum,
        courtLabel,
        fallbackTitle: option.menuLabel,
    });
    const meta = resolveJourneyTransitionMeta(actionId, option);
    const sourceProceduralNodeId = resolveCurrentJourneyNodeId(current.stageJourney);
    const timelineCategory = proceduralRouteTimelineCategory(actionId);
    const { scopedIds, remainingIds, isPartialReferral } = normalizeReferralDefendantIds(
        current,
        defendantIds ?? [],
    );
    const effectiveScoped = scopedIds.length
        ? scopedIds
        : normalizeReferralDefendantIds(current, []).allDefIds;

    const stampRouteEvent = (nodeId: string, ids?: string[]) =>
        stampProceduralNodeId(
            {
                id: createId(),
                date,
                type: 'decision' as const,
                category: timelineCategory,
                title: option.menuLabel,
                description,
                defendantIds: ids?.length ? ids : undefined,
            },
            nodeId,
        );

    if (isPartialReferral) {
        const defs = Array.isArray(current.defendants) ? current.defendants : [];
        const routedJuvenile = shouldUseJuvenileTrialJourneyLabels(defs, {
            defendantIds: scopedIds,
            storedStage: current.basics?.stage,
        });
        const remainJuvenile = shouldUseJuvenileTrialJourneyLabels(defs, {
            defendantIds: remainingIds,
            storedStage: current.basics?.stage,
        });
        const remainStage = originStage;
        const remainLabel = journeyNodeLabel(remainStage, stageCourtNumberForJourney(current, remainStage), {
            juvenileTrialDisplay:
                remainJuvenile && (remainStage === 'misdemeanor' || remainStage === 'felony'),
        });
        const routedLabel =
            option.targetStage === 'investigation'
                ? actionId === 'cassation_quash_investigation'
                    ? 'مرحلة التحقيق (نقض تمييزي)'
                    : 'مرحلة التحقيق (إعادة لوجود نقص)'
                : journeyNodeLabel(option.targetStage, courtNum, { juvenileTrialDisplay: routedJuvenile });

        const nodes = forkStageJourneyFromCurrent(current.stageJourney ?? buildInitialStageJourney(), {
            startedAt: date,
            transitionText: meta.transitionText,
            branches: [
                {
                    branchId: 'partial-route-remain',
                    branchLabel: partialRouteBranchLabel(remainStage, 'remain', remainJuvenile),
                    stage: remainStage,
                    label: remainLabel,
                    defendantIds: remainingIds,
                    transitionKind: 'parallel_fork',
                },
                {
                    branchId: 'partial-route-target',
                    branchLabel: partialRouteBranchLabel(option.targetStage, 'routed', routedJuvenile),
                    stage: option.targetStage,
                    label: routedLabel,
                    defendantIds: scopedIds,
                    transitionKind: meta.transitionKind,
                },
            ],
        });

        const remainNodeId =
            nodes.find((n) => n.branchId === 'partial-route-remain' && n.status === 'current')?.id ?? '';

        let next: CriminalCase = {
            ...current,
            caseStage: remainStage,
            basics: { ...current.basics, stage: syncStoredStageFromJourneyCaseStage(remainStage, current.basics?.stage) },
            stageJourney: nodes,
            finalDecision: undefined,
            isFrozen: false,
            timelineEvents: [
                ...(Array.isArray(current.timelineEvents) ? current.timelineEvents : []),
                stampRouteEvent(sourceProceduralNodeId, scopedIds),
                stampRouteEvent(remainNodeId, remainingIds),
            ],
        };

        if (option.targetStage === 'investigation' || actionId === 'cassation_quash_investigation') {
            next = unlockInvestigationOnCase(next, current);
        }
        if (actionId === 'cassation_confirm') {
            next = { ...next, isFrozen: true };
        }
        if (effectiveScoped.length && defendantStatusAtDecision) {
            const ps = personalStageForDecision(actionId, undefined);
            if (ps) {
                next = applyPersonalStagesToDefendants(next, effectiveScoped, ps, {
                    status: mapDecisionStatusToDefendantStatus(defendantStatusAtDecision),
                });
            }
        }
        return { caseRecord: next, sourceProceduralNodeId, originStage };
    }

    const { caseRecord } = applyStageJourneyTransition(current, {
        targetStage: option.targetStage,
        storedStageOverride:
            option.targetStage === 'investigation'
                ? syncStoredStageFromJourneyCaseStage('investigation', current.basics?.stage)
                : option.targetStage === 'misdemeanor'
                  ? syncStoredStageFromJourneyCaseStage('misdemeanor', current.basics?.stage)
                  : option.targetStage === 'felony'
                    ? 'محكمة الجنايات'
                    : undefined,
        transitionText: meta.transitionText,
        transitionKind: meta.transitionKind,
        startedAt: date,
        courtCaseNumber: courtNum || undefined,
        courtName: courtName || undefined,
    });

    let nextCase: CriminalCase = {
        ...caseRecord,
        finalDecision: undefined,
        isFrozen: actionId === 'cassation_confirm',
        timelineEvents: [
            ...(Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []),
            stampRouteEvent(sourceProceduralNodeId, effectiveScoped.length ? effectiveScoped : undefined),
        ],
    };

    if (
        actionId === 'return_investigation_deficiency' ||
        actionId === 'cassation_quash_investigation'
    ) {
        nextCase = unlockInvestigationOnCase(nextCase, current);
    }

    return { caseRecord: nextCase, sourceProceduralNodeId, originStage };
}

function applyProceduralActionToCase(
    target: CriminalCase,
    actionId: ProceduralTransitionActionId,
    transitionDate: string,
    notes: string,
    court?: { courtName?: string; courtCaseNumber?: string },
): CriminalCase {
    const current = ensureStageJourneyOnCase(target);
    const currentStage = resolveCaseStageFromRecord(current);
    const option = findTransitionOption(currentStage, actionId);
    if (!option) return current;

    const date = String(transitionDate ?? '').trim() || new Date().toISOString().slice(0, 10);
    const detailText = String(notes ?? '').trim() || option.menuLabel;

    if (actionId === 'refer_misdemeanor' || actionId === 'refer_felony') {
        return patchInvestigationReferralCase(
            current,
            actionId === 'refer_felony' ? 'felony' : 'misdemeanor',
            String(court?.courtName ?? '').trim() ||
                (actionId === 'refer_felony' ? 'محكمة الجنايات' : 'محكمة الجنح'),
            String(court?.courtCaseNumber ?? '').trim(),
            date,
            detailText,
            'bailed',
            [],
        );
    }

    if (isProceduralStageRouteActionId(actionId)) {
        return applyProceduralRouteTransition(
            current,
            actionId,
            date,
            detailText,
            court,
            [],
            undefined,
        ).caseRecord;
    }

    return current;
}

/** يقرأ mergedCaseIds مع ترحيل mergedFromCaseIds. */
function cassationAppealMutationBlocked(target: CriminalCase): boolean {
    return isMergedDossierCase(target);
}

function statementMutationBlocked(target: CriminalCase): boolean {
    return investigationStatementsMutationBlocked(target);
}

function filterOutJudicialDecisionsForRequest(
    decisions: JudicialDecision[] | undefined,
    requestId: string,
): JudicialDecision[] {
    const rid = String(requestId ?? '').trim();
    if (!rid) return Array.isArray(decisions) ? decisions : [];
    return (Array.isArray(decisions) ? decisions : []).filter((d) => {
        const src = String(d.sourceRequestId ?? '').trim();
        return src !== rid && d.id !== rid && d.id !== `jd_${rid}`;
    });
}

function appendCaseTrashItem(
    target: CriminalCase,
    kind: CriminalTrashItemKind,
    snapshot: CriminalTrashItem['snapshot'],
): CriminalCase {
    const item: CriminalTrashItem = {
        id: createId(),
        kind,
        deletedAt: new Date().toISOString(),
        label: buildTrashLabel(kind, snapshot),
        snapshot: JSON.parse(JSON.stringify(snapshot)) as CriminalTrashItem['snapshot'],
    };
    return {
        ...target,
        trashBin: [...normalizeTrashBin(target.trashBin), item],
    };
}

function appendIdentityCorrectionTimelineEvent(
    target: CriminalCase,
    title: string,
    description: string,
): CriminalCase {
    const date = new Date().toISOString().slice(0, 10);
    const nodeId = resolveCurrentJourneyNodeId(ensureStageJourneyOnCase(target).stageJourney);
    const event = stampProceduralNodeId(
        {
            id: createId(),
            date,
            type: 'investigation',
            category: CASE_IDENTITY_CORRECTION_CATEGORY,
            title,
            description,
        },
        nodeId,
    );
    return {
        ...target,
        timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), event],
    };
}

function caseMaterialProcedureBlocked(target: CriminalCase): boolean {
    return caseMutationBlocked(target) || isUnderInterventionReview(target);
}

function buildTrialVerdictStageConclusion(
    target: CriminalCase,
    session: TrialSession,
    outcome: TrialVerdictOutcome,
    verdictDate: string,
): StageConclusion {
    const caseStage = resolveCaseStageFromRecord(target);
    const stageType: StageConclusion['stageType'] =
        caseStage === 'felony'
            ? 'felony'
            : caseStage === 'misdemeanor'
              ? 'misdemeanor'
              : 'misdemeanor';
    const outcomeLabel = trialVerdictOutcomeLabel(outcome);
    const notes = String(session.sessionNotes ?? '').trim();
    return {
        id: createId(),
        stageType,
        decisionType: outcome,
        date: verdictDate,
        details: notes
            ? `حكم ${outcomeLabel} صادر وجاهياً في الجلسة رقم ${session.sessionNumber}. ${notes}`
            : `حكم ${outcomeLabel} صادر وجاهياً في الجلسة رقم ${session.sessionNumber}.`,
        defendantStatusAtDecision: 'detained',
    };
}

function trialSessionsLocked(target: CriminalCase): boolean {
    const list = normalizeTrialSessions(target.trials);
    return list.some((s) => s.status === 'verdict_issued' && s.verdict);
}

function normalizeReferralDefendantIds(target: CriminalCase, defendantIds: string[]): {
    allDefIds: string[];
    scopedIds: string[];
    remainingIds: string[];
    isPartialReferral: boolean;
} {
    const allDefIds = (Array.isArray(target.defendants) ? target.defendants : [])
        .map((d) => String(d.id ?? '').trim())
        .filter((x) => x.length > 0);
    const scopedIds = (Array.isArray(defendantIds) ? defendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter((x) => x.length > 0 && allDefIds.includes(x));
    const remainingIds = allDefIds.filter((id) => !scopedIds.includes(id));
    const isPartialReferral = scopedIds.length > 0 && remainingIds.length > 0;
    return { allDefIds, scopedIds, remainingIds, isPartialReferral };
}

function appendJudicialDecisionOnCase(caseRecord: CriminalCase, decision: JudicialDecision): CriminalCase {
    const list = Array.isArray(caseRecord.judicialDecisions) ? caseRecord.judicialDecisions : [];
    const key = decision.sourceRequestId ?? decision.id;
    if (list.some((d) => (d.sourceRequestId ?? d.id) === key || d.id === decision.id)) {
        return caseRecord;
    }
    return { ...caseRecord, judicialDecisions: [...list, decision] };
}

function upsertJudicialDecisionOnCase(caseRecord: CriminalCase, request: LawyerRequest): CriminalCase {
    const jd = lawyerRequestToJudicialDecision(request);
    if (!jd) return caseRecord;
    const list = Array.isArray(caseRecord.judicialDecisions) ? caseRecord.judicialDecisions : [];
    const key = jd.sourceRequestId ?? jd.id;
    const idx = list.findIndex((d) => (d.sourceRequestId ?? d.id) === key || d.id === jd.id);
    const filedAppeals = idx >= 0
        ? (list[idx]!.appeals ?? []).filter((a) => String(a.filedAt ?? '').trim())
        : [];
    const caseStage = resolveCaseStageFromRecord(caseRecord);
    const storedAppealability = idx >= 0 ? list[idx]!.decisionAppealability : undefined;
    const defaultAppealability =
        isLawyerRequestJudgeOrder(jd) && !storedAppealability
            ? resolveInitialLawyerOrderAppealability(caseStage)
            : storedAppealability;
    const nextDecision =
        idx >= 0
            ? {
                  ...jd,
                  proceduralNodeId: list[idx]!.proceduralNodeId ?? jd.proceduralNodeId,
                  appeals: filedAppeals,
                  decisionAppealability: storedAppealability ?? defaultAppealability,
              }
            : {
                  ...jd,
                  decisionAppealability: defaultAppealability,
              };
    const nextList = idx >= 0 ? list.map((d, i) => (i === idx ? nextDecision : d)) : [...list, nextDecision];
    return { ...caseRecord, judicialDecisions: nextList };
}

function resolveJudicialDecisionsForCase(caseRecord: CriminalCase): JudicialDecision[] {
    return mergeJudicialDecisionsFromRequests(caseRecord.judicialDecisions, caseRecord.lawyerRequests);
}

/** آثار الموافقة/الرفض/القرار النافذ على أطراف القضية والسجل القضائي. */
function applyLawyerRequestOutcomeOnCase(caseRecord: CriminalCase, request: LawyerRequest): CriminalCase {
    const isBailApproval =
        request.status === 'approved' && /كفالة|إخلاء سبيل بكفالة/i.test(String(request.type ?? ''));
    const templateKey = normalizeProceduralRequestTemplate(
        String(request.proceduralTemplate ?? request.type ?? '').trim(),
    );
    const isJuvenileObservationBinding =
        (request.status === 'approved' || request.status === 'executed') &&
        templateKey === JUVENILE_OBSERVATION_HOME_DECISION_TEMPLATE;
    const isJuvenileProvisionalDelivery =
        (request.status === 'approved' || request.status === 'executed') &&
        templateKey === JUVENILE_PROVISIONAL_DELIVERY_DECISION_TEMPLATE;
    /** توقيف قضائي = توثيق في السجل للمتهم؛ يبقى التحديث عبر بطاقة التوقيف أو accused* للمتقابل. */
    const isJudicialDefendantDocumentationOnly = isJudicialDefendantStatusDocumentationOnly(
        request.proceduralTemplate ?? request.type,
    );
    const isDetentionBinding =
        (request.status === 'approved' || request.status === 'executed') &&
        (isDetentionDecisionTemplate(request.proceduralTemplate ?? request.type) ||
            isJuvenileObservationBinding);
    const isDefendantBailDecision =
        request.status === 'executed' &&
        isDefendantBailTemplate(request.proceduralTemplate ?? request.type);
    const bindsPartyAccusedStatus =
        isBailApproval ||
        isDetentionBinding ||
        isDefendantBailDecision ||
        isJuvenileProvisionalDelivery;
    const detentionEndApproved = String(request.detentionEndDate ?? '').trim();
    const rawIds = Array.isArray(request.defendantIds) ? request.defendantIds : [];
    const partyIds = rawIds.map((x) => String(x ?? '').trim()).filter(Boolean);
    const defendantIds = resolveProceduralDefendantIds(
        Array.isArray(caseRecord.complainants) ? caseRecord.complainants : [],
        Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [],
        partyIds,
        caseRecord.isMutualComplaint === true,
    );
    const bailGuarantorDetails: GuarantorDetails | undefined = (() => {
        if (!isDefendantBailDecision) return undefined;
        const b = request.defendantBail;
        if (!b) return undefined;
        if (b.kind === 'financial') {
            const amt = String(b.bailAmount ?? '').trim();
            if (!amt) return undefined;
            return {
                bailAmount: amt,
                guarantorInfo: '',
                kind: 'financial',
            };
        }
        if (b.kind === 'personal') {
            const list = Array.isArray(b.guarantors) ? b.guarantors : [];
            const guarantors = list
                .map((g, i) => ({
                    id: String(g?.id ?? '').trim() || `g_${Date.now()}_${i}`,
                    fullName: String(g?.fullName ?? '').trim(),
                }))
                .filter((g) => g.fullName.length > 0);
            if (guarantors.length === 0) return undefined;
            const summary = guarantors.map((g) => g.fullName).join(' • ');
            return {
                bailAmount: '',
                guarantorInfo: summary,
                kind: 'personal',
                guarantors,
            };
        }
        return undefined;
    })();
    const nextDefendants =
        bindsPartyAccusedStatus &&
        !isJudicialDefendantDocumentationOnly &&
        defendantIds.length
            ? (Array.isArray(caseRecord.defendants) ? caseRecord.defendants : []).map((d) => {
                  if (!defendantIds.includes(d.id)) return d;
                  if (isJuvenileProvisionalDelivery) {
                      const nextDef: CriminalDefendant = {
                          ...d,
                          status: 'مكفل' as DefendantStatus,
                      };
                      if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                      if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                      return nextDef;
                  }
                  if (isDefendantBailDecision) {
                      const nextDef = {
                          ...d,
                          status: 'مكفل' as DefendantStatus,
                          guarantorDetails: bailGuarantorDetails ?? d.guarantorDetails,
                      };
                      if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                      if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                      return nextDef;
                  }
                  if (isBailApproval) {
                      const nextDef = { ...d, status: 'bailed_pending_appeal' as DefendantStatus };
                      if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                      if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                      return nextDef;
                  }
                  if (Boolean((d as CriminalDefendant).isJuvenile)) {
                      const nextDef: CriminalDefendant = {
                          ...d,
                          status: 'juvenile_detention' as DefendantStatus,
                          detentionAuthority: investigationJuvenileDetentionAuthorityLabel(),
                          detentionExpiryDate: detentionEndApproved || d.detentionExpiryDate,
                      };
                      return nextDef;
                  }
                  const nextDef = {
                      ...d,
                      status: 'موقوف' as DefendantStatus,
                      detentionExpiryDate: detentionEndApproved || d.detentionExpiryDate,
                  };
                  return nextDef;
              })
            : caseRecord.defendants;
    /**
     * ⚖️ مَسار مُوازٍ لِلمشتكي المتقابل: عند صُدور قَرار كفالة/توقيف/إخلاء سبيل
     * بحقّ مشتكٍ يَكتسب صفة المتهم (isCrossComplaint per-party أو isMutualComplaint
     * case-level)، نُحدّث حقوله الفرعية `accused*` بشَكلٍ مُماثل للمتهم — دون نَقل
     * كائنه إلى مَصفوفة `defendants`. الـ gate صَريم:
     *   - المعرّف يَجب أن يَكون في `partyIds` (المُخرَج من نِيّة المُستخدم).
     *   - المشتكي يَجب أن يَكون مُتقابلاً فِعلاً (case-level أو per-party).
     * يَمنع التَسريب: في الدعاوى غير المتقابلة لا يُلامس حقل واحد من حقول المشتكي.
     */
    const partyIdSet = new Set(partyIds);
    const nextComplainants = bindsPartyAccusedStatus && partyIdSet.size
            ? (Array.isArray(caseRecord.complainants) ? caseRecord.complainants : []).map((c) => {
                  if (!partyIdSet.has(c.id)) return c;
                  const isAccused =
                      caseRecord.isMutualComplaint === true || c.isCrossComplaint === true;
                  if (!isAccused) return c;
                  if (isDefendantBailDecision) {
                      const nextC: CriminalComplainant = {
                          ...c,
                          accusedStatus: 'مكفل' as DefendantStatus,
                          accusedGuarantorDetails:
                              bailGuarantorDetails ?? c.accusedGuarantorDetails,
                      };
                      if (!requiresDetentionAuthority(nextC.accusedStatus ?? '')) {
                          nextC.accusedDetentionAuthority = '';
                      }
                      if (!requiresDetentionExpiryDate(nextC.accusedStatus ?? '')) {
                          nextC.accusedDetentionExpiryDate = '';
                      }
                      return nextC;
                  }
                  if (isBailApproval) {
                      const nextC: CriminalComplainant = {
                          ...c,
                          accusedStatus: 'bailed_pending_appeal' as DefendantStatus,
                      };
                      if (!requiresDetentionAuthority(nextC.accusedStatus ?? '')) {
                          nextC.accusedDetentionAuthority = '';
                      }
                      if (!requiresDetentionExpiryDate(nextC.accusedStatus ?? '')) {
                          nextC.accusedDetentionExpiryDate = '';
                      }
                      return nextC;
                  }
                  if (isJuvenileProvisionalDelivery) {
                      const nextC: CriminalComplainant = {
                          ...c,
                          accusedStatus: 'مكفل' as DefendantStatus,
                      };
                      if (!requiresDetentionAuthority(nextC.accusedStatus ?? '')) {
                          nextC.accusedDetentionAuthority = '';
                      }
                      if (!requiresDetentionExpiryDate(nextC.accusedStatus ?? '')) {
                          nextC.accusedDetentionExpiryDate = '';
                      }
                      return nextC;
                  }
                  if (Boolean((c as CriminalComplainant).isJuvenile)) {
                      const nextC: CriminalComplainant = {
                          ...c,
                          accusedStatus: 'juvenile_detention' as DefendantStatus,
                          accusedDetentionAuthority: investigationJuvenileDetentionAuthorityLabel(),
                          accusedDetentionExpiryDate:
                              detentionEndApproved || c.accusedDetentionExpiryDate,
                      };
                      return nextC;
                  }
                  const nextC: CriminalComplainant = {
                      ...c,
                      accusedStatus: 'موقوف' as DefendantStatus,
                      accusedDetentionExpiryDate:
                          detentionEndApproved || c.accusedDetentionExpiryDate,
                  };
                  return nextC;
              })
            : caseRecord.complainants;
    let nextCase: CriminalCase = {
        ...caseRecord,
        defendants: nextDefendants,
        complainants: nextComplainants,
    };
    if (lawyerRequestToJudicialDecision(request)) {
        nextCase = upsertJudicialDecisionOnCase(nextCase, request);
    }
    nextCase = applyInvestigationClosureFromRequest(nextCase, request);
    const referredCourt = String(request.referredCourtName ?? '').trim();
    if (
        (request.status === 'executed' || request.status === 'approved') &&
        isComplaintCourtReferralTemplate(request.proceduralTemplate ?? request.type) &&
        referredCourt
    ) {
        nextCase = applyComplaintCourtReferralToCase(nextCase, referredCourt, request.id);
    }
    if (
        (request.status === 'executed' || request.status === 'approved') &&
        templateKey === SOCIAL_INQUIRY_REFERRAL_TEMPLATE &&
        defendantIds.length
    ) {
        nextCase = {
            ...nextCase,
            defendants: applyJuvenileSocialInquiryReferralOnDefendants(
                Array.isArray(nextCase.defendants) ? nextCase.defendants : [],
                defendantIds,
            ),
        };
    }
    return syncJuvenileInvestigationCaseFlags(nextCase);
}

function resolveDecisionPartyIds(decision: JudicialDecision, caseRecord: CriminalCase): string[] {
    const raw = (decision.defendantIds ?? decision.beneficiaryPartyIds ?? []).map((x) =>
        String(x ?? '').trim(),
    ).filter(Boolean);
    return resolveProceduralDefendantIds(
        Array.isArray(caseRecord.complainants) ? caseRecord.complainants : [],
        Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [],
        raw,
        caseRecord.isMutualComplaint === true,
    );
}

function findStoredJudicialDecisionIndex(list: JudicialDecision[], decisionId: string): number {
    const key = String(decisionId ?? '').trim();
    if (!key) return -1;
    let idx = list.findIndex((d) => d.id === key);
    if (idx >= 0) return idx;
    const reqKey = key.startsWith('jd_') ? key.slice(3) : '';
    if (reqKey) {
        idx = list.findIndex((d) => d.sourceRequestId === reqKey || d.id === `jd_${reqKey}`);
        if (idx >= 0) return idx;
    }
    return -1;
}

function patchDetentionDecisionOnCase(
    caseRecord: CriminalCase,
    decisionId: string,
    patch: { detentionEndDate?: string; detentionReleasedAt?: string },
    fallback?: JudicialDecision,
): CriminalCase | null {
    const list = Array.isArray(caseRecord.judicialDecisions) ? [...caseRecord.judicialDecisions] : [];
    let idx = findStoredJudicialDecisionIndex(list, decisionId);
    let prior = idx >= 0 ? list[idx]! : fallback;
    if (!prior) return null;
    if (idx < 0) {
        list.push({ ...prior, isLocked: prior.isLocked ?? true });
        idx = list.length - 1;
    }
    const nextDecision: JudicialDecision = {
        ...prior,
        detentionEndDate:
            patch.detentionEndDate !== undefined
                ? patch.detentionEndDate
                : prior.detentionEndDate,
        detentionReleasedAt:
            patch.detentionReleasedAt !== undefined
                ? patch.detentionReleasedAt
                : prior.detentionReleasedAt,
    };
    const nextList = list.map((d, i) => (i === idx ? nextDecision : d));
    let nextCase: CriminalCase = { ...caseRecord, judicialDecisions: nextList };
    const reqId = String(prior.sourceRequestId ?? '').trim();
    if (reqId) {
        const reqs = Array.isArray(nextCase.lawyerRequests) ? [...nextCase.lawyerRequests] : [];
        const rIdx = reqs.findIndex((r) => r.id === reqId);
        if (rIdx >= 0) {
            const req = reqs[rIdx]!;
            reqs[rIdx] = {
                ...req,
                detentionEndDate: nextDecision.detentionEndDate ?? req.detentionEndDate,
            };
            nextCase = { ...nextCase, lawyerRequests: reqs };
        }
    }
    return nextCase;
}

function patchOrderEnforcementOnCase(
    caseRecord: CriminalCase,
    decisionId: string,
    patch: Partial<OrderEnforcementTracking>,
    fallback?: JudicialDecision,
): CriminalCase | null {
    const merged = resolveJudicialDecisionsForCase(caseRecord);
    const hit =
        findJudicialDecisionByRef(merged, decisionId) ??
        fallback ??
        merged.find((d) => d.id === decisionId || d.sourceRequestId === decisionId);
    if (!hit) return null;
    const priorTracking = normalizeOrderEnforcementTracking(hit.orderEnforcement) ?? {};
    const nextTracking = normalizeOrderEnforcementTracking({ ...priorTracking, ...patch });
    const legalArticleBasis =
        String(patch.legalArticleBasis ?? hit.legalArticleBasis ?? nextTracking?.legalArticleBasis ?? '').trim() ||
        undefined;
    const nextDecision: JudicialDecision = {
        ...hit,
        orderEnforcement: nextTracking,
        legalArticleBasis,
    };
    let nextCase = persistSealedJudicialDecisionOnCase(caseRecord, nextDecision);
    const reqId = String(hit.sourceRequestId ?? '').trim();
    if (reqId) {
        const reqs = Array.isArray(nextCase.lawyerRequests) ? [...nextCase.lawyerRequests] : [];
        const rIdx = reqs.findIndex((r) => r.id === reqId);
        if (rIdx >= 0) {
            reqs[rIdx] = {
                ...reqs[rIdx]!,
                orderEnforcement: nextTracking,
                legalArticleBasis,
            };
            nextCase = { ...nextCase, lawyerRequests: reqs };
        }
    }
    const partyIds = (hit.defendantIds ?? hit.beneficiaryPartyIds ?? [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (partyIds.length && nextTracking) {
        const defs = Array.isArray(nextCase.defendants) ? [...nextCase.defendants] : [];
        nextCase = {
            ...nextCase,
            defendants: defs.map((d) => {
                if (!partyIds.includes(d.id)) return d;
                if (nextTracking.kind === 'summons' && nextTracking.attendanceStatus === 'attended') {
                    return d.status === 'حر' || d.status === 'هارب' ? { ...d, status: 'مستقدم' as DefendantStatus } : d;
                }
                if (nextTracking.kind === 'arrest' && nextTracking.arrestExecuted === 'executed') {
                    if (nextTracking.postArrestOutcome === 'detained') {
                        const nextDef = { ...d, status: 'ملقى القبض عليه' as DefendantStatus };
                        if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                        return nextDef;
                    }
                    if (nextTracking.postArrestOutcome === 'bailed') {
                        const nextDef = { ...d, status: 'bailed_pending_appeal' as DefendantStatus };
                        if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                        if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                        return nextDef;
                    }
                }
                return d;
            }),
        };
    }
    return nextCase;
}

function persistSealedJudicialDecisionOnCase(
    caseRecord: CriminalCase,
    mergedDecision: JudicialDecision,
): CriminalCase {
    const sealed: JudicialDecision = { ...mergedDecision, isLocked: true };
    const list = Array.isArray(caseRecord.judicialDecisions) ? [...caseRecord.judicialDecisions] : [];
    const storeIdx = findJudicialDecisionStoreIndex(list, sealed);
    const nextList =
        storeIdx >= 0
            ? list.map((d, i) => {
                  if (i !== storeIdx) return d;
                  const prior = list[storeIdx]!;
                  return {
                      ...sealed,
                      id: prior.id,
                      sourceRequestId: sealed.sourceRequestId ?? prior.sourceRequestId,
                      appeals: mergeJudicialDecisionAppeals(prior.appeals, sealed.appeals),
                      isLocked: true,
                  };
              })
            : [...list, sealed];
    return { ...caseRecord, judicialDecisions: coalesceJudicialDecisions(nextList) };
}

/** يستبعد أحداث التايم لاين التجريبية/الميتة عند التحميل من التخزين المحلي. */
function mapDecisionStatusToDefendantStatus(status: StageConclusion['defendantStatusAtDecision']): DefendantStatus {
    if (status === 'detained') return 'موقوف';
    if (status === 'fugitive') return 'هارب';
    return 'مكفل';
}

const criminalPersistStorage = createCriminalStorePersistStorage<CriminalStoreState>();

export const useCriminalStore = create<CriminalStoreState>()(
    persist(
        (set, get) => ({
            draft: makeInitialDraft(),
            casesById: {},
            pendingSeveranceContext: null,
            setBasicField: (key, value) =>
                set((state) => {
                    if (key === 'ourRepresentation') {
                        const rep = value as OurRepresentation | '';
                        return {
                            draft: {
                                ...state.draft,
                                basics: {
                                    ...state.draft.basics,
                                    ourRepresentation: rep,
                                    role: legacyRoleFromRepresentation(rep),
                                },
                            },
                        };
                    }
                    if (key !== 'stage') {
                        return { draft: { ...state.draft, basics: { ...state.draft.basics, [key]: value } } };
                    }
                    const nextStage = value as CriminalCaseStage | '';
                    const nextLocation = makeEmptyLocation();
                    return {
                        draft: {
                            ...state.draft,
                            basics: { ...state.draft.basics, stage: nextStage },
                            location: nextLocation,
                        },
                    };
                }),
            setLocationField: (key, value) =>
                set((state) => ({
                    draft: { ...state.draft, location: { ...state.draft.location, [key]: value } },
                })),
            setDraftArticle3Offense: (value) =>
                set((state) => ({
                    draft: {
                        ...state.draft,
                        isArticle3Offense: value === true,
                        crimeDiscoveryDate: value === true ? String((state.draft as any).crimeDiscoveryDate ?? '') : '',
                    },
                })),
            setDraftMutualComplaint: (value) =>
                set((state) => {
                    if (state.draft.isPublicProsecutionComplainant === true) return state;
                    const mutual = value === true;
                    const complainants = (Array.isArray(state.draft.complainants)
                        ? state.draft.complainants
                        : []
                    ).map((c) => {
                        const {
                            counterComplaintTargetDefendantIds: _targets,
                            isCrossComplaint: _cross,
                            ...rest
                        } = c;
                        return rest;
                    });
                    return {
                        draft: {
                            ...state.draft,
                            isMutualComplaint: mutual,
                            complainants,
                        },
                    };
                }),
            setDraftPublicProsecutionComplainant: (value) =>
                set((state) => {
                    const enabled = value === true;
                    if (!enabled) {
                        const onlyPublic =
                            state.draft.complainants.length === 1 &&
                            isPublicRightComplainantName(state.draft.complainants[0]?.fullName);
                        return {
                            draft: {
                                ...state.draft,
                                isPublicProsecutionComplainant: false,
                                complainants: onlyPublic
                                    ? [makeEmptyComplainant()]
                                    : state.draft.complainants,
                            },
                        };
                    }
                    return {
                        draft: {
                            ...state.draft,
                            isPublicProsecutionComplainant: true,
                            articleIncludesPublicRight: false,
                            isMutualComplaint: false,
                            complainants: [makePublicRightComplainant()],
                        },
                    };
                }),
            setDraftArticleIncludesPublicRight: (value) =>
                set((state) => {
                    if (state.draft.isPublicProsecutionComplainant === true) return state;
                    return {
                        draft: {
                            ...state.draft,
                            articleIncludesPublicRight: value === true,
                        },
                    };
                }),
            setDraftCrimeDiscoveryDate: (value) =>
                set((state) => ({
                    draft: {
                        ...state.draft,
                        crimeDiscoveryDate: String(value ?? ''),
                    },
                })),
            addComplainant: () =>
                set((state) => ({
                    draft: { ...state.draft, complainants: [...state.draft.complainants, makeEmptyComplainant()] },
                })),
            deleteComplainant: (id) =>
                set((state) => {
                    const list = Array.isArray(state.draft.complainants) ? state.draft.complainants : [];
                    if (list.length <= 1) return state;
                    const next = list.filter((c) => c.id !== id);
                    if (next.length === list.length) return state;
                    const pruned = pruneCounterComplaintTargetsAfterPartyRemoval(next, id);
                    return {
                        draft: syncDraftOfficeRepresentation({
                            ...state.draft,
                            complainants: pruned.length ? pruned : [makeEmptyComplainant()],
                        }),
                    };
                }),
            toggleDraftComplainantOfficeClient: (id, next) =>
                set((state) => ({
                    draft: applyComplainantOfficeClientToggle(state.draft, id, next),
                })),
            setDraftComplainantCounterComplaintTargets: (complainantId, targetDefendantIds) =>
                set((state) => {
                    const cid = String(complainantId ?? '').trim();
                    if (!cid) return state;
                    return {
                        draft: {
                            ...state.draft,
                            complainants: state.draft.complainants.map((c) =>
                                c.id === cid
                                    ? {
                                          ...c,
                                          counterComplaintTargetDefendantIds:
                                              targetDefendantIds === undefined
                                                  ? undefined
                                                  : (Array.isArray(targetDefendantIds)
                                                        ? targetDefendantIds
                                                        : []
                                                    )
                                                          .map((id) => String(id ?? '').trim())
                                                          .filter(Boolean),
                                      }
                                    : c,
                            ),
                        },
                    };
                }),
            setComplainantField: (id, key, value) =>
                set((state) => ({
                    draft: {
                        ...state.draft,
                        complainants: state.draft.complainants.map((c) => (c.id === id ? { ...c, [key]: value } : c)),
                    },
                })),
            updateCaseComplainantJuvenile: (caseId, complainantId, data) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const list = Array.isArray(target.complainants) ? target.complainants : [];
                    const hasTarget = list.some((c) => c.id === complainantId);
                    if (!hasTarget) return state;

                    const nextIsJuvenile = typeof (data as any)?.isJuvenile === 'boolean' ? (data as any).isJuvenile : null;
                    const nextBirthDate = typeof (data as any)?.birthDate === 'string' ? String((data as any).birthDate) : null;
                    const nextGuardianName = typeof (data as any)?.guardianName === 'string' ? String((data as any).guardianName) : null;
                    const nextGuardianRelationship =
                        typeof (data as any)?.guardianRelationship === 'string'
                            ? String((data as any).guardianRelationship)
                            : null;

                    const next = list.map((c) => {
                        if (c.id !== complainantId) return c;
                        const patched: CriminalComplainant = {
                            ...c,
                            isJuvenile: nextIsJuvenile === null ? Boolean((c as any).isJuvenile) : nextIsJuvenile,
                            birthDate: nextBirthDate === null ? String((c as any).birthDate ?? '') : nextBirthDate,
                            guardianName: nextGuardianName === null ? String((c as any).guardianName ?? '') : nextGuardianName,
                            guardianRelationship:
                                nextGuardianRelationship === null
                                    ? String((c as any).guardianRelationship ?? '')
                                    : nextGuardianRelationship,
                        };
                        if (nextIsJuvenile === false) {
                            patched.guardianName = '';
                            patched.guardianRelationship = '';
                            patched.birthDate = '';
                        }
                        return patched;
                    });

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, complainants: next },
                        },
                    };
                }),
            setUnknownDefendant: (value) =>
                set((state) => {
                    if (value) {
                        const current = Array.isArray(state.draft.defendants) ? state.draft.defendants : [];
                        const unknowns = current.filter((d) => isDefendantIdentityUnknown(d));
                        const identified = current.filter(
                            (d) => !isDefendantIdentityUnknown(d) && !isEmptyDefendantShell(d),
                        );
                        const juvenileCtx = inferUnknownDefendantJuvenileContext(current);
                        const nextUnknowns =
                            unknowns.length > 0
                                ? unknowns
                                : [
                                      makeUnknownIdentityDefendant(
                                          nextUnknownDefendantIndex(current),
                                          { isJuvenile: juvenileCtx },
                                      ),
                                  ];
                        return {
                            draft: {
                                ...state.draft,
                                unknownDefendant: true,
                                defendants: [...identified, ...nextUnknowns],
                            },
                        };
                    }
                    const current = Array.isArray(state.draft.defendants) ? state.draft.defendants : [];
                    const identified = current.filter((d) => !isDefendantIdentityUnknown(d));
                    return {
                        draft: {
                            ...state.draft,
                            unknownDefendant: false,
                            defendants: identified.length ? identified : [makeEmptyDefendant()],
                        },
                    };
                }),
            addUnknownDefendant: () =>
                set((state) => {
                    const raw = Array.isArray(state.draft.defendants) ? state.draft.defendants : [];
                    const juvenileCtx = inferUnknownDefendantJuvenileContext(raw);
                    const next = [
                        ...raw,
                        makeUnknownIdentityDefendant(nextUnknownDefendantIndex(raw), {
                            isJuvenile: juvenileCtx,
                        }),
                    ];
                    const hasNamedIdentified = getIdentifiedDefendants(next).some((d) =>
                        resolveDefendantFullName(d),
                    );
                    let basics = state.draft.basics;
                    if (!hasNamedIdentified && !isInvestigationStoredStage(String(basics.stage ?? '').trim())) {
                        basics = { ...basics, stage: 'مرحلة التحقيق' };
                    }
                    return {
                        draft: {
                            ...state.draft,
                            basics,
                            defendants: syncUnknownDefendantsJuvenileContext(
                                pruneEmptyDefendantShells(next),
                            ),
                            unknownDefendant: hasUnrevealedUnknownDefendants(next),
                        },
                    };
                }),
            toggleDraftDefendantIdentityUnknown: (defendantId, unknown) =>
                set((state) => {
                    const id = String(defendantId ?? '').trim();
                    if (!id) return state;
                    const raw = Array.isArray(state.draft.defendants) ? state.draft.defendants : [];
                    const hit = raw.find((d) => d.id === id);
                    if (!hit) return state;

                    if (unknown) {
                        if (isDefendantIdentityUnknown(hit)) return state;
                        if (!canMarkDraftDefendantAsUnknown(raw, id)) return state;
                        const juvenileCtx = inferUnknownDefendantJuvenileContext(raw);
                        const idx = nextUnknownDefendantIndex(raw);
                        const next = raw.map((d) =>
                            d.id === id
                                ? convertIdentifiedDefendantToUnknown(d, idx, { isJuvenile: juvenileCtx })
                                : d,
                        );
                        return {
                            draft: {
                                ...state.draft,
                                defendants: syncUnknownDefendantsJuvenileContext(
                                    pruneEmptyDefendantShells(next),
                                ),
                                unknownDefendant: hasUnrevealedUnknownDefendants(next),
                            },
                        };
                    }

                    if (!isDefendantIdentityUnknown(hit)) return state;
                    const next = raw.map((d) =>
                        d.id === id ? convertUnknownDefendantToIdentifiedShell(d) : d,
                    );
                    return {
                        draft: {
                            ...state.draft,
                            defendants: next,
                            unknownDefendant: hasUnrevealedUnknownDefendants(next),
                        },
                    };
                }),
            revealDefendantIdentity: (caseId, defendantId, payload) => {
                const errMsg = validateRevealDefendantIdentityPayload(payload);
                if (errMsg) return errMsg;
                let blockingError: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId] as CriminalCase | undefined;
                    if (!target || caseMutationBlocked(target)) {
                        blockingError = 'تعذّر كشف الهوية.';
                        return state;
                    }
                    const id = String(defendantId ?? '').trim();
                    const defs = Array.isArray(target.defendants) ? target.defendants : [];
                    if (!defs.some((d) => d.id === id)) {
                        blockingError = 'المتهم غير موجود في الإضبارة.';
                        return state;
                    }
                    const fullName = String(payload.fullName ?? '').trim();
                    const revealIsUnderSeven = payload.isUnderSeven === true;
                    const revealIsJuvenile = payload.isJuvenile === true && !revealIsUnderSeven;
                    const nextDefendants = pruneEmptyDefendantShells(
                        defs.map((d) => {
                            if (d.id !== id) return normalizeDefendantPersonalFields(d);
                            const revealed: CriminalDefendant = {
                                ...d,
                                isIdentityUnknown: false,
                                fullName,
                                address: String(payload.address ?? d.address ?? '').trim(),
                                birthYear: String(payload.birthYear ?? d.birthYear ?? '').trim(),
                                isJuvenile: revealIsJuvenile,
                                isUnderSeven: revealIsUnderSeven,
                                birthDate:
                                    payload.birthDate !== undefined
                                        ? String(payload.birthDate ?? '').trim()
                                        : d.birthDate,
                                guardianName:
                                    payload.guardianName !== undefined
                                        ? String(payload.guardianName ?? '').trim()
                                        : d.guardianName,
                                guardianRelationship:
                                    payload.guardianRelationship !== undefined
                                        ? String(payload.guardianRelationship ?? '').trim()
                                        : d.guardianRelationship,
                            };
                            if (revealIsUnderSeven) {
                                revealed.status = '';
                                revealed.detentionAuthority = '';
                                revealed.detentionExpiryDate = '';
                                revealed.guarantorDetails = undefined;
                                revealed.socialInquiryReport = undefined;
                            } else if (payload.status !== undefined) {
                                revealed.status = payload.status;
                            }
                            if (!revealIsJuvenile && !revealIsUnderSeven) {
                                revealed.guardianName = '';
                                revealed.guardianRelationship = '';
                                revealed.birthDate = '';
                                revealed.socialInquiryReport = undefined;
                            } else if (revealIsJuvenile) {
                                revealed.socialInquiryReport =
                                    d.socialInquiryReport ?? {
                                        isAttached: false,
                                        workflowStatus: 'not_requested' as const,
                                        receivedDate: '',
                                        investigatorName: '',
                                        recommendations: '',
                                    };
                            }
                            return normalizeDefendantPersonalFields(revealed);
                        }),
                    );
                    const nextCase = syncJuvenileInvestigationCaseFlags(
                        syncUnknownDefendantCaseFlag(
                            { ...target, defendants: nextDefendants },
                            nextDefendants,
                        ),
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
                return blockingError;
            },
            addDefendant: () =>
                set((state) => ({
                    draft: {
                        ...state.draft,
                        defendants: [...state.draft.defendants, makeEmptyDefendant()],
                    },
                })),
            deleteDefendant: (id) =>
                set((state) => {
                    const list = Array.isArray(state.draft.defendants) ? state.draft.defendants : [];
                    if (list.length <= 1) return state;
                    const next = list.filter((d) => d.id !== id);
                    if (next.length === list.length) return state;
                    const prunedComplainants = pruneCounterComplaintTargetsAfterPartyRemoval(
                        state.draft.complainants,
                        id,
                    );
                    return {
                        draft: syncDraftOfficeRepresentation({
                            ...state.draft,
                            complainants: prunedComplainants,
                            unknownDefendant: hasUnrevealedUnknownDefendants(next),
                            defendants: next.length ? next : [makeEmptyDefendant()],
                        }),
                    };
                }),
            toggleDraftDefendantOfficeClient: (id, next) =>
                set((state) => ({
                    draft: applyDefendantOfficeClientToggle(state.draft, id, next),
                })),
            setDefendantField: (id, key, value) =>
                set((state) => {
                    const nextDefendants = state.draft.defendants.map((d) => {
                        if (d.id !== id) return d;
                        const nextDefendant = { ...d, [key]: value };
                        if (key === 'status' && !requiresDetentionAuthority(nextDefendant.status)) {
                            nextDefendant.detentionAuthority = '';
                        }
                        if (key === 'status' && !requiresDetentionExpiryDate(nextDefendant.status)) {
                            nextDefendant.detentionExpiryDate = '';
                        }
                        if (key === 'status') {
                            const st = String(value ?? '').trim();
                            if (st === 'مكفل' && !nextDefendant.guarantorDetails) {
                                nextDefendant.guarantorDetails = makeEmptyGuarantorDetails();
                            } else if (st !== 'مكفل') {
                                nextDefendant.guarantorDetails = undefined;
                            }
                        }
                        return nextDefendant;
                    });
                    return {
                        draft: {
                            ...state.draft,
                            defendants: syncUnknownDefendantsJuvenileContext(nextDefendants),
                        },
                    };
                }),
            setDraftDefendantGuarantor: (defendantId, patch) =>
                set((state) => {
                    const id = String(defendantId ?? '').trim();
                    if (!id) return state;
                    const nextDefendants = state.draft.defendants.map((d) => {
                        if (d.id !== id) return d;
                        if (patch === null) return { ...d, guarantorDetails: undefined };
                        const current = normalizeGuarantorDetails(d.guarantorDetails) ?? makeEmptyGuarantorDetails();
                        const next: GuarantorDetails = { ...current, ...patch };
                        if (!next.bailAmount.trim() && !next.guarantorInfo.trim()) {
                            return { ...d, guarantorDetails: undefined };
                        }
                        return { ...d, guarantorDetails: next };
                    });
                    return { draft: { ...state.draft, defendants: nextDefendants } };
                }),
            updateCaseDefendantGuarantor: (caseId, defendantId, patch) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const id = String(defendantId ?? '').trim();
                    if (!id) return state;
                    const list = Array.isArray(target.defendants) ? target.defendants : [];
                    const nextDefendants = list.map((d) => {
                        if (d.id !== id) return d;
                        const current = normalizeGuarantorDetails(d.guarantorDetails) ?? makeEmptyGuarantorDetails();
                        const next: GuarantorDetails = { ...current, ...patch };
                        if (!next.bailAmount.trim() && !next.guarantorInfo.trim()) {
                            return { ...d, guarantorDetails: undefined };
                        }
                        return { ...d, guarantorDetails: next };
                    });
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, defendants: nextDefendants },
                        },
                    };
                }),
            updateCaseDefendantJuvenile: (caseId, defendantId, data) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const list = Array.isArray(target.defendants) ? target.defendants : [];
                    const hasTarget = list.some((d) => d.id === defendantId);
                    if (!hasTarget) return state;

                    const nextIsJuvenile = typeof (data as any)?.isJuvenile === 'boolean' ? (data as any).isJuvenile : null;
                    const nextBirthDate = typeof (data as any)?.birthDate === 'string' ? String((data as any).birthDate) : null;
                    const nextGuardianName = typeof (data as any)?.guardianName === 'string' ? String((data as any).guardianName) : null;
                    const nextGuardianRelationship =
                        typeof (data as any)?.guardianRelationship === 'string'
                            ? String((data as any).guardianRelationship)
                            : null;

                    const next = list.map((d) => {
                        if (d.id !== defendantId) return d;
                        const patched: CriminalDefendant = {
                            ...d,
                            isJuvenile: nextIsJuvenile === null ? Boolean((d as any).isJuvenile) : nextIsJuvenile,
                            birthDate: nextBirthDate === null ? String((d as any).birthDate ?? '') : nextBirthDate,
                            guardianName: nextGuardianName === null ? String((d as any).guardianName ?? '') : nextGuardianName,
                            guardianRelationship:
                                nextGuardianRelationship === null
                                    ? String((d as any).guardianRelationship ?? '')
                                    : nextGuardianRelationship,
                        };
                        if (nextIsJuvenile === false) {
                            patched.guardianName = '';
                            patched.guardianRelationship = '';
                            patched.birthDate = '';
                            patched.socialInquiryReport = undefined;
                        }
                        if (
                            nextIsJuvenile === true &&
                            requiresDetentionAuthority(patched.status) &&
                            !String(patched.detentionAuthority ?? '').trim()
                        ) {
                            patched.detentionAuthority = investigationJuvenileDetentionAuthorityLabel();
                        }
                        return patched;
                    });

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: syncJuvenileInvestigationCaseFlags({ ...target, defendants: next }),
                        },
                    };
                }),
            updateCaseDefendantAgeCategory: (caseId, defendantId, category) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const list = Array.isArray(target.defendants) ? target.defendants : [];
                    const hit = list.find((d) => d.id === defendantId);
                    if (!hit || isDefendantIdentityUnknown(hit)) return state;

                    const next = list.map((d) => {
                        if (d.id !== defendantId) return d;
                        if (category === 'adult') {
                            return {
                                ...d,
                                isJuvenile: false,
                                isUnderSeven: false,
                                guardianName: '',
                                guardianRelationship: '',
                                birthDate: '',
                                socialInquiryReport: undefined,
                            };
                        }
                        if (category === 'juvenile') {
                            const patched: CriminalDefendant = {
                                ...d,
                                isJuvenile: true,
                                isUnderSeven: false,
                            };
                            if (
                                requiresDetentionAuthority(patched.status) &&
                                !String(patched.detentionAuthority ?? '').trim()
                            ) {
                                patched.detentionAuthority = investigationJuvenileDetentionAuthorityLabel();
                            }
                            return patched;
                        }
                        return {
                            ...d,
                            isUnderSeven: true,
                            isJuvenile: false,
                            status: '' as DefendantStatus,
                            detentionAuthority: '',
                            detentionExpiryDate: '',
                            guarantorDetails: undefined,
                            guardianName: '',
                            guardianRelationship: '',
                            birthDate: '',
                            socialInquiryReport: undefined,
                        };
                    });

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: syncJuvenileInvestigationCaseFlags({ ...target, defendants: next }),
                        },
                    };
                }),
            updateJuvenileSocialInquiryReport: (caseId, defendantId, report) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const list = Array.isArray(target.defendants) ? target.defendants : [];
                    const hasTarget = list.some((d) => d.id === defendantId);
                    if (!hasTarget) return state;
                    const next = list.map((d) => {
                        if (d.id !== defendantId) return d;
                        if (!Boolean((d as any).isJuvenile)) return d;
                        const isAttached = (report as any)?.isAttached === true;
                        const receivedDate =
                            typeof (report as any)?.receivedDate === 'string' ? String((report as any).receivedDate) : '';
                        const investigatorName =
                            typeof (report as any)?.investigatorName === 'string'
                                ? String((report as any).investigatorName)
                                : '';
                        const recommendations =
                            typeof (report as any)?.recommendations === 'string'
                                ? String((report as any).recommendations)
                                : '';
                        const workflowRaw = String((report as any)?.workflowStatus ?? '').trim();
                        const workflowStatus: SocialInquiryWorkflowStatus | undefined = isValidSocialInquiryWorkflowStatus(
                            workflowRaw,
                        )
                            ? workflowRaw
                            : isAttached
                              ? 'submitted'
                              : undefined;
                        const attached = workflowStatus === 'submitted' || isAttached;
                        const nextReport: SocialInquiryReport = {
                            workflowStatus: workflowStatus ?? (attached ? 'submitted' : 'not_requested'),
                            isAttached: attached,
                            receivedDate: receivedDate.trim() ? receivedDate : undefined,
                            investigatorName: investigatorName.trim() ? investigatorName : undefined,
                            recommendations: recommendations.trim() ? recommendations : undefined,
                        };
                        return { ...d, socialInquiryReport: nextReport };
                    });
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, defendants: next },
                        },
                    };
                }),
            addStatement: (caseId, statement) =>
                set((state) => {
                    const target = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                    if (!target) return state;
                    const result = applyStatementInsertion(target, statement);
                    if (!result.ok) return state;
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: result.nextCase,
                        },
                    };
                }),
            addOtherEvidenceItem: (caseId, item) => {
                let err: string | null = null;
                set((state) => {
                    const target = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (otherEvidenceMutationBlocked(target)) {
                        err = 'لا يمكن إضافة أدلة — الإضبارة مؤرشفة أو مضمومة.';
                        return state;
                    }
                    const evidenceType = String(item.evidenceType ?? '').trim();
                    if (!evidenceType) {
                        err = 'نوع الدليل مطلوب.';
                        return state;
                    }
                    const notes = String(item.notes ?? '').trim();
                    const nodeId = resolveCurrentJourneyNodeId(target.stageJourney);
                    const stamped = stampProceduralNodeId(
                        {
                            id: String(item.id ?? createId()),
                            evidenceType,
                            isLinkedToDossier: item.isLinkedToDossier === true,
                            attachmentDate:
                                item.isLinkedToDossier === true && String(item.attachmentDate ?? '').trim()
                                    ? String(item.attachmentDate).trim()
                                    : undefined,
                            notes,
                            createdAt: new Date().toISOString().slice(0, 10),
                        } as OtherEvidenceItem,
                        nodeId,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                otherEvidenceItems: [
                                    ...(Array.isArray(target.otherEvidenceItems) ? target.otherEvidenceItems : []),
                                    stamped,
                                ],
                            },
                        },
                    };
                });
                return err;
            },
            removeOtherEvidenceItem: (caseId, itemId) => get().moveOtherEvidenceToTrash(caseId, itemId),
            moveOtherEvidenceToTrash: (caseId, itemId) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (otherEvidenceMutationBlocked(target)) {
                        err = 'لا يمكن حذف الدليل — الإضبارة مؤرشفة أو مضمومة.';
                        return state;
                    }
                    const list = Array.isArray(target.otherEvidenceItems) ? target.otherEvidenceItems : [];
                    const doomed = list.find((it) => it.id === itemId);
                    if (!doomed) {
                        err = 'الدليل غير موجود.';
                        return state;
                    }
                    const next = list.filter((it) => it.id !== itemId);
                    const nextCase = appendCaseTrashItem(
                        { ...target, otherEvidenceItems: next },
                        'other_evidence',
                        doomed,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
                return err;
            },
            updateStatement: (caseId, statementId, updatedData) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const result = applyStatementUpdate(target, statementId, updatedData);
                    if (!result.ok) return state;
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: result.nextCase,
                        },
                    };
                }),
            addTimelineEvent: (caseId, event) =>
                set((state) => {
                    const target = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                    if (!target) return state;
                    const result = applyTimelineEventInsertion(target, event);
                    if (!result.ok) return state;
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: result.nextCase,
                        },
                    };
                }),
            deleteTimelineEvent: (caseId, eventId) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const list = Array.isArray(target.timelineEvents) ? target.timelineEvents : [];
                    const doomed = list.find((e) => e.id === eventId);
                    const journey = ensureStageJourneyOnCase(target).stageJourney ?? [];
                    const tenureNodeId = String((doomed as { proceduralNodeId?: string })?.proceduralNodeId ?? '').trim();
                    if (tenureNodeId && isJourneyTenureArchived(journey, tenureNodeId)) {
                        return state;
                    }
                    if (doomed && target.isInvestigationLocked && isLockedInvestigationTimelineEvent(doomed.category, doomed.type)) {
                        return state;
                    }
                    const next = list.filter((e) => e.id !== eventId);
                    if (next.length === list.length) return state;
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, timelineEvents: next },
                        },
                    };
                }),
            moveStatementToTrash: (caseId, statementId) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (statementMutationBlocked(target)) {
                        err = 'لا يمكن حذف الإفادة — الإضبارة مقفلة.';
                        return state;
                    }
                    const list = Array.isArray(target.statements) ? target.statements : [];
                    const doomed = list.find((s) => s.id === statementId);
                    if (!doomed) {
                        err = 'الإفادة غير موجودة.';
                        return state;
                    }
                    const next = list.filter((s) => s.id !== statementId);
                    const nextCase = appendCaseTrashItem({ ...target, statements: next }, 'statement', doomed);
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
                return err;
            },
            deleteStatement: (caseId, statementId) => {
                get().moveStatementToTrash(caseId, statementId);
            },
            addInvestigationLog: (caseId, log) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const result = applyInvestigationLogInsertion(target, log);
                    if (!result.ok) return state;
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: result.nextCase,
                        },
                    };
                }),
            updateInvestigationLog: (caseId, logId, updatedData) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const result = applyInvestigationLogUpdate(target, logId, updatedData);
                    if (!result.ok) return state;
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: result.nextCase,
                        },
                    };
                }),
            completeInvestigationLetter: (caseId, logId, payload) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    const result = applyCompleteInvestigationLetter(target, logId, payload);
                    if (!result.ok) {
                        err = result.error;
                        return state;
                    }
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: result.nextCase,
                        },
                    };
                });
                return err;
            },
            updateInvestigationLogExhibitLifecycle: (caseId, logId, lifecycle) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    const result = applyInvestigationLogExhibitLifecycleUpdate(target, logId, lifecycle);
                    if (!result.ok) {
                        err = result.error;
                        return state;
                    }
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: result.nextCase,
                        },
                    };
                });
                return err;
            },
            moveInvestigationLogToTrash: (caseId, logId) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (investigationLogsMutationBlocked(target)) {
                        err = 'لا يمكن حذف السجل — الإضبارة مقفلة.';
                        return state;
                    }
                    const list = Array.isArray(target.investigationLogs) ? target.investigationLogs : [];
                    const doomed = list.find((l) => l.id === logId);
                    if (!doomed) {
                        err = 'السجل غير موجود.';
                        return state;
                    }
                    const next = list.filter((l) => l.id !== logId);
                    const nextCase = appendCaseTrashItem(
                        { ...target, investigationLogs: next },
                        'investigation_log',
                        doomed,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
                return err;
            },
            deleteInvestigationLog: (caseId, logId) => {
                get().moveInvestigationLogToTrash(caseId, logId);
            },
            setProceduralContainers: (caseId, containers) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                proceduralContainers: normalizeProceduralContainers(containers),
                            },
                        },
                    };
                }),
            addRootProceduralContainer: (caseId, input) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const title = String(input.title ?? '').trim();
                    if (!title) return state;
                    const container: ProceduralContainer = {
                        id: createProceduralId(),
                        title,
                        color: normalizeColor(input.color),
                        icon: normalizeIcon(input.icon),
                        parentId: null,
                        subItems: [],
                        pathStatus: 'active',
                    };
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                proceduralContainers: insertRootContainer(list, container),
                            },
                        },
                    };
                }),
            updateProceduralContainer: (caseId, containerId, patch) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    const next = mapContainerTree(list, (c) => {
                        if (c.id !== containerId) return c;
                        return {
                            ...c,
                            title:
                                patch.title !== undefined ? String(patch.title).trim() || c.title : c.title,
                            color: patch.color !== undefined ? normalizeColor(patch.color) : c.color,
                            icon: patch.icon !== undefined ? normalizeIcon(patch.icon) : c.icon,
                            collapsed: patch.collapsed !== undefined ? patch.collapsed === true : c.collapsed,
                            pathStatus:
                                c.parentId === null && patch.pathStatus !== undefined
                                    ? patch.pathStatus === 'completed'
                                        ? 'completed'
                                        : 'active'
                                    : c.pathStatus,
                            pathEndedAt:
                                c.parentId === null
                                    ? patch.pathEndedAt !== undefined
                                        ? String(patch.pathEndedAt).trim() || undefined
                                        : patch.pathStatus === 'active'
                                          ? undefined
                                          : c.pathEndedAt
                                    : undefined,
                        };
                    });
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, proceduralContainers: next },
                        },
                    };
                }),
            deleteProceduralContainer: (caseId, containerId) => {
                get().moveProceduralContainerToTrash(caseId, containerId);
            },
            moveProceduralContainerToTrash: (caseId, containerId) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن حذف المسار — الإضبارة مقفلة.';
                        return state;
                    }
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    const hit = findContainerInTree(list, containerId);
                    if (!hit) {
                        err = 'المسار غير موجود.';
                        return state;
                    }
                    const snapshot = JSON.parse(JSON.stringify(hit.container)) as ProceduralContainer;
                    const next = deleteContainerFromTree(list, containerId);
                    const nextCase = appendCaseTrashItem(
                        { ...target, proceduralContainers: next },
                        'procedural_container',
                        snapshot,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
                return err;
            },
            reorderRootProceduralContainers: (caseId, fromId, toId) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                proceduralContainers: reorderRootContainers(list, fromId, toId),
                            },
                        },
                    };
                }),
            addProceduralSubItem: (caseId, parentId, item) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    let next = list;
                    if (item.type === 'container') {
                        const title = String(item.container.title ?? '').trim();
                        if (!title) return state;
                        const child: ProceduralContainer = {
                            ...item.container,
                            id: item.container.id || createProceduralId(),
                            title,
                            color: normalizeColor(item.container.color),
                            icon: normalizeIcon(item.container.icon),
                            parentId,
                            branchRole: item.container.branchRole,
                            subItems: Array.isArray(item.container.subItems) ? item.container.subItems : [],
                        };
                        next = insertNestedContainer(list, parentId, child);
                    } else if (item.type === 'note') {
                        const title = String(item.title ?? '').trim();
                        if (!title) return state;
                        const link = normalizeProceduralItemLink(item.link);
                        const contextNote = String(item.contextNote ?? '').trim();
                        const legacyRef = String(item.contextRef ?? '').trim();
                        next = appendSubItem(list, parentId, {
                            type: 'note',
                            id: item.id || createProceduralId(),
                            title,
                            body: String(item.body ?? '').trim() || undefined,
                            tags: normalizeProceduralTags(item.tags),
                            isStarred: item.isStarred === true || undefined,
                            link,
                            contextNote: contextNote || (!link && legacyRef ? legacyRef : undefined),
                            contextRef: !link && legacyRef ? legacyRef : undefined,
                        });
                    } else if (item.type === 'action') {
                        const title = String(item.title ?? '').trim();
                        const date = String(item.date ?? '').trim();
                        if (!title || !date) return state;
                        const status =
                            item.status === 'done' || item.status === 'postponed'
                                ? item.status
                                : 'in_progress';
                        const link = normalizeProceduralItemLink(item.link);
                        const contextNote = String(item.contextNote ?? '').trim();
                        const legacyRef = String(item.contextRef ?? '').trim();
                        const followUpDate = normalizeFollowUpDate(item.followUpDate, status);
                        next = appendSubItem(list, parentId, {
                            type: 'action',
                            id: item.id || createProceduralId(),
                            title,
                            date,
                            status,
                            followUpDate,
                            tags: normalizeProceduralTags(item.tags),
                            isStarred: item.isStarred === true || undefined,
                            link,
                            contextNote: contextNote || (!link && legacyRef ? legacyRef : undefined),
                            contextRef: !link && legacyRef ? legacyRef : undefined,
                        });
                    } else {
                        return state;
                    }
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, proceduralContainers: next },
                        },
                    };
                }),
            updateProceduralSubItem: (caseId, parentId, itemId, patch) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                proceduralContainers: updateSubItemInTree(list, parentId, itemId, patch),
                            },
                        },
                    };
                }),
            deleteProceduralSubItem: (caseId, parentId, itemId) => {
                get().moveProceduralSubItemToTrash(caseId, parentId, itemId);
            },
            moveProceduralSubItemToTrash: (caseId, parentId, itemId) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن حذف العنصر — الإضبارة مقفلة.';
                        return state;
                    }
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    const containerHit = findContainerInTree(list, itemId);
                    if (containerHit) {
                        const snapshot = JSON.parse(JSON.stringify(containerHit.container)) as ProceduralContainer;
                        const next = deleteContainerFromTree(list, itemId);
                        const nextCase = appendCaseTrashItem(
                            { ...target, proceduralContainers: next },
                            'procedural_container',
                            snapshot,
                        );
                        return {
                            casesById: {
                                ...state.casesById,
                                [caseId]: nextCase,
                            },
                        };
                    }
                    const parent = findContainerInTree(list, parentId);
                    if (!parent) {
                        err = 'الحاوية الأم غير موجودة.';
                        return state;
                    }
                    const doomed = parent.container.subItems.find((it) => {
                        if (it.type === 'container') return it.container.id === itemId;
                        return it.id === itemId;
                    });
                    if (!doomed) {
                        err = 'العنصر غير موجود.';
                        return state;
                    }
                    const wrapped: ProceduralSubItemTrashSnapshot = {
                        parentContainerId: parentId,
                        item: JSON.parse(JSON.stringify(doomed)) as ProceduralSubItem,
                    };
                    const next = removeSubItemFromTree(list, parentId, itemId);
                    const nextCase = appendCaseTrashItem(
                        { ...target, proceduralContainers: next },
                        'procedural_sub_item',
                        wrapped,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
                return err;
            },
            duplicateProceduralSubItem: (caseId, parentId, itemId) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    const next = duplicateSubItemInTree(list, parentId, itemId);
                    if (!next) return state;
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, proceduralContainers: next },
                        },
                    };
                }),
            moveProceduralSubItem: (caseId, fromParentId, toParentId, itemId, toIndex) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                proceduralContainers: moveSubItemInTree(
                                    list,
                                    fromParentId,
                                    toParentId,
                                    itemId,
                                    toIndex,
                                ),
                            },
                        },
                    };
                }),
            moveProceduralContainer: (caseId, containerId, newParentId, toIndex) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                proceduralContainers: moveContainerInTree(
                                    list,
                                    containerId,
                                    newParentId,
                                    toIndex,
                                ),
                            },
                        },
                    };
                }),
            advanceProceduralActionPhase: (caseId, parentId, actionId, opts) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    const spawnTitle = String(opts?.spawnChildTitle ?? '').trim();
                    const next = advanceActionToNextPhase(list, parentId, actionId, {
                        spawnChildContainer: spawnTitle
                            ? {
                                  title: spawnTitle,
                                  color: opts?.spawnChildColor,
                                  icon: opts?.spawnChildIcon,
                              }
                            : undefined,
                    });
                    const audit = appendProceduralAudit(
                        normalizeProceduralCanvasAudit(target.proceduralCanvasAudit),
                        spawnTitle ? `انتقال مرحلة + حاوية: ${spawnTitle}` : 'انتقال مرحلة — إجراء منجز',
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, proceduralContainers: next, proceduralCanvasAudit: audit },
                        },
                    };
                }),
            recordProceduralCanvasAudit: (caseId, summary) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const audit = appendProceduralAudit(
                        normalizeProceduralCanvasAudit(target.proceduralCanvasAudit),
                        summary,
                    );
                    if (audit.length === normalizeProceduralCanvasAudit(target.proceduralCanvasAudit).length) {
                        return state;
                    }
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, proceduralCanvasAudit: audit },
                        },
                    };
                }),
            applyProceduralSandboxTemplate: (caseId, templateId) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    const added = buildSandboxTemplateRoots(templateId);
                    const tpl = SANDBOX_TEMPLATES.find((t) => t.id === templateId);
                    const audit = appendProceduralAudit(
                        normalizeProceduralCanvasAudit(target.proceduralCanvasAudit),
                        `قالب اختياري: ${tpl?.title ?? templateId}`,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                proceduralContainers: [...list, ...added],
                                proceduralCanvasAudit: audit,
                            },
                        },
                    };
                }),
            duplicateProceduralContainer: (caseId, containerId) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = normalizeProceduralContainers(target.proceduralContainers);
                    const hit = findContainerInTree(list, containerId);
                    if (!hit) return state;
                    const clone = cloneContainerWithNewIds(hit.container, hit.parent?.id ?? null);
                    if (!hit.parent) {
                        clone.pathStatus = 'active';
                        clone.pathEndedAt = undefined;
                    }
                    let next = list;
                    if (!hit.parent) {
                        const idx = list.findIndex((c) => c.id === containerId);
                        next = [...list];
                        next.splice(idx < 0 ? next.length : idx + 1, 0, clone);
                    } else {
                        next = insertNestedContainer(list, hit.parent.id, clone);
                    }
                    const audit = appendProceduralAudit(
                        normalizeProceduralCanvasAudit(target.proceduralCanvasAudit),
                        `نسخ حاوية: ${hit.container.title}`,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                proceduralContainers: next,
                                proceduralCanvasAudit: audit,
                            },
                        },
                    };
                }),
            addOrUpdateRequest: (caseId, request) =>
                set((state) => {
                    const target = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                    if (!target) return state;
                    if (caseMutationBlocked(target)) return state;
                    const list = Array.isArray(target.lawyerRequests) ? target.lawyerRequests : [];
                    const idx = list.findIndex((r) => r.id === request.id);
                    const nodeId = resolveCurrentJourneyNodeId(target.stageJourney);
                    const isNew = idx < 0;
                    const stampedReq = stampProceduralNodeId(
                        isNew
                            ? ({
                                  ...request,
                                  status: 'pending',
                                  judgeMargin: undefined,
                                  decisionDate: undefined,
                                  isLocked: false,
                                  decisionArchived: undefined,
                              } as LawyerRequest)
                            : request,
                        nodeId,
                    );
                    if (!isNew && (stampedReq.status !== 'pending' || stampedReq.isLocked)) {
                        return state;
                    }
                    const next = idx >= 0 ? list.map((r, i) => (i === idx ? stampedReq : r)) : [...list, stampedReq];
                    const isBailApproval =
                        request.status === 'approved' && /كفالة|إخلاء سبيل بكفالة/i.test(String(request.type ?? ''));
                    const rawIds = Array.isArray((request as any).defendantIds) ? (request as any).defendantIds : [];
                    const partyIds = Array.isArray(rawIds)
                        ? rawIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
                        : [];
                    const defendantIds = resolveProceduralDefendantIds(
                        Array.isArray(target.complainants) ? target.complainants : [],
                        Array.isArray(target.defendants) ? target.defendants : [],
                        partyIds,
                        target.isMutualComplaint === true,
                    );
                    const nextDefendants =
                        isBailApproval && defendantIds.length
                            ? (Array.isArray(target.defendants) ? target.defendants : []).map((d) => {
                                  if (!defendantIds.includes(d.id)) return d;
                                  const nextHistory = Array.isArray((d as any).detentionHistoryLog)
                                      ? ((d as any).detentionHistoryLog as DetentionHistory[])
                                      : [];
                                  const decisionDate = String((request as any).decisionDate ?? request.requestDate ?? '').trim();
                                  const closeDate = decisionDate || new Date().toISOString().slice(0, 10);
                                  const openIdx = (() => {
                                      for (let i = nextHistory.length - 1; i >= 0; i--) {
                                          const it = nextHistory[i] as any;
                                          if (it && typeof it === 'object' && !String(it.endDate ?? '').trim()) return i;
                                      }
                                      return -1;
                                  })();
                                  const updatedHistory =
                                      openIdx >= 0
                                          ? nextHistory.map((h, i) => (i === openIdx ? { ...h, endDate: closeDate } : h))
                                          : nextHistory;
                                  const nextDef = { ...d, status: 'bailed_pending_appeal' as DefendantStatus, detentionHistoryLog: updatedHistory };
                                  if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                                  if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                                  return nextDef;
                              })
                            : target.defendants;
                    let nextCase: CriminalCase = {
                        ...target,
                        defendants: nextDefendants,
                        lawyerRequests: next,
                    };
                    nextCase = upsertJudicialDecisionOnCase(nextCase, stampedReq);
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                }),
            createLawyerRequest: (caseId, input) => {
                const err = validateCreateLawyerRequestInput(input);
                if (err) return { error: err, requestId: null };
                const target = get().casesById[caseId] as CriminalCase | undefined;
                if (!target || caseMutationBlocked(target)) return { error: 'تعذّر تسجيل الطلب.', requestId: null };
                const resolved = resolveStoredRequestTypeFields(
                    input.proceduralTemplate,
                    String(input.customTypeName ?? ''),
                    input.isAppealable === true,
                );
                const detentionStart = String(input.detentionStartDate ?? '').trim();
                const detentionEnd = String(input.detentionEndDate ?? '').trim();
                const requestDate = String(input.requestDate).trim();
                const lawyerNote = String(input.lawyerNote).trim();
                const isJudicial = isJudicialDecisionTemplate(resolved.proceduralTemplate);
                if (isInvestigationSeveranceJudicialTemplate(resolved.proceduralTemplate)) {
                    return {
                        error: 'قرار تفريق الإضبارة يُكمَّل عبر مسار شطر الإضبارة — اختر المتهمين ثم «تنفيذ التفريق وإنشاء الإضبارة».',
                        requestId: null,
                    };
                }
                const requestedPartyIds = filterUnknownDefendantsFromPartyIds(
                    target.defendants,
                    input.defendantIds,
                );
                if (
                    Array.isArray(input.defendantIds) &&
                    input.defendantIds.length > requestedPartyIds.length &&
                    isDefendantTargetRequestTemplate(resolved.proceduralTemplate)
                ) {
                    return { error: UNKNOWN_DEFENDANT_ACTION_BLOCKED_MESSAGE, requestId: null };
                }
                if (
                    isJudicial &&
                    requiresInvestigationPurgeDefendantScope(resolved.proceduralTemplate) &&
                    resolveCaseStageFromRecord(target) === 'investigation'
                ) {
                    const purgeIds = resolveInvestigationClosureDefendantIds(target, {
                        id: 'pending',
                        requestDate,
                        type: resolved.type,
                        lawyerNote,
                        status: 'executed',
                        defendantIds: requestedPartyIds,
                        proceduralTemplate: resolved.proceduralTemplate,
                    });
                    if (!purgeIds.length) {
                        return {
                            error: 'حدّد متهماً واحداً على الأقل مشمولاً بقرار الغلق/الصلح/التفريق.',
                            requestId: null,
                        };
                    }
                }
                const legalArticleBasis = String(input.legalArticleBasis ?? '').trim() || undefined;
                const orderEnforcement = buildInitialOrderEnforcement(
                    resolved.proceduralTemplate,
                    legalArticleBasis ?? '',
                    input.enforcementKind,
                );
                const defendantBailPayload = (() => {
                    const b = input.defendantBail;
                    if (!b || (b.kind !== 'financial' && b.kind !== 'personal')) return undefined;
                    if (b.kind === 'financial') {
                        const amt = String(b.bailAmount ?? '').trim();
                        if (!amt) return undefined;
                        return { kind: 'financial' as const, bailAmount: amt };
                    }
                    const list = Array.isArray(b.guarantors) ? b.guarantors : [];
                    const guarantors: GuarantorPerson[] = list
                        .map((g, i) => ({
                            id: String(g?.id ?? '').trim() || `g_${Date.now()}_${i}`,
                            fullName: String(g?.fullName ?? '').trim(),
                        }))
                        .filter((g) => g.fullName.length > 0);
                    if (guarantors.length === 0) return undefined;
                    return { kind: 'personal' as const, guarantors };
                })();
                /**
                 * بيانات «حجز الأموال» المهيكلة — تُنظَّف وتُختصر على الأصناف ذات الوصف،
                 * ثم تُلتقط معرّفات للأصناف لإلصاقها بكل متهم لاحقاً.
                 */
                const assetSeizurePayload = (() => {
                    const s = input.assetSeizure;
                    if (!s || !Array.isArray(s.perDefendant) || s.perDefendant.length === 0) return undefined;
                    const cleaned = s.perDefendant
                        .map((entry) => {
                            const did = String(entry?.defendantId ?? '').trim();
                            if (!did) return null;
                            const assets: SeizedAsset[] = (Array.isArray(entry?.assets) ? entry.assets : [])
                                .map((a, i) => {
                                    const description = String(a?.description ?? '').trim();
                                    if (!description) return null;
                                    const out: SeizedAsset = {
                                        id: `${createId()}_${i}`,
                                        description,
                                        createdAt: new Date().toISOString(),
                                    };
                                    const ref = String(a?.referenceNumber ?? '').trim();
                                    if (ref) out.referenceNumber = ref;
                                    const dt = String(a?.seizureDate ?? '').trim();
                                    if (dt) out.seizureDate = dt;
                                    const notes = String(a?.notes ?? '').trim();
                                    if (notes) out.notes = notes;
                                    return out;
                                })
                                .filter((x): x is SeizedAsset => x !== null);
                            if (!assets.length) return null;
                            return { defendantId: did, assets };
                        })
                        .filter((x): x is { defendantId: string; assets: SeizedAsset[] } => x !== null);
                    if (!cleaned.length) return undefined;
                    return { perDefendant: cleaned };
                })();
                const request: LawyerRequest = {
                    id: createId(),
                    requestDate,
                    type: resolved.type,
                    lawyerNote,
                    status: isJudicial ? 'executed' : 'pending',
                    defendantIds: requestedPartyIds.length ? requestedPartyIds : undefined,
                    proceduralTemplate: resolved.proceduralTemplate,
                    isAppealable: resolved.isAppealable,
                    detentionStartDate: detentionStart || undefined,
                    detentionEndDate: detentionEnd || undefined,
                    legalArticleBasis: orderEnforcement?.legalArticleBasis ?? legalArticleBasis,
                    orderEnforcement,
                    referredCourtName: String(input.referredCourtName ?? '').trim() || undefined,
                    defendantBail: defendantBailPayload,
                    assetSeizure: assetSeizurePayload,
                    ...(isJudicial
                        ? {
                              isLocked: true,
                              decisionArchived: true,
                              judgeMargin: lawyerNote,
                              decisionDate: requestDate,
                          }
                        : {}),
                };
                if (isJudicial) {
                    set((state) => {
                        const t = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                        if (!t) return state;
                        const nodeId = resolveCurrentJourneyNodeId(t.stageJourney);
                        const stamped = stampProceduralNodeId(request, nodeId);
                        const reqs = Array.isArray(t.lawyerRequests) ? t.lawyerRequests : [];
                        let nextCase = applyLawyerRequestOutcomeOnCase(
                            { ...t, lawyerRequests: [...reqs, stamped] },
                            stamped,
                        );
                        /**
                         * إذا كان القرار «حجز الأموال» — نُلصق الأصناف بكل طرف هارب مُختار،
                         * ونُولّد سجلّاً واحداً في التايم لاين لكل طرف. نَحترم شرط «الهروب» حصراً.
                         *
                         * ⚖️ ازدواجية الصفة (شكوى متقابلة): إن كان perDefendant.defendantId يُطابق
                         *    مشتكياً متقابلاً، تُلصق الأصناف على حقل `accusedSeizedAssets`
                         *    داخل سجل المشتكي نفسه — لا نَنقل الكائن إلى مصفوفة المتهمين.
                         */
                        if (assetSeizurePayload) {
                            const caseIsMutual = (nextCase as { isMutualComplaint?: boolean }).isMutualComplaint === true;
                            const defendantsArr = Array.isArray(nextCase.defendants) ? nextCase.defendants : [];
                            const complainantsArr = Array.isArray(nextCase.complainants) ? nextCase.complainants : [];
                            const seizureEvents: TimelineEvent[] = [];
                            const stampToday = new Date().toISOString().slice(0, 10);
                            const updatedDefendants = defendantsArr.map((d) => {
                                const entry = assetSeizurePayload.perDefendant.find(
                                    (p) => p.defendantId === d.id,
                                );
                                if (!entry) return d;
                                if (d.status !== 'هارب') return d;
                                const stamp = entry.assets.map((a) => ({ ...a, sourceRequestId: stamped.id }));
                                const prevAssets = Array.isArray(d.seizedAssets) ? d.seizedAssets : [];
                                seizureEvents.push({
                                    id: createId(),
                                    date: stampToday,
                                    type: 'decision',
                                    category: 'حجز الأموال',
                                    title: `حجز أموال على المتهم الهارب: ${String(d.fullName ?? '').trim() || '—'}`,
                                    description: stamp.map((a) => `• ${a.description}`).join('\n'),
                                    defendantIds: [d.id],
                                });
                                return { ...d, seizedAssets: [...prevAssets, ...stamp] };
                            });
                            const updatedComplainants = complainantsArr.map((c) => {
                                const entry = assetSeizurePayload.perDefendant.find(
                                    (p) => p.defendantId === c.id,
                                );
                                if (!entry) return c;
                                const isAccused =
                                    caseIsMutual ||
                                    (c as { isCrossComplaint?: boolean }).isCrossComplaint === true;
                                if (!isAccused) return c;
                                if ((c as { accusedStatus?: string }).accusedStatus !== 'هارب') return c;
                                const stamp = entry.assets.map((a) => ({ ...a, sourceRequestId: stamped.id }));
                                const prevAssets = Array.isArray(
                                    (c as { accusedSeizedAssets?: SeizedAsset[] }).accusedSeizedAssets,
                                )
                                    ? ((c as { accusedSeizedAssets?: SeizedAsset[] }).accusedSeizedAssets as SeizedAsset[])
                                    : [];
                                seizureEvents.push({
                                    id: createId(),
                                    date: stampToday,
                                    type: 'decision',
                                    category: 'حجز الأموال (شكوى متقابلة)',
                                    title: `حجز أموال على المشتكي الهارب: ${String(c.fullName ?? '').trim() || '—'}`,
                                    description: stamp.map((a) => `• ${a.description}`).join('\n'),
                                    complainantIds: [c.id],
                                });
                                return { ...c, accusedSeizedAssets: [...prevAssets, ...stamp] };
                            });
                            const prevEvents = Array.isArray(nextCase.timelineEvents) ? nextCase.timelineEvents : [];
                            nextCase = {
                                ...nextCase,
                                defendants: updatedDefendants,
                                complainants: updatedComplainants,
                                timelineEvents: seizureEvents.length
                                    ? [...prevEvents, ...seizureEvents]
                                    : prevEvents,
                            };
                        }
                        return { casesById: { ...state.casesById, [caseId]: nextCase } };
                    });
                } else {
                    get().addOrUpdateRequest(caseId, request);
                }
                return { error: null, requestId: request.id };
            },
            finalizeLawyerRequest: (caseId, requestId, input) => {
                const target = get().casesById[caseId] as CriminalCase | undefined;
                if (!target || caseMutationBlocked(target)) return 'تعذّر حفظ هامش القاضي.';
                const list = Array.isArray(target.lawyerRequests) ? target.lawyerRequests : [];
                const current = list.find((r) => r.id === requestId);
                if (!current) return 'الطلب غير موجود.';
                const err = validateFinalizeLawyerRequestInput(input, current.requestDate);
                if (err) return err;
                if (current.status === 'executed') return 'قرار نافذ — لا يُعدَّل عبر مسار الطلب.';
                if (!isLawyerRequestPending(current)) return 'الطلب ليس قيد النظر أو مُقفلاً مسبقاً.';
                const decisionDate = String(input.decisionDate).trim();
                const requestDate = String(current.requestDate ?? '').trim();
                set((state) => {
                    const t = state.casesById[caseId] as CriminalCase | undefined;
                    if (!t) return state;
                    const reqs = Array.isArray(t.lawyerRequests) ? t.lawyerRequests : [];
                    const idx = reqs.findIndex((r) => r.id === requestId);
                    if (idx < 0) return state;
                    const finalStatus: LawyerRequest['status'] =
                        input.status === 'approved' ? 'approved' : 'rejected';
                    const nextRequest: LawyerRequest = {
                        ...reqs[idx]!,
                        status: finalStatus,
                        judgeMargin: String(input.judgeMargin).trim(),
                        decisionDate,
                        isLocked: true,
                        decisionArchived: true,
                    };
                    const next = reqs.map((r, i) => (i === idx ? nextRequest : r));
                    const nextCase = applyLawyerRequestOutcomeOnCase({ ...t, lawyerRequests: next }, nextRequest);
                    return { casesById: { ...state.casesById, [caseId]: nextCase } };
                });
                const type = String(current.type ?? '').trim();
                const isWaiverDecision =
                    /صلح/.test(type) && /تنازل/.test(type) && /حق شخصي|الحق الشخصي/.test(type);
                if (isWaiverDecision && input.status === 'approved') {
                    get().waivePrivateRight(caseId, decisionDate || requestDate);
                }
                return null;
            },
            extendDetentionOnDecision: (caseId, decisionId, newEndDate) => {
                const target = get().casesById[caseId] as CriminalCase | undefined;
                if (!target || caseMutationBlocked(target)) return 'تعذّر تحديث التوقيف.';
                const merged = resolveJudicialDecisionsForCase(target);
                const hit = merged.find((d) => d.id === decisionId || `jd_${d.sourceRequestId}` === decisionId);
                if (!hit || !isDetentionDecisionTemplate(hit.proceduralTemplate ?? hit.title)) {
                    return 'قرار التوقيف غير موجود.';
                }
                if (hit.detentionReleasedAt) return 'البطاقة مغلقة — تم توثيق إطلاق السراح.';
                const err = validateDetentionExtensionEnd(String(hit.detentionEndDate ?? ''), newEndDate);
                if (err) return err;
                const end = String(newEndDate).trim();
                set((state) => {
                    const t = state.casesById[caseId] as CriminalCase | undefined;
                    if (!t) return state;
                    const patched = patchDetentionDecisionOnCase(t, decisionId, { detentionEndDate: end }, hit);
                    if (!patched) return state;
                    const partyIds = resolveDecisionPartyIds(hit, patched);
                    const nextDefendants =
                        partyIds.length && Array.isArray(patched.defendants)
                            ? patched.defendants.map((d) =>
                                  partyIds.includes(d.id) ? { ...d, detentionExpiryDate: end } : d,
                              )
                            : patched.defendants;
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...patched, defendants: nextDefendants },
                        },
                    };
                });
                return null;
            },
            documentDetentionReleaseOnDecision: (caseId, decisionId) => {
                const target = get().casesById[caseId] as CriminalCase | undefined;
                if (!target || caseMutationBlocked(target)) return 'تعذّر توثيق إطلاق السراح.';
                const merged = resolveJudicialDecisionsForCase(target);
                const hit = merged.find((d) => d.id === decisionId || `jd_${d.sourceRequestId}` === decisionId);
                if (!hit) return 'قرار التوقيف غير موجود.';
                if (hit.detentionReleasedAt) return null;
                const partyIds = resolveDecisionPartyIds(hit, target);
                if (!partyIds.length) return 'حدد المتهم المرتبط بالتوقيف.';
                const releasedAt = new Date().toISOString().slice(0, 10);
                set((state) => {
                    const t = state.casesById[caseId] as CriminalCase | undefined;
                    if (!t) return state;
                    let next = patchDetentionDecisionOnCase(t, decisionId, { detentionReleasedAt: releasedAt }, hit);
                    if (!next) return state;
                    const resolvedIds = resolveProceduralDefendantIds(
                        Array.isArray(next.complainants) ? next.complainants : [],
                        Array.isArray(next.defendants) ? next.defendants : [],
                        partyIds,
                        next.isMutualComplaint === true,
                    );
                    const nextDefendants = (Array.isArray(next.defendants) ? next.defendants : []).map((d) => {
                        if (!resolvedIds.includes(d.id)) return d;
                        const nextDef = { ...d, status: 'مكفل' as DefendantStatus };
                        if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                        if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                        return nextDef;
                    });
                    next = { ...next, defendants: nextDefendants };
                    return { casesById: { ...state.casesById, [caseId]: next } };
                });
                return null;
            },
            updateOrderEnforcementOnDecision: (caseId, decisionId, patch) => {
                const target = get().casesById[caseId] as CriminalCase | undefined;
                if (!target || caseMutationBlocked(target)) return 'تعذّر تحديث متابعة الأمر.';
                const merged = resolveJudicialDecisionsForCase(target);
                const hit = merged.find((d) => d.id === decisionId || `jd_${d.sourceRequestId}` === decisionId);
                if (!hit) return 'الأمر غير موجود في السجل.';
                set((state) => {
                    const t = state.casesById[caseId] as CriminalCase | undefined;
                    if (!t) return state;
                    const patched = patchOrderEnforcementOnCase(t, decisionId, patch, hit);
                    if (!patched) return state;
                    return { casesById: { ...state.casesById, [caseId]: patched } };
                });
                return null;
            },
            releaseDefendantsFromDetention: (caseId, defendantIds) => {
                const target = get().casesById[caseId] as CriminalCase | undefined;
                if (!target || caseMutationBlocked(target)) return 'تعذّر تحديث حالة المتهم.';
                const ids = defendantIds.map((x) => String(x ?? '').trim()).filter(Boolean);
                if (!ids.length) return 'حدد المتهم.';
                set((state) => {
                    const t = state.casesById[caseId] as CriminalCase | undefined;
                    if (!t) return state;
                    const resolvedIds = resolveProceduralDefendantIds(
                        Array.isArray(t.complainants) ? t.complainants : [],
                        Array.isArray(t.defendants) ? t.defendants : [],
                        ids,
                        t.isMutualComplaint === true,
                    );
                    const nextDefendants = (Array.isArray(t.defendants) ? t.defendants : []).map((d) => {
                        if (!resolvedIds.includes(d.id)) return d;
                        const nextDef = { ...d, status: 'مكفل' as DefendantStatus };
                        if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                        if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                        return nextDef;
                    });
                    return { casesById: { ...state.casesById, [caseId]: { ...t, defendants: nextDefendants } } };
                });
                return null;
            },
            updateLawyerRequest: (caseId, requestId, updatedData) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const list = Array.isArray(target.lawyerRequests) ? target.lawyerRequests : [];
                    const idx = list.findIndex((r) => r.id === requestId);
                    if (idx < 0) return state;
                    const current = list[idx];
                    if (current.isLocked === true || current.decisionArchived === true) {
                        return state;
                    }
                    if (!isLawyerRequestPending(current)) {
                        return state;
                    }
                    const patch = stripLawyerRequestDecisionPatch(updatedData);
                    const nextRequest = {
                        ...list[idx],
                        ...patch,
                        id: list[idx].id,
                    } as LawyerRequest;
                    const next = list.map((r, i) => (i === idx ? nextRequest : r));
                    const isBailApproval =
                        nextRequest.status === 'approved' && /كفالة|إخلاء سبيل بكفالة/i.test(String(nextRequest.type ?? ''));
                    const rawIds = Array.isArray((nextRequest as any).defendantIds) ? (nextRequest as any).defendantIds : [];
                    const partyIds = Array.isArray(rawIds)
                        ? rawIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
                        : [];
                    const defendantIds = resolveProceduralDefendantIds(
                        Array.isArray(target.complainants) ? target.complainants : [],
                        Array.isArray(target.defendants) ? target.defendants : [],
                        partyIds,
                        target.isMutualComplaint === true,
                    );
                    const nextDefendants =
                        isBailApproval && defendantIds.length
                            ? (Array.isArray(target.defendants) ? target.defendants : []).map((d) => {
                                  if (!defendantIds.includes(d.id)) return d;
                                  const nextDef = { ...d, status: 'bailed_pending_appeal' as DefendantStatus };
                                  if (!requiresDetentionAuthority(nextDef.status)) nextDef.detentionAuthority = '';
                                  if (!requiresDetentionExpiryDate(nextDef.status)) nextDef.detentionExpiryDate = '';
                                  return nextDef;
                              })
                            : target.defendants;
                    let nextCase: CriminalCase = { ...target, defendants: nextDefendants, lawyerRequests: next };
                    nextCase = upsertJudicialDecisionOnCase(nextCase, nextRequest);
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                }),
            fileJudicialDecisionAppeal: (caseId, decisionId, payload) => {
                const target = get().casesById[caseId] as CriminalCase | undefined;
                if (!target || cassationAppealMutationBlocked(target)) return 'تعذّر تسجيل الطعن التمييزي.';
                const decisions = resolveJudicialDecisionsForCase(target);
                const did = String(decisionId ?? '').trim();
                const merged = findJudicialDecisionByRef(decisions, did);
                if (!merged) return 'القرار غير موجود في السجل.';
                const appealPath: JudicialCassationAppealPath = payload.appealPath ?? 'ordinary';
                if (appealPath === 'ordinary') {
                const purgeTemplate = normalizeProceduralRequestTemplate(
                    merged.proceduralTemplate ?? merged.title,
                );
                if (isInvestigationPurgeDecisionTemplate(purgeTemplate)) {
                    if (resolveCaseStageFromRecord(target) !== 'investigation') {
                        return 'الطعن التمييزي غير متاح خارج مرحلة التحقيق.';
                    }
                    if (!investigationPurgeDecisionAllowsCassationAppeal(merged)) {
                        return 'هذا القرار لا يقبل طعناً تمييزياً.';
                    }
                }
                if (decisionAlreadyHasCassationAppeal(merged)) {
                    return 'تم تسجيل طعن تمييزي على هذا القرار مسبقاً — لا يجوز الطعن مرتين فيه.';
                }
                } else if (appealPath === 'intervention_264b') {
                    if (hasJudicialAppealBeenFiledOnPath(merged, 'intervention_264b')) {
                        return 'تم تسجيل طلب التدخل التمييزي على هذا القرار مسبقاً.';
                    }
                } else if (appealPath === 'correction_266') {
                    if (hasJudicialAppealBeenFiledOnPath(merged, 'correction_266')) {
                        return 'تم تسجيل طلب تصحيح القرار التمييزي مسبقاً.';
                    }
                }
                const appellantIds = (Array.isArray(payload.appellantIds) ? payload.appellantIds : [])
                    .map((x) => String(x ?? '').trim())
                    .filter(Boolean);
                const appellantManualLabel = String(payload.appellantManualLabel ?? '').trim();
                if (!appellantIds.length && !appellantManualLabel) {
                    return 'حدّد طرفاً واحداً على الأقل أو أدخل اسم من قام بالإجراء يدوياً.';
                }
                const filedAt = String(payload.filedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
                const targetDefendantIds = (
                    Array.isArray(payload.targetDefendantIds) ? payload.targetDefendantIds : appellantIds
                )
                    .map((x) => String(x ?? '').trim())
                    .filter(Boolean);
                const appeal = {
                    id: createId(),
                    appellantType: payload.appellantType,
                    appellantIds,
                    targetDefendantIds,
                    cassationStatus: 'pending' as const,
                    filedAt,
                    appellantManualLabel: appellantManualLabel || undefined,
                    appealPath,
                };
                const updated: JudicialDecision = {
                    ...merged,
                    appeals: [...(merged.appeals ?? []), appeal],
                    isAppealed: true,
                    interventionCassationPending:
                        appealPath === 'intervention_264b' ? true : merged.interventionCassationPending,
                    cassationCorrectionPending:
                        appealPath === 'correction_266' ? true : merged.cassationCorrectionPending,
                    cassationPapersReceivedAt:
                        appealPath === 'correction_266' && !merged.cassationPapersReceivedAt
                            ? filedAt
                            : merged.cassationPapersReceivedAt,
                };
                const list = Array.isArray(target.judicialDecisions) ? [...target.judicialDecisions] : [];
                const storeIdx = findJudicialDecisionStoreIndex(list, updated);
                const nextList =
                    storeIdx >= 0
                        ? list.map((d, i) =>
                              i === storeIdx ? { ...d, ...updated, id: d.id, appeals: updated.appeals } : d,
                          )
                        : [...list, updated];
                set((state) => ({
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            judicialDecisions: coalesceJudicialDecisions(nextList),
                        },
                    },
                }));
                return null;
            },
            declareJudicialDecisionFinal: (caseId, decisionId, payload) => {
                const target = get().casesById[caseId] as CriminalCase | undefined;
                if (!target) return 'الإضبارة غير موجودة.';
                const mergedList = resolveJudicialDecisionsForCase(target);
                const hit = findJudicialDecisionByRef(mergedList, String(decisionId ?? '').trim());
                if (!hit) return 'القرار غير موجود في السجل.';
                if (hit.isJudgmentFinalDeclared === true) return 'تم إعلان الحكم باتاً مسبقاً على هذا القرار.';
                const declarerIds = (Array.isArray(payload.declarerIds) ? payload.declarerIds : [])
                    .map((x) => String(x ?? '').trim())
                    .filter(Boolean);
                const declarerManualLabel = String(payload.declarerManualLabel ?? '').trim();
                if (!declarerIds.length && !declarerManualLabel) {
                    return 'حدّد من قام بإعلان الحكم باتاً.';
                }
                const declaredAt =
                    String(payload.declaredAt ?? '').trim() || new Date().toISOString().slice(0, 10);
                const patch: Partial<JudicialDecision> = {
                    isJudgmentFinalDeclared: true,
                    judgmentFinalDeclaredAt: declaredAt,
                    judgmentFinalDeclaredByLabel: declarerManualLabel || undefined,
                    judgmentFinalDeclaredByIds: declarerIds.length ? declarerIds : undefined,
                };
                const list = Array.isArray(target.judicialDecisions) ? [...target.judicialDecisions] : [];
                const storeIdx = findJudicialDecisionStoreIndex(list, hit);
                const nextList =
                    storeIdx >= 0
                        ? list.map((d, i) => (i === storeIdx ? { ...d, ...patch, id: d.id } : d))
                        : [...list, { ...hit, ...patch }];
                set((state) => ({
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            judicialDecisions: coalesceJudicialDecisions(nextList),
                        },
                    },
                }));
                return null;
            },
            patchJudicialDecisionLifecycle: (caseId, decisionId, patch) => {
                const target = get().casesById[caseId] as CriminalCase | undefined;
                if (!target) return 'الإضبارة غير موجودة.';
                const merged = resolveJudicialDecisionsForCase(target);
                const did = String(decisionId ?? '').trim();
                const hit = findJudicialDecisionByRef(merged, did);
                if (!hit) return 'القرار غير موجود في السجل.';
                const updated: JudicialDecision = { ...hit, ...patch };
                const list = Array.isArray(target.judicialDecisions) ? [...target.judicialDecisions] : [];
                const storeIdx = findJudicialDecisionStoreIndex(list, updated);
                const nextList =
                    storeIdx >= 0
                        ? list.map((d, i) => (i === storeIdx ? { ...d, ...patch, id: d.id } : d))
                        : [...list, updated];
                set((state) => ({
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...target,
                            judicialDecisions: coalesceJudicialDecisions(nextList),
                        },
                    },
                }));
                return null;
            },
            recordJudicialAppealResult: (caseId, decisionId, appealId, payload) => {
                const target0 = get().casesById[caseId] as CriminalCase | undefined;
                if (!target0 || cassationAppealMutationBlocked(target0)) return 'تعذّر تسجيل النتيجة.';
                let blockingError: string | null = null;
                set((state) => {
                    const target = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                    if (!target || cassationAppealMutationBlocked(target)) return state;
                    const decisions = resolveJudicialDecisionsForCase(target);
                    const did = String(decisionId ?? '').trim();
                    const aid = String(appealId ?? '').trim();
                    if (!payload.result) return state;

                    const beneficiaryIds =
                        payload.result === 'affirmation'
                            ? []
                            : payload.result === 'quash_dismissal'
                              ? (Array.isArray(payload.targetDefendantIds) ? payload.targetDefendantIds : [])
                                    .map((x) => String(x ?? '').trim())
                                    .filter(Boolean)
                              : (Array.isArray(payload.targetDefendantIds) ? payload.targetDefendantIds : [])
                                    .map((x) => String(x ?? '').trim())
                                    .filter(Boolean);

                    const decision = findJudicialDecisionByRef(decisions, did);
                    if (!decision) {
                        blockingError = 'القرار غير موجود في السجل.';
                        return state;
                    }
                    const purgeTemplate = normalizeProceduralRequestTemplate(
                        decision.proceduralTemplate ?? decision.title,
                    );
                    const isClosurePurge = isInvestigationPurgeDecisionTemplate(purgeTemplate);
                    const isStructuralCassation = isInvestigationStructuralCassationTemplate(purgeTemplate);
                    const isSeveranceDecision = isInvestigationSeveranceJudicialTemplate(purgeTemplate);
                    const isMergeDecision = isInvestigationMergeJudicialTemplate(purgeTemplate);
                    const concludedAt =
                        String(payload.date ?? '').trim() || new Date().toISOString().slice(0, 10);
                    const appealsList = Array.isArray(decision.appeals) ? decision.appeals : [];
                    if (isProceduralCassationResult(payload.result)) {
                        if (isStructuralCassation) {
                            const validationErr = validateInvestigationPurgeCassationResult(payload.result);
                            if (validationErr) {
                                blockingError = validationErr;
                                return state;
                            }
                        }
                        const appeals = appealsList.map((a) =>
                            a.id === aid
                                ? {
                                      ...a,
                                      result: payload.result,
                                      beneficiaryIds: undefined,
                                      cassationStatus: 'concluded' as const,
                                      cassationDirectives: payload.cassationDirectives,
                                      concludedAt,
                                      filedAt: a.filedAt ?? concludedAt,
                                  }
                                : a,
                        );
                        if (!appeals.some((a) => a.id === aid)) {
                            blockingError = 'الطعن التمييزي غير موجود على هذا القرار.';
                            return state;
                        }
                        const appealResultLabel = formatAppealResultLabel(String(payload.result ?? ''));
                        const isUphold = resolveAppealResultCategory(String(payload.result ?? '')) === 'upheld';
                        const updatedDecision: JudicialDecision = {
                            ...decision,
                            appeals,
                            isLocked: true,
                            isAppealed: true,
                            interventionCassationPending: false,
                            cassationCorrectionPending: false,
                            appealResult: appealResultLabel || undefined,
                            cassationPapersReceivedAt: isUphold
                                ? concludedAt
                                : decision.cassationPapersReceivedAt,
                        };
                        const concludedAppeal = appeals.find((a) => a.id === aid)!;

                        if (isStructuralCassation) {
                            if (payload.result === 'procedural_annulment') {
                                if (isSeveranceDecision) {
                                    const revertOutcome = revertSeveranceAfterCassationAnnulment(
                                        state.casesById,
                                        caseId,
                                        updatedDecision,
                                    );
                                    if (revertOutcome.error) {
                                        blockingError = revertOutcome.error;
                                        return state;
                                    }
                                    const sealedParent = persistSealedJudicialDecisionOnCase(
                                        revertOutcome.casesById[caseId] ?? target,
                                        updatedDecision,
                                    );
                                    return {
                                        casesById: {
                                            ...revertOutcome.casesById,
                                            [caseId]: sealedParent,
                                        },
                                    };
                                }
                                if (isMergeDecision) {
                                    const revertOutcome = revertCaseMergeAfterCassationAnnulment(
                                        state.casesById,
                                        caseId,
                                        updatedDecision,
                                    );
                                    if (revertOutcome.error) {
                                        blockingError = revertOutcome.error;
                                        return state;
                                    }
                                    const sealedParent = persistSealedJudicialDecisionOnCase(
                                        revertOutcome.casesById[caseId] ?? target,
                                        updatedDecision,
                                    );
                                    return {
                                        casesById: {
                                            ...revertOutcome.casesById,
                                            [caseId]: sealedParent,
                                        },
                                    };
                                }
                                if (isClosurePurge) {
                                    const restoreIds = resolvePurgeCassationRestoreDefendantIds(
                                        target,
                                        updatedDecision,
                                        concludedAppeal,
                                    );
                                    if (!restoreIds.length) {
                                        blockingError =
                                            'تعذّر تحديد المتهمين المُعادين — تحقق من نطاق القرار أو أهداف الطعن.';
                                        return state;
                                    }
                                }
                            }

                            let nextCase = persistSealedJudicialDecisionOnCase(target, updatedDecision);
                            if (isClosurePurge) {
                                nextCase = applyInvestigationPurgeAfterCassation(
                                    nextCase,
                                    updatedDecision,
                                    concludedAppeal,
                                );
                            }
                            return {
                                casesById: {
                                    ...state.casesById,
                                    [caseId]: nextCase,
                                },
                            };
                        }

                        let nextCase: CriminalCase = { ...target };
                        nextCase = applyProceduralCassationEffects(nextCase, decision, concludedAppeal, {
                            result: payload.result,
                            cassationDirectives: payload.cassationDirectives,
                            date: concludedAt,
                        });
                        nextCase = persistSealedJudicialDecisionOnCase(nextCase, updatedDecision);
                        nextCase = applyInvestigationPurgeAfterCassation(
                            nextCase,
                            updatedDecision,
                            concludedAppeal,
                        );
                        return {
                            casesById: {
                                ...state.casesById,
                                [caseId]: nextCase,
                            },
                        };
                    }

                    const appeals = appealsList.map((a) =>
                        a.id === aid
                            ? {
                                  ...a,
                                  result: payload.result,
                                  beneficiaryIds: beneficiaryIds.length ? beneficiaryIds : undefined,
                                  cassationStatus: 'concluded' as const,
                                  isObjectiveGrounds269b: payload.isObjectiveGrounds === true,
                                  remandTargetStage: payload.remandTargetStage,
                                  modifiedCharge: payload.modifiedCharge,
                                  modifiedArticle: payload.modifiedArticle,
                                  concludedAt,
                                  filedAt: a.filedAt ?? concludedAt,
                              }
                            : a,
                    );
                    if (!appeals.some((a) => a.id === aid)) {
                        blockingError = 'الطعن التمييزي غير موجود على هذا القرار.';
                        return state;
                    }
                    const appealResultLabel = formatAppealResultLabel(String(payload.result ?? ''));
                    const isUphold = resolveAppealResultCategory(String(payload.result ?? '')) === 'upheld';
                    const updatedDecision: JudicialDecision = {
                        ...decision,
                        appeals,
                        isLocked: true,
                        isAppealed: true,
                        interventionCassationPending: false,
                        cassationCorrectionPending: false,
                        appealResult: appealResultLabel || undefined,
                        cassationPapersReceivedAt: isUphold
                            ? concludedAt
                            : decision.cassationPapersReceivedAt,
                    };

                    const partyLabel = (id: string) => {
                        const def = (target.defendants ?? []).find((d) => d.id === id);
                        if (def) return String(def.fullName ?? '').trim() || '—';
                        const comp = (target.complainants ?? []).find((c) => c.id === id);
                        if (comp) return String(comp.fullName ?? '').trim() || '—';
                        return '—';
                    };
                    const concludedAppeal = appeals.find((a) => a.id === aid)!;
                    const badgeText = buildCassationHistoricalBadge(
                        concludedAppeal,
                        partyLabel,
                        decision.title,
                    );
                    const personalQuashTargets =
                        (payload.result === 'quash_dismissal' ||
                            payload.result === 'quash_remand' ||
                            payload.result === 'quash_modify') &&
                        !payload.isObjectiveGrounds;

                    let nextCase: CriminalCase = { ...target };

                    const virtualAppellants = (
                        Array.isArray(concludedAppeal.appellantIds) ? concludedAppeal.appellantIds : []
                    )
                        .concat(
                            Array.isArray(concludedAppeal.targetDefendantIds)
                                ? concludedAppeal.targetDefendantIds
                                : [],
                        )
                        .map((x) => String(x ?? '').trim())
                        .filter(Boolean);
                    const engineOutcome = recordCassationResult(nextCase, {
                        result: payload.result,
                        date: concludedAt,
                        details: badgeText ?? payload.details ?? '',
                        isObjectiveGrounds: payload.isObjectiveGrounds === true,
                        targetDefendantIds: personalQuashTargets
                            ? beneficiaryIds.length
                                ? beneficiaryIds
                                : undefined
                            : payload.targetDefendantIds,
                        remandTargetStage: payload.remandTargetStage,
                        modifiedCharge: payload.modifiedCharge,
                        modifiedArticle: payload.modifiedArticle,
                        virtualAppellantDefendantIds: [...new Set(virtualAppellants)],
                        suppressTimelineAppend: true,
                    });
                    if (engineOutcome.error) {
                        blockingError = engineOutcome.error;
                        return state;
                    }
                    nextCase = engineOutcome.caseRecord;
                    nextCase = persistSealedJudicialDecisionOnCase(nextCase, updatedDecision);
                    nextCase = applyInvestigationPurgeAfterCassation(nextCase, updatedDecision, concludedAppeal);

                    if (
                        shouldRestoreCourtAfterReferralQuash(
                            updatedDecision,
                            nextCase,
                            payload.result,
                        )
                    ) {
                        nextCase = restoreComplaintCourtReferralOnQuash(
                            nextCase,
                            String(updatedDecision.sourceRequestId ?? '').trim(),
                        );
                    }

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
                return blockingError;
            },
            moveLawyerRequestToTrash: (caseId, requestId) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن حذف الطلب — الإضبارة مقفلة.';
                        return state;
                    }
                    const list = Array.isArray(target.lawyerRequests) ? target.lawyerRequests : [];
                    const doomed = list.find((r) => r.id === requestId);
                    if (!doomed) {
                        err = 'الطلب غير موجود.';
                        return state;
                    }
                    const next = list.filter((r) => r.id !== requestId);
                    const nextJudicial = filterOutJudicialDecisionsForRequest(target.judicialDecisions, requestId);
                    const nextCase = appendCaseTrashItem(
                        { ...target, lawyerRequests: next, judicialDecisions: nextJudicial },
                        'lawyer_request',
                        doomed,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
                return err;
            },
            deleteLawyerRequest: (caseId, requestId) => {
                get().moveLawyerRequestToTrash(caseId, requestId);
            },
            moveJudicialDecisionToTrash: (caseId, decisionRef) => {
                const ref = String(decisionRef ?? '').trim();
                if (!ref) return 'معرّف القرار غير صالح.';
                const target = get().casesById[caseId];
                if (!target) return 'الإضبارة غير موجودة.';
                if (caseMaterialProcedureBlocked(target)) {
                    return 'لا يمكن حذف القرار — الإضبارة مقفلة.';
                }
                const stored = Array.isArray(target.judicialDecisions) ? target.judicialDecisions : [];
                const doomed = findJudicialDecisionByRef(stored, ref);
                const sourceRequestId = String(doomed?.sourceRequestId ?? '').trim();
                if (sourceRequestId) {
                    const requests = Array.isArray(target.lawyerRequests) ? target.lawyerRequests : [];
                    if (requests.some((r) => r.id === sourceRequestId)) {
                        return get().moveLawyerRequestToTrash(caseId, sourceRequestId);
                    }
                }
                if (!doomed) return 'القرار غير موجود.';
                let err: string | null = null;
                set((state) => {
                    const row = state.casesById[caseId];
                    if (!row) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(row)) {
                        err = 'لا يمكن حذف القرار — الإضبارة مقفلة.';
                        return state;
                    }
                    const list = Array.isArray(row.judicialDecisions) ? [...row.judicialDecisions] : [];
                    const idx = findJudicialDecisionStoreIndex(list, doomed);
                    if (idx < 0) {
                        err = 'القرار غير موجود.';
                        return state;
                    }
                    const picked = list[idx]!;
                    const filtered = list.filter((_, i) => i !== idx);
                    const nextCase = appendCaseTrashItem(
                        { ...row, judicialDecisions: filtered },
                        'judicial_decision',
                        picked,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
                return err;
            },
            restoreTrashItem: (caseId, trashItemId) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن استرجاع العناصر — الإضبارة مقفلة.';
                        return state;
                    }
                    const trash = normalizeTrashBin(target.trashBin);
                    const item = trash.find((t) => t.id === trashItemId);
                    if (!item) {
                        err = 'العنصر غير موجود في سلة المهملات.';
                        return state;
                    }
                    if (item.kind === 'statement' && statementMutationBlocked(target)) {
                        err = 'لا يمكن استرجاع الإفادة — مرحلة التحقيق مقفلة.';
                        return state;
                    }

                    let nextCase: CriminalCase = {
                        ...target,
                        trashBin: trash.filter((t) => t.id !== trashItemId),
                    };

                    if (item.kind === 'statement') {
                        const st = item.snapshot as Statement;
                        const list = Array.isArray(nextCase.statements) ? nextCase.statements : [];
                        if (list.some((s) => s.id === st.id)) {
                            err = 'الإفادة موجودة مسبقاً — لا يمكن الاسترجاع.';
                            return state;
                        }
                        nextCase = { ...nextCase, statements: [...list, st] };
                    } else if (item.kind === 'lawyer_request') {
                        const req = item.snapshot as LawyerRequest;
                        const list = Array.isArray(nextCase.lawyerRequests) ? nextCase.lawyerRequests : [];
                        if (list.some((r) => r.id === req.id)) {
                            err = 'الطلب موجود مسبقاً — لا يمكن الاسترجاع.';
                            return state;
                        }
                        nextCase = { ...nextCase, lawyerRequests: [...list, req] };
                    } else if (item.kind === 'other_evidence') {
                        if (otherEvidenceMutationBlocked(nextCase)) {
                            err = 'لا يمكن استرجاع الدليل — الإضبارة مؤرشفة أو مضمومة.';
                            return state;
                        }
                        const ev = item.snapshot as OtherEvidenceItem;
                        const list = Array.isArray(nextCase.otherEvidenceItems) ? nextCase.otherEvidenceItems : [];
                        if (list.some((it) => it.id === ev.id)) {
                            err = 'الدليل موجود مسبقاً — لا يمكن الاسترجاع.';
                            return state;
                        }
                        nextCase = { ...nextCase, otherEvidenceItems: [...list, ev] };
                    } else if (item.kind === 'judicial_decision') {
                        const decision = item.snapshot as JudicialDecision;
                        const list = Array.isArray(nextCase.judicialDecisions) ? nextCase.judicialDecisions : [];
                        if (findJudicialDecisionByRef(list, decision.id)) {
                            err = 'القرار موجود مسبقاً — لا يمكن الاسترجاع.';
                            return state;
                        }
                        nextCase = {
                            ...nextCase,
                            judicialDecisions: coalesceJudicialDecisions([...list, decision]),
                        };
                    } else if (item.kind === 'procedural_container') {
                        const container = item.snapshot as ProceduralContainer;
                        const list = normalizeProceduralContainers(nextCase.proceduralContainers);
                        if (findContainerInTree(list, container.id)) {
                            err = 'المسار موجود مسبقاً — لا يمكن الاسترجاع.';
                            return state;
                        }
                        const parentId = String(container.parentId ?? '').trim();
                        const nextContainers = parentId
                            ? insertNestedContainer(list, parentId, container)
                            : insertRootContainer(list, container);
                        nextCase = { ...nextCase, proceduralContainers: nextContainers };
                    } else if (item.kind === 'procedural_sub_item') {
                        const wrapped = item.snapshot as ProceduralSubItemTrashSnapshot;
                        const parentId = String(wrapped.parentContainerId ?? '').trim();
                        const subItem = wrapped.item;
                        if (!parentId || !subItem) {
                            err = 'بيانات الاسترجاع غير مكتملة.';
                            return state;
                        }
                        const list = normalizeProceduralContainers(nextCase.proceduralContainers);
                        const parent = findContainerInTree(list, parentId);
                        if (!parent) {
                            err = 'الحاوية الأم غير موجودة — لا يمكن الاسترجاع.';
                            return state;
                        }
                        const subId =
                            subItem.type === 'container' ? subItem.container.id : subItem.id;
                        const exists = parent.container.subItems.some((it) =>
                            it.type === 'container' ? it.container.id === subId : it.id === subId,
                        );
                        if (exists) {
                            err = 'العنصر موجود مسبقاً — لا يمكن الاسترجاع.';
                            return state;
                        }
                        nextCase = {
                            ...nextCase,
                            proceduralContainers: appendSubItem(list, parentId, subItem),
                        };
                    } else {
                        const log = item.snapshot as InvestigationLog;
                        const list = Array.isArray(nextCase.investigationLogs) ? nextCase.investigationLogs : [];
                        if (list.some((l) => l.id === log.id)) {
                            err = 'السجل موجود مسبقاً — لا يمكن الاسترجاع.';
                            return state;
                        }
                        nextCase = { ...nextCase, investigationLogs: [...list, log] };
                    }

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
                return err;
            },
            purgeTrashItem: (caseId, trashItemId) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    const trash = normalizeTrashBin(target.trashBin);
                    if (!trash.some((t) => t.id === trashItemId)) {
                        err = 'العنصر غير موجود في سلة المهملات.';
                        return state;
                    }
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                trashBin: trash.filter((t) => t.id !== trashItemId),
                            },
                        },
                    };
                });
                return err;
            },
            addTrialSession: (caseId, sessionData) => {
                let err: string | null = validateAddTrialSessionInput(sessionData);
                if (err) return err;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن إضافة جلسة — الإضبارة مقفلة.';
                        return state;
                    }
                    const list = normalizeTrialSessions(target.trials);
                    if (trialSessionsLocked(target)) {
                        err = 'الإضبارة محسومة — لا يمكن إضافة جلسات بعد صدور الحكم.';
                        return state;
                    }
                    if (hasPendingTrialSession(list)) {
                        err = 'يوجد جلسة معلّقة — أكمل إجراءاتها قبل فتح جلسة جديدة.';
                        return state;
                    }
                    err = validateTrialSessionNumberUnique(list, String(sessionData.sessionNumber).trim());
                    if (err) return state;
                    const remandPivot = resolveCassationRemandRetrialPivotDate(
                        normalizeVerdictCards(target.verdictCards),
                    );
                    const session: TrialSession = {
                        id: createId(),
                        date: String(sessionData.date).trim(),
                        sessionNumber: String(sessionData.sessionNumber).trim(),
                        presenceStatus: sessionData.presenceStatus,
                        sessionNotes: String(sessionData.sessionNotes ?? '').trim(),
                        witnessesAndExperts: Array.isArray(sessionData.witnessesAndExperts)
                            ? sessionData.witnessesAndExperts.map((w) => ({ ...w }))
                            : undefined,
                        status: 'pending',
                        ...(remandPivot ? { trialRound: 'post_cassation_remand' as const } : {}),
                    };
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, trials: [...list, session] },
                        },
                    };
                });
                return err;
            },
            updateTrialSession: (caseId, sessionId, sessionData) => {
                let err: string | null = validateAddTrialSessionInput(sessionData);
                if (err) return err;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن تعديل الجلسة — الإضبارة مقفلة.';
                        return state;
                    }
                    const list = normalizeTrialSessions(target.trials);
                    if (trialSessionsLocked(target)) {
                        err = 'الإضبارة محسومة — لا يمكن تعديل الجلسات.';
                        return state;
                    }
                    const idx = list.findIndex((s) => s.id === sessionId);
                    if (idx < 0) {
                        err = 'الجلسة غير موجودة.';
                        return state;
                    }
                    const current = list[idx]!;
                    if (current.status !== 'pending') {
                        err = 'لا يمكن تعديل جلسة مغلقة.';
                        return state;
                    }
                    err = validateTrialSessionNumberUnique(
                        list,
                        String(sessionData.sessionNumber).trim(),
                        sessionId,
                    );
                    if (err) return state;
                    const updated: TrialSession = {
                        ...current,
                        date: String(sessionData.date).trim(),
                        sessionNumber: String(sessionData.sessionNumber).trim(),
                        presenceStatus: sessionData.presenceStatus,
                        sessionNotes: String(sessionData.sessionNotes ?? '').trim(),
                        preparatoryDecision: current.preparatoryDecision,
                    };
                    const nextList = list.map((s, i) => (i === idx ? updated : s));
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, trials: nextList },
                        },
                    };
                });
                return err;
            },
            documentTrialSessionPreparatoryDecision: (caseId, input) => {
                let err: string | null = validateAddTrialSessionInput(input.session);
                if (!err) err = validateTrialSessionPreparatoryInput(input.preparatory);
                if (err) return err;

                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن توثيق القرار — الإضبارة مقفلة.';
                        return state;
                    }
                    if (trialSessionsLocked(target)) {
                        err = 'الإضبارة محسومة — لا يمكن توثيق قرارات جديدة.';
                        return state;
                    }

                    let list = normalizeTrialSessions(target.trials);
                    let sessionId = String(input.sessionId ?? '').trim();
                    let sessionRow: TrialSession | null = null;

                    if (sessionId) {
                        const idx = list.findIndex((s) => s.id === sessionId);
                        if (idx < 0) {
                            err = 'الجلسة غير موجودة.';
                            return state;
                        }
                        const current = list[idx]!;
                        if (current.status !== 'pending') {
                            err = 'لا يمكن توثيق قرار على جلسة مغلقة.';
                            return state;
                        }
                        if (current.preparatoryDecision?.judicialDecisionId) {
                            err = 'القرار الإعدادي مسجّل مسبقاً على هذه الجلسة.';
                            return state;
                        }
                        sessionRow = {
                            ...current,
                            date: String(input.session.date).trim(),
                            sessionNumber: String(input.session.sessionNumber).trim(),
                            presenceStatus: input.session.presenceStatus,
                            sessionNotes: String(input.session.sessionNotes ?? '').trim(),
                        };
                        list = list.map((s, i) => (i === idx ? sessionRow! : s));
                    } else {
                        sessionRow = {
                            id: createId(),
                            date: String(input.session.date).trim(),
                            sessionNumber: String(input.session.sessionNumber).trim(),
                            presenceStatus: input.session.presenceStatus,
                            sessionNotes: String(input.session.sessionNotes ?? '').trim(),
                            witnessesAndExperts: Array.isArray(input.session.witnessesAndExperts)
                                ? input.session.witnessesAndExperts.map((w) => ({ ...w }))
                                : undefined,
                            status: 'pending',
                        };
                        list = [...list, sessionRow];
                        sessionId = sessionRow.id;
                    }

                    const caseStage = resolveCaseStageFromRecord(target);
                    const nodeId = resolveCurrentJourneyNodeId(target.stageJourney);
                    const judicialDecision = buildTrialSessionPreparatoryJudicialDecision(
                        sessionRow,
                        input.preparatory,
                        caseStage,
                        nodeId || undefined,
                    );
                    const preparatoryDecision = {
                        title: String(input.preparatory.title).trim(),
                        details: String(input.preparatory.details).trim(),
                        isBlockingSuit: input.preparatory.isBlockingSuit === true,
                        judicialDecisionId: judicialDecision.id,
                        sessionNumber: String(sessionRow.sessionNumber ?? '').trim(),
                        sessionId: sessionId,
                    };
                    const sessionWithPrep: TrialSession = {
                        ...sessionRow,
                        preparatoryDecision,
                    };
                    const nextTrials = list.map((s) => (s.id === sessionId ? sessionWithPrep : s));
                    let nextCase = appendJudicialDecisionOnCase(
                        { ...target, trials: nextTrials },
                        judicialDecision,
                    );
                    const event = stampProceduralNodeId(
                        {
                            id: createId(),
                            date: sessionWithPrep.date,
                            type: 'decision',
                            category: 'قرار إعدادي — جلسة مرافعة',
                            title: preparatoryDecision.title,
                            description: preparatoryDecision.details,
                        },
                        nodeId,
                    );
                    nextCase = {
                        ...nextCase,
                        timelineEvents: [...(Array.isArray(nextCase.timelineEvents) ? nextCase.timelineEvents : []), event],
                    };
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
                return err;
            },
            postponeTrialSession: (caseId, sessionId, nextDate, reason, prepNote) => {
                let err: string | null = null;
                const next = String(nextDate ?? '').trim();
                const why = String(reason ?? '').trim();
                const prep = String(prepNote ?? '').trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) return 'تاريخ الجلسة القادمة غير صالح.';
                const nextDateErr = validateTrialSessionIsoDate(next);
                if (nextDateErr) return nextDateErr;
                if (!why) return 'سبب التأجيل مطلوب.';
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن تأجيل الجلسة — الإضبارة مقفلة.';
                        return state;
                    }
                    const list = normalizeTrialSessions(target.trials);
                    const idx = list.findIndex((s) => s.id === sessionId);
                    if (idx < 0) {
                        err = 'الجلسة غير موجودة.';
                        return state;
                    }
                    const current = list[idx]!;
                    if (current.status !== 'pending') {
                        err = 'قرار الجلسة مسجّل مسبقاً.';
                        return state;
                    }
                    const updated: TrialSession = {
                        ...current,
                        status: 'postponed',
                        postponementReason: why,
                        nextSessionDate: next,
                        preparationNote: prep || undefined,
                    };
                    const nextList = list.map((s, i) => (i === idx ? updated : s));
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, trials: nextList },
                        },
                    };
                });
                return err;
            },
            finalizeTrialVerdict: (caseId, sessionId, verdictData) => {
                let err: string | null = null;
                const verdictDate =
                    String(verdictData.date ?? '').trim() || new Date().toISOString().slice(0, 10);
                if (!/^\d{4}-\d{2}-\d{2}$/.test(verdictDate)) return 'تاريخ الحكم غير صالح.';
                if (!['conviction', 'acquittal', 'release'].includes(String(verdictData.outcome ?? ''))) {
                    return 'نوع الحكم غير صالح.';
                }
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن تسجيل الحكم — الإضبارة مقفلة.';
                        return state;
                    }
                    if (trialSessionsLocked(target)) {
                        err = 'الإضبارة محسومة مسبقاً — الحكم مسجّل.';
                        return state;
                    }
                    const list = normalizeTrialSessions(target.trials);
                    const idx = list.findIndex((s) => s.id === sessionId);
                    if (idx < 0) {
                        err = 'الجلسة غير موجودة.';
                        return state;
                    }
                    const current = list[idx]!;
                    if (current.status === 'verdict_issued') {
                        err = 'الحكم مسجّل مسبقاً على هذه الجلسة.';
                        return state;
                    }
                    if (current.status !== 'pending') {
                        err = 'لا يمكن إصدار حكم على جلسة مؤجّلة — أضف جلسة جديدة للحكم.';
                        return state;
                    }
                    const presenceType =
                        verdictData.presenceType ?? presenceTypeFromSession(current.presenceStatus);
                    const updated: TrialSession = {
                        ...current,
                        status: 'verdict_issued',
                        verdict: {
                            outcome: verdictData.outcome,
                            presenceType,
                            date: verdictDate,
                            appealDeadline: computeAppealDeadline(verdictDate),
                        },
                    };
                    const nextList = list.map((s, i) => (i === idx ? updated : s));
                    const conclusion = buildTrialVerdictStageConclusion(
                        target,
                        current,
                        verdictData.outcome,
                        verdictDate,
                    );
                    const frozenTarget: CriminalCase = {
                        ...target,
                        trials: nextList,
                        verdictDate,
                        isFrozen: true,
                        finalDecision: conclusion,
                    };
                    const nextCase = upsertVerdictCardFromConclusion(
                        applyPersonalStagesFromConclusion(frozenTarget, conclusion),
                        conclusion,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
                return err;
            },
            syncTrialSessionVerdictFromStageFinal: (caseId, sessionId, input) => {
                const outcome = mapStageFinalKindToTrialOutcome(String(input.kind ?? ''));
                if (!outcome) return null;
                const verdictDate = String(input.issuedAt ?? '').trim();
                const dateErr = validateTrialSessionIsoDate(verdictDate);
                if (dateErr) return dateErr;
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    const list = normalizeTrialSessions(target.trials);
                    const idx = list.findIndex((s) => s.id === sessionId);
                    if (idx < 0) {
                        err = 'الجلسة غير موجودة.';
                        return state;
                    }
                    const current = list[idx]!;
                    if (current.status === 'verdict_issued') return state;
                    const presenceType = mapDecisionPresenceToTrialVerdictPresence(
                        input.presenceType,
                        current.presenceStatus,
                    );
                    const updated: TrialSession = {
                        ...current,
                        status: 'verdict_issued',
                        verdict: {
                            outcome,
                            presenceType,
                            date: verdictDate,
                            appealDeadline: computeAppealDeadline(verdictDate),
                        },
                    };
                    const nextList = list.map((s, i) => (i === idx ? updated : s));
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, trials: nextList, verdictDate },
                        },
                    };
                });
                return err;
            },
            updateVerdictCardDraft: (caseId, cardId, draft) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const cards = patchVerdictCardInList(normalizeVerdictCards(target.verdictCards), cardId, {
                        decisionDraft: String(draft ?? '').trim() || undefined,
                    });
                    return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: cards } } };
                }),
            patchVerdictCardOrdinaryAppeal: (caseId, cardId, patch) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const cards = normalizeVerdictCards(target.verdictCards).map((c) => {
                        if (c.id !== cardId) return c;
                        const merged = mergeOrdinaryAppealTrack(c.ordinaryAppeal, patch);
                        const prevResult = String(c.ordinaryAppeal?.result ?? '').trim();
                        const nextResult = String(merged.result ?? '').trim();
                        if (nextResult && nextResult !== prevResult) {
                            const explicitRecordedAt = String(patch.resultRecordedAt ?? '').trim();
                            if (explicitRecordedAt) {
                                merged.resultRecordedAt = explicitRecordedAt;
                            } else if (
                                !String(merged.resultRecordedAt ?? c.ordinaryAppeal?.resultRecordedAt ?? '').trim()
                            ) {
                                merged.resultRecordedAt = new Date().toISOString().slice(0, 10);
                            }
                        }
                        const filingComplete = Boolean(String(merged.filedAt ?? '').trim());
                        return {
                            ...c,
                            ordinaryAppeal: merged,
                            cassationAppealFiled: filingComplete || c.cassationAppealFiled === true,
                        };
                    });
                    return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: cards } } };
                }),
            recordVerdictCardCassationResult: (caseId, cardId, input) => {
                const target = get().casesById[caseId];
                if (!target) return 'الإضبارة غير موجودة.';
                const cards = normalizeVerdictCards(target.verdictCards);
                const card = cards.find((c) => c.id === cardId);
                if (!card) return 'بطاقة الحكم غير موجودة.';

                const outcome = applyVerdictCassationResultEffects(
                    target,
                    card,
                    input,
                    target.basics?.crimeType,
                );
                if (outcome.error) return outcome.error;

                const appealPatch = buildVerdictOrdinaryAppealPatch(input, card.ordinaryAppeal);
                const nextCards = cards.map((c) =>
                    c.id === cardId
                        ? {
                              ...c,
                              ordinaryAppeal: appealPatch,
                              cassationAppealFiled: true,
                              ...(input.result === 'verdict_quash_modify_mitigate' ||
                              input.result === 'verdict_quash_modify_aggravate'
                                  ? {
                                        decisionDraft:
                                            String(input.penaltyModificationText ?? '').trim() ||
                                            c.decisionDraft,
                                    }
                                  : {}),
                          }
                        : c,
                );

                const activeNodeId = resolveCurrentJourneyNodeId(outcome.caseRecord.stageJourney);
                const remappedCards = activeNodeId
                    ? nextCards.map((c) =>
                          c.id === cardId ? { ...c, proceduralNodeId: activeNodeId } : c,
                      )
                    : nextCards;

                let nextCase: CriminalCase = {
                    ...outcome.caseRecord,
                    verdictCards: remappedCards,
                };

                set((state) => ({
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                }));

                if (outcome.referralStage) {
                    get().updateCaseStage(caseId, outcome.referralStage);
                }

                return null;
            },
            patchVerdictCardInterventionAppeal: (caseId, cardId, patch) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const cards = normalizeVerdictCards(target.verdictCards).map((c) =>
                        c.id === cardId
                            ? {
                                  ...c,
                                  interventionAppeal: mergeInterventionAppealTrack(c.interventionAppeal, patch),
                              }
                            : c,
                    );
                    return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: cards } } };
                }),
            patchVerdictCardCorrectionAppeal: (caseId, cardId, patch) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const cards = normalizeVerdictCards(target.verdictCards).map((c) =>
                        c.id === cardId
                            ? {
                                  ...c,
                                  correctionAppeal: mergeCorrectionAppealTrack(c.correctionAppeal, patch),
                              }
                            : c,
                    );
                    return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: cards } } };
                }),
            registerStageFinalDecision: (caseId, payload, meta) => {
                const target = get().casesById[caseId];
                if (!target) return 'الإضبارة غير موجودة.';
                const syncedTarget = syncCaseSovereignContext(target);
                const sovereignContext = resolveCaseSovereignContext(syncedTarget);
                const validationErr = validateStageFinalDecisionForm(payload, sovereignContext);
                if (validationErr) return validationErr;

                const caseStage = syncedTarget.caseStage ?? resolveCaseStageFromRecord(syncedTarget);
                const stageType: StageConclusion['stageType'] =
                    caseStage === 'felony' ? 'felony' : caseStage === 'investigation' ? 'investigation' : 'misdemeanor';
                const conclusion = buildStageConclusionFromForm(payload, stageType, meta.defendantStatusAtDecision);
                if (payload.defendantIds?.length) {
                    conclusion.defendantIds = payload.defendantIds;
                }

                set((state) => ({
                    casesById: {
                        ...state.casesById,
                        [caseId]: syncedTarget,
                    },
                }));

                const issueErr = get().issueStageDecision(caseId, conclusion);
                if (issueErr) return issueErr;

                const caseType = inferDecisionCaseTypeFromContext(sovereignContext, caseStage);
                const cardId = `verdict_${conclusion.id}`;

                set((state) => {
                    const fresh = state.casesById[caseId];
                    if (!fresh) return state;
                    const cards = normalizeVerdictCards(fresh.verdictCards);
                    const idx = cards.findIndex((c) => c.id === cardId || c.sourceConclusionId === conclusion.id);
                    if (idx < 0) return state;
                    const enriched = enrichVerdictCardFromForm(cards[idx]!, payload, caseType);
                    const next = cards.map((c, i) => (i === idx ? enriched : c));
                    return { casesById: { ...state.casesById, [caseId]: { ...fresh, verdictCards: next } } };
                });
                return null;
            },
            recordVerdictAbsentiaPublication: (caseId, cardId, publicationDate) => {
                const pub = String(publicationDate ?? '').trim();
                if (!pub) return 'أدخل تاريخ التبليغ بالنشر.';
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    const cards = normalizeVerdictCards(target.verdictCards);
                    const card = cards.find((c) => c.id === cardId);
                    if (!card) {
                        err = 'بطاقة الحكم غير موجودة.';
                        return state;
                    }
                    if (card.presenceType !== 'غيابي') {
                        err = 'التبليغ بالنشر يخص الأحكام الغيابية فقط.';
                        return state;
                    }
                    const caseType = card.caseCrimeType ?? inferDecisionCaseTypeFromStage(
                        target.caseStage ?? resolveCaseStageFromRecord(target),
                        target.basics?.crimeType,
                    );
                    const objectionDeadline = resolveAbsentiaObjectionDeadline(pub, caseType);
                    const next = patchVerdictCardInList(cards, cardId, {
                        absentiaPublicationDate: pub,
                        absentiaObjectionDeadline: objectionDeadline,
                        caseCrimeType: caseType,
                    });
                    return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: next } } };
                });
                return err;
            },
            recordVerdictAbsentiaObjection: (caseId, cardId) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    const cards = normalizeVerdictCards(target.verdictCards);
                    const card = cards.find((c) => c.id === cardId);
                    if (!card) {
                        err = 'بطاقة الحكم غير موجودة.';
                        return state;
                    }
                    if (card.presenceType !== 'غيابي') {
                        err = 'الاعتراض الغيابي يخص الأحكام الغيابية فقط.';
                        return state;
                    }
                    const next = patchVerdictCardInList(cards, cardId, { absentiaObjectionFiled: true });
                    return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: next } } };
                });
                return err;
            },
            refreshVerdictCardLifecycles: (caseId) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const before = normalizeVerdictCards(target.verdictCards);
                    const after = resolveVerdictCardsLifecycle(before);
                    const changed =
                        after.length !== before.length ||
                        after.some((card, index) => card !== before[index]);
                    if (!changed) return state;
                    return { casesById: { ...state.casesById, [caseId]: { ...target, verdictCards: after } } };
                }),
            ensureCaseSovereignContext: (caseId) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const synced = syncCaseSovereignContext(target);
                    if (
                        synced.case_classification === target.case_classification &&
                        synced.misdemeanor_type === target.misdemeanor_type
                    ) {
                        return state;
                    }
                    return { casesById: { ...state.casesById, [caseId]: synced } };
                }),
            addTrialDeposition: (caseId, input) => {
                let err: string | null = validateAddTrialDepositionInput(input);
                if (err) return err;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن إضافة إفادة — الإضبارة مقفلة.';
                        return state;
                    }
                    const content = String(input.content).trim();
                    const deposition: TrialDeposition = {
                        id: createTrialDepositionId(),
                        sessionId: String(input.sessionId ?? '').trim() || undefined,
                        date: String(input.date).trim(),
                        giverType: input.giverType,
                        witnessName: String(input.witnessName).trim(),
                        witnessDetails: String(input.witnessDetails ?? '').trim() || undefined,
                        content,
                        contentHighlights: input.contentHighlights,
                        comparisons: Array.isArray(input.comparisons)
                            ? input.comparisons.map((c) => ({ ...c }))
                            : undefined,
                        crossExamination: Array.isArray(input.crossExamination)
                            ? input.crossExamination.map((q) => ({ ...q }))
                            : undefined,
                    };
                    const list = normalizeTrialDepositions(target.trialDepositions);
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, trialDepositions: [...list, deposition] },
                        },
                    };
                });
                return err;
            },
            updateTrialDeposition: (caseId, depositionId, patch) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن تعديل الإفادة — الإضبارة مقفلة.';
                        return state;
                    }
                    const list = normalizeTrialDepositions(target.trialDepositions);
                    const idx = list.findIndex((d) => d.id === depositionId);
                    if (idx < 0) {
                        err = 'الإفادة غير موجودة.';
                        return state;
                    }
                    const current = list[idx]!;
                    const nextContent =
                        patch.content !== undefined ? String(patch.content).trim() : current.content;
                    if (patch.content !== undefined && !nextContent) {
                        err = 'نص الإفادة مطلوب.';
                        return state;
                    }
                    const next: TrialDeposition = {
                        ...current,
                        ...patch,
                        id: current.id,
                        content: nextContent,
                        witnessName:
                            patch.witnessName !== undefined
                                ? String(patch.witnessName).trim()
                                : current.witnessName,
                        giverType: patch.giverType !== undefined ? patch.giverType : current.giverType,
                        witnessDetails:
                            patch.witnessDetails !== undefined
                                ? String(patch.witnessDetails).trim() || undefined
                                : current.witnessDetails,
                        date: patch.date !== undefined ? String(patch.date).trim() : current.date,
                        contentHighlights:
                            patch.contentHighlights !== undefined
                                ? patch.contentHighlights
                                : patch.content !== undefined
                                  ? undefined
                                  : current.contentHighlights,
                        comparisons:
                            patch.comparisons !== undefined
                                ? patch.comparisons.map((c) => ({ ...c }))
                                : current.comparisons,
                        crossExamination:
                            patch.crossExamination !== undefined
                                ? patch.crossExamination.map((q) => ({ ...q }))
                                : current.crossExamination,
                    };
                    const normalized = normalizeTrialDeposition(next);
                    if (!normalized) {
                        err = 'بيانات الإفادة غير صالحة.';
                        return state;
                    }
                    const nextList = list.map((d, i) => (i === idx ? normalized : d));
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, trialDepositions: nextList },
                        },
                    };
                });
                return err;
            },
            deleteTrialDeposition: (caseId, depositionId) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن حذف الإفادة — الإضبارة مقفلة.';
                        return state;
                    }
                    const list = normalizeTrialDepositions(target.trialDepositions);
                    const nextList = list.filter((d) => d.id !== depositionId);
                    if (nextList.length === list.length) {
                        err = 'الإفادة غير موجودة.';
                        return state;
                    }
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, trialDepositions: nextList },
                        },
                    };
                });
                return err;
            },
            modifyTrialChargeDescription: (caseId, input) => {
                let err: string | null = validateModifyTrialChargeInput(input);
                if (err) return err;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) {
                        err = 'الإضبارة غير موجودة.';
                        return state;
                    }
                    if (caseMaterialProcedureBlocked(target)) {
                        err = 'لا يمكن تعديل الوصف — الإضبارة مقفلة.';
                        return state;
                    }
                    const currentArticle = resolveCurrentAccusationArticleFromCase({
                        currentAccusationArticle: target.currentAccusationArticle,
                        chargeModifications: target.chargeModifications,
                        referralArticle: target.referralArticle,
                        legalArticleHistory: target.legalArticleHistory,
                        basicsLegalArticle: target.basics?.legalArticle,
                    });
                    if (!currentArticle) {
                        err = 'لا توجد مادة إحالة مسجّلة.';
                        return state;
                    }
                    const newArticle = String(input.newArticle ?? '').trim();
                    if (newArticle === currentArticle) {
                        err = 'المادة الجديدة مطابقة لمادة الاتهام الحالية.';
                        return state;
                    }
                    const entry = buildChargeModificationEntry(currentArticle, input);
                    const chargeModifications = [
                        ...normalizeChargeModifications(target.chargeModifications),
                        entry,
                    ];
                    const referralArticle =
                        String(target.referralArticle ?? '').trim() ||
                        resolveReferralArticleFromCase({
                            referralArticle: target.referralArticle,
                            legalArticleHistory: target.legalArticleHistory,
                            basicsLegalArticle: target.basics?.legalArticle,
                        }) ||
                        currentArticle;
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                referralArticle,
                                currentAccusationArticle: newArticle,
                                chargeModifications,
                            },
                        },
                    };
                });
                return err;
            },
            addRequestMargin: (caseId, requestId, text) =>
                set((state) => {
                    const trimmed = String(text ?? '').trim();
                    if (!trimmed) return state;
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = Array.isArray(target.lawyerRequests) ? [...target.lawyerRequests] : [];
                    const idx = list.findIndex((r) => r.id === requestId);
                    if (idx < 0) return state;
                    const current = list[idx];
                    if (!canAddLawyerRequestFollowUpMargin(current)) return state;
                    const margin = {
                        id: createId(),
                        date: new Date().toISOString().slice(0, 10),
                        text: trimmed,
                    };
                    list[idx] = { ...current, margins: [...(current.margins ?? []), margin] };
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, lawyerRequests: list },
                        },
                    };
                }),
            toggleRequestStar: (caseId, requestId) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = Array.isArray(target.lawyerRequests) ? [...target.lawyerRequests] : [];
                    const idx = list.findIndex((r) => r.id === requestId);
                    if (idx < 0) return state;
                    const current = list[idx];
                    list[idx] = { ...current, isStarred: current.isStarred !== true };
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, lawyerRequests: list },
                        },
                    };
                }),
            addRequestAttachment: (caseId, requestId, name) =>
                set((state) => {
                    const trimmed = String(name ?? '').trim();
                    if (!trimmed) return state;
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = Array.isArray(target.lawyerRequests) ? [...target.lawyerRequests] : [];
                    const idx = list.findIndex((r) => r.id === requestId);
                    if (idx < 0) return state;
                    const current = list[idx];
                    if (!canEditLawyerRequestAttachments(current)) return state;
                    const attachment = { id: createId(), name: trimmed };
                    list[idx] = {
                        ...current,
                        attachments: [...(current.attachments ?? []), attachment],
                    };
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, lawyerRequests: list },
                        },
                    };
                }),
            removeRequestAttachment: (caseId, requestId, attachmentId) =>
                set((state) => {
                    const aid = String(attachmentId ?? '').trim();
                    if (!aid) return state;
                    const target = state.casesById[caseId];
                    if (!target || caseMutationBlocked(target)) return state;
                    const list = Array.isArray(target.lawyerRequests) ? [...target.lawyerRequests] : [];
                    const idx = list.findIndex((r) => r.id === requestId);
                    if (idx < 0) return state;
                    const current = list[idx];
                    if (!canEditLawyerRequestAttachments(current)) return state;
                    const nextAtt = (current.attachments ?? []).filter((a) => a.id !== aid);
                    list[idx] = {
                        ...current,
                        attachments: nextAtt.length ? nextAtt : undefined,
                    };
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, lawyerRequests: list },
                        },
                    };
                }),
            updateCaseDefendantStatus: (caseId, defendantId, status) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (caseMutationBlocked(target)) return state;
                    const id = String(defendantId ?? '').trim();
                    if (!id) return state;
                    const nextStatus = status as DefendantStatus;
                    const defs = Array.isArray(target.defendants) ? target.defendants : [];
                    const idx = defs.findIndex((d) => d.id === id);
                    if (idx < 0) return state;
                    const current = defs[idx] as CriminalDefendant;
                    const prevStatus = current.status;
                    if (prevStatus === nextStatus) return state;

                    const date = new Date().toISOString().slice(0, 10);
                    const existingHistory = Array.isArray((current as any).detentionHistoryLog)
                        ? ((current as any).detentionHistoryLog as DetentionHistory[])
                        : [];
                    const openIdx = (() => {
                        for (let i = existingHistory.length - 1; i >= 0; i--) {
                            const it = existingHistory[i] as any;
                            if (it && typeof it === 'object' && !String(it.endDate ?? '').trim()) return i;
                        }
                        return -1;
                    })();
                    const startsDetention = requiresDetentionAuthority(nextStatus);
                    const endsDetention =
                        nextStatus === 'مكفل' ||
                        nextStatus === 'حر' ||
                        nextStatus === 'provisional_delivery';
                    const nextHistory =
                        startsDetention && openIdx < 0
                            ? [
                                  ...existingHistory,
                                  {
                                      id: createId(),
                                      location: String((current as any).detentionAuthority ?? '').trim() || 'غير محدد',
                                      startDate: date,
                                  },
                              ]
                            : endsDetention && openIdx >= 0
                              ? existingHistory.map((h, i) => (i === openIdx ? { ...h, endDate: date } : h))
                              : existingHistory;

                    const updated: CriminalDefendant = {
                        ...current,
                        status: nextStatus,
                        detentionHistoryLog: nextHistory,
                    };
                    if (
                        nextStatus === 'juvenile_detention' &&
                        Boolean((current as CriminalDefendant).isJuvenile)
                    ) {
                        updated.detentionAuthority = investigationJuvenileDetentionAuthorityLabel();
                    }
                    if (!requiresDetentionAuthority(updated.status)) updated.detentionAuthority = '';
                    if (!requiresDetentionExpiryDate(updated.status)) updated.detentionExpiryDate = '';

                    const nextDefendants = defs.map((d, i) => (i === idx ? updated : d));

                    const event: TimelineEvent = {
                        id: createId(),
                        date,
                        type: 'decision',
                        category: 'تحديث حالة المتهم',
                        title: 'تحديث حالة المتهم',
                        description: `تم تغيير حالة المتهم (${String((current as any).fullName ?? '').trim() || '—'}) من (${String(
                            prevStatus ?? '',
                        ) || '—'}) إلى (${String(nextStatus ?? '') || '—'}).`,
                        defendantIds: [id],
                    };

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                defendants: nextDefendants,
                                timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), event],
                            },
                        },
                    };
                }),
            updateCrossComplainantAccusedStatus: (caseId, complainantId, status) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (caseMutationBlocked(target)) return state;
                    const cid = String(complainantId ?? '').trim();
                    if (!cid) return state;
                    const nextStatus = status as DefendantStatus;
                    const comps = Array.isArray(target.complainants) ? target.complainants : [];
                    const idx = comps.findIndex((c) => c.id === cid);
                    if (idx < 0) return state;
                    const current = comps[idx] as CriminalComplainant;
                    // 🛡️ منع التغيير على مشتكٍ غير حامل لصفة متقابلة (لا case-level ولا per-complainant).
                    const isAccused =
                        target.isMutualComplaint === true || current.isCrossComplaint === true;
                    if (!isAccused) return state;
                    const prevStatus = current.accusedStatus ?? '';
                    if (prevStatus === nextStatus) return state;

                    const date = new Date().toISOString().slice(0, 10);
                    const existingHistory = Array.isArray(current.accusedDetentionHistoryLog)
                        ? current.accusedDetentionHistoryLog
                        : [];
                    const openIdx = (() => {
                        for (let i = existingHistory.length - 1; i >= 0; i--) {
                            const it = existingHistory[i] as DetentionHistory | undefined;
                            if (it && !String(it.endDate ?? '').trim()) return i;
                        }
                        return -1;
                    })();
                    const startsDetention = requiresDetentionAuthority(nextStatus);
                    const endsDetention =
                        nextStatus === 'مكفل' ||
                        nextStatus === 'حر' ||
                        nextStatus === 'provisional_delivery';
                    const nextHistory: DetentionHistory[] =
                        startsDetention && openIdx < 0
                            ? [
                                  ...existingHistory,
                                  {
                                      id: createId(),
                                      location:
                                          String(current.accusedDetentionAuthority ?? '').trim() ||
                                          'غير محدد',
                                      startDate: date,
                                  },
                              ]
                            : endsDetention && openIdx >= 0
                              ? existingHistory.map((h, i) =>
                                    i === openIdx ? { ...h, endDate: date } : h,
                                )
                              : existingHistory;

                    const updated: CriminalComplainant = {
                        ...current,
                        accusedStatus: nextStatus,
                        accusedDetentionHistoryLog: nextHistory,
                    };
                    if (
                        nextStatus === 'juvenile_detention' &&
                        Boolean((current as CriminalComplainant).isJuvenile)
                    ) {
                        updated.accusedDetentionAuthority =
                            investigationJuvenileDetentionAuthorityLabel();
                    }
                    if (!requiresDetentionAuthority(nextStatus)) updated.accusedDetentionAuthority = '';
                    if (!requiresDetentionExpiryDate(nextStatus)) updated.accusedDetentionExpiryDate = '';

                    const nextComplainants = comps.map((c, i) => (i === idx ? updated : c));

                    const event: TimelineEvent = {
                        id: createId(),
                        date,
                        type: 'decision',
                        category: 'تحديث حالة المشتكي (شكوى متقابلة)',
                        title: 'تحديث حالة المشتكي بصفته متهماً',
                        description: `تم تغيير حالة المشتكي (${String(current.fullName ?? '').trim() || '—'}) بصفته متهماً في شكوى متقابلة من (${String(
                            prevStatus ?? '',
                        ) || '—'}) إلى (${String(nextStatus ?? '') || '—'}).`,
                        complainantIds: [cid],
                    };

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                complainants: nextComplainants,
                                timelineEvents: [
                                    ...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []),
                                    event,
                                ],
                            },
                        },
                    };
                }),
            registerCrossComplainantAccusedDeath: (caseId, complainantId, date) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (target.isArchived) return state;
                    const cid = String(complainantId ?? '').trim();
                    if (!cid) return state;
                    const comps = Array.isArray(target.complainants) ? target.complainants : [];
                    const idx = comps.findIndex((c) => c.id === cid);
                    if (idx < 0) return state;
                    const current = comps[idx] as CriminalComplainant;
                    const isAccused =
                        target.isMutualComplaint === true || current.isCrossComplaint === true;
                    if (!isAccused) return state;
                    if ((current as { accusedIsPartyRecordLocked?: boolean }).accusedIsPartyRecordLocked) {
                        return state;
                    }
                    const eventDate = String(date ?? '').trim() || new Date().toISOString().slice(0, 10);
                    const name = String(current.fullName ?? '').trim() || '—';
                    const nodeId = resolveCurrentJourneyNodeId(
                        ensureStageJourneyOnCase(target).stageJourney,
                    );
                    const event: TimelineEvent = stampProceduralNodeId(
                        {
                            id: createId(),
                            date: eventDate,
                            type: 'decision',
                            category: 'سقوط الدعوى الفرعية — وفاة مشتكي متقابل',
                            title: 'وفاة مشتكي متقابل',
                            description: `⚠️ سقوط الدعوى الجزائية الفرعية بحق المشتكي ${name} (شكوى متقابلة) لوفاته`,
                            complainantIds: [cid],
                        },
                        nodeId,
                    );
                    const updated: CriminalComplainant = {
                        ...current,
                        accusedStatus: 'متوفى' as DefendantStatus,
                        accusedIsPartyRecordLocked: true,
                        accusedPersonalStage: 'lawsuit_dropped_death',
                        accusedDetentionAuthority: '',
                        accusedDetentionExpiryDate: '',
                    };
                    const nextComps = comps.map((c, i) => (i === idx ? updated : c));
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                complainants: nextComps,
                                timelineEvents: [
                                    ...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []),
                                    event,
                                ],
                            },
                        },
                    };
                }),
            addCrossComplainantSeizedAssets: (caseId, complainantId, assets, sourceRequestId) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (caseMutationBlocked(target)) return state;
                    const cid = String(complainantId ?? '').trim();
                    if (!cid) return state;
                    const comps = Array.isArray(target.complainants) ? target.complainants : [];
                    const idx = comps.findIndex((c) => c.id === cid);
                    if (idx < 0) return state;
                    const current = comps[idx] as CriminalComplainant;
                    const isAccused =
                        target.isMutualComplaint === true || current.isCrossComplaint === true;
                    if (!isAccused) return state;
                    const stampedDate = new Date().toISOString();
                    const cleaned: SeizedAsset[] = (Array.isArray(assets) ? assets : [])
                        .map((a) => {
                            const description = String(a?.description ?? '').trim();
                            if (!description) return null;
                            const out: SeizedAsset = {
                                id: String(a?.id ?? '').trim() || createId(),
                                description,
                                referenceNumber: String(a?.referenceNumber ?? '').trim() || undefined,
                                seizureDate: String(a?.seizureDate ?? '').trim() || undefined,
                                notes: String(a?.notes ?? '').trim() || undefined,
                                createdAt: String(a?.createdAt ?? '').trim() || stampedDate,
                                sourceRequestId: sourceRequestId || undefined,
                            };
                            return out;
                        })
                        .filter((x): x is SeizedAsset => x !== null);
                    if (!cleaned.length) return state;
                    const prev = Array.isArray(current.accusedSeizedAssets)
                        ? current.accusedSeizedAssets
                        : [];
                    const next: CriminalComplainant = {
                        ...current,
                        accusedSeizedAssets: [...prev, ...cleaned],
                    };
                    const nextComps = comps.map((c, i) => (i === idx ? next : c));
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, complainants: nextComps },
                        },
                    };
                }),
            updateCrossComplainantSeizedAsset: (caseId, complainantId, assetId, patch) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (caseMutationBlocked(target)) return state;
                    const cid = String(complainantId ?? '').trim();
                    const aid = String(assetId ?? '').trim();
                    if (!cid || !aid) return state;
                    const comps = Array.isArray(target.complainants) ? target.complainants : [];
                    const cIdx = comps.findIndex((c) => c.id === cid);
                    if (cIdx < 0) return state;
                    const current = comps[cIdx] as CriminalComplainant;
                    const assets = Array.isArray(current.accusedSeizedAssets)
                        ? current.accusedSeizedAssets
                        : [];
                    const aIdx = assets.findIndex((a) => a.id === aid);
                    if (aIdx < 0) return state;
                    const prevAsset = assets[aIdx]!;
                    const nextAsset: SeizedAsset = { ...prevAsset };
                    if (patch.description !== undefined) {
                        const d = String(patch.description).trim();
                        if (!d) return state;
                        nextAsset.description = d;
                    }
                    if (patch.referenceNumber !== undefined) {
                        nextAsset.referenceNumber =
                            String(patch.referenceNumber).trim() || undefined;
                    }
                    if (patch.seizureDate !== undefined) {
                        nextAsset.seizureDate = String(patch.seizureDate).trim() || undefined;
                    }
                    if (patch.notes !== undefined) {
                        nextAsset.notes = String(patch.notes).trim() || undefined;
                    }
                    const nextAssets = assets.map((a, i) => (i === aIdx ? nextAsset : a));
                    const nextComps = comps.map((c, i) =>
                        i === cIdx ? { ...c, accusedSeizedAssets: nextAssets } : c,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, complainants: nextComps },
                        },
                    };
                }),
            releaseCrossComplainantSeizedAssets: (caseId, complainantId, assetIds) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (caseMutationBlocked(target)) return state;
                    const cid = String(complainantId ?? '').trim();
                    if (!cid) return state;
                    const comps = Array.isArray(target.complainants) ? target.complainants : [];
                    const cIdx = comps.findIndex((c) => c.id === cid);
                    if (cIdx < 0) return state;
                    const current = comps[cIdx] as CriminalComplainant;
                    const assets = Array.isArray(current.accusedSeizedAssets)
                        ? current.accusedSeizedAssets
                        : [];
                    if (!assets.length) return state;
                    const idsSet = new Set(
                        (Array.isArray(assetIds) ? assetIds : [])
                            .map((x) => String(x ?? '').trim())
                            .filter(Boolean),
                    );
                    const remaining = idsSet.size
                        ? assets.filter((a) => !idsSet.has(a.id))
                        : [];
                    if (remaining.length === assets.length) return state;
                    const nextComps = comps.map((c, i) =>
                        i === cIdx ? { ...c, accusedSeizedAssets: remaining } : c,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, complainants: nextComps },
                        },
                    };
                }),
            confirmBailAfterAppeal: (caseId, defendantIds) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const rawIds = Array.isArray(defendantIds)
                        ? defendantIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0)
                        : [];
                    const ids = resolveProceduralDefendantIds(
                        Array.isArray(target.complainants) ? target.complainants : [],
                        Array.isArray(target.defendants) ? target.defendants : [],
                        rawIds,
                        target.isMutualComplaint === true,
                    );
                    const today = new Date().toISOString().slice(0, 10);
                    const nextDefendants = (Array.isArray(target.defendants) ? target.defendants : []).map((d) => {
                        if (ids.length && !ids.includes(d.id)) return d;

                        const existingHistory = Array.isArray((d as any).detentionHistoryLog)
                            ? ((d as any).detentionHistoryLog as DetentionHistory[])
                            : [];
                        const openIdx = (() => {
                            for (let i = existingHistory.length - 1; i >= 0; i--) {
                                const it = existingHistory[i] as any;
                                if (it && typeof it === 'object' && !String(it.endDate ?? '').trim()) return i;
                            }
                            return -1;
                        })();
                        const nextHistory =
                            openIdx >= 0
                                ? existingHistory.map((h, i) => (i === openIdx ? { ...h, endDate: today } : h))
                                : existingHistory;

                        const next = { ...d, status: 'مكفل' as DefendantStatus, detentionHistoryLog: nextHistory };
                        if (!requiresDetentionAuthority(next.status)) next.detentionAuthority = '';
                        if (!requiresDetentionExpiryDate(next.status)) next.detentionExpiryDate = '';
                        return next;
                    });

                    const event: TimelineEvent = {
                        id: createId(),
                        date: today,
                        type: 'decision',
                        category: 'تصديق الكفالة',
                        title: 'تصديق الكفالة',
                        description: 'انقضاء مهلة طعن الادعاء العام، وتم إطلاق سراح المتهم بكفالة رسمياً.',
                        defendantIds: ids.length ? ids : undefined,
                    };
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, defendants: nextDefendants, timelineEvents: [...(target.timelineEvents ?? []), event] },
                        },
                    };
                }),
            fileInAbsentiaObjection: (caseId, defendantId) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const id = String(defendantId ?? '').trim();
                    if (!id) return state;
                    const today = new Date().toISOString().slice(0, 10);
                    let didUpdate = false;
                    const nextDefendants = (Array.isArray(target.defendants) ? target.defendants : []).map((d) => {
                        if (d.id !== id) return d;
                        const det = (d as any).inAbsentiaDetails as InAbsentiaDetails | undefined;
                        if (!det) return d;
                        if (det.isObjectionFiled) return d;
                        didUpdate = true;
                        return { ...d, inAbsentiaDetails: { ...det, isObjectionFiled: true } };
                    });
                    if (!didUpdate) return state;
                    const event: TimelineEvent = {
                        id: createId(),
                        date: today,
                        type: 'decision',
                        category: 'تقديم اعتراض على الحكم الغيابي',
                        title: 'تقديم اعتراض على الحكم الغيابي',
                        description: 'تم تقديم لائحة الاعتراض وتسليم المتهم لإعادة المحاكمة الاعتراضية.',
                        defendantIds: [id],
                    };
                    const firstSession: TimelineEvent = {
                        id: createId(),
                        date: today,
                        type: 'court_session',
                        category: 'جلسة المحاكمة الاعتراضية الأولى',
                        title: 'جلسة المحاكمة الاعتراضية الأولى',
                        description: 'تم فتح أول جلسة للمحاكمة الاعتراضية بعد تقديم الاعتراض.',
                        defendantIds: [id],
                    };
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                defendants: nextDefendants,
                                timelineEvents: [
                                    ...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []),
                                    event,
                                    firstSession,
                                ],
                            },
                        },
                    };
                }),
            addDefendantSeizedAssets: (caseId, defendantId, assets, sourceRequestId) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (caseMutationBlocked(target)) return state;
                    const did = String(defendantId ?? '').trim();
                    if (!did) return state;
                    const list = Array.isArray(target.defendants) ? target.defendants : [];
                    const idx = list.findIndex((d) => d.id === did);
                    if (idx < 0) return state;
                    const current = list[idx];
                    // Only fugitives are eligible — guard mirrors the UI gate.
                    if (current.status !== 'هارب') return state;

                    const nowIso = new Date().toISOString();
                    const cleaned = (Array.isArray(assets) ? assets : [])
                        .map((a, i) => {
                            const description = String(a?.description ?? '').trim();
                            if (!description) return null;
                            const out: SeizedAsset = {
                                id: String(a?.id ?? '').trim() || `${createId()}_${i}`,
                                description,
                                createdAt: String(a?.createdAt ?? '').trim() || nowIso,
                            };
                            const ref = String(a?.referenceNumber ?? '').trim();
                            if (ref) out.referenceNumber = ref;
                            const dt = String(a?.seizureDate ?? '').trim();
                            if (dt) out.seizureDate = dt;
                            const notes = String(a?.notes ?? '').trim();
                            if (notes) out.notes = notes;
                            const src = String(sourceRequestId ?? '').trim();
                            if (src) out.sourceRequestId = src;
                            return out;
                        })
                        .filter((x): x is SeizedAsset => x !== null);
                    if (!cleaned.length) return state;

                    const prevAssets = Array.isArray(current.seizedAssets) ? current.seizedAssets : [];
                    const nextDefendants = list.map((d, i) =>
                        i === idx ? { ...d, seizedAssets: [...prevAssets, ...cleaned] } : d,
                    );

                    const event: TimelineEvent = {
                        id: createId(),
                        date: new Date().toISOString().slice(0, 10),
                        type: 'decision',
                        category: 'حجز الأموال',
                        title: `حجز أموال على المتهم الهارب: ${String(current.fullName ?? '').trim() || '—'}`,
                        description: cleaned.map((a) => `• ${a.description}`).join('\n'),
                        defendantIds: [did],
                    };

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                defendants: nextDefendants,
                                timelineEvents: [
                                    ...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []),
                                    event,
                                ],
                            },
                        },
                    };
                }),
            updateDefendantSeizedAsset: (caseId, defendantId, assetId, patch) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (caseMutationBlocked(target)) return state;
                    const did = String(defendantId ?? '').trim();
                    const aid = String(assetId ?? '').trim();
                    if (!did || !aid) return state;
                    const list = Array.isArray(target.defendants) ? target.defendants : [];
                    const dIdx = list.findIndex((d) => d.id === did);
                    if (dIdx < 0) return state;
                    const current = list[dIdx];
                    const assets = Array.isArray(current.seizedAssets) ? current.seizedAssets : [];
                    const aIdx = assets.findIndex((a) => a.id === aid);
                    if (aIdx < 0) return state;
                    const prevAsset = assets[aIdx];

                    const nextAsset: SeizedAsset = { ...prevAsset };
                    if (typeof patch?.description === 'string') {
                        const v = patch.description.trim();
                        if (!v) return state; // refuse to wipe the required field
                        nextAsset.description = v;
                    }
                    if (typeof patch?.referenceNumber === 'string') {
                        const v = patch.referenceNumber.trim();
                        if (v) nextAsset.referenceNumber = v;
                        else delete (nextAsset as any).referenceNumber;
                    }
                    if (typeof patch?.seizureDate === 'string') {
                        const v = patch.seizureDate.trim();
                        if (v) nextAsset.seizureDate = v;
                        else delete (nextAsset as any).seizureDate;
                    }
                    if (typeof patch?.notes === 'string') {
                        const v = patch.notes.trim();
                        if (v) nextAsset.notes = v;
                        else delete (nextAsset as any).notes;
                    }

                    const nextAssets = assets.map((a, i) => (i === aIdx ? nextAsset : a));
                    const nextDefendants = list.map((d, i) =>
                        i === dIdx ? { ...d, seizedAssets: nextAssets } : d,
                    );

                    const event: TimelineEvent = {
                        id: createId(),
                        date: new Date().toISOString().slice(0, 10),
                        type: 'decision',
                        category: 'حجز الأموال',
                        title: `تعديل صنف محجوز — ${String(current.fullName ?? '').trim() || '—'}`,
                        description: `${prevAsset.description} ← ${nextAsset.description}`,
                        defendantIds: [did],
                    };

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                defendants: nextDefendants,
                                timelineEvents: [
                                    ...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []),
                                    event,
                                ],
                            },
                        },
                    };
                }),
            releaseDefendantSeizedAssets: (caseId, defendantId, assetIds) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (caseMutationBlocked(target)) return state;
                    const did = String(defendantId ?? '').trim();
                    if (!did) return state;
                    const list = Array.isArray(target.defendants) ? target.defendants : [];
                    const dIdx = list.findIndex((d) => d.id === did);
                    if (dIdx < 0) return state;
                    const current = list[dIdx];
                    const assets = Array.isArray(current.seizedAssets) ? current.seizedAssets : [];
                    if (!assets.length) return state;

                    const releaseAll = !Array.isArray(assetIds) || assetIds.length === 0;
                    const releaseSet = new Set(
                        (Array.isArray(assetIds) ? assetIds : [])
                            .map((x) => String(x ?? '').trim())
                            .filter(Boolean),
                    );
                    const removed = releaseAll
                        ? assets
                        : assets.filter((a) => releaseSet.has(a.id));
                    if (!removed.length) return state;
                    const remaining = releaseAll
                        ? []
                        : assets.filter((a) => !releaseSet.has(a.id));

                    const nextDefendants = list.map((d, i) =>
                        i === dIdx ? { ...d, seizedAssets: remaining } : d,
                    );

                    const event: TimelineEvent = {
                        id: createId(),
                        date: new Date().toISOString().slice(0, 10),
                        type: 'decision',
                        category: 'فك الحجز',
                        title: `فك الحجز عن ${removed.length === 1 ? 'صنف' : `${removed.length} أصناف`} — ${
                            String(current.fullName ?? '').trim() || '—'
                        }`,
                        description: removed.map((a) => `• ${a.description}`).join('\n'),
                        defendantIds: [did],
                    };

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                defendants: nextDefendants,
                                timelineEvents: [
                                    ...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []),
                                    event,
                                ],
                            },
                        },
                    };
                }),
            updateBailForfeiture: (caseId, defendantId, data) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const id = String(defendantId ?? '').trim();
                    if (!id) return state;
                    const list = Array.isArray(target.defendants) ? target.defendants : [];
                    const hasTarget = list.some((d) => d.id === id);
                    if (!hasTarget) return state;

                    const note = typeof (data as any)?.forfeitureNote === 'string' ? String((data as any).forfeitureNote).trim() : '';
                    const existingDef = list.find((d) => d.id === id) as any;
                    const existingGuarantor = normalizeGuarantorDetails(existingDef?.guarantorDetails);
                    if (!existingGuarantor) return state;

                    const nextInfo = note || existingGuarantor.guarantorInfo;
                    if (nextInfo === existingGuarantor.guarantorInfo) return state;

                    const nextDefendants = list.map((d) => {
                        if (d.id !== id) return d;
                        return {
                            ...d,
                            guarantorDetails: { ...existingGuarantor, guarantorInfo: nextInfo },
                        };
                    });

                    const date = new Date().toISOString().slice(0, 10);
                    const desc = note ? `ملاحظة مصادرة الكفالة: ${note}` : 'تم تحديث بيانات الكفالة';
                    const ev: TimelineEvent = {
                        id: createId(),
                        date,
                        type: 'decision',
                        category: 'تحديث مصادرة الكفالة',
                        title: 'مصادرة الكفالة',
                        description: desc,
                        defendantIds: [id],
                    };

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                defendants: nextDefendants,
                                timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), ev],
                            },
                        },
                    };
                }),
            updateCasePhysicalLocation: (caseId, location, customName) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (target.isArchived) return state;

                    const normalizedLocation: PhysicalLocation = [
                        'judge_desk',
                        'investigator_room',
                        'prosecution',
                        'police_station',
                        'archive',
                        'custom',
                    ].includes(String(location))
                        ? (String(location) as PhysicalLocation)
                        : 'custom';
                    const normalizedCustom =
                        normalizedLocation === 'custom' ? String(customName ?? '').trim() : '';

                    const didChange =
                        String((target as any).physicalLocation ?? 'custom') !== normalizedLocation ||
                        String((target as any).physicalLocationCustomName ?? '').trim() !== normalizedCustom;
                    if (!didChange) return state;

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                physicalLocation: normalizedLocation,
                                physicalLocationCustomName: normalizedLocation === 'custom' ? normalizedCustom : '',
                            },
                        },
                    };
                }),
            getCaseForDisplay: (caseId) => {
                const raw = get().casesById[caseId];
                if (!raw) return null;
                return resolveCriminalCaseForDisplay(raw, get().casesById);
            },
            getActiveParties: (caseId) => {
                const target = get().casesById[caseId];
                if (!target) return [];
                const complainants = Array.isArray(target.complainants) ? target.complainants : [];
                const defendants = Array.isArray(target.defendants) ? target.defendants : [];
                return buildActiveParties(complainants, defendants, {
                    isMutualComplaint: target.isMutualComplaint === true,
                });
            },
            getAllParties: (caseId) => {
                const target = get().casesById[caseId];
                if (!target) return [];
                const complainants = Array.isArray(target.complainants) ? target.complainants : [];
                const defendants = Array.isArray(target.defendants) ? target.defendants : [];
                return buildAllParties(complainants, defendants, {
                    isMutualComplaint: target.isMutualComplaint === true,
                });
            },
            recordPartyDeath: (caseId, defendantId, date) => {
                get().registerPartyDeath(caseId, defendantId, date);
            },
            recordCassationResult: (caseId, payload) => {
                const target = ensureStageJourneyOnCase(get().casesById[caseId] as CriminalCase);
                if (!target) return 'الإضبارة غير موجودة.';
                if (target.isArchived) return 'الإضبارة مؤرشفة.';
                const outcome = recordCassationResult(target, payload);
                if (outcome.error) return outcome.error;
                const archiveAll = allDefendantsTerminal(outcome.caseRecord.defendants ?? []);
                set((state) => ({
                    casesById: {
                        ...state.casesById,
                        [caseId]: {
                            ...outcome.caseRecord,
                            isArchived: outcome.caseRecord.isArchived || archiveAll,
                        },
                    },
                }));
                return null;
            },
            issueStageDecision: (caseId, conclusion, referral) => {
                const scoped = scopeStageConclusionTargets(conclusion);
                return get().concludeStage(caseId, scoped, referral);
            },
            applyPendingJourneyOrder: (caseId) => {
                const target = get().casesById[caseId];
                if (!target) return 'الإضبارة غير موجودة.';
                if (target.isArchived) return 'لا يمكن تطبيق الأمر على إضبارة مؤرشفة.';

                const pending = resolvePendingJourneyOrder(target);
                if (!pending) return 'لا يوجد أمر معلّق لتطبيقه على المسار.';

                const referralMeta = buildReferralMetaForPendingOrder(target, pending);
                if (pending.sourceFinalDecision) {
                    const scoped = scopeStageConclusionTargets(pending.sourceFinalDecision);
                    if (referralMeta && scoped.decisionType === 'referral') {
                        return get().concludeStage(caseId, scoped, referralMeta);
                    }
                    if (
                        referralMeta &&
                        (scoped.decisionType === 'misdemeanor_to_felony_jurisdiction' ||
                            scoped.decisionType === 'felony_to_misdemeanor_jurisdiction')
                    ) {
                        return get().concludeStage(caseId, scoped, referralMeta);
                    }
                    return get().concludeStage(caseId, scoped, referralMeta ?? undefined);
                }

                if (!referralMeta) {
                    return 'أكمل اسم المحكمة ورقم الدعوى قبل تطبيق الإحالة.';
                }

                const actionId = pending.actionId;
                const stageType = actionId === 'refer_felony' ? 'felony' : 'misdemeanor';
                const conclusion: StageConclusion = {
                    id: createId(),
                    stageType,
                    decisionType: 'referral',
                    date: new Date().toISOString().slice(0, 10),
                    details: 'تطبيق الإحالة من مسار تتبع الإضبارة',
                    defendantStatusAtDecision: 'bailed',
                };
                return get().concludeStage(caseId, conclusion, referralMeta);
            },
            registerPartyDeath: (caseId, defendantId, date) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (target.isArchived) return state;
                    const defId = String(defendantId ?? '').trim();
                    if (!defId) return state;
                    const defendants = Array.isArray(target.defendants) ? target.defendants : [];
                    const victim = defendants.find((d) => d.id === defId);
                    if (!victim) return state;
                    const eventDate = String(date ?? '').trim() || new Date().toISOString().slice(0, 10);
                    const name = String(victim.fullName ?? '').trim() || '—';
                    const nodeId = resolveCurrentJourneyNodeId(
                        ensureStageJourneyOnCase(target).stageJourney,
                    );
                    const event: TimelineEvent = stampProceduralNodeId(
                        {
                            id: createId(),
                            date: eventDate,
                            type: 'decision',
                            category: 'سقوط الدعوى — وفاة متهم',
                            title: 'وفاة متهم',
                            description: `⚠️ سقوط الدعوى الجزائية بحق المتهم ${name} لوفاته`,
                            defendantIds: [defId],
                        },
                        nodeId,
                    );
                    const nextDefendants = defendants.map((d) =>
                        d.id !== defId
                            ? normalizeDefendantPersonalFields(d)
                            : normalizeDefendantPersonalFields({
                                  ...d,
                                  status: 'متوفى',
                                  personalStage: 'lawsuit_dropped_death',
                                  isPartyRecordLocked: true,
                                  detentionAuthority: '',
                                  detentionExpiryDate: '',
                              }),
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                defendants: nextDefendants,
                                timelineEvents: [
                                    ...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []),
                                    event,
                                ],
                            },
                        },
                    };
                }),
            severCase: (parentCaseId, payload) => {
                const ids = (Array.isArray(payload.defendantIds) ? payload.defendantIds : [])
                    .map((x) => String(x ?? '').trim())
                    .filter(Boolean);
                if (!ids.length) return null;
                const at = String(payload.date ?? '').trim() || new Date().toISOString().slice(0, 10);
                const details = String(payload.details ?? '').trim() || 'قرار تفريق الدعاوى.';
                const began = get().beginSeveranceFromDossier(parentCaseId, ids, {
                    judicialSeveranceDraft: {
                        requestDate: at,
                        lawyerNote: details,
                        isAppealable: false,
                    },
                    severanceReason: payload.severanceReason,
                });
                if (!began) return null;
                if (!get().resumePendingSeveranceForm()) return null;
                const childId = get().commitSeveranceFromDossier();
                return childId;
            },
            applyInvestigationReferral: (caseId, payload) => {
                set((state) => {
                    const current = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                    if (!current) return state;
                    if (current.isArchived) return state;
                    if (current.unknownDefendant && !hasIdentifiedDefendant(current.defendants)) return state;
                    if (
                        !referralPayloadValid({
                            courtName: payload.courtName,
                            courtCaseNumber: payload.courtCaseNumber,
                            decisionDate: payload.decisionDate,
                        })
                    ) {
                        return state;
                    }
                    if (payload.targetCaseStage === 'misdemeanor' && !isMisdemeanorType(payload.referralMisdemeanorType)) {
                        return state;
                    }
                    const referralDefendantIds = (payload.defendantIds ?? [])
                        .map((x) => String(x ?? '').trim())
                        .filter(Boolean);
                    if (
                        investigationReferralScopeMixesJuvenileAndAdult(
                            Array.isArray(current.defendants) ? current.defendants : [],
                            referralDefendantIds,
                        )
                    ) {
                        return state;
                    }
                    let nextCase = patchInvestigationReferralCase(
                        current,
                        payload.targetCaseStage,
                        payload.courtName,
                        payload.courtCaseNumber,
                        payload.decisionDate,
                        payload.decisionDetails,
                        payload.defendantStatusAtDecision,
                        payload.defendantIds ?? [],
                        {
                            publicProsecutionNumber: payload.publicProsecutionNumber,
                            referralLegalArticle: payload.referralLegalArticle,
                            referralMisdemeanorType: payload.referralMisdemeanorType,
                            defendantStatusesByDefendantId: payload.defendantStatusesByDefendantId,
                        },
                    );
                    const ids = (payload.defendantIds ?? []).map((x) => String(x ?? '').trim()).filter(Boolean);
                    if (ids.length) {
                        nextCase = patchDefendantsInvestigationStatus(nextCase, ids, 'referred');
                    }
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                });
            },
            referInvestigationDefendantToTrial: (caseId, payload) => {
                const parent0 = get().casesById[caseId] as CriminalCase | undefined;
                if (!parent0 || parent0.isArchived) return null;
                if (parent0.unknownDefendant && !hasIdentifiedDefendant(parent0.defendants)) return null;
                if (investigationDossierMaterialMutationBlocked(parent0)) return null;
                const requestedIds = (Array.isArray(payload.defendantIds) ? payload.defendantIds : [])
                    .map((x) => String(x ?? '').trim())
                    .filter(Boolean);
                if (!requestedIds.length) return null;
                if (
                    investigationReferralScopeMixesJuvenileAndAdult(
                        Array.isArray(parent0.defendants) ? parent0.defendants : [],
                        requestedIds,
                    )
                ) {
                    return null;
                }

                const parentDefs = Array.isArray(parent0.defendants) ? parent0.defendants : [];
                const snapshots = requestedIds
                    .map((id) => parentDefs.find((d) => d.id === id))
                    .filter((d): d is CriminalDefendant => {
                        if (!d) return false;
                        if (isDefendantIdentityUnknown(d)) return false;
                        return normalizeInvestigationDefendantStatus(d.investigationStatus) === 'active';
                    });
                if (!snapshots.length) return null;

                const stageLabel = resolveInvestigationReferralStageLabel(payload.targetCaseStage);
                const referredNames = snapshots
                    .map((d) => String(d.fullName ?? '').trim())
                    .filter(Boolean)
                    .join('، ');

                const seededDraft: CriminalCaseDraft = {
                    ...makeInitialDraft(),
                    basics: {
                        ...parent0.basics,
                        stage: stageLabel,
                        legalArticle: String(parent0.basics.legalArticle ?? parent0.currentAccusationArticle ?? '').trim(),
                    },
                    location: {
                        ...parent0.location,
                        courtName: String(payload.courtName ?? '').trim(),
                        caseNumber: String(payload.courtCaseNumber ?? '').trim(),
                        publicProsecutionNumber:
                            String(payload.publicProsecutionNumber ?? parent0.location.publicProsecutionNumber ?? '').trim() ||
                            undefined,
                    },
                    complainants: (Array.isArray(parent0.complainants) ? parent0.complainants : []).map((c) => ({
                        ...c,
                    })),
                    defendants: snapshots.map((d) =>
                        normalizeDefendantPersonalFields({
                            ...d,
                            id: createId(),
                            investigationStatus: 'active',
                            personalStage: 'under_investigation',
                        }),
                    ),
                    unknownDefendant: false,
                    isMutualComplaint: parent0.isMutualComplaint,
                };
                set({ draft: seededDraft });
                const newCaseId = get().createCaseFromDraft();
                if (!newCaseId) return null;

                const date = String(payload.decisionDate ?? '').trim() || new Date().toISOString().slice(0, 10);
                const details =
                    String(payload.decisionDetails ?? '').trim() ||
                    `إحالة المتهمين (${referredNames || '—'}) إلى ${stageLabel}.`;
                const courtLabel = stageLabel;
                const sourceDefendantIds = snapshots.map((d) => d.id);

                set((state) => {
                    const parent = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                    const child = state.casesById[newCaseId] as CriminalCase | undefined;
                    if (!parent || !child) return state;

                    let nextChild: CriminalCase = {
                        ...child,
                        parentCaseId: parent.id,
                        caseStage:
                            payload.targetCaseStage === 'juvenile' ? 'misdemeanor' : payload.targetCaseStage,
                        courtCaseNumber: String(payload.courtCaseNumber ?? '').trim() || child.courtCaseNumber,
                        referralArticle:
                            String(payload.referralLegalArticle ?? parent.referralArticle ?? '').trim() || undefined,
                    };
                    nextChild = applyTrialChargeReferralSeed(nextChild);
                    const childDefendantIds = (nextChild.defendants ?? []).map((d) => d.id);
                    nextChild = patchInvestigationReferralCase(
                        nextChild,
                        payload.targetCaseStage,
                        payload.courtName,
                        payload.courtCaseNumber,
                        date,
                        details,
                        payload.defendantStatusAtDecision,
                        childDefendantIds,
                        {
                            publicProsecutionNumber: payload.publicProsecutionNumber,
                            referralLegalArticle: payload.referralLegalArticle,
                            referralMisdemeanorType: payload.referralMisdemeanorType,
                        },
                    );

                    let nextParent = patchInvestigationReferralCase(
                        parent,
                        payload.targetCaseStage,
                        payload.courtName,
                        payload.courtCaseNumber,
                        date,
                        details,
                        payload.defendantStatusAtDecision,
                        sourceDefendantIds,
                        {
                            publicProsecutionNumber: payload.publicProsecutionNumber,
                            referralLegalArticle: payload.referralLegalArticle,
                            referralMisdemeanorType: payload.referralMisdemeanorType,
                        },
                    );
                    nextParent = applyPersonalStagesToDefendants(
                        nextParent,
                        sourceDefendantIds,
                        'referred_to_trial',
                        {
                            status: mapDecisionStatusToDefendantStatus(payload.defendantStatusAtDecision),
                        },
                    );
                    nextParent = patchDefendantsInvestigationStatus(nextParent, sourceDefendantIds, 'referred');

                    const referralEvent: TimelineEvent = {
                        id: createId(),
                        date,
                        type: 'decision',
                        category: 'قرار إحالة إلى محكمة الموضوع',
                        title: `إحالة إلى ${courtLabel}`,
                        description: `${details}\nإضبارة المحكمة: ${resolveOfficialCaseNumber(nextChild) || newCaseId}`,
                        defendantIds: sourceDefendantIds,
                    };

                    const priorChildren = Array.isArray(nextParent.severedChildCaseIds)
                        ? nextParent.severedChildCaseIds
                        : [];
                    nextParent = {
                        ...nextParent,
                        severedChildCaseIds: priorChildren.includes(newCaseId)
                            ? priorChildren
                            : [...priorChildren, newCaseId],
                        timelineEvents: [
                            ...(Array.isArray(nextParent.timelineEvents) ? nextParent.timelineEvents : []),
                            referralEvent,
                        ],
                    };

                    if (payload.targetCaseStage === 'juvenile') {
                        const sourceIds = snapshots.map((d) => d.id);
                        const referralCard = buildJuvenileInvestigationReferralJudicialDecision({
                            decisionDate: date,
                            courtName: String(payload.courtName ?? '').trim() || JUVENILE_TRIAL_COURT_NAME,
                            courtCaseNumber: String(payload.courtCaseNumber ?? '').trim(),
                            defendantIds: sourceIds,
                            childCaseId: newCaseId,
                            childCaseNumber: resolveOfficialCaseNumber(nextChild) || newCaseId,
                            referralLegalArticle: payload.referralLegalArticle,
                        });
                        nextParent = appendJudicialDecisionOnCase(nextParent, referralCard);
                    }

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextParent,
                            [newCaseId]: nextChild,
                        },
                    };
                });
                return newCaseId;
            },
            referAndGenerateCase: (currentCaseId, targetCourt, decisionDetails, referralMeta) => {
                set((state) => {
                    const current = state.casesById[currentCaseId];
                    if (!current) return state;
                    if (current.isArchived) return state;

                    const stageKey =
                        targetCourt === 'محكمة الجنايات'
                            ? 'felony'
                            : targetCourt === 'محكمة الجنح'
                              ? 'misdemeanor'
                              : targetCourt === JUVENILE_TRIAL_COURT_NAME
                                ? 'juvenile'
                                : null;
                    if (stageKey && referralMeta) {
                        const nextCase = patchInvestigationReferralCase(
                            current,
                            stageKey,
                            referralMeta.courtName,
                            referralMeta.caseNumber,
                            String(decisionDetails.date ?? '').trim(),
                            String(decisionDetails.details ?? '').trim(),
                            decisionDetails.defendantStatusAtDecision ?? 'bailed',
                            decisionDetails.defendantIds ?? [],
                        );
                        return {
                            casesById: {
                                ...state.casesById,
                                [currentCaseId]: {
                                    ...nextCase,
                                    finalDecision: decisionDetails,
                                },
                            },
                        };
                    }

                    const stage = isCourtStageValue(targetCourt) ? targetCourt : current.basics.stage;
                    const referralDate = String((decisionDetails as any)?.date ?? '').trim() || new Date().toISOString().slice(0, 10);
                    const referralDetails = String((decisionDetails as any)?.details ?? '').trim();
                    const event: TimelineEvent = {
                        id: createId(),
                        date: referralDate,
                        type: 'decision',
                        category: 'قرار إحالة إلى المحكمة المختصة',
                        title: 'إحالة',
                        description:
                            `${referralDetails || 'تمت الإحالة إلى المحكمة المختصة.'}` +
                            (referralMeta
                                ? `\nالمحكمة: ${String(referralMeta.courtName ?? '').trim() || '—'} • الرقم: ${String(
                                      referralMeta.caseNumber ?? '',
                                  ).trim() || '—'}`
                                : ''),
                    };

                    const nextLocation: CriminalCaseLocation = referralMeta
                        ? {
                              ...current.location,
                              courtName: referralMeta.courtName,
                              caseNumber: referralMeta.caseNumber,
                          }
                        : current.location;

                    const nextCase: CriminalCase = {
                        ...current,
                        basics: { ...current.basics, stage },
                        location: nextLocation,
                        timelineEvents: [...(Array.isArray(current.timelineEvents) ? current.timelineEvents : []), event],
                    };
                    return {
                        casesById: {
                            ...state.casesById,
                            [currentCaseId]: nextCase,
                        },
                    };
                });
                return currentCaseId;
            },
            endInvestigationTemporaryClosure: (caseId) => {
                const target = get().casesById[caseId] as CriminalCase | undefined;
                if (!target) return 'الإضبارة غير موجودة.';
                if (target.investigationDossierClosure?.kind !== 'temporary') {
                    return 'لا يوجد غلق مؤقت نشط على هذه الإضبارة.';
                }
                const date = new Date().toISOString().slice(0, 10);
                const event: TimelineEvent = {
                    id: createId(),
                    date,
                    type: 'investigation',
                    category: 'إجراء مخصص (إدخال يدوي)',
                    title: 'إعادة الشكوى وإنهاء الغلق المؤقت',
                    description: 'إنهاء تجميد الإضبارة التحقيقية وإعادة تفعيل مسار التحقيق.',
                };
                const nextCase = endInvestigationTemporaryClosureOnCase({
                    ...target,
                    timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), event],
                });
                set((state) => ({
                    casesById: {
                        ...state.casesById,
                        [caseId]: nextCase,
                    },
                }));
                return null;
            },
            reopenClosedCase: (caseId, reopenReason) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    const reason = String(reopenReason ?? '').trim();
                    if (!reason) return state;

                    const date = new Date().toISOString().slice(0, 10);
                    const event: TimelineEvent = {
                        id: createId(),
                        date,
                        type: 'investigation',
                        category: 'إعادة فتح دعوى لظهور دليل',
                        title: 'إعادة فتح الدعوى',
                        description: reason,
                    };

                    const withJourney = appendStageJourneyPhaseOverlay(
                        ensureStageJourneyOnCase(target).stageJourney ?? buildInitialStageJourney(),
                        'reopened_new_evidence',
                        {
                            transitionText: 'إعادة فتح — ظهور أدلة جديدة',
                            startedAt: date,
                            labelSuffix: 'أدلة جديدة',
                        },
                    );

                    const next: CriminalCase = reopenInvestigationDefendantsOnCase({
                        ...target,
                        isFrozen: false,
                        isInvestigationLocked: false,
                        isPrejudicialPostponed: false,
                        finalDecision: undefined,
                        investigationDossierClosure: undefined,
                        isArchived: undefined,
                        isDefaultJudgmentArchived: false,
                        stageJourney: withJourney,
                        timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), event],
                    });

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: next,
                        },
                    };
                }),
            initiateCassationProceeding: (caseId, payload) =>
                set((state) => {
                    const target = ensureStageJourneyOnCase(state.casesById[caseId] ?? ({} as CriminalCase));
                    if (!target?.id) return state;
                    if (target.isArchived || caseMutationBlocked(target)) return state;
                    if (target.cassationProceeding && target.cassationProceeding.status !== 'concluded') {
                        return state;
                    }
                    const cassationNumber = String(payload.cassationNumber ?? '').trim();
                    if (!cassationNumber) return state;
                    const next = applyCassationFiling(target, payload);
                    return { casesById: { ...state.casesById, [caseId]: next } };
                }),
            sendCaseToCassation: (caseId, data) =>
                set((state) => {
                    const target = ensureStageJourneyOnCase(state.casesById[caseId] ?? ({} as CriminalCase));
                    if (!target?.id || target.isArchived || caseMutationBlocked(target)) return state;
                    if (target.cassationProceeding && target.cassationProceeding.status !== 'concluded') {
                        return state;
                    }
                    const cassationNumber = String(data.cassationNumber ?? '').trim();
                    const sentDate = String(data.sentDate ?? '').trim();
                    const panelName = String(data.panelName ?? '').trim();
                    if (!cassationNumber || !sentDate || !panelName) return state;
                    const type: CassationType =
                        target.basics.crimeType === 'جناية'
                            ? 'federal_cassation_felony'
                            : 'criminal_cassation_misdemeanor';
                    const next = applyCassationFiling(target, {
                        cassationType: type,
                        filedAt: sentDate,
                        details: 'إرسال أوراق الطعن للتمييز',
                        cassationNumber,
                        panelName,
                        sentDate,
                        appellantDefendantIds: (target.defendants ?? []).map((d) => d.id),
                    });
                    return { casesById: { ...state.casesById, [caseId]: next } };
                }),
            updateCaseLocation: (caseId, newLocationType, newLocationName, reason) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;

                    const type = newLocationType === 'police' || newLocationType === 'court' ? newLocationType : null;
                    const name = String(newLocationName ?? '').trim();
                    const why = String(reason ?? '').trim();
                    if (!type || !name || !why) return state;

                    const date = new Date().toISOString().slice(0, 10);
                    const event: TimelineEvent = {
                        id: createId(),
                        date,
                        type: 'decision',
                        category: 'إحالة لعدم الاختصاص',
                        title: 'نقل الإضبارة لعدم الاختصاص',
                        description: `تم نقل الإضبارة إلى (${name}) بناءً على قرار عدم الاختصاص لسبب: ${why}`,
                    };

                    const isInvestigationStage = isInvestigationStoredStage(String(target.basics.stage ?? '').trim());
                    const nextLocation: CriminalCaseLocation =
                        type === 'police'
                            ? {
                                  ...target.location,
                                  investigationPapersAt: isInvestigationStage ? 'مركز شرطة' : target.location.investigationPapersAt,
                                  policeStationName: name,
                              }
                            : {
                                  ...target.location,
                                  courtName: name,
                                  investigationCourtName: isInvestigationStage ? name : target.location.investigationCourtName,
                              };

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                location: nextLocation,
                                timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), event],
                            },
                        },
                    };
                }),
            correctCasePartyName: (caseId, payload) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (caseIdentityCorrectionBlocked(target)) {
                        err = 'لا يمكن تصحيح البيانات — الإضبارة مقفلة أو مؤرشفة.';
                        return state;
                    }
                    const partyId = String(payload.partyId ?? '').trim();
                    const reasonErr = validateIdentityCorrectionReason(payload.reason);
                    if (reasonErr) {
                        err = reasonErr;
                        return state;
                    }
                    const why = String(payload.reason ?? '').trim();
                    const nextName = String(payload.newFullName ?? '').trim();
                    const nameValidation = validateIdentityCorrectionInput(nextName, why);
                    if (nameValidation) {
                        err = nameValidation;
                        return state;
                    }
                    const nextAddress =
                        payload.newAddress !== undefined ? String(payload.newAddress ?? '').trim() : undefined;
                    if (nextAddress !== undefined && nextAddress.length > 0 && nextAddress.length < 2) {
                        err = 'العنوان قصير جداً — تحقق من الإدخال.';
                        return state;
                    }
                    const nextPhone =
                        payload.partyKind === 'complainant' && payload.newPhone !== undefined
                            ? String(payload.newPhone ?? '').trim()
                            : undefined;
                    if (nextPhone !== undefined && nextPhone.length > 0) {
                        const phoneValidation = validatePartyPhoneCorrection(nextPhone);
                        if (phoneValidation) {
                            err = phoneValidation;
                            return state;
                        }
                    }

                    if (payload.partyKind === 'complainant') {
                        const list = Array.isArray(target!.complainants) ? target!.complainants : [];
                        const hit = list.find((c) => c.id === partyId);
                        if (!hit) {
                            err = 'المشتكي غير موجود.';
                            return state;
                        }
                        const priorName = String(hit.fullName ?? '').trim();
                        const priorPhone = String(hit.phone ?? '').trim();
                        const priorAddress = String(hit.address ?? '').trim();
                        const addressValue = nextAddress ?? priorAddress;
                        const phoneValue = nextPhone ?? priorPhone;
                        const nameChanged = priorName !== nextName;
                        const phoneChanged = priorPhone !== phoneValue;
                        const addressChanged = priorAddress !== addressValue;
                        if (!nameChanged && !phoneChanged && !addressChanged) {
                            err = 'لا توجد تغييرات — البيانات مطابقة للحالية.';
                            return state;
                        }
                        const changeLines = [
                            nameChanged
                                ? identityCorrectionTimelineDescription('اسم المشتكي', priorName, nextName, '')
                                : '',
                            phoneChanged
                                ? identityCorrectionTimelineDescription(
                                      'هاتف المشتكي',
                                      priorPhone,
                                      phoneValue,
                                      '',
                                  )
                                : '',
                            addressChanged
                                ? identityCorrectionTimelineDescription(
                                      'عنوان المشتكي',
                                      priorAddress,
                                      addressValue,
                                      '',
                                  )
                                : '',
                        ].filter(Boolean);
                        const nextComplainants = list.map((c) =>
                            c.id === partyId
                                ? {
                                      ...c,
                                      fullName: nextName,
                                      phone: phoneValue,
                                      address: addressValue,
                                  }
                                : c,
                        );
                        let nextCase = appendIdentityCorrectionTimelineEvent(
                            { ...target!, complainants: nextComplainants },
                            'تصحيح بيانات مشتكي',
                            [...changeLines, `السبب: ${why}`].join('\n'),
                        );
                        if (nameChanged) {
                            nextCase = syncCasePartyNameCorrection(nextCase, partyId, priorName, nextName);
                        }
                        return { casesById: { ...state.casesById, [caseId]: nextCase } };
                    }
                    const defs = Array.isArray(target!.defendants) ? target!.defendants : [];
                    const victim = defs.find((d) => d.id === partyId);
                    if (!victim) {
                        err = 'المتهم غير موجود.';
                        return state;
                    }
                    if ((victim as { isPartyRecordLocked?: boolean }).isPartyRecordLocked) {
                        err = 'سجل هذا المتهم مغلق — لا يمكن تعديل بياناته.';
                        return state;
                    }
                    const priorName = String(victim.fullName ?? '').trim();
                    const priorAddress = String(victim.address ?? '').trim();
                    const addressValue = nextAddress ?? priorAddress;
                    const nameChanged = priorName !== nextName;
                    const addressChanged = priorAddress !== addressValue;
                    if (!nameChanged && !addressChanged) {
                        err = 'لا توجد تغييرات — البيانات مطابقة للحالية.';
                        return state;
                    }
                    const changeLines = [
                        nameChanged
                            ? identityCorrectionTimelineDescription('اسم المتهم', priorName, nextName, '')
                            : '',
                        addressChanged
                            ? identityCorrectionTimelineDescription(
                                  'عنوان المتهم',
                                  priorAddress,
                                  addressValue,
                                  '',
                              )
                            : '',
                    ].filter(Boolean);
                    const nextDefendants = defs.map((d) =>
                        d.id === partyId ? { ...d, fullName: nextName, address: addressValue } : d,
                    );
                    let nextCase = appendIdentityCorrectionTimelineEvent(
                        { ...target!, defendants: nextDefendants },
                        'تصحيح بيانات متهم',
                        [...changeLines, `السبب: ${why}`].join('\n'),
                    );
                    if (nameChanged) {
                        nextCase = syncCasePartyNameCorrection(nextCase, partyId, priorName, nextName);
                    }
                    return { casesById: { ...state.casesById, [caseId]: nextCase } };
                });
                return err;
            },
            correctCaseCourtName: (caseId, payload) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (caseHeaderMetadataEditBlocked(target)) {
                        err = 'لا يمكن تصحيح البيانات — الإضبارة مؤرشفة أو مضمومة.';
                        return state;
                    }
                    const validation = validateIdentityCorrectionInput(payload.newCourtName, payload.reason);
                    if (validation) {
                        err = validation;
                        return state;
                    }
                    const nextName = String(payload.newCourtName ?? '').trim();
                    const why = String(payload.reason ?? '').trim();
                    const prior =
                        payload.scope === 'investigation'
                            ? String(target!.location.investigationCourtName ?? '').trim()
                            : String(target!.location.courtName ?? '').trim();
                    if (prior === nextName) {
                        err = 'اسم المحكمة مطابق للحالي.';
                        return state;
                    }
                    const nextLocation =
                        payload.scope === 'investigation'
                            ? { ...target!.location, investigationCourtName: nextName }
                            : { ...target!.location, courtName: nextName };
                    const label =
                        payload.scope === 'investigation' ? 'محكمة التحقيق' : 'محكمة الموضوع';
                    let nextCase = appendIdentityCorrectionTimelineEvent(
                        { ...target!, location: nextLocation },
                        `تصحيح ${label}`,
                        identityCorrectionTimelineDescription(label, prior, nextName, why),
                    );
                    nextCase = syncCaseCourtNameCorrection(nextCase, prior, nextName);
                    return { casesById: { ...state.casesById, [caseId]: nextCase } };
                });
                return err;
            },
            correctCaseDepositionLocation: (caseId, payload) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (caseHeaderMetadataEditBlocked(target)) {
                        err = 'لا يمكن تصحيح البيانات — الإضبارة مؤرشفة أو مضمومة.';
                        return state;
                    }
                    const validation = validateDepositionCorrectionInput(
                        payload.papersAt,
                        payload.entityName,
                        payload.reason,
                    );
                    if (validation) {
                        err = validation;
                        return state;
                    }
                    const papersAt = payload.papersAt;
                    const entityName = String(payload.entityName ?? '').trim();
                    const why = String(payload.reason ?? '').trim();
                    const prior = formatInvestigationDepositLocation(target!.location);
                    const nextLocation: CriminalCaseLocation =
                        papersAt === 'مكتب تحقيق قضائي'
                            ? {
                                  ...target!.location,
                                  investigationPapersAt: papersAt,
                                  investigationOfficeName: entityName,
                              }
                            : {
                                  ...target!.location,
                                  investigationPapersAt: papersAt,
                                  policeStationName: entityName,
                              };
                    const nextLabel = formatInvestigationDepositLocation(nextLocation);
                    if (prior === nextLabel) {
                        err = 'جهة الإيداع مطابقة للحالية.';
                        return state;
                    }
                    let nextCase = appendIdentityCorrectionTimelineEvent(
                        { ...target!, location: nextLocation },
                        'تصحيح جهة إيداع الإضبارة',
                        identityCorrectionTimelineDescription('جهة الإيداع', prior, nextLabel, why),
                    );
                    return { casesById: { ...state.casesById, [caseId]: nextCase } };
                });
                return err;
            },
            correctCaseLegalArticle: (caseId, payload) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (caseHeaderMetadataEditBlocked(target)) {
                        err = 'لا يمكن تصحيح البيانات — الإضبارة مؤرشفة أو مضمومة.';
                        return state;
                    }
                    const validation = validateIdentityCorrectionInput(payload.newArticle, payload.reason);
                    if (validation) {
                        err = validation;
                        return state;
                    }
                    const nextArticle = String(payload.newArticle ?? '').trim();
                    const why = String(payload.reason ?? '').trim();
                    const history = Array.isArray(target!.legalArticleHistory) ? target!.legalArticleHistory : [];
                    const prior =
                        String(target!.basics?.legalArticle ?? '').trim() ||
                        String(history[history.length - 1]?.article ?? '').trim();
                    if (prior === nextArticle) {
                        err = 'مادة الاتهام مطابقة للحالية.';
                        return state;
                    }
                    const caseStage = resolveCaseStageFromRecord(target!);
                    const change: LegalArticleChange = {
                        id: createId(),
                        article: nextArticle,
                        changedAtDate: new Date().toISOString().slice(0, 10),
                        changedBy: caseStage === 'investigation' ? 'investigation_judge' : 'trial_court',
                    };
                    const trialPatch =
                        caseStage === 'misdemeanor' || caseStage === 'felony'
                            ? { currentAccusationArticle: nextArticle }
                            : {};
                    const nextCase = syncCaseLegalArticleCorrection(
                        appendIdentityCorrectionTimelineEvent(
                            {
                                ...target!,
                                basics: { ...target!.basics, legalArticle: nextArticle },
                                legalArticleHistory: [...history, change],
                                ...trialPatch,
                            },
                            'تصحيح مادة الاتهام',
                            identityCorrectionTimelineDescription('مادة الاتهام', prior, nextArticle, why),
                        ),
                        prior,
                        nextArticle,
                    );
                    return { casesById: { ...state.casesById, [caseId]: nextCase } };
                });
                return err;
            },
            correctCaseReferenceNumbers: (caseId, payload) => {
                let err: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (caseHeaderMetadataEditBlocked(target)) {
                        err = 'لا يمكن تصحيح البيانات — الإضبارة مؤرشفة أو مضمومة.';
                        return state;
                    }
                    const why = String(payload.reason ?? '').trim();
                    const priorCourtNum = String(
                        target!.courtCaseNumber ?? target!.location.caseNumber ?? '',
                    ).trim();
                    const priorPp = String(target!.location.publicProsecutionNumber ?? '').trim();
                    const nextCourtNum =
                        payload.courtCaseNumber !== undefined
                            ? String(payload.courtCaseNumber ?? '').trim()
                            : priorCourtNum;
                    const nextPp =
                        payload.publicProsecutionNumber !== undefined
                            ? String(payload.publicProsecutionNumber ?? '').trim()
                            : priorPp;
                    const courtChanged = nextCourtNum !== priorCourtNum;
                    const ppChanged = nextPp !== priorPp;
                    if (!courtChanged && !ppChanged) {
                        err = 'أرقام الإضبارة مطابقة للحالية.';
                        return state;
                    }
                    const parts: string[] = [];
                    if (courtChanged) {
                        parts.push(
                            identityCorrectionTimelineDescription(
                                'رقم الدعوى',
                                priorCourtNum || '—',
                                nextCourtNum || '—',
                                why,
                            ),
                        );
                    }
                    if (ppChanged) {
                        parts.push(
                            identityCorrectionTimelineDescription(
                                'رقم الادعاء العام',
                                priorPp || '—',
                                nextPp || '—',
                                why,
                            ),
                        );
                    }
                    let nextCase: CriminalCase = {
                        ...target!,
                        courtCaseNumber: nextCourtNum || undefined,
                        location: {
                            ...target!.location,
                            caseNumber: nextCourtNum,
                            publicProsecutionNumber: nextPp,
                        },
                    };
                    nextCase = appendIdentityCorrectionTimelineEvent(
                        nextCase,
                        'تصحيح أرقام الإضبارة',
                        parts.join('\n'),
                    );
                    return { casesById: { ...state.casesById, [caseId]: nextCase } };
                });
                return err;
            },
            updateCaseStage: (caseId, stage) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (caseMutationBlocked(target)) return state;
                    const proceduralKey = caseStageFromStoredStage(stage);
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                basics: { ...target.basics, stage },
                                ...(proceduralKey ? { caseStage: proceduralKey } : {}),
                                ...(stage !== 'cassation_court' ? { isSentToCassation: false } : {}),
                            },
                        },
                    };
                }),
            updateLegalArticle: (caseId, change) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (caseMutationBlocked(target)) return state;
                    const history = Array.isArray(target.legalArticleHistory) ? target.legalArticleHistory : [];
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                legalArticleHistory: [...history, change],
                                basics: { ...target.basics, legalArticle: change.article },
                            },
                        },
                    };
                }),
            waivePrivateRight: (caseId, waiverDate) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (caseMutationBlocked(target)) return state;
                    const withWaiver: CriminalCase = {
                        ...target,
                        isPrivateRightWaived: true,
                        waiverDate,
                    };
                    const nextCase = applyPublicRightAfterPrivateWaiver(withWaiver);
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: nextCase,
                        },
                    };
                }),
            /**
             * ضَم إضبارة في الإضبارة الأم — عَملية ذَرّية كاملة.
             *
             * • التَّحقّقات الصَّارمة (مَرحلة، وجود، تَكرار، تَجميد، ...) في `prepareMergedCaseTransaction`.
             *   عند فَشل أي منها يُرفع `MergeValidationError` ولا تُكتَب أي بيانات.
             * • الترحيل يَتضمّن: التايم لاين، الإفادات، السجلات، الطلبات، القرارات
             *   مع ختم تَتبّع دائم (`mergedFromCaseId` / `mergedFromCaseNumber`).
             * • توحيد الأطراف مع منع التَّكرار (بناءً على الاسم النَّظيف).
             * • تَجميد الطِفل: `isFrozen=true, isArchived=true, dossierStatus='merged'`
             *   مع تَفريغ سجلاته (الأصل مَحفوظ بختم التَتبّع داخل الأم).
             */
            mergeCases: (parentCaseId, childCaseId, mergeReason) => {
                const casesById = get().casesById;
                const parentEntry = findCaseInStore(casesById, parentCaseId);
                const childEntry = findCaseInStore(casesById, childCaseId);
                if (!parentEntry) {
                    throw new MergeValidationError(
                        'missing_parent',
                        'تعذّر تنفيذ الضم: الإضبارة الأم غير موجودة.',
                    );
                }
                if (!childEntry) {
                    throw new MergeValidationError(
                        'missing_child',
                        'تعذّر تنفيذ الضم: الإضبارة المراد ضمها غير موجودة في النظام.',
                    );
                }
                const { updatedParent, frozenChild } = prepareMergedCaseTransaction(
                    parentEntry.record,
                    childEntry.record,
                    mergeReason,
                    { createId },
                    casesById,
                );

                set((state) => {
                    const parentInSet = state.casesById[parentEntry.storageKey];
                    const childInSet = state.casesById[childEntry.storageKey];
                    if (!parentInSet || !childInSet) return state;
                    return {
                        casesById: {
                            ...state.casesById,
                            [parentEntry.storageKey]: updatedParent,
                            [childEntry.storageKey]: frozenChild,
                        },
                    };
                });
            },
            severJuvenileDefendantToJuvenileCourt: (caseId, defendantId, date, details) => {
                set((state) => {
                    const source = state.casesById[caseId];
                    if (!source) return state;
                    if (source.isArchived) return state;

                    const defId = String(defendantId ?? '').trim();
                    const cleanDate = String(date ?? '').trim();
                    const cleanDetails = String(details ?? '').trim();
                    if (!defId || !cleanDate || !cleanDetails) return state;

                    const sourceDefendants = Array.isArray(source.defendants) ? source.defendants : [];
                    const juvenile = sourceDefendants.find((d) => d.id === defId);
                    if (!juvenile) return state;
                    if (!Boolean((juvenile as any).isJuvenile)) return state;

                    const event: TimelineEvent = {
                        id: createId(),
                        date: cleanDate,
                        type: 'decision',
                        category: 'تفريق دعوى المتهم الحدث ومسار محكمة الأحداث',
                        title: 'تفريق دعوى الحدث',
                        description: `تم تفريق دعوى المتهم الحدث (${String((juvenile as any).fullName ?? '').trim() || '—'}) لمسار محكمة الأحداث (جنح/جنايات حسب التصنيف). ${cleanDetails}`,
                        defendantIds: [defId],
                    };

                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...source,
                                timelineEvents: [...(Array.isArray(source.timelineEvents) ? source.timelineEvents : []), event],
                            },
                        },
                    };
                });

                return null;
            },
            concludeStage: (caseId, conclusion, referral) => {
                let blockingError: string | null = null;
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (target.isArchived || caseMutationBlocked(target)) {
                        blockingError = target.isArchived
                            ? 'الإضبارة مؤرشفة ولا يمكن إصدار قرار مرحلي عليها.'
                            : 'الإضبارة مجمدة ولا يمكن إصدار قرار مرحلي عليها.';
                        return state;
                    }
                    if (
                        conclusion.decisionType === 'referral' &&
                        target.unknownDefendant &&
                        !hasIdentifiedDefendant(target.defendants)
                    ) {
                        return state;
                    }

                    const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
                    const details = String(conclusion.details ?? '').trim();

                    if (conclusion.decisionType === 'case_split_fugitive_referral' && referral) {
                        const stageLabel = referral.stage;
                        if (stageLabel !== 'محكمة الجنح' && stageLabel !== 'محكمة الجنايات') return state;
                        const updated = applyCaseSplitFugitiveReferral(target, conclusion, {
                            courtName: referral.courtName,
                            caseNumber: referral.caseNumber,
                            stage: stageLabel,
                        });
                        return { casesById: { ...state.casesById, [caseId]: updated } };
                    }

                    if (conclusion.decisionType === 'postpone_article_183') {
                        const updated = applyPrejudicialPostponement(ensureStageJourneyOnCase(target), date, details);
                        return {
                            casesById: {
                                ...state.casesById,
                                [caseId]: { ...updated, finalDecision: conclusion },
                            },
                        };
                    }

                    if (conclusion.decisionType === 'default_judgment_issue') {
                        const updated = applyDefaultJudgmentArchive(
                            applyPersonalStagesFromConclusion(ensureStageJourneyOnCase(target), conclusion),
                            conclusion,
                        );
                        return { casesById: { ...state.casesById, [caseId]: updated } };
                    }

                    if (conclusion.decisionType === 'default_judgment_opposition') {
                        const updated = applyDefaultJudgmentOpposition(
                            applyPersonalStagesFromConclusion(ensureStageJourneyOnCase(target), conclusion),
                            conclusion,
                        );
                        return { casesById: { ...state.casesById, [caseId]: updated } };
                    }

                    if (conclusion.decisionType === 'temporary_release_insufficient_evidence') {
                        const scoped: StageConclusion = {
                            ...conclusion,
                            decisionType: 'release',
                        };
                        let nextCase = applyPersonalStagesFromConclusion(
                            { ...target, isFrozen: false, finalDecision: conclusion },
                            scoped,
                        );
                        const nodes = ensureStageJourneyOnCase(nextCase).stageJourney ?? buildInitialStageJourney();
                        const activeNodeId = resolveCurrentJourneyNodeId(nodes);
                        const event = stampProceduralNodeId(
                            {
                                id: createId(),
                                date,
                                type: 'decision',
                                category: 'إفراج مؤقت',
                                title: '🔒 إفراج مؤقت لعدم كفاية الأدلة',
                                description: details,
                                defendantIds: conclusion.defendantIds,
                            },
                            activeNodeId,
                        );
                        nextCase = {
                            ...nextCase,
                            stageJourney: nodes,
                            timelineEvents: [
                                ...(Array.isArray(nextCase.timelineEvents) ? nextCase.timelineEvents : []),
                                event,
                            ],
                        };
                        return { casesById: { ...state.casesById, [caseId]: nextCase } };
                    }

                    const cassationPayload = stageConclusionToCassationPayload(target, conclusion);
                    if (cassationPayload) {
                        const engineOutcome = recordCassationResult(ensureStageJourneyOnCase(target), cassationPayload);
                        if (engineOutcome.error) {
                            blockingError = engineOutcome.error;
                            return state;
                        }
                        let nextCase = engineOutcome.caseRecord;
                        const archiveAll = allDefendantsTerminal(nextCase.defendants ?? []);
                        if (
                            conclusion.decisionType === 'cassation_confirm' ||
                            conclusion.decisionType === 'cassation_quash_reduce' ||
                            conclusion.decisionType === 'cassation_quash_acquit_release'
                        ) {
                            nextCase = { ...nextCase, isArchived: archiveAll || nextCase.isArchived };
                        }
                        return {
                            casesById: {
                                ...state.casesById,
                                [caseId]: nextCase,
                            },
                        };
                    }

                    const routeActionId = proceduralActionFromConclusion(
                        conclusion.decisionType,
                        resolveCaseStageFromRecord(ensureStageJourneyOnCase(target)),
                        target.basics.crimeType,
                    );
                    if (routeActionId) {
                        const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
                        const details = String(conclusion.details ?? '').trim();
                        const courtNum =
                            conclusion.decisionType === 'misdemeanor_to_felony_jurisdiction' ||
                            conclusion.decisionType === 'felony_to_misdemeanor_jurisdiction' ||
                            conclusion.decisionType === 'cassation_quash_trial_misdemeanor' ||
                            conclusion.decisionType === 'cassation_quash_trial_felony'
                                ? String(referral?.caseNumber ?? target.courtCaseNumber ?? target.location.caseNumber ?? '').trim()
                                : undefined;
                        const courtName =
                            conclusion.decisionType === 'misdemeanor_to_felony_jurisdiction' ||
                            conclusion.decisionType === 'felony_to_misdemeanor_jurisdiction'
                                ? String(referral?.courtName ?? target.location.courtName ?? '').trim()
                                : undefined;
                        let sourceProceduralNodeId = '';
                        let originStage: CaseStage = resolveCaseStageFromRecord(target);
                        let updated: CriminalCase;
                        if (isProceduralStageRouteActionId(routeActionId)) {
                            const routed = applyProceduralRouteTransition(
                                target,
                                routeActionId,
                                date,
                                details,
                                { courtCaseNumber: courtNum, courtName },
                                conclusion.defendantIds,
                                conclusion.defendantStatusAtDecision,
                            );
                            updated = routed.caseRecord;
                            sourceProceduralNodeId = routed.sourceProceduralNodeId;
                            originStage = routed.originStage;
                        } else {
                            updated = applyProceduralActionToCase(target, routeActionId, date, details, {
                                courtCaseNumber: courtNum,
                                courtName,
                            });
                        }
                        updated = applyPersonalStagesFromConclusion(updated, conclusion);
                        const routeReq = buildProceduralRouteLawyerRequest(
                            updated,
                            conclusion,
                            routeActionId,
                            sourceProceduralNodeId,
                            originStage,
                        );
                        if (routeReq) {
                            const priorReqs = Array.isArray(updated.lawyerRequests)
                                ? updated.lawyerRequests
                                : [];
                            const nextReqs = [
                                ...priorReqs.filter((r) => r.id !== routeReq.id),
                                routeReq,
                            ];
                            updated = upsertJudicialDecisionOnCase(
                                { ...updated, lawyerRequests: nextReqs },
                                routeReq,
                            );
                        }
                        const terminalCassation =
                            conclusion.decisionType === 'cassation_confirm' ||
                            conclusion.decisionType === 'cassation_quash_reduce' ||
                            conclusion.decisionType === 'cassation_quash_acquit_release';
                        const archiveAll =
                            terminalCassation && allDefendantsTerminal(updated.defendants ?? []);
                        return {
                            casesById: {
                                ...state.casesById,
                                [caseId]: terminalCassation
                                    ? {
                                          ...updated,
                                          finalDecision: conclusion,
                                          isFrozen: true,
                                          isArchived: archiveAll,
                                      }
                                    : updated,
                            },
                        };
                    }

                    if (conclusion.decisionType === 'referral') {
                        if (!referral) return state;
                        const stageKey =
                            referral.stage === 'محكمة الجنايات'
                                ? 'felony'
                                : referral.stage === 'محكمة الجنح'
                                  ? 'misdemeanor'
                                  : null;
                        if (stageKey) {
                            const { isPartialReferral } = normalizeReferralDefendantIds(
                                target,
                                conclusion.defendantIds ?? [],
                            );
                            const updated = patchInvestigationReferralCase(
                                target,
                                stageKey,
                                referral.courtName,
                                referral.caseNumber,
                                String(conclusion.date ?? '').trim(),
                                String(conclusion.details ?? '').trim(),
                                conclusion.defendantStatusAtDecision,
                                conclusion.defendantIds ?? [],
                            );
                            return {
                                casesById: {
                                    ...state.casesById,
                                    [caseId]: isPartialReferral ? updated : { ...updated, finalDecision: conclusion },
                                },
                            };
                        }
                        const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
                        const details = String(conclusion.details ?? '').trim() || 'تمت الإحالة إلى المحكمة المختصة.';
                        const event: TimelineEvent = {
                            id: createId(),
                            date,
                            type: 'decision',
                            category: 'قرار إحالة إلى المحكمة المختصة',
                            title: 'إحالة',
                            description:
                                `${details}` +
                                `\nالمحكمة: ${String(referral.courtName ?? '').trim() || '—'} • الرقم: ${String(
                                    referral.caseNumber ?? '',
                                ).trim() || '—'}`,
                        };
                        const updated: CriminalCase = {
                            ...target,
                            basics: { ...target.basics, stage: referral.stage },
                            location: { ...target.location, courtName: referral.courtName, caseNumber: referral.caseNumber },
                            timelineEvents: [...(Array.isArray(target.timelineEvents) ? target.timelineEvents : []), event],
                        };
                        return {
                            casesById: {
                                ...state.casesById,
                                [caseId]: updated,
                            },
                        };
                    }

                    const isExpiration = conclusion.decisionType === 'expiration';

                    const shouldKeepEditableForMandatoryCassation =
                        conclusion.decisionType === 'conviction' &&
                        (conclusion.punishmentType === 'death' || conclusion.punishmentType === 'life');
                    const isTemporaryClosing = conclusion.decisionType === 'temporary_closing';
                    const isInvestigationClosure =
                        resolveCaseStageFromRecord(target) === 'investigation' &&
                        (conclusion.decisionType === 'closing' ||
                            conclusion.decisionType === 'temporary_closing');
                    const frozenTarget: CriminalCase = {
                        ...target,
                        isFrozen: isInvestigationClosure
                            ? target.isFrozen
                            : isTemporaryClosing || shouldKeepEditableForMandatoryCassation
                              ? false
                              : true,
                        finalDecision: conclusion,
                    };

                    if (isExpiration) {
                        const rawIds = Array.isArray(conclusion.defendantIds) ? conclusion.defendantIds : [];
                        const partyIds = rawIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0);
                        const defendantIds = resolveProceduralDefendantIds(
                            Array.isArray(target.complainants) ? target.complainants : [],
                            Array.isArray(target.defendants) ? target.defendants : [],
                            partyIds,
                            target.isMutualComplaint === true,
                        );
                        const reason = conclusion.expirationReason;
                        const scopedConclusion: StageConclusion = { ...conclusion, defendantIds };
                        let nextCase = applyPersonalStagesFromConclusion(frozenTarget, scopedConclusion);
                        const endDate = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
                        const idSet = new Set(defendantIds);
                        nextCase = {
                            ...nextCase,
                            defendants: (nextCase.defendants ?? []).map((d) => {
                                if (!idSet.has(d.id)) return normalizeDefendantPersonalFields(d);
                                const history = Array.isArray(d.detentionHistoryLog) ? d.detentionHistoryLog : [];
                                const openIdx = (() => {
                                    for (let i = history.length - 1; i >= 0; i--) {
                                        const it = history[i];
                                        if (it && !String(it.endDate ?? '').trim()) return i;
                                    }
                                    return -1;
                                })();
                                const nextHistory =
                                    openIdx >= 0
                                        ? history.map((h, i) => (i === openIdx ? { ...h, endDate } : h))
                                        : history;
                                return normalizeDefendantPersonalFields({
                                    ...d,
                                    detentionHistoryLog: nextHistory,
                                });
                            }),
                        };
                        return {
                            casesById: {
                                ...state.casesById,
                                [caseId]: {
                                    ...nextCase,
                                    isArchived: allDefendantsTerminal(nextCase.defendants ?? []),
                                },
                            },
                        };
                    }

                    if (conclusion.decisionType === 'conviction') {
                        const verdictDate = String(conclusion.date ?? '').trim();

                        const decisionDefendantIds = resolvePersonalStageTargets(target, conclusion);
                        const scopeIds = decisionDefendantIds.length ? new Set(decisionDefendantIds) : null;

                        const nextDefendants = (Array.isArray(target.defendants) ? target.defendants : []).map((d) => {
                            const inScope = scopeIds ? scopeIds.has(d.id) : true;
                            if (!inScope) return d;
                            if (d.status !== 'هارب') return d;
                            return {
                                ...d,
                                inAbsentiaDetails: {
                                    verdictDate,
                                    objectionDeadline: '',
                                    isObjectionFiled: false,
                                    notifiedDate: undefined,
                                    notificationMethod: undefined,
                                },
                            };
                        });

                        let convictionCase = upsertVerdictCardFromConclusion(
                            applyPersonalStagesFromConclusion(
                                { ...frozenTarget, defendants: nextDefendants },
                                conclusion,
                            ),
                            conclusion,
                        );
                        return {
                            casesById: {
                                ...state.casesById,
                                [caseId]: convictionCase,
                            },
                        };
                    }
                    let withParties = upsertVerdictCardFromConclusion(
                        applyPersonalStagesFromConclusion(frozenTarget, conclusion),
                        conclusion,
                    );
                    if (isInvestigationClosure) {
                        const closureIds = resolvePersonalStageTargets(target, conclusion);
                        const closedAt =
                            String(conclusion.date ?? '').trim() ||
                            new Date().toISOString().slice(0, 10);
                        withParties = applyInvestigationClosureFromStageConclusion(withParties, {
                            kind: conclusion.decisionType as 'closing' | 'temporary_closing',
                            defendantIds: closureIds,
                            closedAt,
                            conclusionId: conclusion.id,
                            details: conclusion.details,
                        });
                    }
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: withParties,
                        },
                    };
                });

                return blockingError;
            },
            referCaseToTrial: (caseId, referralData, newCourtData) => {
                set((state) => {
                    const source = state.casesById[caseId];
                    if (!source) return state;
                    if (!isInvestigationStoredStage(String(source.basics.stage ?? '').trim())) return state;
                    if (source.unknownDefendant && !hasIdentifiedDefendant(source.defendants)) return state;
                    const date = String(referralData?.decisionDate ?? '').trim();
                    const courtName = String(newCourtData?.courtName ?? '').trim();
                    const caseNumber = String(newCourtData?.caseNumber ?? '').trim();
                    if (
                        !referralPayloadValid({
                            courtName,
                            courtCaseNumber: caseNumber,
                            decisionDate: date,
                        })
                    ) {
                        return state;
                    }
                    const storedStageStr = String(newCourtData.stage ?? '').trim();
                    const referralTarget: InvestigationReferralTargetStage =
                        storedStageStr === JUVENILE_TRIAL_COURT_NAME
                            ? 'juvenile'
                            : caseStageFromStoredStage(storedStageStr) === 'felony'
                              ? 'felony'
                              : 'misdemeanor';
                    const updated = patchInvestigationReferralCase(
                        ensureStageJourneyOnCase(source),
                        referralTarget,
                        courtName,
                        caseNumber,
                        date,
                        `تمت الإحالة بموجب ${String(referralData?.decisionNumber ?? '').trim() || 'قرار إحالة'} بتاريخ ${date}.`,
                        'bailed',
                        [],
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [source.id]: updated,
                        },
                    };
                });
                return caseId;
            },
            createCaseFromDraft: () => {
                const stateBefore = get();
                const role = String(stateBefore.draft?.basics?.role ?? '').trim();
                const syncedDraft = syncDraftOfficeRepresentation(stateBefore.draft);
                const incoming = String((syncedDraft as any)?.basics?.ourRepresentation ?? '').trim();
                const normalized = normalizeOurRepresentation(incoming, role);
                const nextDraft: CriminalCaseDraft = {
                    ...syncedDraft,
                    basics: { ...syncedDraft.basics, ourRepresentation: normalized },
                };
                const preparedSnapshot = prepareDraftSnapshotForCaseCreation(nextDraft);
                const nowDate = new Date().toISOString().slice(0, 10);

                const caseId = createId();
                set((state) => {
                    const seededCase = seedCriminalCaseFromDraftSnapshot(
                        preparedSnapshot,
                        caseId,
                        nowDate,
                    );
                    return {
                        draft: nextDraft,
                        casesById: {
                            ...state.casesById,
                            [caseId]: seededCase,
                        },
                    };
                });
                return caseId;
            },
            deleteCase: (id) => {
                set((state) => {
                    const target = state.casesById[id];
                    if (!target) return state;
                    if (target.isArchived || isMergedDossierCase(target)) return state;
                    const next = { ...state.casesById };
                    delete next[id];
                    return { casesById: next };
                });
                // 🧹 حذف كل أحداث التقويم المربوطة بهذه الإضبارة (حتى لا تبقى يتيمة)
                try {
                    void import('@/app/services/calendarDossierSync').then((m) =>
                        m.removeAllBridgedEventsForEntity('criminal', id),
                    );
                } catch { /* silent */ }
            },
            resetDraft: () => set({ draft: makeInitialDraft() }),

            beginSeveranceFromDossier: (parentCaseId, defendantIds, options) => {
                const state = get();
                const parent = state.casesById[parentCaseId];
                if (!parent || parent.isArchived || parent.isSeveredChild) return false;
                if (investigationDossierMaterialMutationBlocked(parent)) return false;
                const parentComplainants = Array.isArray(parent.complainants) ? parent.complainants : [];
                const parentDefendantsForRule = Array.isArray(parent.defendants) ? parent.defendants : [];
                if (
                    !caseAllowsSeveranceOrDossierStrike(parentComplainants, parentDefendantsForRule) ||
                    !caseAllowsDefendantSeverance(parentDefendantsForRule)
                ) {
                    return false;
                }
                const allowed = new Set(
                    (Array.isArray(defendantIds) ? defendantIds : [])
                        .map((id) => String(id ?? '').trim())
                        .filter(Boolean),
                );
                if (!allowed.size) return false;
                const parentDefendants = Array.isArray(parent.defendants) ? parent.defendants : [];
                const selectable = filterSeveranceSelectableDefendants(parentDefendants);
                const selectableIdSet = new Set(selectable.map((d) => d.id));
                const snapshots = parentDefendants
                    .filter((d) => allowed.has(d.id) && selectableIdSet.has(d.id))
                    .map((d) => normalizeDefendantPersonalFields({ ...d }));
                if (!snapshots.length) return false;
                if (snapshots.length >= selectable.length) return false;

                const judicialDraft = options?.judicialSeveranceDraft;
                const draftDefendants = snapshots.map((d) => ({
                    ...d,
                    id: createId(),
                    investigationStatus: DEFAULT_INVESTIGATION_DEFENDANT_STATUS,
                }));
                const formDraft = buildSeveranceDraftFromParent(parent, draftDefendants);
                const lockedCaseStage =
                    normalizeLegacyCriminalStage(
                        String(parent.basics?.stage ?? '').trim() || 'مرحلة التحقيق',
                        parent.basics?.crimeType,
                    ) || 'مرحلة التحقيق';
                const lockedFormDraft: CriminalCaseDraft = {
                    ...formDraft,
                    basics: {
                        ...formDraft.basics,
                        stage: lockedCaseStage,
                    },
                };

                set({
                    draft: makeInitialDraft(),
                    pendingSeveranceContext: {
                        parentCaseId,
                        parentDefendantIds: snapshots.map((d) => d.id),
                        defendantSnapshots: snapshots,
                        initiatedAt: new Date().toISOString(),
                        judicialSeveranceDraft: judicialDraft,
                        severanceReason: options?.severanceReason,
                        formDraft: cloneDraftSnapshot(lockedFormDraft),
                        lockedCaseStage,
                    },
                });
                return true;
            },

            stashPendingSeveranceForm: () =>
                set((state) => {
                    const ctx = state.pendingSeveranceContext;
                    if (!ctx) return state;
                    const pristine = makeInitialDraft();
                    const draftHasNamedDefendant = (Array.isArray(state.draft.defendants)
                        ? state.draft.defendants
                        : []
                    ).some((d) => resolveDefendantFullName(d));
                    const savedFormHasNamedDefendant = (Array.isArray(ctx.formDraft?.defendants)
                        ? ctx.formDraft.defendants
                        : []
                    ).some((d) => resolveDefendantFullName(d));
                    const draftHasNamedComplainant = (Array.isArray(state.draft.complainants)
                        ? state.draft.complainants
                        : []
                    ).some((c) => String(c.fullName ?? '').trim());
                    const savedFormHasNamedComplainant = (Array.isArray(ctx.formDraft?.complainants)
                        ? ctx.formDraft.complainants
                        : []
                    ).some((c) => String(c.fullName ?? '').trim());
                    if (
                        (!draftHasNamedDefendant && savedFormHasNamedDefendant) ||
                        (!draftHasNamedComplainant && savedFormHasNamedComplainant)
                    ) {
                        return { draft: pristine };
                    }
                    return {
                        pendingSeveranceContext: {
                            ...ctx,
                            formDraft: cloneDraftSnapshot(state.draft),
                        },
                        draft: pristine,
                    };
                }),

            resumePendingSeveranceForm: () => {
                const ctx = get().pendingSeveranceContext;
                if (!ctx?.formDraft) return false;
                let nextDraft = cloneDraftSnapshot(ctx.formDraft);
                const snaps = ctx.defendantSnapshots;
                if (snaps.length && Array.isArray(nextDraft.defendants)) {
                    nextDraft = {
                        ...nextDraft,
                        defendants: nextDraft.defendants.map((d, index) => {
                            if (resolveDefendantFullName(d)) return coerceDefendantFullName(d);
                            const snapName = resolveDefendantFullName(snaps[index]);
                            return snapName ? { ...d, fullName: snapName } : coerceDefendantFullName(d);
                        }),
                    };
                }
                set({ draft: nextDraft });
                return true;
            },

            prepareNormalCriminalCaseForm: () =>
                set({
                    draft: makeInitialDraft(),
                    pendingSeveranceContext: null,
                }),

            commitSeveranceFromDossier: () => {
                const stateBefore = get();
                const ctx = stateBefore.pendingSeveranceContext;
                if (!ctx) return null;
                const parent = stateBefore.casesById[ctx.parentCaseId];
                if (!parent || parent.isArchived) return null;

                const lockedStage = ctx.lockedCaseStage;
                if (lockedStage && stateBefore.draft.basics.stage !== lockedStage) {
                    set({
                        draft: {
                            ...stateBefore.draft,
                            basics: {
                                ...stateBefore.draft.basics,
                                stage: lockedStage,
                            },
                        },
                    });
                }

                // 1) إنشاء الإضبارة الجديدة عبر المسار المعياري — يضمن normalization كاملاً.
                const newCaseId = get().createCaseFromDraft();
                if (!newCaseId) return null;

                const severedAt = new Date().toISOString().slice(0, 10);
                const allowedParentIds = new Set<string>(ctx.parentDefendantIds);

                set((state) => {
                    const child = state.casesById[newCaseId];
                    const parentRecord = state.casesById[ctx.parentCaseId];
                    if (!child || !parentRecord) return state;

                    // 2) ترحيل العناصر المرتبطة حصرياً بالمتهمين المنقولين.
                    const movedDefendantNames = buildSeveredDefendantNameSet(ctx.defendantSnapshots);
                    const migrationOrigin = {
                        caseId: parentRecord.id,
                        caseNumber: resolveOfficialCaseNumber(parentRecord) || parentRecord.id,
                    };

                    const parentRequests = partitionLawyerRequestsForSeverance(
                        parentRecord.lawyerRequests,
                        allowedParentIds,
                        parentRecord,
                    );
                    const parentJudicialDecisions = partitionJudicialDecisionsForSeverance(
                        parentRecord.judicialDecisions ?? [],
                        allowedParentIds,
                        parentRecord,
                    );
                    const parentInvestigationLogs = partitionInvestigationLogsForSeverance(
                        parentRecord.investigationLogs,
                        allowedParentIds,
                        parentRecord,
                    );
                    const parentTimelinePartition = partitionTimelineEventsForSeverance(
                        parentRecord.timelineEvents,
                        allowedParentIds,
                        parentRecord,
                    );
                    // الإفادات مفتاحها الاسم لا المعرّف — نُرحّل إفادات المتهمين المنقولين فقط
                    // إذا كانت من نوع «defendant» واسم المُدلي مطابق لأحد المنقولين.
                    const parentStatements = Array.isArray(parentRecord.statements)
                        ? parentRecord.statements
                        : [];
                    const migratedStatements = parentStatements.filter((s) =>
                        statementBelongsToSeveredDefendants(s, movedDefendantNames),
                    );
                    const keptStatements = parentStatements.filter(
                        (s) => !migratedStatements.includes(s),
                    );

                    // 3) حذف المتهمين المنقولين من الأم نهائياً.
                    const remainingParentDefendants = (Array.isArray(parentRecord.defendants)
                        ? parentRecord.defendants
                        : []
                    ).filter((d) => !allowedParentIds.has(d.id));

                    // 4) ختم حدث «تفريق الدعوى» على الأم.
                    const judicialNote = String(ctx.judicialSeveranceDraft?.lawyerNote ?? '').trim();
                    const severanceEvent: TimelineEvent = {
                        id: createId(),
                        date: String(ctx.judicialSeveranceDraft?.requestDate ?? '').trim() || severedAt,
                        type: 'decision',
                        category: 'تفريق الدعاوى',
                        title: 'تفريق وشطر الإضبارة',
                        description: [
                            judicialNote || null,
                            `تم شطر إضبارة المتهمين: ${[...movedDefendantNames].join('، ') || '—'} إلى إضبارة مستقلة (${resolveOfficialCaseNumber(child) || child.id}).`,
                        ]
                            .filter(Boolean)
                            .join('\n'),
                    };

                    const priorChildren = Array.isArray(parentRecord.severedChildCaseIds)
                        ? parentRecord.severedChildCaseIds
                        : [];

                    const scrubRemovedIds = allowedParentIds;
                    let updatedParent: CriminalCase = {
                        ...parentRecord,
                        defendants: remainingParentDefendants,
                        statements: keptStatements,
                        timelineEvents: [...parentTimelinePartition.kept, severanceEvent],
                        lawyerRequests: scrubRemovedPartyIdsFromLawyerRequests(
                            parentRequests.kept,
                            scrubRemovedIds,
                        ),
                        investigationLogs: parentInvestigationLogs.kept,
                        judicialDecisions:
                            parentRecord.judicialDecisions === undefined
                                ? undefined
                                : scrubRemovedPartyIdsFromJudicialDecisions(
                                      parentJudicialDecisions.kept,
                                      scrubRemovedIds,
                                  ),
                        severedChildCaseIds: [...priorChildren, child.id],
                    };
                    updatedParent = appendJudicialSeveranceRequestOnParent(updatedParent, ctx, {
                        childCaseId: child.id,
                        parentDefendantIds: [...ctx.parentDefendantIds],
                    });

                    const severanceReason = ctx.severanceReason;
                    const patchedChildDefendants = (Array.isArray(child.defendants)
                        ? child.defendants
                        : []
                    ).map((d, index) => {
                        let next: CriminalDefendant;
                        if (resolveDefendantFullName(d)) {
                            next = coerceDefendantFullName(d);
                        } else {
                            const snap = ctx.defendantSnapshots[index];
                            const snapName = snap ? resolveDefendantFullName(snap) : '';
                            next = snapName
                                ? { ...d, fullName: snapName }
                                : coerceDefendantFullName(d);
                        }
                        if (
                            severanceReason === 'defendant_absconding' &&
                            next.status !== 'هارب'
                        ) {
                            next = { ...next, status: 'هارب' as DefendantStatus };
                        }
                        if (normalizeInvestigationDefendantStatus(next.investigationStatus) !== 'active') {
                            next = {
                                ...next,
                                investigationStatus: DEFAULT_INVESTIGATION_DEFENDANT_STATUS,
                            };
                        }
                        return next;
                    });

                    const partyIdMaps = buildSeverancePartyIdMaps(
                        parentRecord,
                        patchedChildDefendants,
                        ctx.parentDefendantIds,
                        child.complainants,
                    );
                    const migratedRequests = parentRequests.migrated.map((req) =>
                        remapLawyerRequestForSeveredChild(req, partyIdMaps, migrationOrigin),
                    );
                    const migratedDecisions = parentJudicialDecisions.migrated.map((decision) =>
                        remapJudicialDecisionForSeveredChild(decision, partyIdMaps, migrationOrigin),
                    );
                    const migratedLogs = parentInvestigationLogs.migrated.map((log) =>
                        remapInvestigationLogForSeveredChild(log, partyIdMaps, migrationOrigin),
                    );
                    const migratedTimeline = parentTimelinePartition.migrated.map((event) =>
                        remapTimelineEventForSeveredChild(event, partyIdMaps, migrationOrigin),
                    );

                    const updatedChild: CriminalCase = {
                        ...child,
                        defendants: patchedChildDefendants,
                        parentCaseId: parentRecord.id,
                        isSeveredChild: true,
                        severedAt,
                        ...(severanceReason
                            ? {
                                  severanceReason,
                                  ...(ctx.severanceReasonDetail
                                      ? { severanceReasonDetail: ctx.severanceReasonDetail }
                                      : {}),
                                  stageJourney: buildSeveredChildStageJourney(
                                      severanceReason,
                                      severedAt,
                                  ),
                              }
                            : {}),
                        statements: [
                            ...(Array.isArray(child.statements) ? child.statements : []),
                            ...migratedStatements,
                        ],
                        timelineEvents: [
                            ...(Array.isArray(child.timelineEvents) ? child.timelineEvents : []),
                            ...migratedTimeline,
                        ],
                        lawyerRequests: [
                            ...(Array.isArray(child.lawyerRequests) ? child.lawyerRequests : []),
                            ...migratedRequests,
                        ],
                        investigationLogs: [
                            ...(Array.isArray(child.investigationLogs) ? child.investigationLogs : []),
                            ...migratedLogs,
                        ],
                        judicialDecisions:
                            migratedDecisions.length || child.judicialDecisions
                                ? [
                                      ...(Array.isArray(child.judicialDecisions)
                                          ? child.judicialDecisions
                                          : []),
                                      ...migratedDecisions,
                                  ]
                                : child.judicialDecisions,
                    };

                    return {
                        casesById: {
                            ...state.casesById,
                            [parentRecord.id]: updatedParent,
                            [newCaseId]: updatedChild,
                        },
                        pendingSeveranceContext: null,
                        draft: makeInitialDraft(),
                    };
                });

                return newCaseId;
            },

            cancelPendingSeverance: () => {
                set({ pendingSeveranceContext: null, draft: makeInitialDraft() });
            },

            setPendingSeveranceReason: (reason, detail) =>
                set((state) => {
                    const ctx = state.pendingSeveranceContext;
                    if (!ctx) return state;
                    const nextDetail =
                        reason === 'other'
                            ? String(detail ?? ctx.severanceReasonDetail ?? '').trim() || undefined
                            : undefined;
                    return {
                        pendingSeveranceContext: {
                            ...ctx,
                            severanceReason: reason,
                            severanceReasonDetail: nextDetail,
                        },
                    };
                }),
        }),
        {
            name: CRIMINAL_STORE_KEY,
            version: CRIMINAL_STORE_PERSIST_VERSION,
            migrate: migrateCriminalPersistState,
            storage: criminalPersistStorage,
            partialize: criminalStorePartialize,
        },
    ),
);

installCriminalStorePersistMergeListener(useCriminalStore.setState);
