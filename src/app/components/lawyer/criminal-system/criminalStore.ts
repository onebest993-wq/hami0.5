import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import SecureStoreService from '@/app/services/SecureStoreService';
import { createSecureJSONStorage } from '@/app/services/securePersistStorage';
import {
    CRIMINAL_STORAGE_PATCHED_EVENT,
    loadCriminalCasesRaw,
} from '@/app/utils/criminalCasesStorage';
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
import { isStageExpirationReason, type StageExpirationReason } from './stageExpirationReasons';
import {
    buildTrashLabel,
    normalizeTrashBin,
    type CriminalTrashItem,
    type CriminalTrashItemKind,
    type ProceduralSubItemTrashSnapshot,
} from './criminalCaseTrash';
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
    isInvestigationSeveranceJudicialTemplate,
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
import {
    MergeValidationError,
    prepareMergedCaseTransaction,
    revertCaseMergeAfterCassationAnnulment,
} from './caseMergeMigration';
import { findCaseInStore } from './caseMergeTimeline';
export { MergeValidationError } from './caseMergeMigration';
export type { MergeValidationCode } from './caseMergeMigration';

export type CriminalLawyerRole = 'وكيل المشتكي' | 'وكيل المشكو منه' | 'شكوى متقابلة';
export type OurRepresentation = 'complainant_side' | 'defendant_side';
export type PhysicalLocation = 'judge_desk' | 'investigator_room' | 'prosecution' | 'police_station' | 'archive' | 'custom';
export type CriminalCaseStage =
    | 'مرحلة التحقيق'
    | 'تحقيق الأحداث'
    | 'محكمة الأحداث'
    | 'محكمة الجنح'
    | 'محكمة الجنايات'
    | 'cassation_court';
export type CrimeType = 'مخالفة' | 'جنحة' | 'جناية';
export type DefendantStatus =
    | 'حر'
    | 'مستقدم'
    | 'هارب'
    | 'ملقى القبض عليه'
    | 'موقوف'
    | 'مكفل'
    | 'bailed_pending_appeal'
    | 'psychiatric_eval'
    | 'provisional_delivery'
    | 'behavioral_surveillance'
    | 'juvenile_detention'
    | 'متوفى'
    | 'مشمول بالعفو';
export type InvestigationPapersAt = '' | 'مركز شرطة' | 'مكتب تحقيق قضائي';

/** نوع الكفالة: مالية (مبلغ) أو شخص ضامن (كفلاء بأسمائهم). */
export type GuarantorBailKind = 'financial' | 'personal';

/** كفيل ضامن مفرد ضمن قائمة الكفلاء. */
export type GuarantorPerson = {
    id: string;
    fullName: string;
};

export type GuarantorDetails = {
    bailAmount: string;
    guarantorInfo: string;
    /** نوع الكفالة المهيكلة — جديد. */
    kind?: GuarantorBailKind;
    /** أسماء الكفلاء — يُستخدم عند kind='personal'. */
    guarantors?: GuarantorPerson[];
};

export function makeEmptyGuarantorDetails(): GuarantorDetails {
    return { bailAmount: '', guarantorInfo: '' };
}

function normalizeGuarantorPersonList(raw: unknown): GuarantorPerson[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const out: GuarantorPerson[] = [];
    raw.forEach((entry, idx) => {
        if (!entry || typeof entry !== 'object') return;
        const o = entry as Record<string, unknown>;
        const fullName = String(o.fullName ?? o.name ?? '').trim();
        if (!fullName) return;
        const id = String(o.id ?? '').trim() || `g_${Date.now()}_${idx}`;
        out.push({ id, fullName });
    });
    return out.length ? out : undefined;
}

function normalizeGuarantorBailKind(raw: unknown): GuarantorBailKind | undefined {
    const v = String(raw ?? '').trim();
    if (v === 'financial' || v === 'personal') return v;
    return undefined;
}

export function normalizeGuarantorDetails(raw: unknown): GuarantorDetails | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Record<string, unknown>;
    if ('bailAmount' in o || 'guarantorInfo' in o) {
        const bailAmount = String(o.bailAmount ?? '').trim();
        const guarantorInfo = String(o.guarantorInfo ?? '').trim();
        const kind = normalizeGuarantorBailKind(o.kind);
        const guarantors = normalizeGuarantorPersonList(o.guarantors);
        if (!bailAmount && !guarantorInfo && !kind && !guarantors) return undefined;
        const result: GuarantorDetails = { bailAmount, guarantorInfo };
        if (kind) result.kind = kind;
        if (guarantors) result.guarantors = guarantors;
        return result;
    }
    const legacyName = String(o.name ?? '').trim();
    const legacyAmount = Number(o.amount);
    const legacyType = String(o.type ?? '').trim();
    const legacyNotes = String(o.forfeitureNotes ?? '').trim();
    const legacyForfeited = o.isForfeited === true;
    const bailAmount =
        Number.isFinite(legacyAmount) && legacyAmount > 0
            ? String(legacyAmount)
            : String(o.bailAmount ?? '').trim();
    const infoParts: string[] = [];
    if (legacyName) infoParts.push(legacyName);
    if (legacyType) infoParts.push(`(${legacyType})`);
    if (legacyForfeited) infoParts.push('⛔ مصادرة الكفالة');
    if (legacyNotes) infoParts.push(legacyNotes);
    const guarantorInfo = infoParts.join(' — ').trim();
    if (!bailAmount && !guarantorInfo) return undefined;
    return { bailAmount, guarantorInfo };
}

export function isGuarantorForfeited(raw: unknown): boolean {
    const g = normalizeGuarantorDetails(raw);
    return Boolean(g?.guarantorInfo.includes('مصادرة'));
}

/**
 * يُعيد قائمة آمنة من الأموال المحجوزة بعد إعادة التحميل من التخزين الدائم.
 *
 * يُقصى أي صنف بدون وصف نصّي حقيقي. الحقول الاختيارية تُنظَّف إلى strings مقصوصة
 * أو تُحذف إذا كانت فارغة لئلا تتسرّب قيم "" تتعارض مع `?:` في النوع.
 */
export function normalizeSeizedAssets(raw: unknown): SeizedAsset[] {
    if (!Array.isArray(raw)) return [];
    return raw
        .map((a: any) => {
            const description = String(a?.description ?? '').trim();
            if (!description) return null;
            const out: SeizedAsset = {
                id: String(a?.id ?? createId()),
                description,
                createdAt: String(a?.createdAt ?? '').trim() || new Date().toISOString(),
            };
            const ref = String(a?.referenceNumber ?? '').trim();
            if (ref) out.referenceNumber = ref;
            const dt = String(a?.seizureDate ?? '').trim();
            if (dt) out.seizureDate = dt;
            const notes = String(a?.notes ?? '').trim();
            if (notes) out.notes = notes;
            const src = String(a?.sourceRequestId ?? '').trim();
            if (src) out.sourceRequestId = src;
            return out;
        })
        .filter((x): x is SeizedAsset => x !== null);
}

export type CriminalComplainant = {
    id: string;
    fullName: string;
    address: string;
    phone: string;
    /** المكتب يُمثّل هذا الطرف (توكل) — يُحدَّد من الواجهة بجانب الاسم. */
    isOfficeClient?: boolean;
    isJuvenile?: boolean;
    isUnderSeven?: boolean;
    birthDate?: string;
    guardianName?: string;
    guardianRelationship?: string;
    /**
     * ⚖️ ازدواجية الصفة — «شكوى متقابلة» على مستوى المشتكي.
     * عند `true` يَكتسب هذا المشتكي صفة المتهم أيضاً (يبقى داخل مصفوفة complainants
     * ولا يُنقل إلى defendants — منع تخريب الداتا)، وتُستخدم الحقول accused* أدناه
     * لتخزين حالته الإجرائية كمتهم بشكل مستقل عن صفته الأصلية كمشتكي.
     *
     * ملاحظة: عند `caseRecord.isMutualComplaint === true` كل المشتكين يُعامَلون
     * كأنّ لديهم `isCrossComplaint = true` (سلوك تراثي).
     */
    isCrossComplaint?: boolean;
    /**
     * متهمون مُستهدفون بشكوى هذا المشتكي المتقابلة (إنشاء الإضبارة).
     * `undefined` = لا شكوى متقابلة على هذا المشتكي.
     * قائمة غير فارغة = الأطراف المقصودون بالشكوى المتقابلة فقط (متهمون و/أو مشتكون).
     */
    counterComplaintTargetDefendantIds?: string[];
    /** حالة المشتكي كمتهم (موقوف/مكفل/حر/هارب…) — منفصلة عن صفته كمشتكي. */
    accusedStatus?: DefendantStatus | '';
    /** جهة الإيداع للتوقيف — مرتبطة بـ accusedStatus. */
    accusedDetentionAuthority?: string;
    /** تاريخ انتهاء التوقيف لهذا المشتكي حين يكون موقوفاً. */
    accusedDetentionExpiryDate?: string;
    /** سجل دفعات التوقيف — مماثل لـ CriminalDefendant.detentionHistoryLog. */
    accusedDetentionHistoryLog?: DetentionHistory[];
    /** مجموع أيام التوقيف — للحساب التراكمي. */
    accusedTotalDetentionDays?: number;
    /** تفاصيل الكفالة عند كون المشتكي «مكفلاً» كمتهم. */
    accusedGuarantorDetails?: GuarantorDetails;
    /**
     * 🔒 قُفل سجل المشتكي بصفته متهماً (شكوى متقابلة) — يُفعَّل عند توثيق الوفاة
     *    أو سقوط الدعوى الفرعية بحقّه. مَفهومه مماثل لـ `isPartyRecordLocked` على المتهم.
     */
    accusedIsPartyRecordLocked?: boolean;
    /** مَرحلة المشتكي الشخصية بصفته متهماً (مثل lawsuit_dropped_death عند الوفاة). */
    accusedPersonalStage?: string;
    /**
     * 📦 محجوزات الأموال على المشتكي المتقابل (يَوازي `seizedAssets` للمتهم). يَظهر
     * فقط عندما يَكون المشتكي «هارباً» في شكوى متقابلة وتُصدر بحقّه أوامر حَجز.
     */
    accusedSeizedAssets?: SeizedAsset[];
};

export interface DetentionHistory {
    id: string;
    location: string;
    startDate: string;
    endDate?: string;
}

/**
 * مال محجوز على المتهم الهارب (م 121 أصول).
 *
 * يُنشَأ عبر قرار قاضٍ من نوع «حجز الأموال» داخل تبويب «قرارات القاضي»،
 * ويُلصق بالمتهم الهارب فقط. يمكن تعدّد الأموال على نفس المتهم،
 * ويمكن «فكّ الحجز» عن صنف واحد أو جماعياً عن كل ما لديه.
 */
export interface SeizedAsset {
    /** معرّف داخلي لكل صنف محجوز. */
    id: string;
    /** وصف المال المحجوز (مثال: «سيارة BMW X5 موديل 2020»، «حساب مصرفي رقم …»). */
    description: string;
    /** رقم كتاب الحجز / المرجع. */
    referenceNumber?: string;
    /** تاريخ تنفيذ الحجز. */
    seizureDate?: string;
    /** ملاحظات إضافية. */
    notes?: string;
    /** معرّف الطلب/القرار الذي أنشأ هذا الحجز (LawyerRequest.id) — للتتبّع. */
    sourceRequestId?: string;
    /** ختم زمني للإنشاء — يُحدَّد ساعة الحفظ (ISO). */
    createdAt: string;
}

export type InAbsentiaDetails = {
    verdictDate: string;
    objectionDeadline: string;
    isObjectionFiled: boolean;
    notifiedDate?: string;
    notificationMethod?: string;
};

export type SocialInquiryWorkflowStatus = 'not_requested' | 'under_preparation' | 'submitted';

export type JuvenileDetentionPlacement = 'juvenile_observation' | 'rehabilitation_school';

export type SocialInquiryReport = {
    workflowStatus?: SocialInquiryWorkflowStatus;
    isAttached: boolean;
    receivedDate?: string;
    investigatorName?: string;
    recommendations?: string;
};

export type CriminalDefendant = {
    id: string;
    fullName: string;
    address: string;
    birthYear: string;
    status: DefendantStatus | '';
    detentionAuthority: string;
    detentionExpiryDate: string;
    detentionHistoryLog: DetentionHistory[];
    totalDetentionDays: number;
    hasFelonyCourtPermit?: boolean;
    guarantorDetails?: GuarantorDetails;
    inAbsentiaDetails?: InAbsentiaDetails;
    /** قائمة الأموال المحجوزة على المتهم الهارب — تُملأ عبر قرار «حجز الأموال». */
    seizedAssets?: SeizedAsset[];
    /** المكتب يُمثّل هذا الطرف (توكل) — يُحدَّد من الواجهة بجانب الاسم. */
    isOfficeClient?: boolean;
    isJuvenile?: boolean;
    isUnderSeven?: boolean;
    birthDate?: string;
    guardianName?: string;
    guardianRelationship?: string;
    socialInquiryReport?: SocialInquiryReport;
    /** المصير الإجرائي الفردي داخل الإضبارة الموحدة. */
    personalStage?: DefendantPersonalStage;
    /** قفل بيانات الطرف (شمع أحمر) — مثلاً بعد وفاة المتهم. */
    isPartyRecordLocked?: boolean;
    /** حالة المتهم داخل التحقيق — تصفية الخصوم (افتراضي active). */
    investigationStatus?: InvestigationDefendantStatus;
    /** هوية المتهم مجهولة حتى «كشف الهوية». */
    isIdentityUnknown?: boolean;
};

/** فئة العمر الإجرائية للمتهم المعلوم — بالغ (افتراضي) | حدث | دون 7 سنوات. */
export type DefendantAgeCategory = 'adult' | 'juvenile' | 'under_seven';

export type StatementHighlightColor = 'red' | 'blue' | 'yellow';

export interface StatementContentHighlight {
    start: number;
    end: number;
    color: StatementHighlightColor;
}

export interface Statement {
    id: string;
    date: string;
    giverType: 'complainant' | 'defendant' | 'witness' | 'informant';
    giverName: string;
    content: string;
    notes?: string;
    /** مقاطع مميزة داخل نص الإفادة (توضيح المحامي). */
    contentHighlights?: StatementContentHighlight[];
    proceduralNodeId?: string;
    isJudiciallyRatified?: boolean;
    /** مكان تدوين الإفادة — مرحلة التحقيق (ضابط تحقيق / محقق قضائي). */
    statementRecordingPlace?: 'investigation_officer' | 'judicial_investigator';
    /** اسم الشاهد الثلاثي — حقل سجل الإفادات فقط. */
    witnessName?: string;
    /** عمر / سكن / صلة قرابة — اختياري للشاهد. */
    witnessDetails?: string;
    /**
     * @deprecated — استُبدل بـ witnessPartySide + witnessPartyIds
     *  - `prosecution`: شاهد إثبات (يَدعم الادعاء).
     *  - `defense`:     شاهد نفي  (يَدعم الدفاع).
     */
    witnessKind?: 'prosecution' | 'defense';
    /** جهة الشهادة — مشتكي أو متهم (لا يجتمع الطرفان). */
    witnessPartySide?: 'complainant' | 'defendant';
    /** الأطراف التي يخصّهم الشاهد — اختيار متعدد ضمن جهة واحدة. */
    witnessPartyIds?: string[];
    /** مُعَيَّن بعد الضم: مُعرّف الإضبارة الأصلية التي رُحِّلت منها هذه الإفادة. */
    mergedFromCaseId?: string;
    /** مُعَيَّن بعد الضم: الرقم الرسمي للإضبارة الأصلية (لشارة التتبّع). */
    mergedFromCaseNumber?: string;
}

export type OtherEvidenceItem = {
    id: string;
    evidenceType: string;
    isLinkedToDossier: boolean;
    attachmentDate?: string;
    notes: string;
    proceduralNodeId?: string;
    /** تاريخ الإنشاء — للترتيب عند غياب تاريخ الإرفاق. */
    createdAt?: string;
};

export interface TimelineEvent {
    id: string;
    date: string;
    type: 'investigation' | 'court_session' | 'decision';
    category: string;
    title: string;
    description: string;
    nextDate?: string;
    defendantIds?: string[];
    /**
     * ⚖️ مُعرّفات المشتكين المتقابلين (ازدواجية الصفة) المُرتبطين بهذا الحدث.
     * يُملأ حصراً عند تَفعيل الشكوى المتقابلة. يَسمح بِفلتَرة التايملاين بطَرف
     * من جانِبَي القضية دون نَقل أيّ كائن بين المَصفوفات.
     */
    complainantIds?: string[];
    appealedDecision?: string;
    postponementReason?: string;
    guarantorDetails?: GuarantorDetails;
    extensionDays?: number;
    socialWorkerPresent?: boolean;
    suspendedExecution?: boolean;
    probationYears?: number;
    transferredToStage?: CriminalCaseStage;
    notifiedDate?: string;
    notificationMethod?: string;
    summonsStatus?: 'served_valid' | 'not_served_invalid' | 'served_to_official';
    summonsDate?: string;
    summonsDocumentRef?: string;
    detentionPlacement?: JuvenileDetentionPlacement;
    isConfidential?: boolean;
    /** طرف مستهدف للإجراء المخصص (تحقيق) — null = إجراء غير شخصي. */
    targetDefendantId?: string | null;
    /** حقل عرض يُحقن في العرض الموحَّد لتايم لاين الأم (true إذا كان مُرحَّلاً). */
    isMerged?: boolean;
    /** يُكتب عند نَقل أحداث «تفريق الدعاوى» إلى الإضبارة التابعة (severance) — تتبّع دائم. */
    originCaseNumber?: string;
    originCaseId?: string;
    /** يُكتب عند تَرحيل الحدث من إضبارة مَضمومة إلى الإضبارة الأم (merge) — تتبّع دائم. */
    mergedFromCaseId?: string;
    mergedFromCaseNumber?: string;
    /** عقدة المسار النشطة عند إنشاء الحدث. */
    proceduralNodeId?: string;
    /** رقم الجلسة — محاكمة. */
    sessionNumber?: string;
    /** اسم القاضي / الهيئة — محاكمة. */
    judgeOrPanelName?: string;
    /** طلبات الجلسة القادمة — محاكمة. */
    nextSessionRequests?: string;
}

export interface LegalArticleChange {
    id: string;
    article: string;
    changedAtDate: string;
    changedBy: 'police' | 'investigation_judge' | 'trial_court';
}

export type ExhibitLifecycleStatus = 'seized_at_station' | 'sent_to_lab' | 'lab_result_received';

export interface InvestigationLog {
    id: string;
    date: string;
    category: 'official_letter' | 'forensic_report' | 'site_inspection' | 'exhibit_seizure' | 'other';
    title: string;
    details: string;
    status: 'awaiting_response' | 'response_received' | 'returned_for_revision';
    attachmentRef?: string;
    defendantIds?: string[];
    /** ربط إجباري بالخصم — معرّف الطرف في الإضبارة. */
    linkedPartyId?: string;
    /** رقم محضر الضبط — عند تصنيف «ضبط مبرز». */
    seizureRecordNumber?: string;
    /** رقم وتاريخ كتاب الطب العدلي — عند تصنيف «طب عدلي». */
    forensicLetterRef?: string;
    /** وصف المبرز الدقيق. */
    exhibitDescription?: string;
    /** الكمية / العدد. */
    exhibitQuantity?: string;
    /** دورة حياة المبرز — خزانة الأدلة فقط. */
    exhibitLifecycle?: ExhibitLifecycleStatus;
    /** تاريخ ورود الجواب — مخاطبات (تحديث أمامي فقط). */
    responseReceivedAt?: string;
    responseNotes?: string;
    /** يُكتب عند ترحيل السجل من إضبارة مَضمومة إلى الأم (merge) — تتبّع دائم. */
    mergedFromCaseId?: string;
    mergedFromCaseNumber?: string;
}

export interface LawyerRequest {
    id: string;
    requestDate: string;
    type: string;
    lawyerNote: string;
    status: 'pending' | 'approved' | 'rejected' | 'executed';
    judgeMargin?: string;
    decisionDate?: string;
    defendantIds?: string[];
    /** قفل نهائي — لا تعديل بعد التأكيد. */
    isLocked?: boolean;
    /** @deprecated — يُحوَّل إلى isLocked عند التحميل. */
    decisionArchived?: boolean;
    proceduralNodeId?: string;
    /** قالب نوع الطلب من القائمة (بما فيها «إجراء مخصص»). */
    proceduralTemplate?: string;
    /** للإجراء المخصص — قابلية الطعن التمييزي. */
    isAppealable?: boolean;
    /** تاريخ انتهاء التوقيف/التمديد عند اختيار نوع توقيف. */
    detentionStartDate?: string;
    detentionEndDate?: string;
    /** هوامش ومتابعات إجرائية متسلسلة على الطلب (منفصلة عن هامش القاضي الختامي). */
    margins?: { id: string; date: string; text: string }[];
    /** مرفقات موثقة (محاكاة رفع — اسم المستند فقط). */
    attachments?: { id: string; name: string }[];
    /** تمييز قرار/طلب مصيري في الواجهة. */
    isStarred?: boolean;
    /** المادة القانونية المستند عليها — استقدام/قبض. */
    legalArticleBasis?: string;
    /** متابعة تنفيذ أمر الاستقدام/القبض. */
    orderEnforcement?: import('@/app/types/criminal').OrderEnforcementTracking;
    /** المحكمة المحال إليها — إحالة الشكوى إلى محكمة أخرى. */
    referredCourtName?: string;
    /** بيانات قرار «تكفيل المتهم» المهيكلة — مالية أو شخص ضامن. */
    defendantBail?: {
        kind: GuarantorBailKind;
        bailAmount?: string;
        guarantors?: GuarantorPerson[];
    };
    /**
     * بيانات قرار «حجز الأموال» المهيكلة — قائمة أموال محجوزة لكل طَرَف هارب مُستهدف.
     *
     * 🛈 ملاحظة دلالية: حقل `defendantId` تَراثياً يَحوي مُعرّف متهم؛ لكن في حالة
     *    الشكوى المتقابلة (isMutualComplaint أو isCrossComplaint) يَجوز أن يَحمل
     *    مُعرّف مشتكٍ مُتقابل (الحجز يَكتب على `complainant.accusedSeizedAssets`).
     *    تَفسير المُعرّف يَتمّ ديناميكياً عبر مُطابقته مع `defendants[].id` ثم
     *    `complainants[].id`. أيّ كود مُستقبلي يَفترض «مُعرّف متهم حَتماً» سَيُخطئ.
     */
    assetSeizure?: {
        perDefendant: Array<{
            /** مُعرّف الطَرَف المُستهدف (متهم أصلي، أو مشتكٍ متقابل في القَضايا المُتقابلة). */
            defendantId: string;
            assets: SeizedAsset[];
        }>;
    };
    /** يُكتب عند ترحيل الطلب من إضبارة مَضمومة إلى الأم (merge) — تتبّع دائم. */
    mergedFromCaseId?: string;
    mergedFromCaseNumber?: string;
}

export interface StageConclusion {
    id: string;
    stageType: 'investigation' | 'misdemeanor' | 'felony' | 'juvenile' | 'cassation';
    decisionType:
        | 'referral'
        | 'closing'
        | 'temporary_closing'
        | 'conviction'
        | 'juvenile_deliver_guardian'
        | 'juvenile_behavioral_surveillance'
        | 'juvenile_reform_boys'
        | 'juvenile_youth_school'
        | 'juvenile_fine'
        | 'juvenile_severance_referral'
        | 'acquittal'
        | 'release'
        | 'expiration'
        | 'cassation_confirm'
        | 'cassation_quash_remand'
        | 'cassation_quash_reduce'
        | 'cassation_quash_acquit_release'
        | 'return_investigation_deficiency'
        | 'misdemeanor_to_felony_jurisdiction'
        | 'felony_to_misdemeanor_jurisdiction'
        | 'trial_cassation_appeal'
        | 'cassation_quash_investigation'
        | 'cassation_quash_trial_misdemeanor'
        | 'cassation_quash_trial_felony'
        | 'case_split_fugitive_referral'
        | 'temporary_release_insufficient_evidence'
        | 'postpone_article_183'
        | 'default_judgment_issue'
        | 'default_judgment_opposition';
    date: string;
    details: string;
    defendantStatusAtDecision: 'detained' | 'bailed' | 'fugitive';
    defendantIds?: string[];
    /** نطاق المستفيدين من النقض عند أسباب شخصية (م 269/ب). */
    targetDefendantIds?: string[];
    /** أسباب نقض موضوعية مشتركة — يستفيد جميع المتهمين. */
    sharedObjectiveGrounds269b?: boolean;
    punishmentType?: 'death' | 'life' | 'other';
    expirationReason?: StageExpirationReason;
    /**
     * حالة كل متهم لحظة القرار (موقوف/مكفل/هارب) — Per-Defendant.
     * يُستخدم عندما يحتاج القرار حالات فردية مختلفة لكل متهم.
     * يُلغي قيمة `defendantStatusAtDecision` العامة عند توفّره.
     */
    defendantStatusesByDefendantId?: Record<string, 'detained' | 'bailed' | 'fugitive'>;
    /** سبب غلق الدعوى — إجباري في قرارات [غلق نهائي / غلق مؤقت]. */
    closureReason?: InvestigationClosureReason;
}

export type CriminalCaseLocation = {
    investigationCourtName: string;
    investigationPapersAt: InvestigationPapersAt;
    policeStationName: string;
    baseRegisterNumberAndDate: string;
    investigationOfficeName: string;
    investigationDossierNumber: string;
    courtName: string;
    caseNumber: string;
    /** رقم الادعاء العام — بجانب رقم الدعوى بعد الإحالة. */
    publicProsecutionNumber: string;
    /** اسم القاضي — محكمة الموضوع. */
    trialJudgeName: string;
    /** موعد المرافعة القادمة (YYYY-MM-DD). */
    nextHearingDate: string;
};

export type { CriminalCaseUserRole } from './complainantCassationGovernance';

export type CriminalCaseDraft = {
    basics: {
        role: CriminalLawyerRole | '';
        ourRepresentation: OurRepresentation | '';
        /** صفة المحامي في الإضبارة — يُشتق من ourRepresentation عند الغياب. */
        userRole?: CriminalCaseUserRole | '';
        stage: CriminalCaseStage | '';
        legalArticle: string;
        crimeType: CrimeType | '';
    };
    location: CriminalCaseLocation;
    complainants: CriminalComplainant[];
    unknownDefendant: boolean;
    defendants: CriminalDefendant[];
    statements: Statement[];
    otherEvidenceItems: OtherEvidenceItem[];
    timelineEvents: TimelineEvent[];
    investigationLogs: InvestigationLog[];
    /** حاويات إجرائية متداخلة — لوحة المتابعة (Recursive Canvas). */
    proceduralContainers: ProceduralContainer[];
    /** سجل تغييرات لوحة المسارات (اختياري — شفافية). */
    proceduralCanvasAudit?: ProceduralCanvasAuditEntry[];
    lawyerRequests: LawyerRequest[];
    /** سجل جلسات المحاكمة الرسمي — مستقل عن الساندبوكس الإجرائي. */
    trials: TrialSession[];
    /** بطاقات الأحكام (براءة/إفراج/إدانة) ومسارات الطعن — تبويب القرارات والطعون. */
    verdictCards?: VerdictCard[];
    /** إفادات واستجواب الشهود — محكمة الموضوع (تبويب المحاكمات فقط). */
    trialDepositions: TrialDeposition[];
    /** مادة الإحالة الأصلية — ثابتة للقراءة (تبويب المحاكمات). */
    referralArticle?: string;
    /** مادة الاتهام الحالية للمحاكمة — قابلة للتعديل (م 187). */
    currentAccusationArticle?: string;
    /** سجل تعديلات الوصف القانوني أثناء المرافعة. */
    chargeModifications?: TrialChargeModification[];
    /** السجل الزمني الموحد للقرارات القضائية (محمي). */
    judicialDecisions?: JudicialDecision[];
    physicalLocation: PhysicalLocation;
    physicalLocationCustomName?: string;
    isArticle3Offense?: boolean;
    crimeDiscoveryDate?: string;
    /** شكوى متقابلة (مشاجرة/تبادل أفعال) — الأطراف يبقون في مصفوفتين منفصلتين */
    isMutualComplaint: boolean;
    /** إضبارة سرية — تُفعَّل تلقائياً عند وجود متهم/مشتكٍ حدث. */
    isConfidential?: boolean;
};

export type CriminalDossierStatus = 'active' | 'merged';

export type InvestigationDossierClosureKind = 'temporary' | 'final' | 'waiver';

/** حالة إغلاق/تجميد الإضبارة التحقيقية — مستقلة عن حالة كل متهم. */
export type InvestigationDossierClosure = {
    kind: InvestigationDossierClosureKind;
    closedAt: string;
    sourceRequestId?: string;
    defendantIds?: string[];
};

export type CriminalCase = CriminalCaseDraft & {
    id: string;
    createdAt: string;
    isFrozen?: boolean;
    /** استئخار م 183 — يحجب الإجراءات الجنائية الجديدة. */
    isPrejudicialPostponed?: boolean;
    /** أرشفة بحكم غيابي — يُفتح بها طعن المعارضة. */
    isDefaultJudgmentArchived?: boolean;
    verdictDate?: string;
    isSentToCassation?: boolean;
    /** @deprecated — يُرحَّل إلى cassationProceeding */
    cassationCaseDetails?: {
        cassationNumber: string;
        sentDate: string;
        panelName: string;
    };
    /** سجل الطعن/التدخل التمييزي النشط. */
    cassationProceeding?: CassationProceeding;
    isArchived?: boolean;
    notes?: string;
    /** حالة الارتباط الإداري — merged = إضبارة مضمومة ومغلقة */
    dossierStatus?: CriminalDossierStatus;
    /** أرقام الأضابير المضمومة في هذه الإضبارة الأم (للشارات) */
    mergedCasesTexts?: string[];
    mergedIntoCaseId?: string;
    mergedIntoCaseNumber?: string;
    /** معرّفات الأضابير المضمومة (ضم متعدد — الإضبارة الأم). */
    mergedCaseIds?: string[];
    /** @deprecated — يُدمَج عند التحميل إلى mergedCaseIds */
    mergedFromCaseIds?: string[];
    legalArticleHistory: LegalArticleChange[];
    isPrivateRightWaived?: boolean;
    waiverDate?: string;
    finalDecision?: StageConclusion;
    /** المرحلة القطعية (تحقيق / جنح / جنايات). */
    caseStage?: CaseStage;
    /** نوع الجريمة السيادي — جnaية / جنحة / مخalفة. */
    case_classification?: import('./caseClassificationEngine').CaseClassification;
    /** طريقة الجنحة — موjزة (م 201-211) أو غير موjزة. */
    misdemeanor_type?: import('./caseClassificationEngine').MisdemeanorType;
    /** رقم دعوى المحكمة بعد الإحالة. */
    courtCaseNumber?: string;
    /** رقم التحقيق السابق (لقطة عند الإحالة). */
    investigationCaseNumber?: string;
    /** قفل أمان — يمنع تعديل أحداث التحقيق. */
    isInvestigationLocked?: boolean;
    /** غلق/تجميد الإضبارة التحقيقية (مؤقت / نهائي / تنازل). */
    investigationDossierClosure?: InvestigationDossierClosure;
    /** مسار تنقل الإضبارة في رأس اللوحة. */
    stageJourney?: JourneyNode[];
    /** الإضبارة الأم عند تفريق الدعاوى (إضبارة تابعة). */
    parentCaseId?: string;
    /** وليدة قرار تفريق — لا تُعدّل المشتكين/التايم لاين القديم في التخزين. */
    isSeveredChild?: boolean;
    severanceReason?: SeveranceReason;
    /** تفصيل يدوي عند اختيار «أخرى». */
    severanceReasonDetail?: string;
    /** تاريخ قرار التفريق (YYYY-MM-DD) — حد الوراثة من الأم. */
    severedAt?: string;
    /** معرّفات الإضابير المفرّعة التابعة (الأم فقط). */
    severedChildCaseIds?: string[];
    /** لقطة إحالة الشكوى — لاستعادة اسم المحكمة عند النقض. */
    complaintCourtReferral?: import('./complaintCourtReferralEngine').ComplaintCourtReferralMeta;
    /** سلة مهملات — عناصر محذوفة من الطلبات/الإفادات/التتبع قابلة للاسترجاع. */
    trashBin?: CriminalTrashItem[];
};

/**
 * سياق تفريق الدعوى (شطر إضبارة) — يجسر بين:
 *   1. فتح المودال من ترويسة الإضبارة الأم،
 *   2. التوجيه إلى شاشة «إضبارة جديدة» مع تعبئة المتهمين فقط،
 *   3. تنفيذ الترحيل (createNew + deleteFromParent + migrateExclusiveItems) عند الحفظ.
 * يبقى في الحالة حتى يتم Commit أو Cancel بشكل صريح.
 */
export type JudicialSeveranceDraft = {
    requestDate: string;
    lawyerNote: string;
    isAppealable: boolean;
};

export type PendingSeveranceContext = {
    parentCaseId: string;
    /** معرّفات المتهمين في الإضبارة الأم — للحذف من الأم وقت الـ Commit. */
    parentDefendantIds: string[];
    /** لقطة المتهمين المنقولين (لإعادة استخدام بياناتهم الكاملة في الإضبارة الجديدة). */
    defendantSnapshots: CriminalDefendant[];
    /** ختم زمني لمعرفة عمر السياق وكشف أي تسريب محتمل. */
    initiatedAt: string;
    /** بيانات قرار التفريق من يوميات التحقيق — تُسجَّل على الأم بعد إتمام الشطر. */
    judicialSeveranceDraft?: JudicialSeveranceDraft;
    /** مسودّة تعبئة الإضبارة المفرّقة — منفصلة عن مسودّة «إضبارة جديدة» العادية. */
    formDraft: CriminalCaseDraft;
    /** اختياري — مسار `severCase` القديم أو تكامل خارجي. */
    severanceReason?: SeveranceReason;
    /** تفصيل يدوي عند اختيار «أخرى». */
    severanceReasonDetail?: string;
    /** مرحلة الإضبارة الأم عند بدء التفريق — تُقفل على المفرّقة. */
    lockedCaseStage: CriminalCaseStage;
};

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

function createId(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj && 'randomUUID' in cryptoObj && typeof cryptoObj.randomUUID === 'function') {
        return cryptoObj.randomUUID();
    }
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function addUtcDays(ymd: string, days: number): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd ?? '').trim());
    if (!m) return null;
    const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    dt.setUTCDate(dt.getUTCDate() + Math.floor(days));
    return dt.toISOString().slice(0, 10);
}

function addUtcMonths(ymd: string, months: number): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd ?? '').trim());
    if (!m) return null;
    const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    dt.setUTCMonth(dt.getUTCMonth() + Math.floor(months));
    return dt.toISOString().slice(0, 10);
}

function computeObjectionDeadlineFromNotifiedDate(notifiedDate: string, crimeType: string): string | null {
    const base = addUtcDays(notifiedDate, 1);
    if (!base) return null;
    const ct = String(crimeType ?? '').trim();
    if (ct === 'مخالفة') return addUtcDays(base, 30);
    if (ct === 'جنحة') return addUtcMonths(base, 3);
    if (ct === 'جناية') return addUtcMonths(base, 6);
    return addUtcMonths(base, 3);
}

function makeEmptyComplainant(): CriminalComplainant {
    return {
        id: createId(),
        fullName: '',
        address: '',
        phone: '',
        isJuvenile: false,
        isUnderSeven: false,
        birthDate: '',
        guardianName: '',
        guardianRelationship: '',
    };
}

/** يُطبَّق عند حفظ الإضبارة من مسودّة الإنشاء — لا يغيّر سلوك الدعوى المتقابلة في لوحة الإضبارة. */
function finalizeDraftComplainantsCounterComplaint(
    complainants: CriminalComplainant[],
    defendantIds: string[],
): CriminalComplainant[] {
    const validDef = new Set(defendantIds.map((id) => String(id ?? '').trim()).filter(Boolean));
    const complainantIdSet = new Set(complainants.map((c) => c.id));
    const validParty = new Set([...validDef, ...complainantIdSet]);

    const accusedComplainantIds = new Set<string>();

    const mapped = complainants.map((c) => {
        const raw = c.counterComplaintTargetDefendantIds;
        if (raw === undefined) {
            const { counterComplaintTargetDefendantIds: _drop, ...rest } = c;
            return { ...rest, isCrossComplaint: false };
        }
        const filtered = (Array.isArray(raw) ? raw : [])
            .map((id) => String(id ?? '').trim())
            .filter((id) => validParty.has(id));
        if (!filtered.length) {
            const { counterComplaintTargetDefendantIds: _drop, ...rest } = c;
            return { ...rest, isCrossComplaint: false };
        }
        for (const tid of filtered) {
            if (tid !== c.id && complainantIdSet.has(tid)) {
                accusedComplainantIds.add(tid);
            }
        }
        return {
            ...c,
            isCrossComplaint: true,
            counterComplaintTargetDefendantIds: filtered,
        };
    });

    return mapped.map((c) =>
        accusedComplainantIds.has(c.id) ? { ...c, isCrossComplaint: true } : c,
    );
}

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

function normalizeDefendantPersonalFields(d: CriminalDefendant): CriminalDefendant {
    const withName = coerceDefendantFullName(d);
    const ps = withName.personalStage ?? defaultPersonalStage();
    const isUnderSeven = Boolean((withName as CriminalDefendant).isUnderSeven);
    return {
        ...withName,
        isJuvenile: isUnderSeven ? false : Boolean((withName as CriminalDefendant).isJuvenile),
        isUnderSeven,
        personalStage: ps,
        investigationStatus: normalizeInvestigationDefendantStatus(d.investigationStatus),
        isPartyRecordLocked:
            d.isPartyRecordLocked === true ||
            ps === 'lawsuit_dropped_death' ||
            ps === 'lawsuit_dropped',
    };
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

function makeEmptyLocation(): CriminalCaseLocation {
    return {
        investigationCourtName: '',
        investigationPapersAt: '',
        policeStationName: '',
        baseRegisterNumberAndDate: '',
        investigationOfficeName: '',
        investigationDossierNumber: '',
        courtName: '',
        caseNumber: '',
        publicProsecutionNumber: '',
        trialJudgeName: '',
        nextHearingDate: '',
    };
}

function normalizeCriminalCaseLocation(raw: unknown): CriminalCaseLocation {
    const base = makeEmptyLocation();
    if (!raw || typeof raw !== 'object') return base;
    const r = raw as Partial<CriminalCaseLocation>;
    return {
        investigationCourtName: String(r.investigationCourtName ?? ''),
        investigationPapersAt: (r.investigationPapersAt ?? '') as InvestigationPapersAt,
        policeStationName: String(r.policeStationName ?? ''),
        baseRegisterNumberAndDate: sanitizeCaseReferenceField(r.baseRegisterNumberAndDate),
        investigationOfficeName: String(r.investigationOfficeName ?? ''),
        investigationDossierNumber: sanitizeCaseReferenceField(r.investigationDossierNumber),
        courtName: String(r.courtName ?? ''),
        caseNumber: sanitizeCaseReferenceField(r.caseNumber),
        publicProsecutionNumber: String(r.publicProsecutionNumber ?? ''),
        trialJudgeName: String(r.trialJudgeName ?? ''),
        nextHearingDate: String(r.nextHearingDate ?? ''),
    };
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

function normalizeTrialChargeFieldsOnCase(c: CriminalCase): {
    referralArticle?: string;
    currentAccusationArticle?: string;
    chargeModifications?: TrialChargeModification[];
} {
    const chargeModifications = normalizeChargeModifications(c.chargeModifications);
    const referralArticle = resolveReferralArticleFromCase({
        referralArticle: c.referralArticle,
        legalArticleHistory: c.legalArticleHistory,
        basicsLegalArticle: c.basics?.legalArticle,
    });
    const currentAccusationArticle = resolveCurrentAccusationArticleFromCase({
        currentAccusationArticle: c.currentAccusationArticle,
        chargeModifications,
        referralArticle: c.referralArticle,
        legalArticleHistory: c.legalArticleHistory,
        basicsLegalArticle: c.basics?.legalArticle,
    });
    return {
        referralArticle: referralArticle || undefined,
        currentAccusationArticle: currentAccusationArticle || undefined,
        chargeModifications: chargeModifications.length ? chargeModifications : undefined,
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
    const complainantsForCase = (
        Array.isArray(snapshotWithUnknown.complainants) ? snapshotWithUnknown.complainants : []
    ).map((c) => {
        const {
            counterComplaintTargetDefendantIds: _targets,
            isCrossComplaint: _cross,
            ...rest
        } = c;
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

function makeInitialDraft(): CriminalCaseDraft {
    return {
        basics: {
            role: '',
            ourRepresentation: '',
            stage: '',
            legalArticle: '',
            crimeType: '',
        },
        location: makeEmptyLocation(),
        complainants: [makeEmptyComplainant()],
        unknownDefendant: false,
        defendants: [makeEmptyDefendant()],
        statements: [],
        otherEvidenceItems: [],
        timelineEvents: [],
        investigationLogs: [],
        proceduralContainers: [],
        proceduralCanvasAudit: [],
        lawyerRequests: [],
        trials: [],
        trialDepositions: [],
        physicalLocation: 'custom',
        physicalLocationCustomName: '',
        isArticle3Offense: false,
        crimeDiscoveryDate: '',
        isMutualComplaint: false,
    };
}

/** يحوّل معرّف طرف (مشتكي أو متهم) إلى صف المتهم عند تطبيق إجراءات التوقيف/الكفالة في الشكوى المتقابلة. */
/**
 * 🧭 تَحويل مُعرّف طَرف إلى مُعرّف متهم لأغراض الإجراءات القَضائية.
 *
 * المَنطق:
 *  1) إن كان `partyId` يُطابق مُتهماً مَوجوداً → يُرجَع كما هو.
 *  2) إن لم تَكن الإضبارة شكوى متقابلة → يُرجَع كما هو (حتى لو كان مُعرّف مشتكي).
 *  3) إن كانت شكوى متقابلة + `partyId` مشتكي + يوجد متهم بنفس **الاسم الكامل** المُجرّد
 *     → يُعاد رَبط المُعرّف بِالمتهم المُطابق (سُلوك مَوروث).
 *  4) خلاف ذلك → يُرجَع المُعرّف الأصلي (مشتكٍ) ليَستهلكه المَسار المُوازي للمشتكي المتقابل.
 *
 * ⚠️ تَنبيه صَريم — مُطابقة الأسماء:
 *   اعتماد المُطابقة بالاسم الكامل المُجرّد هَش قانونياً (شَخصان مُختلفان بنفس الاسم
 *   يَتمّ خَلطهما). لكن لا يَتمّ التَطبيق إلا في الإضبارات المُعلَّمة `isMutualComplaint`
 *   صَراحةً، والسُلوك مَحفوظ للتَوافق مع البَيانات الموروثة قَبل تَبنّي الـ Dual Identity
 *   عبر `accusedStatus`. أيّ بَديل آمن يَحتاج تَرحيل بَيانات شامل (Migration) — مَوقوف.
 *
 *   التَحصين الإضافي: إذا كانت الأسماء فارغة (بعد .trim()) أو لم يُوجد تَطابق فِعلي،
 *   نُعيد المُعرّف الأصلي. لا اخْتيار «أوّل متهم» أو fallback ضَبابي.
 */
export function resolveProceduralDefendantId(
    complainants: CriminalComplainant[],
    defendants: CriminalDefendant[],
    partyId: string,
    isMutualComplaint: boolean,
): string {
    const id = String(partyId ?? '').trim();
    if (!id) return '';
    if (defendants.some((d) => d.id === id)) return id;
    if (!isMutualComplaint) return id;
    const complainant = complainants.find((c) => c.id === id);
    if (!complainant) return id;
    const name = String(complainant.fullName ?? '').trim();
    if (!name) return id;
    const match = defendants.find((d) => String(d.fullName ?? '').trim() === name);
    return match?.id ?? id;
}

function resolveProceduralDefendantIds(
    complainants: CriminalComplainant[],
    defendants: CriminalDefendant[],
    partyIds: string[],
    isMutualComplaint: boolean,
): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of partyIds) {
        const resolved = resolveProceduralDefendantId(complainants, defendants, raw, isMutualComplaint);
        if (!resolved || seen.has(resolved)) continue;
        seen.add(resolved);
        out.push(resolved);
    }
    return out;
}

function normalizeOurRepresentation(incoming: string, role: string): OurRepresentation {
    const rep = String(incoming ?? '').trim();
    if (rep === 'complainant_side' || rep === 'defendant_side') return rep;
    if (rep === 'defendant') return 'defendant_side';
    if (rep === 'complainant' || rep === 'civil_claimant') return 'complainant_side';
    if (String(role ?? '').trim() === 'وكيل المشكو منه') return 'defendant_side';
    return 'complainant_side';
}

/** يُورّث تمثيل المحامي من الإضبارة الأم عند شطر الإضبارة. */
export function resolveOurRepresentationFromCaseRecord(
    record: Pick<CriminalCase, 'basics'> | null | undefined,
): OurRepresentation {
    if (!record) return 'complainant_side';
    return normalizeOurRepresentation(
        String(record.basics?.ourRepresentation ?? ''),
        String(record.basics?.role ?? ''),
    );
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
export function classifyAssetSeizurePartyKind(
    caseRecord: { defendants?: { id: string }[]; complainants?: { id: string }[] } | undefined,
    partyId: string,
): 'defendant' | 'complainant' | 'unknown' {
    const id = String(partyId ?? '').trim();
    if (!id || !caseRecord) return 'unknown';
    const defendants = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    if (defendants.some((d) => d.id === id)) return 'defendant';
    const complainants = Array.isArray(caseRecord.complainants) ? caseRecord.complainants : [];
    if (complainants.some((c) => c.id === id)) return 'complainant';
    return 'unknown';
}

/** يكتشف معرّفات داخلية (UUID / createId) — لا تُعرض للمستخدم. */
export function isInternalCaseIdentifier(value: string): boolean {
    const s = String(value ?? '').trim();
    if (!s) return false;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) return true;
    if (/^\d+_\d+[a-z0-9]+$/i.test(s)) return true;
    if (/^[0-9a-f]{8,}$/i.test(s) && !s.includes('/')) return true;
    return false;
}

/** يميّز رقم إضبارة/قضية حقيقي عن نص اختبار عشوائي في حقل الرقم. */
export function looksLikeRealCaseReference(value: string): boolean {
    const s = String(value ?? '').trim();
    if (!s) return false;
    if (isInternalCaseIdentifier(s)) return false;
    if (/\d/.test(s)) return true;
    if (/[\/\\–—]/.test(s)) return true;
    // نص عربي/لاتيني بلا أرقام ولا فواصل مرجعية — إدخال عشوائي (مثل ىرلاىرلاى)
    if (/^[\u0600-\u06FFa-zA-Z\s.,،]+$/u.test(s)) return false;
    return s.length >= 16;
}

/** يُعيد المرجع إن كان حقيقياً، وإلا سلسلة فارغة (للعرض والتخزين). */
export function sanitizeCaseReferenceField(value: string | undefined): string {
    const s = String(value ?? '').trim();
    return looksLikeRealCaseReference(s) ? s : '';
}

/** رقم الإضبارة الرسمي فقط — بلا UUID ولا معرّفات داخلية. */
export function resolveOfficialCaseNumber(c: CriminalCase | undefined): string {
    if (!c) return '—';
    const caseNumber = String(c.location?.caseNumber ?? '').trim();
    if (caseNumber && looksLikeRealCaseReference(caseNumber)) return caseNumber;
    const register = String(c.location?.baseRegisterNumberAndDate ?? '').trim();
    if (register && looksLikeRealCaseReference(register)) return register;
    return '—';
}

/** تسمية عرض للإضبارة — رقم رسمي أو محكمة/مرحلة (بلا UUID ولا معرّفات داخلية). */
export function resolveCriminalCaseDisplayLabel(c: CriminalCase | undefined): string {
    if (!c) return '—';
    const candidates = [
        String(c.location?.caseNumber ?? '').trim(),
        String(c.location?.investigationDossierNumber ?? '').trim(),
        String(c.location?.baseRegisterNumberAndDate ?? '').trim(),
    ];
    for (const raw of candidates) {
        if (looksLikeRealCaseReference(raw)) return raw;
    }
    const court = String(c.location?.investigationCourtName ?? c.location?.courtName ?? '').trim();
    const stage = formatCriminalStageLabel(String(c.basics?.stage ?? '').trim());
    if (court && stage) return `${court} — ${stage}`;
    if (court) return court;
    if (stage) return stage;
    return 'إضبارة تحقيق';
}

function resolveInvestigationCaseNumberSnapshot(c: CriminalCase): string {
    const dossier = String(c.location?.investigationDossierNumber ?? '').trim();
    if (dossier) return dossier;
    const reg = String(c.location?.baseRegisterNumberAndDate ?? '').trim();
    if (reg) return reg;
    const stored = String(c.investigationCaseNumber ?? '').trim();
    if (stored) return stored;
    const num = String(c.location?.caseNumber ?? '').trim();
    return num || '—';
}

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

function applyJuvenileTrialJourneyLabelSanitize(c: CriminalCase, nodes: JourneyNode[]): JourneyNode[] {
    const courtNum = String(c.courtCaseNumber ?? c.location?.caseNumber ?? '').trim();
    const withJuvenile = sanitizeJourneyNodeLabelsForJuvenileScope(
        nodes,
        (node) =>
            shouldUseJuvenileTrialJourneyLabels(Array.isArray(c.defendants) ? c.defendants : [], {
                defendantIds: node.defendantIds,
                storedStage: c.basics?.stage,
            }),
        courtNum,
    );
    let changed = false;
    const next = withJuvenile.map((n) => {
        const label = formatJourneyPathDisplayLabel(n);
        if (label === n.label) return n;
        changed = true;
        return { ...n, label };
    });
    return changed ? next : withJuvenile;
}

function ensureStageJourneyOnCase(c: CriminalCase): CriminalCase {
    if (Array.isArray(c.stageJourney) && c.stageJourney.length > 0) {
        let repairedJourney = repairSameCourtRemandJourneyNodes(c.stageJourney);
        repairedJourney = applyJuvenileTrialJourneyLabelSanitize(c, repairedJourney);
        const currentNode = getCurrentJourneyNode(repairedJourney);
        const resolvedStage = currentNode?.stage ?? c.caseStage ?? resolveCaseStageFromRecord(c);
        const stored = syncStoredStageFromJourneyCaseStage(resolvedStage, c.basics?.stage);
        const journeyChanged = JSON.stringify(repairedJourney) !== JSON.stringify(c.stageJourney);
        const stageChanged = c.caseStage !== resolvedStage || c.basics?.stage !== stored;
        if (!journeyChanged && !stageChanged) return c;
        return {
            ...c,
            stageJourney: repairedJourney,
            caseStage: resolvedStage,
            basics: { ...c.basics, stage: stored },
        };
    }
    const legacy = (c as CriminalCase & { proceduralNodes?: ProceduralNode[] }).proceduralNodes;
    const journey =
        Array.isArray(legacy) && legacy.length > 0
            ? migrateProceduralNodesToStageJourney(legacy)
            : buildInitialStageJourney();
    return {
        ...c,
        stageJourney: journey,
        caseStage: c.caseStage ?? resolveCaseStageFromRecord(c),
    };
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

function buildMergeTimelineDescription(childCaseNumber: string, mergeReason: string): string {
    const num = childCaseNumber && childCaseNumber !== '—' ? childCaseNumber : 'غير مسجّل';
    const reason = String(mergeReason ?? '').trim() || '—';
    return `تم ضم الإضبارة رقم ${num} ضمن هذه الإضبارة الأم. السبب: ${reason}`;
}

function sanitizeMergedCasesTexts(texts: string[]): string[] {
    return texts
        .map((x) => String(x ?? '').trim())
        .filter((x) => x.length > 0 && !isInternalCaseIdentifier(x));
}

function sanitizeMergeTimelineEvents(
    events: TimelineEvent[],
    mergedChildIds: string[],
    casesById: Record<string, CriminalCase | undefined>,
): TimelineEvent[] {
    if (!mergedChildIds.length) return events;
    let changed = false;
    const next = events.map((ev) => {
        if (ev.category !== 'ضم وإغلاق إضبارة') return ev;
        const desc = String(ev.description ?? '');
        const reasonMatch = desc.match(/السبب:\s*([\s\S]+)$/);
        const reason = reasonMatch?.[1]?.trim() || '—';
        for (const childId of mergedChildIds) {
            const childNum = resolveOfficialCaseNumber(casesById[childId]);
            const leakedId = desc.includes(childId) || isInternalCaseIdentifier(desc);
            if (!leakedId) continue;
            changed = true;
            return { ...ev, description: buildMergeTimelineDescription(childNum, reason) };
        }
        return ev;
    });
    return changed ? next : events;
}

/** يقرأ mergedCaseIds مع ترحيل mergedFromCaseIds. */
export function resolveMergedCaseIds(
    caseRecord: Pick<CriminalCase, 'mergedCaseIds' | 'mergedFromCaseIds'> | undefined,
): string[] {
    if (!caseRecord) return [];
    const raw = [
        ...(Array.isArray(caseRecord.mergedCaseIds) ? caseRecord.mergedCaseIds : []),
        ...(Array.isArray(caseRecord.mergedFromCaseIds) ? caseRecord.mergedFromCaseIds : []),
    ];
    return Array.from(new Set(raw.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0)));
}

function isMergedDossierCase(c: CriminalCase | undefined): boolean {
    if (!c) return false;
    return c.dossierStatus === 'merged' || Boolean(String(c.mergedIntoCaseId ?? '').trim());
}

function caseMutationBlocked(target: CriminalCase): boolean {
    return (
        target.isArchived === true ||
        target.isFrozen === true ||
        isMergedDossierCase(target)
    );
}

/** الطعن التمييزي مسموح حتى عند تجميد الإضبارة (غلق مؤقت/نهائي) — يُمنع فقط في دمج الإضابير. */
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
export function isCorruptTimelineEvent(ev: TimelineEvent): boolean {
    const date = String(ev?.date ?? '').trim();
    const next = String((ev as { nextDate?: string }).nextDate ?? '').trim();
    const title = String(ev?.title ?? '').trim();
    const desc = String(ev?.description ?? '').trim();
    const category = String((ev as { category?: string }).category ?? '').trim();

    if (!date) return true;
    if (next && date && next < date) return true;
    if (/^f+$/i.test(title) || /^f+$/i.test(desc)) return true;
    if (/^[!؟?.\-_\s]{1,5}$/.test(title) || /^[!؟?.\-_\s]{1,5}$/.test(desc)) return true;
    if (!category && !title && !desc) return true;
    return false;
}

function timelineEventAllowedWhenFrozen(event: TimelineEvent): boolean {
    const category = String((event as any)?.category ?? '').trim();
    return (
        category === 'تبليغ رسمي بالحكم الغيابي' ||
        category === 'تقديم اعتراض على الحكم الغيابي' ||
        category === 'جلسة المحاكمة الاعتراضية الأولى'
    );
}

function normalizeSocialInquiryReport(raw: unknown): SocialInquiryReport | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const r = raw as Record<string, unknown>;
    const isAttached = r.isAttached === true;
    const wsRaw = String(r.workflowStatus ?? '').trim();
    const workflowStatus: SocialInquiryWorkflowStatus = isValidSocialInquiryWorkflowStatus(wsRaw)
        ? wsRaw
        : isAttached
          ? 'submitted'
          : 'not_requested';
    const receivedDate = typeof r.receivedDate === 'string' ? String(r.receivedDate) : '';
    const investigatorName = typeof r.investigatorName === 'string' ? String(r.investigatorName) : '';
    const recommendations = typeof r.recommendations === 'string' ? String(r.recommendations) : '';
    return {
        workflowStatus,
        isAttached: workflowStatus === 'submitted' || isAttached,
        receivedDate: receivedDate.trim() ? receivedDate : undefined,
        investigatorName: investigatorName.trim() ? investigatorName : undefined,
        recommendations: recommendations.trim() ? recommendations : undefined,
    };
}

function mapDecisionStatusToDefendantStatus(status: StageConclusion['defendantStatusAtDecision']): DefendantStatus {
    if (status === 'detained') return 'موقوف';
    if (status === 'fugitive') return 'هارب';
    return 'مكفل';
}

const criminalPersistStorage = createSecureJSONStorage<CriminalStoreState>();

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
                    if (statementMutationBlocked(target)) return state;
                    if (isStatementFromUnknownDefendant(statement, target.defendants)) return state;
                    const nodeId = resolveCurrentJourneyNodeId(target.stageJourney);
                    const stamped = stampProceduralNodeId(statement, nodeId);
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                statements: [...(target.statements ?? []), stamped],
                            },
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
                    if (statementMutationBlocked(target)) return state;
                    const list = Array.isArray(target.statements) ? target.statements : [];
                    const idx = list.findIndex((s) => s.id === statementId);
                    if (idx < 0) return state;
                    const next = list.map((s, i) => {
                        if (i !== idx) return s;
                        const nextRatified =
                            updatedData.isJudiciallyRatified === true
                                ? true
                                : updatedData.isJudiciallyRatified === false
                                  ? undefined
                                  : (s as any).isJudiciallyRatified === true
                                    ? true
                                    : undefined;
                        const isRatified = (s as any).isJudiciallyRatified === true;
                        const patch = isRatified
                            ? {
                                  notes: updatedData.notes,
                                  isJudiciallyRatified: updatedData.isJudiciallyRatified,
                              }
                            : updatedData;
                        return { ...s, ...patch, isJudiciallyRatified: nextRatified, id: s.id };
                    });
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, statements: next },
                        },
                    };
                }),
            addTimelineEvent: (caseId, event) =>
                set((state) => {
                    const target = ensureStageJourneyOnCase(state.casesById[caseId] as CriminalCase);
                    if (!target) return state;
                    if (caseMutationBlocked(target) && !timelineEventAllowedWhenFrozen(event)) return state;
                    const category = String((event as any)?.category ?? '').trim();
                    if (
                        target.isInvestigationLocked &&
                        isLockedInvestigationTimelineEvent(category, String((event as any)?.type ?? ''))
                    ) {
                        return state;
                    }

                    const isCourtSession = String((event as any)?.type ?? '').trim() === 'court_session';
                    const nextEvent: TimelineEvent = (() => {
                        if (!isCourtSession) {
                            const { summonsStatus, summonsDate, summonsDocumentRef, ...rest } = event as any;
                            return rest as TimelineEvent;
                        }
                        const statusRaw = String((event as any)?.summonsStatus ?? '').trim();
                        const status =
                            statusRaw === 'served_valid' ||
                            statusRaw === 'not_served_invalid' ||
                            statusRaw === 'served_to_official'
                                ? statusRaw
                                : '';
                        const summonsDate = String((event as any)?.summonsDate ?? '').trim();
                        const summonsDocumentRef = String((event as any)?.summonsDocumentRef ?? '').trim();
                        if (!status || !summonsDate || !summonsDocumentRef) return null as any;
                        return {
                            ...(event as any),
                            summonsStatus: status as any,
                            summonsDate,
                            summonsDocumentRef,
                        } as TimelineEvent;
                    })();
                    if (!nextEvent) return state;

                    const rawIds = (event as any)?.defendantIds;
                    const eventPartyIds = Array.isArray(rawIds)
                        ? rawIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
                        : [];
                    const isMutual = target.isMutualComplaint === true;
                    const caseComplainants = Array.isArray(target.complainants) ? target.complainants : [];
                    let nextDefendantsAfterArrest = Array.isArray(target.defendants) ? target.defendants : [];
                    const eventDefendantIds = resolveProceduralDefendantIds(
                        caseComplainants,
                        nextDefendantsAfterArrest,
                        eventPartyIds,
                        isMutual,
                    );

                    const isBailForfeiture = category === 'قرار مصادرة الكفالة وتحصيلها';
                    const isInAbsentiaNotification = category === 'تبليغ رسمي بالحكم الغيابي';

                    const guarantorDetails = normalizeGuarantorDetails((event as any)?.guarantorDetails) ?? null;

                    const isArrestCategory = isDetentionArrestCategory(category);
                    const isInvDetentionCategory = isInvestigationDetentionCategory(category);
                    const placementRaw = String((event as any)?.detentionPlacement ?? '').trim();
                    const detentionPlacement = isValidJuvenileDetentionPlacement(placementRaw) ? placementRaw : null;
                    if ((isArrestCategory || isInvDetentionCategory) && eventDefendantIds.length) {
                        nextDefendantsAfterArrest = nextDefendantsAfterArrest.map((d) => {
                            if (!eventDefendantIds.includes(d.id)) return d;
                            if (Boolean((d as any).isJuvenile)) {
                                const placementCode =
                                    detentionPlacement ??
                                    (isInvDetentionCategory ? ('juvenile_observation' as const) : null);
                                if (!placementCode && isArrestCategory) return d;
                                return {
                                    ...d,
                                    status: 'juvenile_detention' as DefendantStatus,
                                    detentionAuthority: isInvDetentionCategory
                                        ? investigationJuvenileDetentionAuthorityLabel()
                                        : juvenileDetentionPlacementLabel(placementCode!),
                                    detentionExpiryDate: isInvDetentionCategory
                                        ? String((event as any)?.detentionEndDate ?? d.detentionExpiryDate ?? '')
                                        : d.detentionExpiryDate,
                                };
                            }
                            if (isInvDetentionCategory) {
                                return {
                                    ...d,
                                    status: 'موقوف' as DefendantStatus,
                                    detentionExpiryDate: String(
                                        (event as any)?.detentionEndDate ?? d.detentionExpiryDate ?? '',
                                    ),
                                };
                            }
                            return d;
                        });
                    }

                    const juvenileSessionConfidential =
                        isCourtSession &&
                        (eventDefendantIds.length
                            ? eventDefendantIds.some((defId) => {
                                  const hit = nextDefendantsAfterArrest.find((d) => d.id === defId);
                                  return Boolean((hit as any)?.isJuvenile);
                              })
                            : nextDefendantsAfterArrest.some((d) => Boolean((d as any).isJuvenile)));

                    if (juvenileSessionConfidential) {
                        (nextEvent as any).isConfidential = true;
                    }

                    const nextDefendants =
                        eventDefendantIds.length &&
                        (Boolean(guarantorDetails) || isBailForfeiture || isInAbsentiaNotification)
                            ? nextDefendantsAfterArrest.map((d) => {
                                  if (!eventDefendantIds.includes(d.id)) return d;

                                  const existingGuarantor = normalizeGuarantorDetails((d as any).guarantorDetails);
                                  const nextGuarantor = (() => {
                                      if (guarantorDetails) return guarantorDetails;
                                      if (isBailForfeiture && existingGuarantor) {
                                          const note = '⛔ مصادرة الكفالة وتحصيلها';
                                          const info = existingGuarantor.guarantorInfo.trim();
                                          return {
                                              ...existingGuarantor,
                                              guarantorInfo: info.includes('مصادرة') ? info : `${info ? `${info}\n` : ''}${note}`.trim(),
                                          };
                                      }
                                      return existingGuarantor;
                                  })();

                                  const next: CriminalDefendant = {
                                      ...d,
                                      guarantorDetails: nextGuarantor,
                                  };
                                  if (isInAbsentiaNotification) {
                                      const det = (d as any).inAbsentiaDetails as InAbsentiaDetails | undefined;
                                      if (det && !det.isObjectionFiled) {
                                          const notifiedDate = String((event as any)?.notifiedDate ?? '').trim();
                                          const method = String((event as any)?.notificationMethod ?? '').trim();
                                          const computed = computeObjectionDeadlineFromNotifiedDate(
                                              notifiedDate,
                                              String((target as any)?.basics?.crimeType ?? ''),
                                          );
                                          if (notifiedDate && computed) {
                                              (next as any).inAbsentiaDetails = {
                                                  ...det,
                                                  notifiedDate,
                                                  notificationMethod: method || undefined,
                                                  objectionDeadline: computed,
                                              };
                                          }
                                      }
                                  }
                                  return next;
                              })
                            : nextDefendantsAfterArrest;

                    const isVerdictEvent = target.basics.stage === 'محكمة الجنح' || target.basics.stage === 'محكمة الجنايات';
                    const verdictDate =
                        isVerdictEvent && /نطق بالقرار|قرار حكم/.test(category)
                            ? String((nextEvent as any)?.date ?? '').trim()
                            : '';

                    const autoWaivePrivateRight = isPrivateRightWaiverTimelineCategory(category);
                    const waiverDate = autoWaivePrivateRight
                        ? String((nextEvent as any)?.date ?? '').trim() || new Date().toISOString().slice(0, 10)
                        : target.waiverDate;

                    const activeNodeId = resolveCurrentJourneyNodeId(target.stageJourney);
                    const stampedEvent = stampProceduralNodeId(nextEvent, activeNodeId);

                    const patchedCase = syncJuvenileInvestigationCaseFlags({
                        ...target,
                        defendants: nextDefendants,
                        timelineEvents: [...(target.timelineEvents ?? []), stampedEvent],
                        verdictDate: verdictDate ? verdictDate : target.verdictDate,
                        ...(autoWaivePrivateRight ? { isPrivateRightWaived: true, waiverDate } : {}),
                    });
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: patchedCase,
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
                    if (investigationLogsMutationBlocked(target)) return state;
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                investigationLogs: [...(target.investigationLogs ?? []), log],
                            },
                        },
                    };
                }),
            updateInvestigationLog: (caseId, logId, updatedData) =>
                set((state) => {
                    const target = state.casesById[caseId];
                    if (!target) return state;
                    if (investigationLogsMutationBlocked(target)) return state;
                    const list = Array.isArray(target.investigationLogs) ? target.investigationLogs : [];
                    const idx = list.findIndex((l) => l.id === logId);
                    if (idx < 0) return state;
                    const next = list.map((l, i) => (i === idx ? { ...l, ...updatedData, id: l.id } : l));
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, investigationLogs: next },
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
                    if (investigationLogsMutationBlocked(target)) {
                        err = 'الإضبارة مقفلة.';
                        return state;
                    }
                    const list = Array.isArray(target.investigationLogs) ? target.investigationLogs : [];
                    const idx = list.findIndex((l) => l.id === logId);
                    if (idx < 0) {
                        err = 'السجل غير موجود.';
                        return state;
                    }
                    const current = list[idx]!;
                    const cat = String(current.category ?? '');
                    if (cat !== 'official_letter' && cat !== 'forensic_report') {
                        err = 'هذا الإجراء ليس من ديوان المخاطبات.';
                        return state;
                    }
                    if (current.status === 'response_received') {
                        err = 'تم تسجيل الورود مسبقاً.';
                        return state;
                    }
                    const receivedAt =
                        String(payload.receivedDate ?? '').trim() || new Date().toISOString().slice(0, 10);
                    const notes = String(payload.responseNotes ?? '').trim();
                    const next = list.map((l, i) =>
                        i === idx
                            ? {
                                  ...l,
                                  status: 'response_received' as const,
                                  responseReceivedAt: receivedAt,
                                  responseNotes: notes || l.responseNotes,
                                  details: notes
                                      ? `${String(l.details ?? '').trim()}\n\n📥 ورود التقرير (${receivedAt}): ${notes}`.trim()
                                      : l.details,
                              }
                            : l,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, investigationLogs: next },
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
                    if (investigationLogsMutationBlocked(target)) {
                        err = 'الإضبارة مقفلة.';
                        return state;
                    }
                    const list = Array.isArray(target.investigationLogs) ? target.investigationLogs : [];
                    const idx = list.findIndex((l) => l.id === logId);
                    if (idx < 0) {
                        err = 'السجل غير موجود.';
                        return state;
                    }
                    const current = list[idx]!;
                    const cat = String(current.category ?? '');
                    if (cat !== 'exhibit_seizure' && cat !== 'site_inspection') {
                        err = 'هذا السجل ليس من خزانة المبرزات.';
                        return state;
                    }
                    const next = list.map((l, i) =>
                        i === idx ? { ...l, exhibitLifecycle: lifecycle } : l,
                    );
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: { ...target, investigationLogs: next },
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
                // Audit log: تمت إضافة جلسة جزائية
                if (!err) {
                    try {
                        void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                            AuditLog.criminal.sessionAdded({
                                caseId,
                                sessionDate: String(sessionData.date),
                            });
                        });
                    } catch { /* silent */ }
                }
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
                    return {
                        casesById: {
                            ...state.casesById,
                            [caseId]: {
                                ...target,
                                isPrivateRightWaived: true,
                                waiverDate,
                            },
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
                try {
                    void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                        const created = useCriminalStore.getState().casesById[caseId];
                        const caseNo =
                            (created as { courtCaseNumber?: string } | undefined)?.courtCaseNumber ||
                            (created as { location?: { caseNumber?: string } } | undefined)?.location?.caseNumber ||
                            caseId;
                        AuditLog.criminal.caseCreated({ caseId, caseNo });
                    });
                } catch {
                    /* silent */
                }
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

                // Audit log اختياري — لا يكسر الـ flow عند الفشل.
                try {
                    void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                        AuditLog.criminal.caseCreated?.({
                            caseId: newCaseId,
                            caseNo: resolveOfficialCaseNumber(get().casesById[newCaseId]) || newCaseId,
                        });
                    });
                } catch { /* silent */ }

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
            name: 'hami:criminal:store',
            version: 49,
            migrate: (persistedState: unknown) => {
                if (!persistedState || typeof persistedState !== 'object') return persistedState as any;
                const s = persistedState as any;

                if (s.pendingSeveranceContext?.formDraft) {
                    s.draft = makeInitialDraft();
                }
                if (s.pendingSeveranceContext) {
                    const ctx = s.pendingSeveranceContext;
                    const normDef = (d: unknown) => {
                        if (!d || typeof d !== 'object') return d;
                        const row = d as Record<string, unknown>;
                        return {
                            ...row,
                            fullName: resolveDefendantFullName(row as CriminalDefendant),
                        };
                    };
                    if (Array.isArray(ctx.defendantSnapshots)) {
                        ctx.defendantSnapshots = ctx.defendantSnapshots.map((d) =>
                            normDef(d),
                        ) as CriminalDefendant[];
                    }
                    if (ctx.formDraft && Array.isArray(ctx.formDraft.defendants)) {
                        ctx.formDraft = {
                            ...ctx.formDraft,
                            defendants: ctx.formDraft.defendants.map((d) =>
                                normDef(d),
                            ) as CriminalDefendant[],
                        };
                    }
                    if (!ctx.lockedCaseStage && ctx.formDraft?.basics?.stage) {
                        ctx.lockedCaseStage = normalizeLegacyCriminalStage(
                            String(ctx.formDraft.basics.stage),
                            ctx.formDraft.basics?.crimeType,
                        ) || 'مرحلة التحقيق';
                    }
                    if (ctx.lockedCaseStage && ctx.formDraft?.basics) {
                        ctx.formDraft = {
                            ...ctx.formDraft,
                            basics: {
                                ...ctx.formDraft.basics,
                                stage: ctx.lockedCaseStage,
                            },
                        };
                    }
                }

                const normalizeStatements = (arr: unknown): Statement[] => {
                    if (!Array.isArray(arr)) return [];
                    return arr.map((it) => {
                        if (!it || typeof it !== 'object') {
                            return {
                                id: createId(),
                                date: new Date().toISOString().slice(0, 10),
                                giverType: 'informant',
                                giverName: '',
                                content: String(it ?? ''),
                            };
                        }
                        const o = it as any;
                        if (typeof o.date === 'string' && typeof o.giverType === 'string') {
                            const giverType = o.giverType as Statement['giverType'];
                            const witnessNameRaw =
                                typeof o.witnessName === 'string'
                                    ? String(o.witnessName).trim()
                                    : giverType === 'witness'
                                      ? String(o.giverName ?? '').trim()
                                      : '';
                            const content = String(o.content ?? '').trim();
                            return {
                                ...(o as Statement),
                                giverType,
                                content,
                                witnessName: witnessNameRaw || undefined,
                                witnessDetails:
                                    typeof o.witnessDetails === 'string' && String(o.witnessDetails).trim()
                                        ? String(o.witnessDetails).trim()
                                        : undefined,
                                giverName:
                                    giverType === 'witness' && witnessNameRaw
                                        ? witnessNameRaw
                                        : String(o.giverName ?? '').trim(),
                                isJudiciallyRatified: o.isJudiciallyRatified === true ? true : undefined,
                                statementRecordingPlace:
                                    o.statementRecordingPlace === 'investigation_officer' ||
                                    o.statementRecordingPlace === 'judicial_investigator'
                                        ? o.statementRecordingPlace
                                        : undefined,
                                contentHighlights: (() => {
                                    const hl = sanitizeContentHighlights(o.contentHighlights, content.length);
                                    return hl.length ? hl : undefined;
                                })(),
                                witnessPartySide:
                                    o.witnessPartySide === 'complainant' || o.witnessPartySide === 'defendant'
                                        ? o.witnessPartySide
                                        : o.witnessKind === 'prosecution'
                                          ? 'complainant'
                                          : o.witnessKind === 'defense'
                                            ? 'defendant'
                                            : undefined,
                                witnessPartyIds: Array.isArray(o.witnessPartyIds)
                                    ? o.witnessPartyIds.map((id: unknown) => String(id).trim()).filter(Boolean)
                                    : undefined,
                            };
                        }
                        const isRatified = o.certified === true || o.isJudiciallyRatified === true;
                        return {
                            id: String(o.id ?? createId()),
                            date: String(o.recordedAt ?? o.date ?? new Date().toISOString().slice(0, 10)),
                            giverType: 'informant',
                            giverName: String(o.ownerName ?? o.giverName ?? ''),
                            content: String(o.text ?? o.content ?? ''),
                            notes: typeof o.notes === 'string' ? o.notes : isRatified ? 'مُصدّقة' : undefined,
                            isJudiciallyRatified: isRatified ? true : undefined,
                        };
                    });
                };

                const normalizeTimeline = (arr: unknown): TimelineEvent[] => {
                    if (!Array.isArray(arr)) return [];
                    const mapped = arr.map((it) => {
                        if (!it || typeof it !== 'object') return it as any;
                        const o = it as any;
                        const legacyId = typeof o.relatedDefendantId === 'string' ? o.relatedDefendantId.trim() : '';
                        const rawIds = Array.isArray(o.defendantIds) ? o.defendantIds : legacyId ? [legacyId] : [];
                        const ids = Array.isArray(rawIds)
                            ? rawIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
                            : [];
                        const rawCategory = typeof o.category === 'string' ? o.category : '';
                        const category = normalizeTimelineCategoryForDisplay(rawCategory);
                        const eventDate = String(o.date ?? '').trim();
                        const rawNext = String(o.nextDate ?? '').trim();
                        const nextDate =
                            rawNext && eventDate && !isTimelineNextDateInvalid(eventDate, rawNext) ? rawNext : undefined;
                        const rawTitle = String(o.title ?? '').trim();
                        const rawDesc = String(o.description ?? o.details ?? '').trim();
                        return {
                            ...o,
                            category,
                            title: resolveTimelineEventTitle(category, rawTitle),
                            description: rawDesc,
                            nextDate,
                            defendantIds: ids.length ? Array.from(new Set(ids)) : undefined,
                            appealedDecision: typeof o.appealedDecision === 'string' ? o.appealedDecision : undefined,
                            postponementReason:
                                typeof o.postponementReason === 'string' ? o.postponementReason : undefined,
                            guarantorDetails: normalizeGuarantorDetails(o.guarantorDetails),
                            extensionDays: typeof o.extensionDays === 'number' ? o.extensionDays : undefined,
                            socialWorkerPresent:
                                typeof o.socialWorkerPresent === 'boolean' ? o.socialWorkerPresent : undefined,
                            suspendedExecution: typeof o.suspendedExecution === 'boolean' ? o.suspendedExecution : undefined,
                            probationYears: typeof o.probationYears === 'number' ? o.probationYears : undefined,
                            transferredToStage: typeof o.transferredToStage === 'string' ? o.transferredToStage : undefined,
                            notifiedDate: typeof o.notifiedDate === 'string' ? o.notifiedDate : undefined,
                            notificationMethod: typeof o.notificationMethod === 'string' ? o.notificationMethod : undefined,
                            summonsStatus:
                                o.summonsStatus === 'served_valid' ||
                                o.summonsStatus === 'not_served_invalid' ||
                                o.summonsStatus === 'served_to_official'
                                    ? o.summonsStatus
                                    : undefined,
                            summonsDate: typeof o.summonsDate === 'string' ? o.summonsDate : undefined,
                            summonsDocumentRef:
                                typeof o.summonsDocumentRef === 'string' ? o.summonsDocumentRef : undefined,
                            targetDefendantId: (() => {
                                if (o.targetDefendantId === null) return null;
                                const tid = String(o.targetDefendantId ?? '').trim();
                                return tid || undefined;
                            })(),
                        } as TimelineEvent;
                    });
                    return mapped.filter((ev) => !isCorruptTimelineEvent(ev));
                };

                const normalizeInvestigationLogs = (arr: unknown): InvestigationLog[] => {
                    if (!Array.isArray(arr)) return [];
                    return arr.map((it) => {
                        if (!it || typeof it !== 'object') {
                            return {
                                id: createId(),
                                date: new Date().toISOString().slice(0, 10),
                                category: 'other',
                                title: String(it ?? ''),
                                details: '',
                                status: 'awaiting_response',
                            };
                        }
                        const o = it as any;
                        const catRaw = String(o.category ?? 'other');
                        const cat = catRaw === 'lawyer_request' ? 'other' : catRaw;
                        const statusRaw = String(o.status ?? 'awaiting_response');
                        const status =
                            statusRaw === 'completed' || statusRaw === 'response_received'
                                ? 'response_received'
                                : statusRaw === 'returned_for_revision'
                                  ? 'returned_for_revision'
                                  : statusRaw === 'pending' || statusRaw === 'awaiting_response'
                                    ? 'awaiting_response'
                                    : 'awaiting_response';
                        const rawIds = Array.isArray(o.defendantIds) ? o.defendantIds : [];
                        const ids = Array.isArray(rawIds)
                            ? rawIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
                            : [];
                        return {
                            id: String(o.id ?? createId()),
                            date: String(o.date ?? new Date().toISOString().slice(0, 10)),
                            category: [
                                'official_letter',
                                'forensic_report',
                                'site_inspection',
                                'exhibit_seizure',
                                'other',
                            ].includes(cat)
                                ? (cat as InvestigationLog['category'])
                                : 'other',
                            title: String(o.title ?? ''),
                            details: String(o.details ?? ''),
                            status: status as InvestigationLog['status'],
                            attachmentRef: typeof o.attachmentRef === 'string' ? o.attachmentRef : undefined,
                            defendantIds: ids.length ? Array.from(new Set(ids)) : undefined,
                            seizureRecordNumber:
                                typeof o.seizureRecordNumber === 'string' ? o.seizureRecordNumber : undefined,
                            forensicLetterRef:
                                typeof o.forensicLetterRef === 'string' ? o.forensicLetterRef : undefined,
                            linkedPartyId:
                                typeof o.linkedPartyId === 'string'
                                    ? String(o.linkedPartyId).trim() || undefined
                                    : ids[0],
                            exhibitDescription:
                                typeof o.exhibitDescription === 'string' ? o.exhibitDescription : undefined,
                            exhibitQuantity:
                                typeof o.exhibitQuantity === 'string' ? o.exhibitQuantity : undefined,
                            exhibitLifecycle:
                                o.exhibitLifecycle === 'seized_at_station' ||
                                o.exhibitLifecycle === 'sent_to_lab' ||
                                o.exhibitLifecycle === 'lab_result_received'
                                    ? o.exhibitLifecycle
                                    : cat === 'exhibit_seizure'
                                      ? 'seized_at_station'
                                      : undefined,
                            responseReceivedAt:
                                typeof o.responseReceivedAt === 'string' ? o.responseReceivedAt : undefined,
                            responseNotes: typeof o.responseNotes === 'string' ? o.responseNotes : undefined,
                        };
                    });
                };

                const normalizeOtherEvidenceItems = (arr: unknown): OtherEvidenceItem[] => {
                    if (!Array.isArray(arr)) return [];
                    return arr
                        .map((it) => {
                            if (!it || typeof it !== 'object') return null;
                            const o = it as any;
                            const evidenceType = String(o.evidenceType ?? '').trim();
                            if (!evidenceType) return null;
                            const isLinkedToDossier = o.isLinkedToDossier === true;
                            const attachmentDateRaw = String(o.attachmentDate ?? '').trim();
                            return {
                                id: String(o.id ?? createId()),
                                evidenceType,
                                isLinkedToDossier,
                                attachmentDate: isLinkedToDossier && attachmentDateRaw ? attachmentDateRaw : undefined,
                                notes: String(o.notes ?? '').trim(),
                                createdAt: String(o.createdAt ?? attachmentDateRaw ?? '').trim() || undefined,
                                proceduralNodeId:
                                    typeof o.proceduralNodeId === 'string' && String(o.proceduralNodeId).trim()
                                        ? String(o.proceduralNodeId).trim()
                                        : undefined,
                            } as OtherEvidenceItem;
                        })
                        .filter(Boolean) as OtherEvidenceItem[];
                };

                const normalizeLawyerRequests = (arr: unknown): LawyerRequest[] => {
                    if (!Array.isArray(arr)) return [];
                    return arr.map((it) => {
                        if (!it || typeof it !== 'object') {
                            return {
                                id: createId(),
                                requestDate: new Date().toISOString().slice(0, 10),
                                type: '',
                                lawyerNote: String(it ?? ''),
                                status: 'pending',
                            };
                        }
                        const o = it as any;
                        const statusRaw = String(o.status ?? 'pending');
                        const status: LawyerRequest['status'] =
                            statusRaw === 'approved' || statusRaw === 'rejected' || statusRaw === 'executed'
                                ? statusRaw
                                : 'pending';
                        const rawIds = Array.isArray(o.defendantIds) ? o.defendantIds : [];
                        const ids = Array.isArray(rawIds)
                            ? rawIds.map((x: unknown) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
                            : [];
                        const judgeMargin =
                            typeof o.judgeMargin === 'string' && o.judgeMargin.trim()
                                ? o.judgeMargin.trim()
                                : undefined;
                        const decisionDate =
                            typeof o.decisionDate === 'string' && o.decisionDate.trim()
                                ? o.decisionDate.trim()
                                : undefined;
                        const hasRecordedFinalDecision =
                            isLawyerRequestFinalStatus(status) &&
                            Boolean(judgeMargin) &&
                            Boolean(decisionDate);
                        const isLocked =
                            o.isLocked === true ||
                            o.decisionArchived === true ||
                            hasRecordedFinalDecision;
                        return {
                            id: String(o.id ?? createId()),
                            requestDate: String(o.requestDate ?? new Date().toISOString().slice(0, 10)),
                            type: String(o.type ?? ''),
                            lawyerNote: String(o.lawyerNote ?? ''),
                            status,
                            judgeMargin,
                            decisionDate,
                            defendantIds: ids.length ? Array.from(new Set(ids)) : undefined,
                            isLocked,
                            decisionArchived:
                                o.decisionArchived === true || hasRecordedFinalDecision ? true : undefined,
                            proceduralTemplate:
                                typeof o.proceduralTemplate === 'string' ? o.proceduralTemplate : undefined,
                            isAppealable: o.isAppealable === true ? true : undefined,
                            detentionStartDate:
                                typeof o.detentionStartDate === 'string' && o.detentionStartDate.trim()
                                    ? o.detentionStartDate.trim()
                                    : undefined,
                            detentionEndDate:
                                typeof o.detentionEndDate === 'string' && o.detentionEndDate.trim()
                                    ? o.detentionEndDate.trim()
                                    : undefined,
                            legalArticleBasis:
                                typeof o.legalArticleBasis === 'string' && o.legalArticleBasis.trim()
                                    ? o.legalArticleBasis.trim()
                                    : undefined,
                            orderEnforcement: normalizeOrderEnforcementTracking(o.orderEnforcement),
                            margins: (() => {
                                if (!Array.isArray(o.margins)) return undefined;
                                const rows = o.margins
                                    .map((m: unknown) => {
                                        if (!m || typeof m !== 'object') return null;
                                        const row = m as Record<string, unknown>;
                                        const text = String(row.text ?? '').trim();
                                        if (!text) return null;
                                        return {
                                            id: String(row.id ?? createId()),
                                            date: String(row.date ?? new Date().toISOString().slice(0, 10)),
                                            text,
                                        };
                                    })
                                    .filter(Boolean) as { id: string; date: string; text: string }[];
                                return rows.length ? rows : undefined;
                            })(),
                            attachments: (() => {
                                if (!Array.isArray(o.attachments)) return undefined;
                                const rows = o.attachments
                                    .map((a: unknown) => {
                                        if (!a || typeof a !== 'object') return null;
                                        const row = a as Record<string, unknown>;
                                        const name = String(row.name ?? '').trim();
                                        if (!name) return null;
                                        return { id: String(row.id ?? createId()), name };
                                    })
                                    .filter(Boolean) as { id: string; name: string }[];
                                return rows.length ? rows : undefined;
                            })(),
                            isStarred: o.isStarred === true ? true : undefined,
                        };
                    });
                };

                const normalizeLegalArticleHistory = (caseObj: any): LegalArticleChange[] => {
                    const history = caseObj?.legalArticleHistory;
                    if (Array.isArray(history)) {
                        return history
                            .map((h: any) => ({
                                id: String(h?.id ?? createId()),
                                article: String(h?.article ?? ''),
                                changedAtDate: String(h?.changedAtDate ?? new Date().toISOString().slice(0, 10)),
                                changedBy:
                                    h?.changedBy === 'police' || h?.changedBy === 'investigation_judge' || h?.changedBy === 'trial_court'
                                        ? h.changedBy
                                        : 'trial_court',
                            }))
                            .filter((h: any) => String(h.article ?? '').trim().length > 0);
                    }
                    const legacy = String(caseObj?.basics?.legalArticle ?? '').trim();
                    if (!legacy) return [];
                    return [
                        {
                            id: createId(),
                            article: legacy,
                            changedAtDate: new Date().toISOString().slice(0, 10),
                            changedBy: 'trial_court',
                        },
                    ];
                };

                const normalizeFinalDecision = (caseObj: any): StageConclusion | undefined => {
                    const fd = caseObj?.finalDecision;
                    if (!fd || typeof fd !== 'object') return undefined;
                    const stageType = String((fd as any).stageType ?? '');
                    const decisionType = String((fd as any).decisionType ?? '');
                    const defendantStatusAtDecision = String((fd as any).defendantStatusAtDecision ?? '');
                    if (
                        !['investigation', 'misdemeanor', 'felony', 'juvenile', 'cassation'].includes(stageType) ||
                        ![
                            'referral',
                            'closing',
                            'temporary_closing',
                            'conviction',
                            'juvenile_deliver_guardian',
                            'juvenile_behavioral_surveillance',
                            'juvenile_reform_boys',
                            'juvenile_youth_school',
                            'juvenile_fine',
                            'juvenile_severance_referral',
                            'acquittal',
                            'release',
                            'expiration',
                            'cassation_confirm',
                            'cassation_quash_remand',
                            'cassation_quash_reduce',
                            'cassation_quash_acquit_release',
                            'return_investigation_deficiency',
                            'misdemeanor_to_felony_jurisdiction',
                            'felony_to_misdemeanor_jurisdiction',
                            'trial_cassation_appeal',
                            'cassation_quash_investigation',
                            'cassation_quash_trial_misdemeanor',
                            'cassation_quash_trial_felony',
                            'case_split_fugitive_referral',
                            'temporary_release_insufficient_evidence',
                            'postpone_article_183',
                            'default_judgment_issue',
                            'default_judgment_opposition',
                        ].includes(decisionType) ||
                        !['detained', 'bailed', 'fugitive'].includes(defendantStatusAtDecision)
                    ) {
                        return undefined;
                    }
                    return {
                        id: String((fd as any).id ?? createId()),
                        stageType: stageType as any,
                        decisionType: decisionType as any,
                        date: String((fd as any).date ?? ''),
                        details: String((fd as any).details ?? ''),
                        defendantStatusAtDecision: defendantStatusAtDecision as any,
                        defendantIds: Array.isArray((fd as any).defendantIds)
                            ? (fd as any).defendantIds.map((x: any) => String(x ?? '').trim()).filter((x: string) => x.length > 0)
                            : undefined,
                        punishmentType:
                            (fd as any).punishmentType === 'death' ||
                            (fd as any).punishmentType === 'life' ||
                            (fd as any).punishmentType === 'other'
                                ? (fd as any).punishmentType
                                : undefined,
                        expirationReason: isStageExpirationReason(String((fd as any).expirationReason ?? ''))
                            ? (fd as any).expirationReason
                            : undefined,
                    };
                };

                const stripLegacyComplainant = (c: any) => {
                    const { isCivilClaimant: _legacy, ...rest } = c && typeof c === 'object' ? c : {};
                    return {
                        ...rest,
                        isJuvenile: typeof c?.isJuvenile === 'boolean' ? c.isJuvenile : false,
                        isUnderSeven: typeof (c as any)?.isUnderSeven === 'boolean' ? (c as any).isUnderSeven : false,
                        birthDate: typeof c?.birthDate === 'string' ? c.birthDate : '',
                        guardianName: typeof c?.guardianName === 'string' ? c.guardianName : '',
                        guardianRelationship: typeof c?.guardianRelationship === 'string' ? c.guardianRelationship : '',
                    };
                };

                const nextDraft = s.draft && typeof s.draft === 'object' ? { ...s.draft } : undefined;
                if (nextDraft) {
                    const complainantsRaw = Array.isArray((nextDraft as any).complainants) ? (nextDraft as any).complainants : [];
                    const complainants = complainantsRaw.map(stripLegacyComplainant);
                    (nextDraft as any).complainants = complainants;
                    delete (nextDraft as any).civilClaimantDetails;
                    const draftBasics = (nextDraft as any).basics && typeof (nextDraft as any).basics === 'object' ? { ...(nextDraft as any).basics } : {};
                    const incoming = String(draftBasics.ourRepresentation ?? '').trim();
                    const draftRole = String(draftBasics.role ?? '').trim();
                    const normalized = normalizeOurRepresentation(incoming, draftRole);
                    const draftStage = normalizeLegacyCriminalStage(
                        String(draftBasics.stage ?? ''),
                        String(draftBasics.crimeType ?? '') as CrimeType | '',
                    );
                    (nextDraft as any).basics = { ...draftBasics, ourRepresentation: normalized, stage: draftStage };
                    const plIncoming = String((nextDraft as any).physicalLocation ?? '').trim();
                    const plValid =
                        plIncoming === 'judge_desk' ||
                        plIncoming === 'investigator_room' ||
                        plIncoming === 'prosecution' ||
                        plIncoming === 'police_station' ||
                        plIncoming === 'archive' ||
                        plIncoming === 'custom';
                    if (!plValid) {
                        (nextDraft as any).physicalLocation = 'custom';
                        (nextDraft as any).physicalLocationCustomName = '';
                    } else {
                        (nextDraft as any).physicalLocation = plIncoming;
                        (nextDraft as any).physicalLocationCustomName =
                            typeof (nextDraft as any).physicalLocationCustomName === 'string'
                                ? (nextDraft as any).physicalLocationCustomName
                                : '';
                    }
                    (nextDraft as any).isArticle3Offense = (nextDraft as any).isArticle3Offense === true ? true : false;
                    (nextDraft as any).crimeDiscoveryDate =
                        typeof (nextDraft as any).crimeDiscoveryDate === 'string' ? String((nextDraft as any).crimeDiscoveryDate) : '';
                    (nextDraft as any).isMutualComplaint = (nextDraft as any).isMutualComplaint === true ? true : false;
                    nextDraft.statements = normalizeStatements(nextDraft.statements);
                    (nextDraft as any).otherEvidenceItems = normalizeOtherEvidenceItems(
                        (nextDraft as any).otherEvidenceItems,
                    );
                    nextDraft.timelineEvents = normalizeTimeline(nextDraft.timelineEvents);
                    nextDraft.investigationLogs = normalizeInvestigationLogs((nextDraft as any).investigationLogs);
                    const draftContainers = (nextDraft as any).proceduralContainers;
                    const draftLegacyPaths = (nextDraft as any).proceduralPaths;
                    nextDraft.proceduralContainers = Array.isArray(draftContainers)
                        ? normalizeProceduralContainers(draftContainers)
                        : migrateLegacyPathsToContainers(draftLegacyPaths);
                    delete (nextDraft as any).proceduralPaths;
                    nextDraft.lawyerRequests = normalizeLawyerRequests((nextDraft as any).lawyerRequests);
                    nextDraft.trials = normalizeTrialSessions((nextDraft as any).trials);
                    nextDraft.trialDepositions = normalizeTrialDepositions((nextDraft as any).trialDepositions);
                    nextDraft.location = normalizeCriminalCaseLocation(nextDraft.location);
                }

                const nextCasesById = s.casesById && typeof s.casesById === 'object' ? { ...s.casesById } : undefined;
                if (nextCasesById) {
                    Object.keys(nextCasesById).forEach((k) => {
                        const c = nextCasesById[k];
                        if (!c || typeof c !== 'object') return;
                        const defendants = Array.isArray((c as any).defendants) ? (c as any).defendants : [];
                        const complainantsRaw = Array.isArray((c as any).complainants) ? (c as any).complainants : [];
                        const complainants = complainantsRaw.map(stripLegacyComplainant);
                        const legalArticleHistory = normalizeLegalArticleHistory(c);
                        const finalDecision = normalizeFinalDecision(c);
                        const { civilClaimantDetails: _ccd, ...caseRest } = c as Record<string, unknown>;
                        nextCasesById[k] = {
                            ...caseRest,
                            location: normalizeCriminalCaseLocation((c as any).location),
                            complainants,
                            finalDecision,
                            defendants: (() => {
                                const normalizedDefendants = defendants.map((d: any) => ({
                                    ...d,
                                    fullName: resolveDefendantFullName(d),
                                    address: typeof d?.address === 'string' ? d.address : '',
                                    isJuvenile: typeof d?.isJuvenile === 'boolean' ? d.isJuvenile : false,
                                    isUnderSeven:
                                        typeof (d as any)?.isUnderSeven === 'boolean' ? (d as any).isUnderSeven : false,
                                    birthDate: typeof d?.birthDate === 'string' ? d.birthDate : '',
                                    guardianName: typeof d?.guardianName === 'string' ? d.guardianName : '',
                                    guardianRelationship: typeof d?.guardianRelationship === 'string' ? d.guardianRelationship : '',
                                    socialInquiryReport: normalizeSocialInquiryReport(d?.socialInquiryReport),
                                    totalDetentionDays: Number.isFinite(Number(d?.totalDetentionDays)) ? Number(d.totalDetentionDays) : 0,
                                    hasFelonyCourtPermit: d?.hasFelonyCourtPermit === true ? true : false,
                                    guarantorDetails: normalizeGuarantorDetails(d?.guarantorDetails),
                                    inAbsentiaDetails:
                                        d?.inAbsentiaDetails && typeof d.inAbsentiaDetails === 'object'
                                            ? (() => {
                                                  const det = d.inAbsentiaDetails as any;
                                                  const verdictDate = String(det.verdictDate ?? '').trim();
                                                  const notifiedDate = typeof det.notifiedDate === 'string' ? det.notifiedDate : '';
                                                  const objectionDeadline =
                                                      notifiedDate.trim() && typeof det.objectionDeadline === 'string'
                                                          ? String(det.objectionDeadline)
                                                          : '';
                                                  return {
                                                      verdictDate,
                                                      objectionDeadline,
                                                      isObjectionFiled: det.isObjectionFiled === true,
                                                      notifiedDate: notifiedDate.trim() ? notifiedDate : undefined,
                                                      notificationMethod:
                                                          typeof det.notificationMethod === 'string' && String(det.notificationMethod).trim()
                                                              ? String(det.notificationMethod)
                                                              : undefined,
                                                  } as InAbsentiaDetails;
                                              })()
                                            : undefined,
                                    detentionExpiryDate: typeof d?.detentionExpiryDate === 'string' ? d.detentionExpiryDate : '',
                                    detentionHistoryLog: Array.isArray(d?.detentionHistoryLog)
                                        ? d.detentionHistoryLog
                                              .map((h: any) => ({
                                                  id: String(h?.id ?? createId()),
                                                  location: String(h?.location ?? ''),
                                                  startDate: String(h?.startDate ?? ''),
                                                  endDate: typeof h?.endDate === 'string' ? h.endDate : undefined,
                                              }))
                                              .filter((h: any) => String(h.startDate ?? '').trim().length > 0)
                                        : [],
                                    seizedAssets: normalizeSeizedAssets((d as any)?.seizedAssets),
                                }));
                                const isSeveredChild = (c as any).isSeveredChild === true;
                                const hasActiveDefendant = normalizedDefendants.some(
                                    (d: any) => normalizeInvestigationDefendantStatus(d?.investigationStatus) === 'active',
                                );
                                const hasClosure = Boolean((c as any).investigationDossierClosure);
                                if (isSeveredChild && normalizedDefendants.length > 0 && !hasActiveDefendant && !hasClosure) {
                                    return normalizedDefendants.map((d: any) => ({
                                        ...d,
                                        investigationStatus: DEFAULT_INVESTIGATION_DEFENDANT_STATUS,
                                    }));
                                }
                                return normalizedDefendants;
                            })(),
                            statements: normalizeStatements((c as any).statements),
                            otherEvidenceItems: normalizeOtherEvidenceItems((c as any).otherEvidenceItems),
                            timelineEvents: (() => {
                                const stage = String((c as any).basics?.stage ?? '').trim();
                                const events = normalizeTimeline((c as any).timelineEvents);
                                if (!isInvestigationStoredStage(stage)) return events;
                                return events.map((ev) => {
                                    const { nextDate: _drop, ...rest } = ev as TimelineEvent & {
                                        nextDate?: string;
                                    };
                                    return rest as TimelineEvent;
                                });
                            })(),
                            investigationLogs: normalizeInvestigationLogs((c as any).investigationLogs),
                            proceduralContainers: (() => {
                                const raw = (c as any).proceduralContainers;
                                if (Array.isArray(raw)) return normalizeProceduralContainers(raw);
                                return migrateLegacyPathsToContainers((c as any).proceduralPaths);
                            })(),
                            proceduralCanvasAudit: normalizeProceduralCanvasAudit((c as any).proceduralCanvasAudit),
                            lawyerRequests: normalizeLawyerRequests((c as any).lawyerRequests),
                            trials: normalizeTrialSessions((c as any).trials),
                            trialDepositions: normalizeTrialDepositions((c as any).trialDepositions),
                            ...normalizeTrialChargeFieldsOnCase(c as CriminalCase),
                            trashBin: normalizeTrashBin((c as any).trashBin),
                            isFrozen: typeof (c as any).isFrozen === 'boolean' ? (c as any).isFrozen : undefined,
                            isPrejudicialPostponed:
                                typeof (c as any).isPrejudicialPostponed === 'boolean'
                                    ? (c as any).isPrejudicialPostponed
                                    : undefined,
                            isDefaultJudgmentArchived:
                                typeof (c as any).isDefaultJudgmentArchived === 'boolean'
                                    ? (c as any).isDefaultJudgmentArchived
                                    : undefined,
                            parentCaseId:
                                typeof (c as any).parentCaseId === 'string' && String((c as any).parentCaseId).trim()
                                    ? String((c as any).parentCaseId).trim()
                                    : undefined,
                            isSeveredChild: (c as any).isSeveredChild === true,
                            severanceReason: isSeveranceReasonValue(String((c as any).severanceReason ?? ''))
                                ? ((c as any).severanceReason as SeveranceReason)
                                : undefined,
                            severanceReasonDetail:
                                typeof (c as any).severanceReasonDetail === 'string' &&
                                String((c as any).severanceReasonDetail).trim()
                                    ? String((c as any).severanceReasonDetail).trim()
                                    : undefined,
                            severedAt:
                                typeof (c as any).severedAt === 'string' && String((c as any).severedAt).trim()
                                    ? String((c as any).severedAt).trim()
                                    : undefined,
                            severedChildCaseIds: Array.isArray((c as any).severedChildCaseIds)
                                ? (c as any).severedChildCaseIds
                                      .map((x: unknown) => String(x ?? '').trim())
                                      .filter((x: string) => x.length > 0)
                                : undefined,
                            verdictDate: typeof (c as any).verdictDate === 'string' ? (c as any).verdictDate : undefined,
                            isSentToCassation:
                                typeof (c as any).isSentToCassation === 'boolean' ? (c as any).isSentToCassation : undefined,
                            cassationCaseDetails:
                                (c as any).cassationCaseDetails && typeof (c as any).cassationCaseDetails === 'object'
                                    ? {
                                          cassationNumber: String((c as any).cassationCaseDetails.cassationNumber ?? ''),
                                          sentDate: String((c as any).cassationCaseDetails.sentDate ?? ''),
                                          panelName: String((c as any).cassationCaseDetails.panelName ?? ''),
                                      }
                                    : undefined,
                            isArchived: typeof (c as any).isArchived === 'boolean' ? (c as any).isArchived : undefined,
                            notes: typeof (c as any).notes === 'string' ? (c as any).notes : undefined,
                            legalArticleHistory,
                            basics: {
                                ...(c as any).basics,
                                stage: normalizeLegacyCriminalStage(
                                    String((c as any).basics?.stage ?? ''),
                                    String((c as any).basics?.crimeType ?? '') as CrimeType | '',
                                ),
                                legalArticle:
                                    legalArticleHistory.length > 0
                                        ? legalArticleHistory[legalArticleHistory.length - 1].article
                                        : String((c as any).basics?.legalArticle ?? ''),
                                ourRepresentation: normalizeOurRepresentation(
                                    String((c as any).basics?.ourRepresentation ?? ''),
                                    String((c as any).basics?.role ?? ''),
                                ),
                            },
                            isPrivateRightWaived:
                                typeof (c as any).isPrivateRightWaived === 'boolean' ? (c as any).isPrivateRightWaived : undefined,
                            waiverDate: typeof (c as any).waiverDate === 'string' ? (c as any).waiverDate : undefined,
                            physicalLocation: ((): PhysicalLocation => {
                                const incoming = String((c as any).physicalLocation ?? (c as any).physicalLocation?.key ?? '').trim();
                                const valid =
                                    incoming === 'judge_desk' ||
                                    incoming === 'investigator_room' ||
                                    incoming === 'prosecution' ||
                                    incoming === 'police_station' ||
                                    incoming === 'archive' ||
                                    incoming === 'custom';
                                if (valid) return incoming as PhysicalLocation;
                                const stage = String((c as any).basics?.stage ?? '').trim();
                                const isArchivedAny = Boolean((c as any).isArchived) || Boolean(String((c as any).mergedIntoCaseId ?? '').trim());
                                if (isArchivedAny) return 'archive';
                                if (isInvestigationStoredStage(stage)) {
                                    const at = String((c as any).location?.investigationPapersAt ?? '').trim();
                                    if (at === 'مركز شرطة') return 'police_station';
                                    return 'investigator_room';
                                }
                                return 'judge_desk';
                            })(),
                            physicalLocationCustomName:
                                typeof (c as any).physicalLocationCustomName === 'string'
                                    ? (c as any).physicalLocationCustomName
                                    : undefined,
                            isArticle3Offense: (c as any).isArticle3Offense === true ? true : undefined,
                            crimeDiscoveryDate:
                                typeof (c as any).crimeDiscoveryDate === 'string' ? String((c as any).crimeDiscoveryDate) : undefined,
                            isMutualComplaint: (c as any).isMutualComplaint === true ? true : false,
                            dossierStatus: ((): CriminalDossierStatus | undefined => {
                                const raw = String((c as any).dossierStatus ?? '').trim();
                                if (raw === 'merged' || raw === 'active') return raw;
                                const mergedInto = String((c as any).mergedIntoCaseId ?? '').trim();
                                if (mergedInto) return 'merged';
                                return 'active';
                            })(),
                            mergedCasesTexts: Array.isArray((c as any).mergedCasesTexts)
                                ? (c as any).mergedCasesTexts
                                      .map((x: unknown) => String(x ?? '').trim())
                                      .filter((x: string) => x.length > 0)
                                : undefined,
                            mergedIntoCaseId:
                                typeof (c as any).mergedIntoCaseId === 'string' && String((c as any).mergedIntoCaseId).trim()
                                    ? String((c as any).mergedIntoCaseId).trim()
                                    : undefined,
                            mergedIntoCaseNumber:
                                typeof (c as any).mergedIntoCaseNumber === 'string' &&
                                String((c as any).mergedIntoCaseNumber).trim()
                                    ? String((c as any).mergedIntoCaseNumber).trim()
                                    : undefined,
                            mergedCaseIds: resolveMergedCaseIds(c as CriminalCase),
                        };
                        nextCasesById[k] = repairUnknownDefendantCaseRecord(nextCasesById[k] as CriminalCase);
                    });
                }

                if (nextDraft) {
                    const draftDefendants = Array.isArray((nextDraft as any).defendants) ? (nextDraft as any).defendants : [];
                    (nextDraft as any).defendants = draftDefendants.map((d: any) => ({
                        ...d,
                        address: typeof d?.address === 'string' ? d.address : '',
                        isJuvenile: typeof d?.isJuvenile === 'boolean' ? d.isJuvenile : false,
                        isUnderSeven: typeof (d as any)?.isUnderSeven === 'boolean' ? (d as any).isUnderSeven : false,
                        birthDate: typeof d?.birthDate === 'string' ? d.birthDate : '',
                        guardianName: typeof d?.guardianName === 'string' ? d.guardianName : '',
                        guardianRelationship: typeof d?.guardianRelationship === 'string' ? d.guardianRelationship : '',
                        socialInquiryReport: normalizeSocialInquiryReport(d?.socialInquiryReport),
                        totalDetentionDays: Number.isFinite(Number(d?.totalDetentionDays)) ? Number(d.totalDetentionDays) : 0,
                        hasFelonyCourtPermit: d?.hasFelonyCourtPermit === true ? true : false,
                        guarantorDetails: normalizeGuarantorDetails(d?.guarantorDetails),
                        detentionExpiryDate: typeof d?.detentionExpiryDate === 'string' ? d.detentionExpiryDate : '',
                        detentionHistoryLog: Array.isArray(d?.detentionHistoryLog)
                            ? d.detentionHistoryLog
                                  .map((h: any) => ({
                                      id: String(h?.id ?? createId()),
                                      location: String(h?.location ?? ''),
                                      startDate: String(h?.startDate ?? ''),
                                      endDate: typeof h?.endDate === 'string' ? h.endDate : undefined,
                                  }))
                                  .filter((h: any) => String(h.startDate ?? '').trim().length > 0)
                            : [],
                        seizedAssets: normalizeSeizedAssets((d as any)?.seizedAssets),
                    }));
                }

                let casesOut = nextCasesById ?? s.casesById;
                if (casesOut && typeof casesOut === 'object') {
                    const map = { ...(casesOut as Record<string, CriminalCase>) };
                    for (const [caseId, raw] of Object.entries(map)) {
                        const c = raw as CriminalCase;
                        let patched = { ...c };

                        const mergedIds = resolveMergedCaseIds(c);
                        if (mergedIds.length > 0) {
                            const texts = sanitizeMergedCasesTexts(
                                Array.isArray(c.mergedCasesTexts) ? c.mergedCasesTexts : [],
                            );
                            for (const childId of mergedIds) {
                                const child = map[childId];
                                const num = resolveOfficialCaseNumber(child);
                                if (num !== '—' && !texts.includes(num)) texts.push(num);
                            }
                            if (texts.length) patched = { ...patched, mergedCasesTexts: texts };
                            const events = Array.isArray(patched.timelineEvents) ? patched.timelineEvents : [];
                            const cleanEvents = sanitizeMergeTimelineEvents(events, mergedIds, map);
                            if (cleanEvents !== events) patched = { ...patched, timelineEvents: cleanEvents };
                        }

                        const mergedIntoId = String(c.mergedIntoCaseId ?? '').trim();
                        if (mergedIntoId) {
                            const parent = map[mergedIntoId];
                            const parentNum = resolveOfficialCaseNumber(parent);
                            patched = {
                                ...patched,
                                dossierStatus: 'merged' as const,
                                mergedIntoCaseNumber: String(c.mergedIntoCaseNumber ?? '').trim() || parentNum,
                            };
                        }

                        patched = ensureStageJourneyOnCase(patched);
                        patched = {
                            ...patched,
                            judicialDecisions: mergeJudicialDecisionsFromRequests(
                                (Array.isArray(patched.judicialDecisions)
                                    ? patched.judicialDecisions
                                          .map((d) => normalizeJudicialDecision(d))
                                          .filter((x): x is JudicialDecision => Boolean(x))
                                    : undefined) as JudicialDecision[] | undefined,
                                patched.lawyerRequests,
                            ),
                        };
                        const migratedProceeding = migrateLegacyCassationToProceeding(patched);
                        if (migratedProceeding) {
                            patched = { ...patched, cassationProceeding: migratedProceeding };
                        }
                        if (Array.isArray(patched.defendants)) {
                            patched = {
                                ...patched,
                                defendants: patched.defendants.map((d) => normalizeDefendantPersonalFields(d)),
                            };
                        }
                        const stageResolved = resolveCaseStageFromRecord(patched);
                        patched = { ...patched, caseStage: stageResolved };
                        if (stageResolved === 'misdemeanor' || stageResolved === 'felony') {
                            if (!patched.isInvestigationLocked) patched = { ...patched, isInvestigationLocked: true };
                            const courtNum =
                                String(patched.courtCaseNumber ?? '').trim() ||
                                String(patched.location?.caseNumber ?? '').trim();
                            if (courtNum) {
                                patched = {
                                    ...patched,
                                    courtCaseNumber: courtNum,
                                    location: { ...patched.location, caseNumber: courtNum },
                                };
                            }
                            const invSnap =
                                String(patched.investigationCaseNumber ?? '').trim() ||
                                resolveInvestigationCaseNumberSnapshot(patched);
                            if (invSnap && invSnap !== '—') {
                                patched = { ...patched, investigationCaseNumber: invSnap };
                            }
                        }

                        map[caseId] = migrateVerdictCardsOnCase(patched);
                    }
                    casesOut = map;
                }

                return { ...s, draft: nextDraft ?? s.draft, casesById: casesOut };
            },
            storage: criminalPersistStorage,
            partialize: (state) => ({
                casesById: state.casesById,
                pendingSeveranceContext: state.pendingSeveranceContext,
                draft:
                    state.pendingSeveranceContext != null
                        ? makeInitialDraft()
                        : state.draft,
            }),
        },
    ),
);

function mergeTimelineEventsFromPersisted(
    live: TimelineEvent[] | undefined,
    persisted: TimelineEvent[] | undefined,
): TimelineEvent[] {
    const liveList = Array.isArray(live) ? live : [];
    const persistedList = Array.isArray(persisted) ? persisted : [];
    if (!persistedList.length) return liveList;
    const byId = new Map(liveList.map((e) => [e.id, e]));
    for (const ev of persistedList) {
        const id = String(ev.id ?? '').trim();
        if (!id) continue;
        const prior = byId.get(id);
        byId.set(id, prior ? ({ ...prior, ...ev } as TimelineEvent) : ev);
    }
    const seen = new Set<string>();
    const merged: TimelineEvent[] = [];
    for (const e of liveList) {
        merged.push(byId.get(e.id) ?? e);
        seen.add(e.id);
    }
    for (const e of persistedList) {
        const id = String(e.id ?? '').trim();
        if (!id || seen.has(id)) continue;
        merged.push(byId.get(id) ?? e);
    }
    return merged;
}

function mergeTrialSessionsFromPersisted(
    live: TrialSession[] | undefined,
    persisted: TrialSession[] | undefined,
): TrialSession[] {
    const liveList = normalizeTrialSessions(live);
    const persistedList = normalizeTrialSessions(persisted);
    if (!persistedList.length) return liveList;
    const byId = new Map(liveList.map((s) => [s.id, s]));
    for (const session of persistedList) {
        const id = String(session.id ?? '').trim();
        if (!id) continue;
        const prior = byId.get(id);
        byId.set(id, prior ? ({ ...prior, ...session } as TrialSession) : session);
    }
    return liveList.map((s) => byId.get(s.id) ?? s);
}

/** دمج حقول مزامنة التقويم فقط — دون استبدال الإضبارة الحية بنسخة قديمة من IndexedDB. */
function mergePersistedCriminalCaseWithLive(existing: CriminalCase, raw: CriminalCase): CriminalCase {
    const persistedLocation = normalizeCriminalCaseLocation(raw.location);
    const liveLocation = existing.location;
    const nextHearingDate = String(persistedLocation.nextHearingDate ?? '').trim();
    const location =
        nextHearingDate !== String(liveLocation.nextHearingDate ?? '').trim()
            ? { ...liveLocation, nextHearingDate: persistedLocation.nextHearingDate }
            : liveLocation;
    return {
        ...existing,
        location,
        timelineEvents: mergeTimelineEventsFromPersisted(existing.timelineEvents, raw.timelineEvents),
        trials: mergeTrialSessionsFromPersisted(existing.trials, raw.trials),
    };
}

function mergeCriminalCasesFromPersistedStorage(caseId?: string): void {
    const rows = loadCriminalCasesRaw();
    if (!rows.length) return;
    useCriminalStore.setState((state) => {
        const next = { ...state.casesById };
        for (const raw of rows) {
            const id = String(raw.id ?? '').trim();
            if (!id) continue;
            if (caseId && id !== String(caseId)) continue;
            const existing = next[id];
            next[id] = existing
                ? mergePersistedCriminalCaseWithLive(existing, raw as CriminalCase)
                : (raw as CriminalCase);
        }
        return { casesById: next };
    });
}

if (typeof window !== 'undefined') {
    window.addEventListener(CRIMINAL_STORAGE_PATCHED_EVENT, (ev) => {
        const detail = (ev as CustomEvent<{ caseId?: string }>).detail;
        mergeCriminalCasesFromPersistedStorage(detail?.caseId);
    });
}
