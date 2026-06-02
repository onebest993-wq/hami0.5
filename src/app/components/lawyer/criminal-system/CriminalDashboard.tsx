import React, {
    Suspense,
    startTransition,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ArrowRight, X } from 'lucide-react';
import { supabase } from '@/app/lib/supabase-client';
import {
    useCriminalStore,
    type CriminalCase,
    type CriminalDefendant,
    type CriminalCaseStage,
    type DefendantStatus,
    type LegalArticleChange,
    type LawyerRequest,
    type OurRepresentation,
    type PhysicalLocation,
    type StageConclusion,
    type Statement,
    type OtherEvidenceItem,
    type TimelineEvent,
    resolveMergedCaseIds,
    isGuarantorForfeited,
    normalizeGuarantorDetails,
    MergeValidationError,
    sanitizeCaseReferenceField,
} from './criminalStore';
import { CriminalDashboardHeader } from './CriminalDashboardHeader';
import { CriminalPartiesGrid } from './CriminalPartiesGrid';
import {
    buildCriminalActionParties,
    formatConcernedPartyLabel,
    formatInvestigationDepositLocation,
    formatTrialCourtHeaderPrimary,
    formatLawyerRequestStatusLabel,
    CONFIDENTIAL_SESSION_BADGE,
    formatCriminalStageLabel,
    hasJuvenileAccused,
    hasJuvenileParty,
    isInvestigationStoredStage,
    isJuvenileTrialStage,
    isReferralTrialStage,
    isValidCriminalStage,
    isValidSocialInquiryWorkflowStatus,
    JUVENILE_REMEDIAL_DECISION_OPTIONS,
    resolveCourtDisplayName,
    resolveTimelineEventTitle,
    formatTimelineCategoryDisplayLabel,
    normalizeTimelineCategoryForDisplay,
    isTimelineNextDateInvalid,
    INVESTIGATION_ARTICLE_130_DECISIONS,
    isPrivateRightWaiverDecisionValue,
    isTrialCaseStage,
    PRIVATE_RIGHT_WAIVER_DECISION_LABEL,
    PRIVATE_RIGHT_WAIVER_DECISION_VALUE,
    resolveCaseStageFromRecord,
    sortTimelineEventsDesc,
    socialInquiryWorkflowLabel,
    storedStageFromCaseStage,
    syncStoredStageFromJourneyCaseStage,
} from './criminalStageUtils';
import { CaseJourneyHeader } from './components/CaseJourneyHeader';
import {
    eventBelongsToJourneyBranch,
    eventBelongsToJourneyNode,
    getCurrentJourneyNode,
    getJourneyBranchTracks,
    getStageTransitionOptions,
    isProceduralRouteDecisionType,
    repairSameCourtRemandJourneyNodes,
} from './stageJourney';
import {
    getTrialCourtReferralOrderOptions,
    referralOrderMenuLabel,
    type TrialReferralOrderActionId,
} from './trialReferralOrdersEngine';
import {
    decisionRequiresDefendantScope,
    filterSelectableDefendantsForScope,
    resolveEffectiveDefendantScopeIds,
    shouldShowDefendantDecisionScopePicker,
} from './partyPersonalStage';
import {
    isTemporaryClosingFollowUp,
    resolveCanConcludeStage,
    resolveCanCreateDecisionsOrRequests,
    shouldOpenInvestigationDecisionModal,
} from './criminalDashboardStageAccess';
import { isStageExpirationReason, STAGE_EXPIRATION_REASONS, validateExpirationReasonSelection } from './stageExpirationReasons';
import { ExpirationReasonFields } from './components/ExpirationReasonFields';
import {
    isInheritedTimelineEvent,
    resolveCriminalCaseForDisplay,
} from './caseSeveranceView';
import { DefendantDecisionScopePicker } from './components/DefendantDecisionScopePicker';
import { UnknownDefendantPartyBlockedRow } from './components/UnknownDefendantPartyBlockedRow';
import type { CassationType, ProsecutionInterventionBasis } from '@/app/types/criminal';
import { isCassationClosureQuashDecision, isUnderInterventionReview, availableCassationTypesForStage, cassationFilingTypeLabel } from './cassationEngine';
import type { SocialInquiryWorkflowStatus } from './criminalStageUtils';
import { ConfirmActionModal } from './ConfirmActionModal';
import {
    InvestigationDecisionModal,
    SeveranceTargetPickerModal,
    PartyIdentityCorrectionModal,
    VenueIdentityCorrectionModal,
    CriminalCaseTrashModal,
    TrialDepositionModal,
    JudicialCassationAppealModal,
    type JudicialCassationAppealModalVariant,
    JudicialCassationResultModal,
    VerdictCassationFilingModal,
    StageFinalDecisionModal,
    ProceduralLinkedTimelineModal,
    RequestQuickFinalizeModal,
    CriminalStatementModal,
    MergeCaseModal,
} from './criminalDashboardLazyModals';
import {
    filterActiveInvestigationDefendants,
    filterStatementEligibleDefendants,
    resolveVisibleInvestigationDefendants,
    investigationDossierIsSealed,
    investigationDossierIsTemporarilyClosed,
    investigationDossierSealMessage,
    investigationStatementsMutationBlocked,
    otherEvidenceMutationBlocked,
    caseAllowsDefendantSeverance,
    caseAllowsSeveranceOrDossierStrike,
    shouldShowInvestigationDefendantScopePicker,
    requiresInvestigationPurgeDefendantScope,
    validateSeveranceOrDossierStrikePartyRule,
} from './investigationDefendantPurge';
import {
    caseAllowsFugitiveParallelSplit,
    INVESTIGATION_FUGITIVE_PARALLEL_SPLIT_LABEL,
    INVESTIGATION_MIXED_JUVENILE_ADULT_REFERRAL_BLOCKED_MESSAGE,
    INVESTIGATION_MIXED_UNKNOWN_IDENTIFIED_REFERRAL_BLOCKED_MESSAGE,
} from './investigationPhaseGuidance';
import {
    filterStatementsExcludingUnknown,
    getIdentifiedDefendants,
    getUnknownIdentityDefendants,
    hasIdentifiedDefendant,
    hasUnrevealedUnknownDefendants,
    investigationDossierHasMixedUnknownAndIdentified,
    isDefendantIdentityUnknown,
    normalizeCaseDefendantsForUnknown,
} from './criminalUnknownDefendant';
import {
    isInvestigationExpirationJudicialTemplate,
    isInvestigationImmediatePurgeTemplate,
    isInvestigationPurgeDecisionTemplate,
    purgeDecisionIncludesUnknownDefendants,
} from './proceduralRequestTypes';
import { ConcernedPartyDecisionPicker } from './components/ConcernedPartyDecisionPicker';
import type { PartyBailDraft, PartyDetentionDraft } from './components/ConcernedPartyDecisionPicker';
import { emptyPartyBailDraft, isPartyBailDraftValid } from './components/ConcernedPartyDecisionPicker';
import { PendingSeveranceResumeBar } from './components/PendingSeveranceResumeBar';
import { JudicialDecisionsLedger } from './components/JudicialDecisionsLedger';

const LazyCriminalNewCase = React.lazy(() =>
    import('./CriminalNewCase').then((m) => ({ default: m.CriminalNewCase })),
);
const LazyStatementsPhaseSections = React.lazy(() =>
    import('./components/StatementsPhaseSections').then((m) => ({ default: m.StatementsPhaseSections })),
);
const LazyLegalCodesTab = React.lazy(() =>
    import('./legalCodes/LegalCodesTab').then((m) => ({ default: m.LegalCodesTab })),
);
const LazyTrialsTab = React.lazy(() =>
    import('./components/TrialsTab').then((m) => ({ default: m.TrialsTab })),
);
const LazyRecursiveProceduralCanvas = React.lazy(() =>
    import('./components/RecursiveProceduralCanvas').then((m) => ({
        default: m.RecursiveProceduralCanvas,
    })),
);

type CriminalDashboardTab = 'requests' | 'statements' | 'tracking' | 'legal_codes';

function criminalDashboardTabClass(tab: CriminalDashboardTab, active: boolean): string {
    const base = 'px-4 py-2 rounded-xl border font-black text-sm transition whitespace-nowrap';
    const palette: Record<CriminalDashboardTab, { active: string; idle: string }> = {
        requests: {
            active: `${base} border-[#E6C673]/55 bg-[#E6C673]/12 text-[#E6C673] underline underline-offset-8 decoration-2 decoration-[#E6C673]`,
            idle: `${base} border-slate-700/80 bg-slate-900/80 text-white/70 hover:border-[#E6C673]/40 hover:text-[#E6C673]`,
        },
        statements: {
            active: `${base} border-sky-400/55 bg-sky-500/12 text-sky-100 underline underline-offset-8 decoration-2 decoration-sky-400`,
            idle: `${base} border-slate-700/80 bg-slate-900/80 text-white/70 hover:border-sky-400/40 hover:text-sky-200`,
        },
        tracking: {
            active: `${base} border-violet-400/55 bg-violet-500/12 text-violet-100 underline underline-offset-8 decoration-2 decoration-violet-400`,
            idle: `${base} border-slate-700/80 bg-slate-900/80 text-white/70 hover:border-violet-400/40 hover:text-violet-200`,
        },
        legal_codes: {
            active: `${base} border-emerald-400/55 bg-emerald-500/12 text-emerald-100 underline underline-offset-8 decoration-2 decoration-emerald-400`,
            idle: `${base} border-slate-700/80 bg-slate-900/80 text-white/70 hover:border-emerald-400/40 hover:text-emerald-200`,
        },
    };
    return active ? palette[tab].active : palette[tab].idle;
}
import { TrialDepositionWitnessCard } from './components/TrialDepositionWitnessCard';
import type { TrialDeposition } from './trialDepositionsEngine';
import { sortTrialDepositionsDesc } from './trialDepositionsEngine';
import { inferDecisionPresenceFromTrialSessions, resolveCassationRemandRetrialPivotDate, sortTrialSessionsAsc } from './trialSessionsEngine';
import { resolveCurrentAccusationArticleFromCase } from './trialChargeEngine';
import { normalizeTrashBin } from './criminalCaseTrash';
import type { DecisionsLedgerKindFilter } from './components/JudicialDecisionsLedger';
import { DecisionsCommandBar } from './components/DecisionsCommandBar';
import { LiveDetentionCard } from './components/LiveDetentionCard';
import { LiveArrestSummonCard } from './components/LiveArrestSummonCard';
import { VerdictCardsPanel } from './components/VerdictCardsPanel';
import { normalizeVerdictCards, resolveVerdictCardsLifecycle, type VerdictCard } from './verdictCardsEngine';
import type { StageFinalDecisionFormPayload } from './stageFinalDecisionEngine';
import { computeOrdinaryCassationWindow } from './decisionAppealPeriodEngine';
import { resolveProceedingsBlockAppealability } from './requestActionEngine';
import { resolveCaseSovereignContext } from './caseClassificationEngine';
import { mergeJudicialDecisionsFromRequests, resolveCriminalCaseUserRole, getPendingCassationAppealForResult, sortJudicialDecisionsNewestFirst } from './judicialDecisionsEngine';
import { validateDetentionDateRange } from './detentionEngine';
import { DecisionsScopeFilterBar } from './components/DecisionsScopeFilterBar';
import { JourneyStageBadge } from './components/JourneyStageBadge';
import {
    defaultDecisionsScopeForStage,
    filterByDecisionsScope,
    filterTrialSessionsByDecisionsScope,
    buildDecisionsScopeFilterOptions,
    partitionStatementsByPhase,
    type DecisionsScopeFilter,
} from './casePhaseFilterEngine';
import { applyDecisionsLedgerKindFilter } from './judicialDecisionsLedgerEngine';
import { ProceduralBacklinks } from './components/ProceduralBacklinks';
import type { ProceduralItemLink } from './proceduralItemLink';
import {
    findProceduralReferencesToLink,
    type ProceduralNavTarget,
} from './proceduralContainersEngine';
import {
    canAddLawyerRequestFollowUpMargin,
    canEditLawyerRequestAttachments,
} from './lawyerRequestsEngine';
import {
    LawyerRequestAttachmentsEditor,
    LawyerRequestMarginsMiniTimeline,
    RequestMarginAddButton,
    RequestMarginPromptModal,
    RequestStarToggle,
} from './components/LawyerRequestUxAddons';
import {
    buildActiveParties,
    buildAllParties,
    formatConcernedPartyLabelWithContext,
} from './partyContextFilter';
import {
    ARREST_ORDER_TEMPLATE,
    ARREST_SUMMON_TEMPLATE,
    BAIL_RELEASE_TEMPLATE,
    COMPLAINT_COURT_REFERRAL_TEMPLATE,
    CUSTOM_JUDICIAL_DECISION_TYPE,
    CUSTOM_LAWYER_MOTION_TYPE,
    DEFENDANT_BAIL_TEMPLATE,
    DETENTION_DECISION_TEMPLATE,
    isAssetSeizureTemplate,
    isComplaintCourtReferralTemplate,
    isCustomJudicialTemplate,
    isCustomLawyerMotionTemplate,
    isDefendantBailTemplate,
    isDetentionDecisionTemplate,
    isJudicialDecisionTemplate,
    isLawyerMotionTemplate,
    isOrderEnforcementTemplate,
    isPrivateRightWaiverTemplate,
    normalizeProceduralRequestTemplate,
    requiresDetentionDateRange,
    resolveRequestEntryLane,
    resolveRequestTypeTemplateFromStored,
    resolveStoredRequestTypeFields,
    SUMMON_ORDER_TEMPLATE,
} from './proceduralRequestTypes';
import { requiresLegalArticleBasis } from './orderEnforcementEngine';
import {
    filterPartiesByDecisionsScope,
    filterDefendantsByDecisionsScope,
    isJuvenileJudgeCassationAppealableTemplate,
    isJuvenileJudgeDecisionTemplateForMix,
    JUVENILE_INVESTIGATION_COURT_NAME,
    JUVENILE_SOCIAL_INQUIRY_ARTICLE_REF,
    partyIdsIncludeJuvenile,
    resolveInvestigationDefendantsPartyMix,
    resolveInvestigationJudicialEntryScope,
    type DecisionsPartyScope,
} from './juvenileInvestigationRules';
import {
    formatInvestigationCourtHeaderTitle,
    GENERIC_INVESTIGATION_COURT_NAMES,
} from './juvenileMixedCaseSplitEngine';
import {
    filterPartiesForRequestTemplate,
    isDefendantTargetRequestTemplate,
    resolveAutoRequestPartyId,
    resolveRequestPartyIdsForPayload,
    shouldShowMultiPartySelectionPicker,
    shouldShowRequestPartyPicker,
} from './requestPartySelection';
import {
    RequestModalEntryLanes,
    type SeizedAssetDraft as AssetSeizureDraftLocal,
} from './components/RequestModalEntryLanes';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import { StatementHighlightedContent } from './components/StatementHighlightedContent';
import { buildMergedCaseHeaderBadges } from './caseMergeTimeline';
import {
    buildRequestFatalLockMessage,
    isLawyerRequestExecuted,
    isLawyerRequestFinalStatus,
    isLawyerRequestLocked,
    isLawyerRequestPending,
    type LawyerRequestModalMode,
} from './lawyerRequestStatusMachine';

export type CriminalDashboardProps = {
    id: string;
    onClose?: () => void;
    onOpenCase?: (id: string) => void;
    /**
     * يُستدعى عند اختيار «تفريق الدعوى (شطر إضبارة)»: على المستوى الأعلى
     * يجب فتح شاشة «إضبارة جديدة» مع تجاوز خطوة اختيار نوع القضية (جزائية مباشرة).
     */
    onRequestNewCaseFromSeverance?: () => void;
};

const RequestReadOnlyField = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start justify-between gap-3 py-1 min-w-0 border-b border-white/[0.06] last:border-0">
        <span className="text-[#A0AEC0] text-[10px] font-light shrink-0 pt-0.5">{label}</span>
        <span className="text-white/95 text-[11px] font-medium text-left whitespace-normal break-words min-w-0 flex-1">
            {value.trim() || '—'}
        </span>
    </div>
);

export const CriminalDashboard = ({
    id,
    onClose,
    onOpenCase,
    onRequestNewCaseFromSeverance,
}: CriminalDashboardProps) => {
    const rawCase = useCriminalStore(useShallow((s) => s.casesById[id] ?? null));
    const mergedCaseIdsForLookup = useMemo(
        () => resolveMergedCaseIds(rawCase ?? undefined),
        [rawCase?.mergedCaseIds, rawCase?.mergedFromCaseIds],
    );
    const parentCaseId = String(rawCase?.parentCaseId ?? '').trim();
    const displayCasesById = useCriminalStore(
        useShallow((s): Record<string, CriminalCase | undefined> => {
            const out: Record<string, CriminalCase | undefined> = {};
            if (parentCaseId) out[parentCaseId] = s.casesById[parentCaseId];
            for (const mid of mergedCaseIdsForLookup) {
                out[mid] = s.casesById[mid];
            }
            return out;
        }),
    );
    const criminalCase = useMemo(
        () => resolveCriminalCaseForDisplay(rawCase, displayCasesById),
        [rawCase, displayCasesById],
    );
    const parentCase = parentCaseId ? displayCasesById[parentCaseId] : undefined;
    const pendingSeveranceContext = useCriminalStore((s) => s.pendingSeveranceContext);
    const resumePendingSeveranceForm = useCriminalStore((s) => s.resumePendingSeveranceForm);
    const stashPendingSeveranceForm = useCriminalStore((s) => s.stashPendingSeveranceForm);
    const deleteTimelineEvent = useCriminalStore((s) => s.deleteTimelineEvent);
    const addStatement = useCriminalStore((s) => s.addStatement);
    const addOtherEvidenceItem = useCriminalStore((s) => s.addOtherEvidenceItem);
    const updateStatement = useCriminalStore((s) => s.updateStatement);
    const moveStatementToTrash = useCriminalStore((s) => s.moveStatementToTrash);
    const moveLawyerRequestToTrash = useCriminalStore((s) => s.moveLawyerRequestToTrash);
    const moveJudicialDecisionToTrash = useCriminalStore((s) => s.moveJudicialDecisionToTrash);
    const moveOtherEvidenceToTrash = useCriminalStore((s) => s.moveOtherEvidenceToTrash);
    const restoreTrashItem = useCriminalStore((s) => s.restoreTrashItem);
    const purgeTrashItem = useCriminalStore((s) => s.purgeTrashItem);
    const addTrialSession = useCriminalStore((s) => s.addTrialSession);
    const updateTrialSession = useCriminalStore((s) => s.updateTrialSession);
    const postponeTrialSession = useCriminalStore((s) => s.postponeTrialSession);
    const documentTrialSessionPreparatoryDecision = useCriminalStore(
        (s) => s.documentTrialSessionPreparatoryDecision,
    );
    const addTrialDeposition = useCriminalStore((s) => s.addTrialDeposition);
    const updateTrialDeposition = useCriminalStore((s) => s.updateTrialDeposition);
    const deleteTrialDeposition = useCriminalStore((s) => s.deleteTrialDeposition);
    const correctCasePartyName = useCriminalStore((s) => s.correctCasePartyName);
    const correctCaseCourtName = useCriminalStore((s) => s.correctCaseCourtName);
    const correctCaseLegalArticle = useCriminalStore((s) => s.correctCaseLegalArticle);
    const correctCaseReferenceNumbers = useCriminalStore((s) => s.correctCaseReferenceNumbers);
    const correctCaseDepositionLocation = useCriminalStore((s) => s.correctCaseDepositionLocation);
    const createLawyerRequest = useCriminalStore((s) => s.createLawyerRequest);
    const extendDetentionOnDecision = useCriminalStore((s) => s.extendDetentionOnDecision);
    const documentDetentionReleaseOnDecision = useCriminalStore((s) => s.documentDetentionReleaseOnDecision);
    const updateOrderEnforcementOnDecision = useCriminalStore((s) => s.updateOrderEnforcementOnDecision);
    const finalizeLawyerRequest = useCriminalStore((s) => s.finalizeLawyerRequest);
    const addRequestMargin = useCriminalStore((s) => s.addRequestMargin);
    const toggleRequestStar = useCriminalStore((s) => s.toggleRequestStar);
    const addRequestAttachment = useCriminalStore((s) => s.addRequestAttachment);
    const removeRequestAttachment = useCriminalStore((s) => s.removeRequestAttachment);
    const fileJudicialDecisionAppeal = useCriminalStore((s) => s.fileJudicialDecisionAppeal);
    const recordJudicialAppealResult = useCriminalStore((s) => s.recordJudicialAppealResult);
    const declareJudicialDecisionFinal = useCriminalStore((s) => s.declareJudicialDecisionFinal);
    const patchJudicialDecisionLifecycle = useCriminalStore((s) => s.patchJudicialDecisionLifecycle);
    const updateVerdictCardDraft = useCriminalStore((s) => s.updateVerdictCardDraft);
    const patchVerdictCardOrdinaryAppeal = useCriminalStore((s) => s.patchVerdictCardOrdinaryAppeal);
    const recordVerdictCardCassationResult = useCriminalStore((s) => s.recordVerdictCardCassationResult);
    const patchVerdictCardCorrectionAppeal = useCriminalStore((s) => s.patchVerdictCardCorrectionAppeal);
    const registerStageFinalDecision = useCriminalStore((s) => s.registerStageFinalDecision);
    const syncTrialSessionVerdictFromStageFinal = useCriminalStore(
        (s) => s.syncTrialSessionVerdictFromStageFinal,
    );
    const recordVerdictAbsentiaPublication = useCriminalStore((s) => s.recordVerdictAbsentiaPublication);
    const recordVerdictAbsentiaObjection = useCriminalStore((s) => s.recordVerdictAbsentiaObjection);
    const refreshVerdictCardLifecycles = useCriminalStore((s) => s.refreshVerdictCardLifecycles);
    const ensureCaseSovereignContext = useCriminalStore((s) => s.ensureCaseSovereignContext);
    const confirmBailAfterAppeal = useCriminalStore((s) => s.confirmBailAfterAppeal);
    const fileInAbsentiaObjection = useCriminalStore((s) => s.fileInAbsentiaObjection);
    const updateBailForfeiture = useCriminalStore((s) => s.updateBailForfeiture);
    const updateCasePhysicalLocation = useCriminalStore((s) => s.updateCasePhysicalLocation);
    const updateCaseStage = useCriminalStore((s) => s.updateCaseStage);
    const updateLegalArticle = useCriminalStore((s) => s.updateLegalArticle);
    const waivePrivateRight = useCriminalStore((s) => s.waivePrivateRight);
    const issueStageDecision = useCriminalStore((s) => s.issueStageDecision);
    const applyInvestigationReferral = useCriminalStore((s) => s.applyInvestigationReferral);
    const referInvestigationDefendantToTrial = useCriminalStore((s) => s.referInvestigationDefendantToTrial);
    const beginSeveranceFromDossier = useCriminalStore((s) => s.beginSeveranceFromDossier);
    const referAndGenerateCase = useCriminalStore((s) => s.referAndGenerateCase);
    const reopenClosedCase = useCriminalStore((s) => s.reopenClosedCase);
    const endInvestigationTemporaryClosure = useCriminalStore((s) => s.endInvestigationTemporaryClosure);
    const initiateCassationProceeding = useCriminalStore((s) => s.initiateCassationProceeding);
    const updateCaseComplainantJuvenile = useCriminalStore((s) => s.updateCaseComplainantJuvenile);
    const updateCaseDefendantJuvenile = useCriminalStore((s) => s.updateCaseDefendantJuvenile);
    const updateJuvenileSocialInquiryReport = useCriminalStore((s) => s.updateJuvenileSocialInquiryReport);
    const mergeCases = useCriminalStore((s) => s.mergeCases);
    const severJuvenileDefendantToJuvenileCourt = useCriminalStore((s) => s.severJuvenileDefendantToJuvenileCourt);

    const stage = criminalCase?.basics.stage ?? '';
    const caseStage = criminalCase ? resolveCaseStageFromRecord(criminalCase) : 'investigation';
    const isInvestigationPhase = caseStage === 'investigation';
    const isTrialPhase = isTrialCaseStage(caseStage);
    const isReferralStage = stage !== '' && !isInvestigationStoredStage(stage);
    const isCassationStage = stage === 'cassation_court';
    const isTrialCourtStage = caseStage === 'misdemeanor' || caseStage === 'felony';
    const isInvestigationLocked = Boolean(criminalCase?.isInvestigationLocked);

    const headerTitle = useMemo(() => {
        if (!criminalCase) {
            return { primary: 'الإضبارة الجنائية' };
        }
        const loc = criminalCase.location;
        const buildCaseReferenceMetaParts = (): { label: string; value: string }[] => {
            const courtNum = String(criminalCase.courtCaseNumber ?? loc.caseNumber ?? '').trim();
            const pp = String(loc.publicProsecutionNumber ?? '').trim();
            const chunks: string[] = [];
            if (courtNum) chunks.push(`دعوى: ${courtNum}`);
            if (pp) chunks.push(`ادعاء: ${pp}`);
            return chunks.length ? [{ label: '', value: chunks.join(' · ') }] : [];
        };

        const caseDefendants = Array.isArray(criminalCase.defendants) ? criminalCase.defendants : [];
        const hasJuvenileDef = hasJuvenileAccused(caseDefendants);
        const stageFallback = formatCriminalStageLabel(stage, hasJuvenileDef) || 'الإضبارة الجنائية';

        if (isTrialPhase) {
            const courtName = loc.courtName.trim();
            const invCourtName = loc.investigationCourtName.trim();
            const effectiveCourtName = courtName || invCourtName;
            const invNum = String(criminalCase.investigationCaseNumber ?? '').trim();
            const metaParts = buildCaseReferenceMetaParts();
            const primary = formatTrialCourtHeaderPrimary(caseStage, {
                courtName: effectiveCourtName,
                courtCaseNumber: criminalCase.courtCaseNumber,
                caseNumber: loc.caseNumber,
            });
            return {
                primary,
                ...(metaParts.length ? { metaParts } : {}),
                ...(!metaParts.length && invNum
                    ? { secondary: invNum, secondaryLabel: 'رقم التحقيق السابق' }
                    : {}),
            };
        }

        if (isInvestigationPhase) {
            const depositLabel = formatInvestigationDepositLocation(loc);
            const invCourtName = loc.investigationCourtName.trim();
            const entityAt =
                loc.investigationPapersAt === 'مكتب تحقيق قضائي'
                    ? String(loc.investigationOfficeName ?? '').trim()
                    : String(loc.policeStationName ?? '').trim();
            const registerRef = sanitizeCaseReferenceField(loc.baseRegisterNumberAndDate);
            const dossierRef = sanitizeCaseReferenceField(loc.investigationDossierNumber);
            const secondary = dossierRef || registerRef;
            if (hasJuvenileDef) {
                const courtTitle = formatInvestigationCourtHeaderTitle(
                    stage,
                    invCourtName || JUVENILE_INVESTIGATION_COURT_NAME,
                    true,
                );
                const courtBase =
                    entityAt && !courtTitle.includes(entityAt) ? `${courtTitle} — ${entityAt}` : courtTitle;
                return {
                    primary: courtBase,
                    ...(secondary ? { secondary, secondaryLabel: 'رقم الإضبارة / القيد' } : {}),
                };
            }
            return {
                primary: depositLabel || formatInvestigationCourtHeaderTitle(stage, invCourtName, hasJuvenileDef) || stageFallback,
                courtLine:
                    depositLabel && invCourtName && !GENERIC_INVESTIGATION_COURT_NAMES.has(invCourtName)
                        ? invCourtName
                        : undefined,
                ...(secondary ? { secondary, secondaryLabel: 'رقم الإضبارة / القيد' } : {}),
            };
        }

        const courtLabel =
            resolveCourtDisplayName(stage, {
                hasJuvenileDefendant: hasJuvenileDef,
                storedCourtName: loc.courtName,
            }) || loc.courtName.trim() || stageFallback;
        return {
            primary: courtLabel,
        };
    }, [caseStage, criminalCase, isInvestigationPhase, isTrialPhase, stage]);

    if (!criminalCase) {
        return (
            <div className="fixed inset-0 z-[220] bg-black font-['Tajawal'] flex items-center justify-center p-6" dir="rtl">
                <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B1021] p-6 text-center">
                    <div className="text-white font-black text-base mb-2">
                        لم يتم العثور على الإضبارة الجنائية. قد تكون محذوفة أو الرقم غير صحيح
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-4 w-full rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-3 text-sm hover:brightness-110 active:brightness-95 transition"
                    >
                        العودة للقائمة
                    </button>
                </div>
            </div>
        );
    }

    const crimeType = criminalCase.basics.crimeType;
    const legalArticleHistory = Array.isArray(criminalCase.legalArticleHistory)
        ? criminalCase.legalArticleHistory
        : ([] as LegalArticleChange[]);
    const activeLegalArticle = legalArticleHistory.length
        ? String(legalArticleHistory[legalArticleHistory.length - 1]?.article ?? '').trim()
        : criminalCase.basics.legalArticle.trim();
    const isUnknownPerpetrator = Boolean(criminalCase.unknownDefendant);
    const complainants = Array.isArray(criminalCase.complainants) ? criminalCase.complainants : [];
    const defendants = useMemo(
        () => normalizeCaseDefendantsForUnknown(criminalCase),
        [criminalCase],
    );
    const hasUnrevealedUnknown = hasUnrevealedUnknownDefendants(defendants);
    const isAllDefendantsUnknown = hasUnrevealedUnknown && !hasIdentifiedDefendant(defendants);
    const unknownDefendantsForPartyDisplay = useMemo(
        () => getUnknownIdentityDefendants(defendants),
        [defendants],
    );
    const identifiedActiveDefendants = useMemo(
        () => filterActiveInvestigationDefendants(getIdentifiedDefendants(defendants)),
        [defendants],
    );
    const isFrozen = Boolean(criminalCase.isFrozen);
    const isPrejudicialPostponed = Boolean((criminalCase as { isPrejudicialPostponed?: boolean }).isPrejudicialPostponed);
    const isDefaultJudgmentArchived = Boolean(
        (criminalCase as { isDefaultJudgmentArchived?: boolean }).isDefaultJudgmentArchived,
    );
    const mergedIntoCaseId = String(criminalCase.mergedIntoCaseId ?? '').trim();
    const mergedIntoCaseNumber = String(criminalCase.mergedIntoCaseNumber ?? '').trim();
    const isMergedDossier = criminalCase.dossierStatus === 'merged' || Boolean(mergedIntoCaseId);
    const isArchived = Boolean((criminalCase as any).isArchived);
    const isEffectivelyArchived = isArchived || isMergedDossier;
    const isDashboardReadOnly = isMergedDossier;
    const canManageDossier = !isArchived && !isDashboardReadOnly;
    const canEditIdentity = canManageDossier && !isFrozen && !isDashboardReadOnly;
    const depositEntityName =
        criminalCase.location.investigationPapersAt === 'مكتب تحقيق قضائي'
            ? criminalCase.location.investigationOfficeName
            : criminalCase.location.policeStationName;
    const showEditDeposition =
        isInvestigationPhase &&
        (criminalCase.location.investigationPapersAt === 'مركز شرطة' ||
            criminalCase.location.investigationPapersAt === 'مكتب تحقيق قضائي');
    const showEditInvestigationCourt = isInvestigationPhase;
    const showEditTrialCourt = !isInvestigationPhase;
    const showEditVenueIdentity =
        canManageDossier && (showEditDeposition || showEditInvestigationCourt || showEditTrialCourt);
    const trashItems = useMemo(() => normalizeTrashBin(criminalCase.trashBin), [criminalCase.trashBin]);
    const trashCount = trashItems.length;
    const isSentToCassation = Boolean((criminalCase as any).isSentToCassation);
    const rawPhysicalLocation = String((criminalCase as any).physicalLocation ?? '').trim();
    const physicalLocation: PhysicalLocation =
        rawPhysicalLocation === 'judge_desk' ||
        rawPhysicalLocation === 'investigator_room' ||
        rawPhysicalLocation === 'prosecution' ||
        rawPhysicalLocation === 'police_station' ||
        rawPhysicalLocation === 'archive' ||
        rawPhysicalLocation === 'custom'
            ? (rawPhysicalLocation as PhysicalLocation)
            : 'custom';
    const physicalLocationCustomName = String((criminalCase as any).physicalLocationCustomName ?? '');
    const isArticle3Offense = Boolean((criminalCase as any).isArticle3Offense);
    const crimeDiscoveryDate = String((criminalCase as any).crimeDiscoveryDate ?? '').trim();
    const article3ElapsedDays = useMemo(() => {
        if (!isArticle3Offense) return null;
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(crimeDiscoveryDate);
        if (!m) return null;
        const startMs = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        const now = new Date();
        const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
        if (todayMs < startMs) return 0;
        return Math.floor((todayMs - startMs) / (24 * 60 * 60 * 1000));
    }, [crimeDiscoveryDate, isArticle3Offense]);
    const shouldShowArticle3DeadlineBanner =
        isArticle3Offense && typeof article3ElapsedDays === 'number' && article3ElapsedDays > 90;
    const cassationCaseDetails = (criminalCase as any).cassationCaseDetails as
        | { cassationNumber?: string; sentDate?: string; panelName?: string }
        | undefined;
    const finalDecision = criminalCase.finalDecision;
    const shouldShowMandatoryCassationBanner =
        finalDecision?.decisionType === 'conviction' &&
        ((finalDecision as any).punishmentType === 'death' || (finalDecision as any).punishmentType === 'life') &&
        !isSentToCassation;
    const isPrivateRightWaived = Boolean(criminalCase.isPrivateRightWaived);
    const investigationDossierClosure = criminalCase.investigationDossierClosure;
    const isInvestigationDossierSealed =
        isInvestigationPhase && investigationDossierIsSealed(criminalCase);
    const investigationDossierSealLabel = investigationDossierSealMessage(investigationDossierClosure);
    const showEndTemporaryClosureAction = investigationDossierIsTemporarilyClosed(investigationDossierClosure);
    const waiverDate = String(criminalCase.waiverDate ?? '').trim();
    const visibleDefendants = useMemo(() => {
        const pendingSeveranceDefendantIds =
            pendingSeveranceContext?.parentCaseId === id
                ? pendingSeveranceContext.parentDefendantIds
                : undefined;
        if (isInvestigationPhase) {
            return resolveVisibleInvestigationDefendants(defendants, {
                alwaysIncludeDefendantIds: pendingSeveranceDefendantIds,
            });
        }
        return defendants;
    }, [defendants, isInvestigationPhase, pendingSeveranceContext, id]);
    const isMutualComplaint = criminalCase.isMutualComplaint === true;
    const partyScopeDefendants = isInvestigationPhase ? visibleDefendants : defendants;
    const statementEligibleDefendants = useMemo(
        () =>
            isInvestigationPhase
                ? filterStatementEligibleDefendants(defendants)
                : defendants,
        [defendants, isInvestigationPhase],
    );
    const actionParties = useMemo(
        () => buildCriminalActionParties(complainants, partyScopeDefendants, isMutualComplaint),
        [complainants, partyScopeDefendants, isMutualComplaint],
    );
    const allParties = useMemo(
        () => buildAllParties(complainants, partyScopeDefendants, { isMutualComplaint }),
        [complainants, partyScopeDefendants, isMutualComplaint],
    );
    const activeParties = useMemo(() => {
        const defendantRows = hasUnrevealedUnknown
            ? getIdentifiedDefendants(defendants)
            : defendants;
        const base = buildActiveParties(complainants, defendantRows, { isMutualComplaint });
        if (!isInvestigationPhase) return base;
        const activeDefIds = new Set(
            filterActiveInvestigationDefendants(defendantRows).map((d) => d.id),
        );
        return base.filter((p) => p.source !== 'defendant' || activeDefIds.has(p.id));
    }, [complainants, defendants, isMutualComplaint, isInvestigationPhase, hasUnrevealedUnknown]);
    const concernedParties = allParties;
    const primaryDefendant = defendants[0] ?? null;
    const juvenileDefendants = defendants.filter((d) => Boolean((d as any).isJuvenile));
    const firstJuvenileDefendant = juvenileDefendants[0] ?? null;
    const juvenileAccused = hasJuvenileAccused(defendants);
    const hasJuvenileInCase = hasJuvenileParty(defendants, complainants);
    const isJuvenileTrial = isJuvenileTrialStage(stage, defendants);
    const allowSeveranceOrDossierStrike = useMemo(
        () => caseAllowsSeveranceOrDossierStrike(complainants, defendants),
        [complainants, defendants],
    );
    const allowDefendantSeverance = useMemo(
        () => caseAllowsDefendantSeverance(defendants),
        [defendants],
    );
    const ourRepresentation: OurRepresentation = (() => {
        const incoming = String((criminalCase as any)?.basics?.ourRepresentation ?? '').trim();
        const role = String((criminalCase as any)?.basics?.role ?? '').trim();
        if (incoming === 'complainant_side' || incoming === 'defendant_side') return incoming;
        if (incoming === 'defendant') return 'defendant_side';
        if (incoming === 'complainant' || incoming === 'civil_claimant') return 'complainant_side';
        if (role === 'وكيل المشكو منه') return 'defendant_side';
        return 'complainant_side';
    })();
    const isDefense = ourRepresentation === 'defendant_side';
    const isComplainantSide = ourRepresentation === 'complainant_side';
    const criminalCaseUserRole = useMemo(() => {
        const resolved = resolveCriminalCaseUserRole(criminalCase);
        if (resolved) return resolved;
        if (isDefense) return 'defendant_lawyer' as const;
        if (isComplainantSide) return 'complainant_lawyer' as const;
        return '' as const;
    }, [criminalCase, isDefense, isComplainantSide]);
    const autoConcernedPartyId = useMemo(() => {
        if (hasUnrevealedUnknown && !hasIdentifiedDefendant(defendants)) return null;
        if (activeParties.length === 1) return activeParties[0]!.id;
        if (complainants.length === 1 && defendants.length === 1) {
            const sole = isDefense
                ? activeParties.find((p) => p.source === 'defendant')
                : activeParties.find((p) => p.source === 'complainant');
            return sole?.id ?? null;
        }
        return null;
    }, [activeParties, complainants, defendants, isDefense, hasUnrevealedUnknown]);
    const showConcernedPartySelect =
        (!hasUnrevealedUnknown || hasIdentifiedDefendant(defendants)) &&
        !autoConcernedPartyId &&
        activeParties.length > 1;
    const autoConcernedPartyLabel = useMemo(() => {
        if (!autoConcernedPartyId) return '';
        const p = activeParties.find((x) => x.id === autoConcernedPartyId);
        return p ? formatConcernedPartyLabel(p) : '—';
    }, [autoConcernedPartyId, activeParties]);
    const pendingBailDefendantIds = defendants.filter((d) => d.status === 'bailed_pending_appeal').map((d) => d.id);
    const hasPendingBail = pendingBailDefendantIds.length > 0;

    const [selectedNodeFilter, setSelectedNodeFilter] = useState('');
    const [selectedPartyFilterId, setSelectedPartyFilterId] = useState('');
    const [selectedJourneyBranchId, setSelectedJourneyBranchId] = useState('');

    const stageJourney = useMemo(() => {
        const raw = Array.isArray(rawCase?.stageJourney) ? rawCase.stageJourney : [];
        return raw.length ? repairSameCourtRemandJourneyNodes(raw) : [];
    }, [rawCase?.stageJourney]);

    useEffect(() => {
        if (!id) return;
        const raw = rawCase?.stageJourney;
        if (!Array.isArray(raw) || raw.length === 0) return;

        let cancelled = false;
        const runRepair = () => {
            if (cancelled) return;
            const repaired = repairSameCourtRemandJourneyNodes(raw);
            const currentNode = getCurrentJourneyNode(repaired);
            const resolvedStage = currentNode?.stage ?? rawCase?.caseStage;
            const stored = resolvedStage
                ? syncStoredStageFromJourneyCaseStage(resolvedStage, rawCase?.basics?.stage)
                : rawCase?.basics?.stage;
            const journeySignature = (nodes: typeof raw) =>
                nodes
                    .map(
                        (n) =>
                            `${n.id}:${n.stage}:${n.status}:${String(n.startedAt ?? '')}:${String(n.endedAt ?? '')}`,
                    )
                    .join('|');
            const journeyChanged = journeySignature(repaired) !== journeySignature(raw);
            const stageChanged =
                Boolean(resolvedStage) &&
                (rawCase?.caseStage !== resolvedStage || rawCase?.basics?.stage !== stored);
            if (!journeyChanged && !stageChanged) return;
            useCriminalStore.setState((state) => {
                const target = state.casesById[id];
                if (!target) return state;
                return {
                    casesById: {
                        ...state.casesById,
                        [id]: {
                            ...target,
                            stageJourney: repaired,
                            ...(resolvedStage
                                ? {
                                      caseStage: resolvedStage,
                                      basics: { ...target.basics, stage: stored ?? target.basics?.stage },
                                  }
                                : {}),
                        },
                    },
                };
            });
        };

        if (typeof requestIdleCallback !== 'undefined') {
            const handle = requestIdleCallback(runRepair, { timeout: 2_500 });
            return () => {
                cancelled = true;
                cancelIdleCallback(handle);
            };
        }
        const timer = window.setTimeout(runRepair, 0);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [id, rawCase?.stageJourney, rawCase?.caseStage, rawCase?.basics?.stage]);
    const journeyBranchTracks = useMemo(() => getJourneyBranchTracks(stageJourney), [stageJourney]);
    const currentJourneyNode = useMemo(
        () => getCurrentJourneyNode(stageJourney, selectedJourneyBranchId),
        [stageJourney, selectedJourneyBranchId],
    );
    const activeJourneyBranch = useMemo(
        () => journeyBranchTracks.find((b) => b.branchId === selectedJourneyBranchId) ?? null,
        [journeyBranchTracks, selectedJourneyBranchId],
    );
    useEffect(() => {
        setSelectedNodeFilter('');
        setSelectedPartyFilterId('');
        setSelectedJourneyBranchId('');
    }, [id, currentJourneyNode?.id]);

    const selectedJourneyNode = currentJourneyNode;

    const activeJourneyStage = currentJourneyNode?.stage ?? caseStage;
    const effectiveUiStage = activeJourneyStage;
    const showTrialsTab = effectiveUiStage === 'misdemeanor' || effectiveUiStage === 'felony';
    const isEffectiveTrialCourtStage = showTrialsTab;
    const showJourneyReferralButton =
        activeJourneyStage === 'misdemeanor' ||
        activeJourneyStage === 'felony' ||
        (isJuvenileTrial && isTrialCourtStage);

    const isHistoricalNodeView = false;
    const isInterventionReview = isUnderInterventionReview(criminalCase);
    const isCassationFilterReadOnly = selectedJourneyNode?.isCassationFilterNode === true;
    const isTimelineArchiveReadOnly =
        isHistoricalNodeView || isDashboardReadOnly || isCassationFilterReadOnly;
    const isPrejudicialFrozen =
        isPrejudicialPostponed || currentJourneyNode?.phaseOverlay === 'frozen_prejudicial';
    const isInvestigationMaterialReadOnly =
        isInvestigationPhase &&
        (isInvestigationDossierSealed || isPrejudicialFrozen || isInvestigationLocked);
    const canCreateDecisionsOrRequests = resolveCanCreateDecisionsOrRequests({
        isDashboardReadOnly,
        isCassationFilterReadOnly,
        isHistoricalNodeView,
        isInterventionReview,
        isInvestigationPhase,
        isInvestigationDossierSealed,
        isInvestigationLocked,
        isPrejudicialFrozen,
    });
    const isStatementsTabReadOnly =
        isTimelineArchiveReadOnly ||
        isDashboardReadOnly ||
        isInterventionReview ||
        (isInvestigationPhase && investigationStatementsMutationBlocked(criminalCase));
    const isOtherEvidenceReadOnly =
        isTimelineArchiveReadOnly ||
        isDashboardReadOnly ||
        isInterventionReview ||
        otherEvidenceMutationBlocked(criminalCase);
    const isDecisionsTabMaterialReadOnly =
        isTimelineArchiveReadOnly ||
        isDashboardReadOnly ||
        isInterventionReview ||
        isInvestigationMaterialReadOnly;
    const [isInvestigationDecisionOpen, setIsInvestigationDecisionOpen] = useState(false);
    const [investigationDecisionError, setInvestigationDecisionError] = useState('');
    const [isSeveranceOpen, setIsSeveranceOpen] = useState(false);
    const [severanceError, setSeveranceError] = useState('');
    const [isInlineSeveranceFormOpen, setIsInlineSeveranceFormOpen] = useState(false);

    const openInlineSeveranceForm = useCallback(() => {
        if (!resumePendingSeveranceForm()) return;
        setIsInlineSeveranceFormOpen(true);
    }, [resumePendingSeveranceForm]);

    const closeInlineSeveranceForm = useCallback(() => {
        stashPendingSeveranceForm();
        setIsInlineSeveranceFormOpen(false);
    }, [stashPendingSeveranceForm]);

    const statements = Array.isArray(criminalCase.statements) ? criminalCase.statements : [];
    const otherEvidenceItems = Array.isArray(criminalCase.otherEvidenceItems)
        ? criminalCase.otherEvidenceItems
        : [];
    const sortedStatements = useMemo(() => {
        const visible = filterStatementsExcludingUnknown(statements, defendants);
        const list = [...visible];
        list.sort((a, b) => {
            const aTime = typeof a.date === 'string' ? Date.parse(a.date) : 0;
            const bTime = typeof b.date === 'string' ? Date.parse(b.date) : 0;
            return bTime - aTime;
        });
        return list;
    }, [statements, defendants]);
    const sortedOtherEvidenceItems = useMemo(() => {
        const list = [...otherEvidenceItems];
        list.sort((a, b) => {
            const aKey = String(a.attachmentDate ?? a.createdAt ?? '').trim();
            const bKey = String(b.attachmentDate ?? b.createdAt ?? '').trim();
            const aTime = aKey ? Date.parse(aKey) : 0;
            const bTime = bKey ? Date.parse(bKey) : 0;
            return bTime - aTime;
        });
        return list;
    }, [otherEvidenceItems]);

    const lawyerRequests = Array.isArray(criminalCase.lawyerRequests) ? criminalCase.lawyerRequests : [];
    const trialSessions = Array.isArray(criminalCase.trials) ? criminalCase.trials : [];
    const inferredStageFinalPresence = useMemo(
        () => inferDecisionPresenceFromTrialSessions(trialSessions),
        [trialSessions],
    );
    const trialDepositions = Array.isArray(criminalCase.trialDepositions) ? criminalCase.trialDepositions : [];
    const sortedTrialDepositions = useMemo(
        () => sortTrialDepositionsDesc(trialDepositions),
        [trialDepositions],
    );
    const sortedTrialSessionsForDepositions = useMemo(
        () => sortTrialSessionsAsc(trialSessions),
        [trialSessions],
    );
    const currentAccusationArticle = resolveCurrentAccusationArticleFromCase({
        currentAccusationArticle: criminalCase.currentAccusationArticle,
        chargeModifications: criminalCase.chargeModifications,
        referralArticle: criminalCase.referralArticle,
        legalArticleHistory: legalArticleHistory,
        basicsLegalArticle: criminalCase.basics.legalArticle,
    });
    const sortedLawyerRequests = useMemo(() => {
        const list = [...lawyerRequests];
        list.sort((a, b) => {
            const aTime = typeof a.requestDate === 'string' ? Date.parse(a.requestDate) : 0;
            const bTime = typeof b.requestDate === 'string' ? Date.parse(b.requestDate) : 0;
            return bTime - aTime;
        });
        return list;
    }, [lawyerRequests]);

    const sortedStatementsForNode = useMemo(() => {
        if (!selectedJourneyNode || !isHistoricalNodeView) return sortedStatements;
        const nodeFiltered = sortedStatements.filter((st) =>
            eventBelongsToJourneyNode(st.date, st.proceduralNodeId, selectedJourneyNode, stageJourney),
        );
        if (!activeJourneyBranch) return nodeFiltered;
        return nodeFiltered.filter((st) =>
            eventBelongsToJourneyBranch(
                { proceduralNodeId: st.proceduralNodeId },
                activeJourneyBranch,
                stageJourney,
            ),
        );
    }, [activeJourneyBranch, isHistoricalNodeView, stageJourney, selectedJourneyNode, sortedStatements]);

    const sortedLawyerRequestsForNode = useMemo(() => {
        if (!selectedJourneyNode || !isHistoricalNodeView) return sortedLawyerRequests;
        const nodeFiltered = sortedLawyerRequests.filter((r) =>
            eventBelongsToJourneyNode(r.requestDate, r.proceduralNodeId, selectedJourneyNode, stageJourney),
        );
        if (!activeJourneyBranch) return nodeFiltered;
        return nodeFiltered.filter((r) =>
            eventBelongsToJourneyBranch(
                { proceduralNodeId: r.proceduralNodeId, defendantIds: r.defendantIds },
                activeJourneyBranch,
                stageJourney,
            ),
        );
    }, [activeJourneyBranch, isHistoricalNodeView, stageJourney, selectedJourneyNode, sortedLawyerRequests]);
    const sortedOtherEvidenceForNode = useMemo(() => {
        if (!selectedJourneyNode || !isHistoricalNodeView) return sortedOtherEvidenceItems;
        const nodeFiltered = sortedOtherEvidenceItems.filter((ev) =>
            eventBelongsToJourneyNode(
                String(ev.attachmentDate ?? ev.createdAt ?? ''),
                ev.proceduralNodeId,
                selectedJourneyNode,
                stageJourney,
            ),
        );
        if (!activeJourneyBranch) return nodeFiltered;
        return nodeFiltered.filter((ev) =>
            eventBelongsToJourneyBranch(
                { proceduralNodeId: ev.proceduralNodeId },
                activeJourneyBranch,
                stageJourney,
            ),
        );
    }, [activeJourneyBranch, isHistoricalNodeView, selectedJourneyNode, sortedOtherEvidenceItems, stageJourney]);

    /** فلتر مرحلة القرارات — ذكي حسب المرحلة الحالية ووجود قرارات فعلية. */
    const [decisionsScopeFilter, setDecisionsScopeFilter] = useState<DecisionsScopeFilter>(() =>
        defaultDecisionsScopeForStage(effectiveUiStage),
    );
    const effectiveDecisionsScope: DecisionsScopeFilter = decisionsScopeFilter;
    const DECISIONS_PAGE_SIZE = 12;
    const [visibleLawyerRequestsCount, setVisibleLawyerRequestsCount] = useState(DECISIONS_PAGE_SIZE);
    const [visibleJudicialDecisionsCount, setVisibleJudicialDecisionsCount] = useState(DECISIONS_PAGE_SIZE);

    /**
     * فلتر سِجلّ القرارات والطعون — Pill Tabs أعلى البطاقات.
     * يَفصل بصرياً بين القرارات القضائية وطلبات المحامي،
     * دون أيّ تَعديل على بيانات الـ Store أو القرارات نَفسها.
     */
    const [decisionsKindFilter, setDecisionsKindFilter] = useState<DecisionsLedgerKindFilter>('all');
    const [trialSessionAddModalOpen, setTrialSessionAddModalOpen] = useState(false);
    useEffect(() => {
        setVisibleLawyerRequestsCount(DECISIONS_PAGE_SIZE);
        setVisibleJudicialDecisionsCount(DECISIONS_PAGE_SIZE);
    }, [decisionsKindFilter, decisionsScopeFilter, selectedNodeFilter, selectedJourneyBranchId, id]);
    useEffect(() => {
        if (decisionsKindFilter !== 'trial_sessions') {
            setTrialSessionAddModalOpen(false);
        }
    }, [decisionsKindFilter]);

    const investigationDefendantsPartyMix = useMemo(
        () => resolveInvestigationDefendantsPartyMix(getIdentifiedDefendants(defendants)),
        [defendants],
    );
    const investigationHasMixedUnknownAndIdentified = useMemo(
        () => investigationDossierHasMixedUnknownAndIdentified(defendants),
        [defendants],
    );

    const phaseFilteredLawyerRequests = useMemo(
        () =>
            filterByDecisionsScope(
                sortedLawyerRequestsForNode,
                effectiveDecisionsScope,
                effectiveUiStage,
                stageJourney,
                (r) => ({ requestDate: r.requestDate, proceduralNodeId: r.proceduralNodeId }),
            ),
        [sortedLawyerRequestsForNode, effectiveDecisionsScope, effectiveUiStage, stageJourney],
    );

    const judicialDecisionsLedger = useMemo(
        () =>
            mergeJudicialDecisionsFromRequests(
                (criminalCase as { judicialDecisions?: JudicialDecision[] })?.judicialDecisions,
                criminalCase?.lawyerRequests,
            ),
        [criminalCase],
    );

    const judicialDecisionsForNode = useMemo(() => {
        if (!selectedJourneyNode || !isHistoricalNodeView) return judicialDecisionsLedger;
        const nodeFiltered = judicialDecisionsLedger.filter((d) =>
            eventBelongsToJourneyNode(String(d.issuedAt ?? ''), d.proceduralNodeId, selectedJourneyNode, stageJourney),
        );
        if (!activeJourneyBranch) return nodeFiltered;
        return nodeFiltered.filter((d) =>
            eventBelongsToJourneyBranch(
                { proceduralNodeId: d.proceduralNodeId, defendantIds: d.defendantIds },
                activeJourneyBranch,
                stageJourney,
            ),
        );
    }, [activeJourneyBranch, isHistoricalNodeView, judicialDecisionsLedger, selectedJourneyNode, stageJourney]);

    const phaseScopedJudicialDecisions = useMemo(
        () =>
            filterByDecisionsScope(
                judicialDecisionsForNode,
                effectiveDecisionsScope,
                effectiveUiStage,
                stageJourney,
                (d) => ({ issuedAt: d.issuedAt, proceduralNodeId: d.proceduralNodeId }),
            ),
        [judicialDecisionsForNode, effectiveDecisionsScope, effectiveUiStage, stageJourney],
    );

    const kindFilteredJudicialDecisions = useMemo(
        () =>
            sortJudicialDecisionsNewestFirst(
                applyDecisionsLedgerKindFilter(
                    phaseScopedJudicialDecisions,
                    decisionsKindFilter,
                    investigationDefendantsPartyMix,
                ),
            ),
        [phaseScopedJudicialDecisions, decisionsKindFilter, investigationDefendantsPartyMix],
    );
    const scopedPendingLawyerRequests = useMemo(
        () => phaseFilteredLawyerRequests.filter((r) => isLawyerRequestPending(r)),
        [phaseFilteredLawyerRequests],
    );
    const visibleLawyerRequests = useMemo(
        () => scopedPendingLawyerRequests.slice(0, visibleLawyerRequestsCount),
        [scopedPendingLawyerRequests, visibleLawyerRequestsCount],
    );
    const visibleJudicialDecisions = useMemo(
        () => kindFilteredJudicialDecisions.slice(0, visibleJudicialDecisionsCount),
        [kindFilteredJudicialDecisions, visibleJudicialDecisionsCount],
    );
    const pendingLawyerRequestsForFeed = scopedPendingLawyerRequests;

    const phaseFilteredTrialSessions = useMemo(
        () =>
            filterTrialSessionsByDecisionsScope(
                trialSessions,
                effectiveDecisionsScope,
                effectiveUiStage,
                stageJourney,
            ),
        [trialSessions, effectiveDecisionsScope, effectiveUiStage, stageJourney],
    );

    const verdictCards = useMemo(
        () => resolveVerdictCardsLifecycle(normalizeVerdictCards(rawCase?.verdictCards)),
        [rawCase?.verdictCards],
    );

    useEffect(() => {
        if (!id) return;
        refreshVerdictCardLifecycles(id);
    }, [id, refreshVerdictCardLifecycles]);
    const verdictCardsForNode = useMemo(() => {
        if (!selectedJourneyNode || !isHistoricalNodeView) return verdictCards;
        const nodeFiltered = verdictCards.filter((c) =>
            eventBelongsToJourneyNode(c.issuedAt, c.proceduralNodeId, selectedJourneyNode, stageJourney),
        );
        if (!activeJourneyBranch) return nodeFiltered;
        return nodeFiltered.filter((c) =>
            eventBelongsToJourneyBranch(
                {
                    proceduralNodeId: c.proceduralNodeId,
                    defendantIds: c.targetDefendantIds,
                    targetDefendantId: c.targetDefendantIds?.[0],
                },
                activeJourneyBranch,
                stageJourney,
            ),
        );
    }, [activeJourneyBranch, isHistoricalNodeView, selectedJourneyNode, stageJourney, verdictCards]);
    const phaseFilteredVerdictCards = useMemo(
        () =>
            filterByDecisionsScope(
                verdictCardsForNode,
                effectiveDecisionsScope,
                effectiveUiStage,
                stageJourney,
                (c) => ({ issuedAt: c.issuedAt, proceduralNodeId: c.proceduralNodeId }),
            ),
        [verdictCardsForNode, effectiveDecisionsScope, effectiveUiStage, stageJourney],
    );

    const currentVerdictCardsForPanel = useMemo(() => {
        if (effectiveDecisionsScope !== 'current') return [];
        return phaseFilteredVerdictCards;
    }, [effectiveDecisionsScope, phaseFilteredVerdictCards]);

    const trialSessionsTabLabel =
        effectiveUiStage === 'felony' ? 'جلسات محكمة الجنايات' : 'جلسات ومحاضر المرافعة';

    const remandPivotDate = useMemo(
        () => resolveCassationRemandRetrialPivotDate(verdictCards),
        [verdictCards],
    );

    const openVerdictCassationFiling = useCallback(
        (cardId: string) => {
            const card = verdictCardsForNode.find((c) => c.id === cardId);
            if (card) setVerdictCassationFilingCard(card);
        },
        [verdictCardsForNode],
    );

    const decisionsScopeOptions = useMemo(
        () =>
            buildDecisionsScopeFilterOptions(
                judicialDecisionsForNode,
                sortedLawyerRequestsForNode,
                stageJourney,
                effectiveUiStage,
                trialSessions,
                verdictCardsForNode,
            ),
        [
            judicialDecisionsForNode,
            sortedLawyerRequestsForNode,
            stageJourney,
            effectiveUiStage,
            trialSessions,
            verdictCardsForNode,
        ],
    );

    const partitionedStatements = useMemo(
        () => partitionStatementsByPhase(sortedStatementsForNode, stageJourney),
        [sortedStatementsForNode, stageJourney],
    );

    const [cassationAppealModal, setCassationAppealModal] = useState<{
        decision: JudicialDecision;
        variant: JudicialCassationAppealModalVariant;
    } | null>(null);
    const [cassationResultContext, setCassationResultContext] = useState<{
        decision: JudicialDecision;
        appeal: JudicialDecisionAppeal;
    } | null>(null);

    const openAppealModal = useCallback(
        (decision: JudicialDecision, variant: JudicialCassationAppealModalVariant) => {
            setCassationAppealModal({ decision, variant });
        },
        [],
    );

    const handleInterventionCassation = useCallback(
        (decision: JudicialDecision) => openAppealModal(decision, 'intervention_264b'),
        [openAppealModal],
    );

    const handleDeclareJudgmentFinal = useCallback(
        (decision: JudicialDecision) => openAppealModal(decision, 'declare_final'),
        [openAppealModal],
    );

    const handleCassationCorrection = useCallback(
        (decision: JudicialDecision) => openAppealModal(decision, 'correction_266'),
        [openAppealModal],
    );

    const handleRequestOrderProceedingsBlockChange = useCallback(
        (decision: JudicialDecision, blocksProceedings: boolean) => {
            const err = patchJudicialDecisionLifecycle(id, decision.id, {
                decisionAppealability: resolveProceedingsBlockAppealability(blocksProceedings),
            });
            if (err) {
                setLegalToast(err);
                setTimeout(() => setLegalToast(''), 5000);
            }
        },
        [id, patchJudicialDecisionLifecycle],
    );

    const isCourtStage = isTrialPhase || isCassationStage;
    const nextDateLabel = isTrialCourtStage ? 'تاريخ المرافعة القادمة' : 'تاريخ الجلسة القادمة';

    const scenarioStyle = (category: string | undefined | null) => {
        const c = String(category ?? '').trim();
        const isRed = /قبض|توقيف|إدانة/.test(c);
        const isGreen = /كفالة|إفراج|براءة|غلق/.test(c);
        const isOrange = /إحالة|تأجيل|استقدام/.test(c);
        const isPurple = /طعن تمييزي|مصح|عقلي|اللجنة الطبية/.test(c);

        if (isRed) {
            return {
                card: 'border-red-500/40 bg-red-900/10',
                badge: 'border-red-500/40 bg-red-500/15 text-red-200',
            };
        }
        if (isGreen) {
            return {
                card: 'border-emerald-500/40 bg-emerald-900/10',
                badge: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
            };
        }
        if (isOrange) {
            return {
                card: 'border-amber-500/40 bg-amber-900/10',
                badge: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
            };
        }
        if (isPurple) {
            return {
                card: 'border-fuchsia-500/40 bg-fuchsia-900/10',
                badge: 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200',
            };
        }
        return {
            card: 'border-slate-700 bg-slate-800/40',
            badge: 'border-slate-600/60 bg-slate-700/40 text-white/80',
        };
    };

    const isPostponementCategory = (category: string) => {
        const c = String(category ?? '').trim();
        return c === 'تأجيل الجلسة/المراجعة' || c === 'تأجيل الجلسة';
    };

    const postponementReasonStyle = (reason: string | undefined | null) => {
        const r = String(reason ?? '').trim();
        const isRed = /أمر قبض|تنبيه الكفيل|تخلف المتهم/.test(r);
        const isOrange = /عطل|سوق المتهم الموقوف|نقل الموقوفين/.test(r);
        if (isRed) return 'border-red-500/40 bg-red-500/15 text-red-200';
        if (isOrange) return 'border-amber-500/40 bg-amber-500/15 text-amber-200';
        return 'border-slate-600/60 bg-slate-700/40 text-white/80';
    };

    const [activeTab, setActiveTab] = useState<CriminalDashboardTab>('requests');
    const switchDashboardTab = useCallback((tab: CriminalDashboardTab) => {
        startTransition(() => setActiveTab(tab));
    }, []);

    useEffect(() => {
        void import('./components/TrialsTab');
    }, [id]);

    useEffect(() => {
        void import('./legalCodes/legalCodesDataCache').then(({ prefetchLegalCodeArticles }) => {
            prefetchLegalCodeArticles(['penal', 'procedure']);
        });
    }, [id]);

    const prevTrialUiStageRef = useRef(effectiveUiStage);
    useEffect(() => {
        const prevStage = prevTrialUiStageRef.current;
        prevTrialUiStageRef.current = effectiveUiStage;
        if (!showTrialsTab && decisionsKindFilter === 'trial_sessions') {
            setDecisionsKindFilter('all');
        }
        if (prevStage !== effectiveUiStage) {
            setDecisionsScopeFilter(defaultDecisionsScopeForStage(effectiveUiStage));
        }
    }, [showTrialsTab, effectiveUiStage, decisionsKindFilter]);

    useEffect(() => {
        if (isInvestigationPhase) {
            setDecisionsKindFilter(
                investigationDefendantsPartyMix === 'mixed'
                    ? 'all'
                    : investigationDefendantsPartyMix === 'juveniles_only'
                      ? 'juvenile_judicial'
                      : 'judicial',
            );
            return;
        }
        setDecisionsKindFilter(showTrialsTab ? 'trial_sessions' : 'all');
    }, [id, isInvestigationPhase, investigationDefendantsPartyMix, showTrialsTab]);

    useEffect(() => {
        if (decisionsScopeOptions.length > 0) return;
        if (decisionsScopeFilter !== 'current') {
            setDecisionsScopeFilter('current');
        }
    }, [decisionsScopeOptions.length, decisionsScopeFilter]);

    useEffect(() => {
        if (decisionsScopeOptions.some((o) => o.value === decisionsScopeFilter)) return;
        const fallback =
            decisionsScopeOptions.find((o) => o.value === 'current')?.value ??
            decisionsScopeOptions[0]?.value ??
            'current';
        setDecisionsScopeFilter(fallback);
    }, [decisionsScopeOptions, decisionsScopeFilter]);

    const [legalToast, setLegalToast] = useState('');
    const [linkedTimelineFromProcedural, setLinkedTimelineFromProcedural] = useState<TimelineEvent | null>(null);
    const [proceduralNavTarget, setProceduralNavTarget] = useState<ProceduralNavTarget | null>(null);

    const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
    const [editingStatement, setEditingStatement] = useState<Statement | null>(null);
    const [isOtherEvidenceFormOpen, setIsOtherEvidenceFormOpen] = useState(false);
    const [otherEvidenceTypeInput, setOtherEvidenceTypeInput] = useState('');
    const [otherEvidenceLinkedInput, setOtherEvidenceLinkedInput] = useState(false);
    const [otherEvidenceDateInput, setOtherEvidenceDateInput] = useState('');
    const [otherEvidenceNotesInput, setOtherEvidenceNotesInput] = useState('');
    const [isTrialDepositionModalOpen, setIsTrialDepositionModalOpen] = useState(false);
    const [editingTrialDeposition, setEditingTrialDeposition] = useState<TrialDeposition | null>(null);
    const [identityEditError, setIdentityEditError] = useState('');
    const [identityEdit, setIdentityEdit] = useState<
        | null
        | {
              mode: 'party';
              kind: 'complainant' | 'defendant';
              id: string;
              fullName: string;
              phone?: string;
              address: string;
          }
        | { mode: 'venue' }
    >(null);
    const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);

    const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
    /**
     * المسار النشط للمودال:
     *  - `'judicial'`: مودال «تقديم طلب إلى قرارات القاضي» (الزر الذهبي الأصلي).
     *  - `'lawyer'`: مودال «طلبات المحامي» (الزر الجديد بجانبه).
     * نُحدِّده عند الفتح ونعتمد عليه لإظهار الحاوية المناسبة في `RequestModalEntryLanes` وعنوان المودال.
     */
    const [requestModalLane, setRequestModalLane] = useState<'judicial' | 'lawyer'>('judicial');
    const [reqDate, setReqDate] = useState('');
    const [reqType, setReqType] = useState('');
    const [reqTypeTemplate, setReqTypeTemplate] = useState('');
    const [reqEntryLane, setReqEntryLane] = useState<'judicial' | 'lawyer' | ''>('');
    const [reqJudicialEntryScope, setReqJudicialEntryScope] = useState<DecisionsPartyScope | null>(
        null,
    );
    const [reqCustomTypeName, setReqCustomTypeName] = useState('');
    const [reqIsAppealable, setReqIsAppealable] = useState(false);
    const [reqNote, setReqNote] = useState('');
    const [reqInvestigationExpirationReason, setReqInvestigationExpirationReason] = useState<
        StageConclusion['expirationReason'] | ''
    >('');
    const [reqInvestigationExpirationCustomDetail, setReqInvestigationExpirationCustomDetail] = useState('');
    const [reqStatus, setReqStatus] = useState<LawyerRequest['status']>('pending');
    const [reqJudgeMargin, setReqJudgeMargin] = useState('');
    const [reqDecisionDate, setReqDecisionDate] = useState('');
    const [reqDefendantIds, setReqDefendantIds] = useState<string[]>([]);
    const [reqDetentionStartDate, setReqDetentionStartDate] = useState('');
    const [reqDetentionEndDate, setReqDetentionEndDate] = useState('');
    const [reqDetentionByPartyId, setReqDetentionByPartyId] = useState<
        Record<string, PartyDetentionDraft>
    >({});
    const [reqLegalArticleBasis, setReqLegalArticleBasis] = useState('');
    const [reqReferredCourtName, setReqReferredCourtName] = useState('');
    const [reqBailByPartyId, setReqBailByPartyId] = useState<Record<string, PartyBailDraft>>({});
    const [reqBailUnified, setReqBailUnified] = useState(false);
    const [reqDetentionUnified, setReqDetentionUnified] = useState(false);
    /* === حجز الأموال — حالة محرّر القالب === */
    const [reqSeizureSelectedDefendantIds, setReqSeizureSelectedDefendantIds] = useState<string[]>([]);
    const [reqSeizureDraftsByDefendant, setReqSeizureDraftsByDefendant] = useState<
        Record<string, AssetSeizureDraftLocal[]>
    >({});
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
    const [requestModalMode, setRequestModalMode] = useState<LawyerRequestModalMode>('create');
    const [quickFinalizeRequest, setQuickFinalizeRequest] = useState<LawyerRequest | null>(null);
    const [quickFinalizeStatus, setQuickFinalizeStatus] = useState<'approved' | 'rejected'>('approved');
    const [quickFinalizeMargin, setQuickFinalizeMargin] = useState('');
    const [quickFinalizeDate, setQuickFinalizeDate] = useState('');
    const [reqIsStarred, setReqIsStarred] = useState(false);
    const [reqDraftAttachments, setReqDraftAttachments] = useState<{ id: string; name: string }[]>([]);
    const [requestMarginModalOpen, setRequestMarginModalOpen] = useState(false);
    const isRequestModalViewOnly = requestModalMode === 'view';
    const isRequestCreateMode = requestModalMode === 'create';
    const isRequestFinalStatus = isLawyerRequestFinalStatus(reqStatus);
    const reqDecisionBeforeRequest = useMemo(() => {
        if (reqStatus !== 'approved' && reqStatus !== 'rejected') return false;
        const requestDate = reqDate.trim();
        const decisionDate = reqDecisionDate.trim();
        if (!requestDate || !decisionDate) return false;
        return isTimelineNextDateInvalid(requestDate, decisionDate);
    }, [reqDate, reqDecisionDate, reqStatus]);
    const requestPartyCtx = useMemo(
        () => ({
            isUnknownPerpetrator: isAllDefendantsUnknown,
            isDefense,
            complainantsCount: complainants.length,
            defendantsCount: defendants.length,
        }),
        [isAllDefendantsUnknown, isDefense, complainants.length, defendants.length],
    );
    const investigationJudicialEntryScope = useMemo(
        () =>
            isInvestigationPhase
                ? resolveInvestigationJudicialEntryScope(
                      reqTypeTemplate,
                      reqJudicialEntryScope,
                      investigationDefendantsPartyMix,
                  )
                : undefined,
        [
            isInvestigationPhase,
            reqTypeTemplate,
            reqJudicialEntryScope,
            investigationDefendantsPartyMix,
        ],
    );
    const defendantTargetRequestParties = useMemo(() => {
        const deceasedById = new Map(activeParties.map((p) => [p.id, Boolean(p.isDeceased)]));
        const scope = isInvestigationPhase
            ? filterActiveInvestigationDefendants(partyScopeDefendants)
            : partyScopeDefendants;
        let rows = scope
            .filter((d) => !deceasedById.get(d.id))
            .filter((d) => !isDefendantIdentityUnknown(d))
            .map((d) => ({
                id: d.id,
                fullName: d.fullName,
                isJuvenile: d.isJuvenile,
                source: 'defendant' as const,
                isDeceased: false,
            }));
        const tpl = String(reqTypeTemplate ?? '').trim();
        if (isInvestigationPhase && tpl) {
            if (investigationJudicialEntryScope === 'juvenile') {
                rows = rows.filter((p) => Boolean(p.isJuvenile));
            } else if (investigationJudicialEntryScope === 'adult') {
                rows = rows.filter((p) => !p.isJuvenile);
            }
        }
        return rows;
    }, [
        activeParties,
        isInvestigationPhase,
        partyScopeDefendants,
        reqTypeTemplate,
        investigationJudicialEntryScope,
    ]);
    const mixedInvestigationScopedDefendantNames = useMemo(() => {
        if (investigationDefendantsPartyMix !== 'mixed' || !investigationJudicialEntryScope) {
            return [];
        }
        const pool = defendantTargetRequestParties;
        const selectedNames = reqDefendantIds
            .map((id) => pool.find((p) => p.id === id)?.fullName)
            .map((n) => String(n ?? '').trim())
            .filter(Boolean);
        if (selectedNames.length) return selectedNames;
        return pool.map((p) => String(p.fullName ?? '').trim()).filter(Boolean);
    }, [
        investigationDefendantsPartyMix,
        investigationJudicialEntryScope,
        defendantTargetRequestParties,
        reqDefendantIds,
    ]);
    const requestEligibleParties = useMemo(
        () => {
            /*
             * في مودال «طلبات المحامي» يجب إظهار جميع الأطراف (مشتكي ومشكو منه، مفرد/جمع)
             * بصرف النظر عن تمثيل المحامي — لأنّ طلب المحامي قد يخصّ أيّ طرف.
             * نتجاوز فلتر `ourRepresentation` بإمرار `undefined`، ونحتفظ بمنطق
             * استبعاد المتوفّى وحالات القوالب المحدّدة (كفالة/توقيف/استقدام) كما هي.
             * قرارات تقييد الحرية: مصدر الأطراف `actionParties` (متهمون + مشتكي متقابل فقط).
             */
            const isJuvenileJudgeTpl =
                requestModalLane === 'judicial' &&
                isInvestigationPhase &&
                investigationJudicialEntryScope === 'juvenile';
            const isAdultInvestigationJudicialTpl =
                requestModalLane === 'judicial' &&
                isInvestigationPhase &&
                isJudicialDecisionTemplate(reqTypeTemplate) &&
                !isJuvenileJudgeTpl &&
                !isCustomJudicialTemplate(reqTypeTemplate);
            const decisionsScope: DecisionsPartyScope | undefined = investigationJudicialEntryScope;
            const representation =
                requestModalLane === 'lawyer' || isJuvenileJudgeTpl ? undefined : ourRepresentation;
            const partyPool = isDefendantTargetRequestTemplate(reqTypeTemplate)
                ? defendantTargetRequestParties
                : activeParties;
            let eligible = filterPartiesForRequestTemplate(
                partyPool,
                reqTypeTemplate,
                representation,
                decisionsScope,
            );
            if (isJuvenileJudgeTpl) {
                eligible = filterPartiesByDecisionsScope(eligible, 'juvenile').filter(
                    (p) => p.source === 'defendant',
                );
            } else if (
                isAdultInvestigationJudicialTpl &&
                isDefendantTargetRequestTemplate(reqTypeTemplate) &&
                !(
                    isInvestigationPhase &&
                    isJudicialDecisionTemplate(reqTypeTemplate) &&
                    requiresInvestigationPurgeDefendantScope(reqTypeTemplate)
                )
            ) {
                eligible = eligible.filter((p) => {
                    if (p.source !== 'defendant') return true;
                    const def = partyScopeDefendants.find((d) => d.id === p.id);
                    return def ? !isDefendantIdentityUnknown(def) : true;
                });
            }
            return eligible;
        },
        [
            activeParties,
            defendantTargetRequestParties,
            reqTypeTemplate,
            ourRepresentation,
            requestModalLane,
            isInvestigationPhase,
            investigationJudicialEntryScope,
        ],
    );
  /**
     * القرار اليدوي المخصص: لا اقتراح تلقائي — الخيار الفارغ = قرار عام للإضبارة.
     * قرارات قاضي الأحداث: «المقصود بالإجراء» يظهر فقط عند تعدد المؤهّلين.
     */
    const isCustomJudicialEntry = useMemo(
        () => isCustomJudicialTemplate(reqTypeTemplate),
        [reqTypeTemplate],
    );
    const isJuvenileJudgeDecisionEntry =
        requestModalLane === 'judicial' &&
        isInvestigationPhase &&
        investigationJudicialEntryScope === 'juvenile';
    const isAdultInvestigationJudicialEntry =
        requestModalLane === 'judicial' &&
        isInvestigationPhase &&
        isJudicialDecisionTemplate(reqTypeTemplate) &&
        !isJuvenileJudgeDecisionEntry &&
        !isCustomJudicialTemplate(reqTypeTemplate);
    const requestDecisionsScope: DecisionsPartyScope | undefined = investigationJudicialEntryScope;
    const showJuvenileJudgeConcernedPartyPicker =
        isJuvenileJudgeDecisionEntry &&
        shouldShowMultiPartySelectionPicker(requestEligibleParties.length);
    const showAdultJudgeConcernedPartyPicker =
        isAdultInvestigationJudicialEntry &&
        isDefendantTargetRequestTemplate(reqTypeTemplate) &&
        shouldShowMultiPartySelectionPicker(requestEligibleParties.length);
    const forceJudicialConcernedPartyPicker =
        showJuvenileJudgeConcernedPartyPicker || showAdultJudgeConcernedPartyPicker;
    const reqNeedsPurgeDefendantScope =
        isInvestigationPhase &&
        isJudicialDecisionTemplate(reqTypeTemplate) &&
        requiresInvestigationPurgeDefendantScope(reqTypeTemplate);
    const purgeSelectableIdentified = useMemo(() => {
        let list = filterSelectableDefendantsForScope(defendants);
        if (isJuvenileJudgeDecisionEntry) {
            list = filterDefendantsByDecisionsScope(list, 'juvenile');
        } else if (investigationDefendantsPartyMix !== 'juveniles_only') {
            list = filterDefendantsByDecisionsScope(list, 'adult');
        }
        return list;
    }, [defendants, isJuvenileJudgeDecisionEntry, investigationDefendantsPartyMix]);
    const showPurgeDefendantPicker =
        reqNeedsPurgeDefendantScope &&
        (purgeSelectableIdentified.length > 0 ||
            (unknownDefendantsForPartyDisplay.length > 0 &&
                purgeDecisionIncludesUnknownDefendants(reqTypeTemplate)));
    const autoRequestPartyId = useMemo(
        () =>
            isCustomJudicialEntry
                ? null
                : resolveAutoRequestPartyId(
                      requestEligibleParties,
                      reqTypeTemplate,
                      requestPartyCtx,
                      requestModalLane === 'lawyer' ? undefined : ourRepresentation,
                      requestDecisionsScope,
                  ),
        [
            isCustomJudicialEntry,
            requestEligibleParties,
            reqTypeTemplate,
            requestPartyCtx,
            ourRepresentation,
            requestModalLane,
            requestDecisionsScope,
        ],
    );
    const showUnknownPartyNoticeInRequestModal =
        unknownDefendantsForPartyDisplay.length > 0 &&
        Boolean(reqTypeTemplate.trim()) &&
        !reqNeedsPurgeDefendantScope &&
        !isAssetSeizureTemplate(reqTypeTemplate);
    const showRequestPartyPicker = useMemo(
        () => {
            if (requestModalLane === 'judicial' && isCustomJudicialEntry) return false;
            return shouldShowRequestPartyPicker(
                requestEligibleParties,
                reqTypeTemplate,
                autoRequestPartyId,
                isAllDefendantsUnknown,
                requestModalLane === 'lawyer' ? undefined : ourRepresentation,
                requestDecisionsScope,
            );
        },
        [
            isCustomJudicialEntry,
            requestEligibleParties,
            reqTypeTemplate,
            autoRequestPartyId,
            isAllDefendantsUnknown,
            ourRepresentation,
            requestModalLane,
            requestDecisionsScope,
        ],
    );
    const autoRequestPartyLabel = useMemo(() => {
        if (!autoRequestPartyId) return '';
        const p = activeParties.find((x) => x.id === autoRequestPartyId);
        return p ? formatConcernedPartyLabel(p) : '—';
    }, [autoRequestPartyId, activeParties]);
    /** قرار قضائي يدوي: لا محدّد طرف — الفراغ = قرار عام للإضبارة. */
    const customJudicialConcernedPartyOptions = useMemo(
        () =>
            activeParties.map((p) => ({
                id: p.id,
                label: formatConcernedPartyLabel(p),
            })),
        [activeParties],
    );
    const customJudicialConcernedPartyId = String(reqDefendantIds[0] ?? '').trim();
    const showConcernedPartyCardsUi =
        requestModalLane === 'judicial' &&
        !isCustomJudicialEntry &&
        shouldShowMultiPartySelectionPicker(requestEligibleParties.length);
    const hidePartySectionForJudicialCustom =
        requestModalLane === 'judicial' && isCustomJudicialEntry;
    const solePartyJuvenileArrestHintSection =
        requestModalLane === 'judicial' &&
        normalizeProceduralRequestTemplate(reqTypeTemplate.trim()) === ARREST_ORDER_TEMPLATE &&
        (() => {
            const partyId = String(autoRequestPartyId ?? requestEligibleParties[0]?.id ?? '').trim();
            if (!partyId) return false;
            const def = defendants.find((d) => d.id === partyId);
            return Boolean((def as { isJuvenile?: boolean } | undefined)?.isJuvenile);
        })();
    const showRequestPartySection =
        Boolean(reqTypeTemplate.trim()) &&
        !hidePartySectionForJudicialCustom &&
        !reqNeedsPurgeDefendantScope &&
        !isAssetSeizureTemplate(reqTypeTemplate) &&
        (isRequestModalViewOnly
            ? Boolean(
                  reqDefendantIds.length ||
                      autoRequestPartyId ||
                      showRequestPartyPicker ||
                      showUnknownPartyNoticeInRequestModal,
              )
            : forceJudicialConcernedPartyPicker ||
                  showConcernedPartyCardsUi ||
                  showRequestPartyPicker ||
                  showUnknownPartyNoticeInRequestModal ||
                  solePartyJuvenileArrestHintSection ||
                  (requiresDetentionDateRange(reqTypeTemplate) &&
                      requestEligibleParties.length > 0) ||
                  (isDefendantBailTemplate(reqTypeTemplate) &&
                      defendantTargetRequestParties.length > 0));
    const effectiveRequestPartyIds = useMemo(() => {
        const cleaned = reqDefendantIds.map((x) => String(x ?? '').trim()).filter(Boolean);
        if (cleaned.length) return cleaned;
        if (autoRequestPartyId) return [autoRequestPartyId];
        if (requestEligibleParties.length === 1) return [requestEligibleParties[0]!.id];
        return [];
    }, [reqDefendantIds, autoRequestPartyId, requestEligibleParties]);
    const patchReqDetentionForParty = (partyId: string, patch: Partial<PartyDetentionDraft>) => {
        setReqDetentionByPartyId((prev) => ({
            ...prev,
            [partyId]: {
                startDate: patch.startDate ?? prev[partyId]?.startDate ?? '',
                endDate: patch.endDate ?? prev[partyId]?.endDate ?? '',
            },
        }));
    };
    const patchReqBailForParty = (partyId: string, patch: Partial<PartyBailDraft>) => {
        setReqBailByPartyId((prev) => ({
            ...prev,
            [partyId]: {
                kind: patch.kind ?? prev[partyId]?.kind ?? 'financial',
                bailAmount: patch.bailAmount ?? prev[partyId]?.bailAmount ?? '',
                guarantors: patch.guarantors ?? prev[partyId]?.guarantors ?? [],
            },
        }));
    };
    const [confirmAction, setConfirmAction] = useState<{
        title?: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm: () => void;
    } | null>(null);
    const [isReopenCaseOpen, setIsReopenCaseOpen] = useState(false);
    const [reopenCaseReason, setReopenCaseReason] = useState('');
    const [isSendToCassationOpen, setIsSendToCassationOpen] = useState(false);
    const [cassationNumber, setCassationNumber] = useState('');
    const [cassationSentDate, setCassationSentDate] = useState('');
    const [cassationPanelName, setCassationPanelName] = useState('');
    const [cassationType, setCassationType] = useState<CassationType>('criminal_cassation_misdemeanor');
    const [cassationInterventionBasis, setCassationInterventionBasis] =
        useState<ProsecutionInterventionBasis>('prosecutor_general_review');
    const [cassationAppellantIds, setCassationAppellantIds] = useState<string[]>([]);
    const [cassationFilingDetails, setCassationFilingDetails] = useState('');
    const [verdictCassationFilingCard, setVerdictCassationFilingCard] = useState<VerdictCard | null>(null);
    const [isMergeCasesOpen, setIsMergeCasesOpen] = useState(false);
    const [mergeTargetCaseId, setMergeTargetCaseId] = useState('');
    const [mergeReason, setMergeReason] = useState('');

    const [isStageCloserOpen, setIsStageCloserOpen] = useState(false);
    const [isStageFinalDecisionOpen, setIsStageFinalDecisionOpen] = useState(false);
    const trialFinalDecisionSessionIdRef = useRef<string | null>(null);
    const [stageFinalDecisionError, setStageFinalDecisionError] = useState('');
    const [stageCloserReferralOnly, setStageCloserReferralOnly] = useState(false);
    const [stageCloserError, setStageCloserError] = useState('');
    const [closureDecisionType, setClosureDecisionType] = useState<
        StageConclusion['decisionType'] | typeof PRIVATE_RIGHT_WAIVER_DECISION_VALUE | ''
    >('');
    const [closureDate, setClosureDate] = useState('');
    const [closureDetails, setClosureDetails] = useState('');
    const [closureDefendantStatus, setClosureDefendantStatus] = useState<StageConclusion['defendantStatusAtDecision']>('bailed');
    const [closureExpirationReason, setClosureExpirationReason] = useState<StageConclusion['expirationReason'] | ''>('');
    const [closureExpirationCustomDetail, setClosureExpirationCustomDetail] = useState('');
    const [closureExpirationDefendantIds, setClosureExpirationDefendantIds] = useState<string[]>([]);
    const [closureReferralStage, setClosureReferralStage] = useState<'محكمة الجنح' | 'محكمة الجنايات' | ''>('');
    const [closureReferralCourtName, setClosureReferralCourtName] = useState('');
    const [closureReferralCaseNumber, setClosureReferralCaseNumber] = useState('');
    const [closureSuspendedExecution, setClosureSuspendedExecution] = useState(false);
    const [closurePunishmentType, setClosurePunishmentType] = useState<'death' | 'life' | 'other'>('other');
    const [closureJuvenileSeverDefendantId, setClosureJuvenileSeverDefendantId] = useState('');
    const [closureScopedDefendantIds, setClosureScopedDefendantIds] = useState<string[]>([]);
    const [closureSharedObjective269b, setClosureSharedObjective269b] = useState(false);

    const [isLegalEditOpen, setIsLegalEditOpen] = useState(false);
    const [legalArticleNext, setLegalArticleNext] = useState('');
    const [legalChangedBy, setLegalChangedBy] = useState<LegalArticleChange['changedBy']>('trial_court');

    const [forfeitureModal, setForfeitureModal] = useState<{
        defendantId: string;
        forfeitureNote: string;
    } | null>(null);

    useEffect(() => {
        if (!isRequestsModalOpen || !autoRequestPartyId || requestModalLane === 'judicial') return;
        setReqDefendantIds([autoRequestPartyId]);
    }, [isRequestsModalOpen, autoRequestPartyId, reqTypeTemplate, requestModalLane]);

    useEffect(() => {
        setIsTrashModalOpen(false);
        setIsMergeCasesOpen(false);
        setMergeTargetCaseId('');
        setMergeReason('');
        setIsReopenCaseOpen(false);
        setReopenCaseReason('');
        setIsStageCloserOpen(false);
        setStageCloserError('');
        setIsStageFinalDecisionOpen(false);
        setStageFinalDecisionError('');
        setIsLegalEditOpen(false);
        setConfirmAction(null);
        setForfeitureModal(null);
    }, [id]);

    const showLegalError = () => {
        setLegalToast('تعذّر تنفيذ الإجراء بسبب نقص/تعارض في البيانات. يمكنك المتابعة بالتوثيق وتعديل التفاصيل لاحقاً.');
        setTimeout(() => setLegalToast(''), 4500);
    };

    const promptMoveToTrash = useCallback(
        (title: string, message: string, onConfirm: () => void) => {
            setConfirmAction({
                title,
                message,
                confirmText: 'نقل للسلة',
                onConfirm,
            });
        },
        [],
    );

    const handleMoveRequestToTrash = useCallback(
        (request: LawyerRequest) => {
            promptMoveToTrash(
                'نقل إلى سلة المهملات',
                'سيتم إخفاء الطلب/القرار مع إمكانية استرجاعه من سلة المهملات.',
                () => {
                    const err = moveLawyerRequestToTrash(id, request.id);
                    if (err) {
                        setLegalToast(err);
                        setTimeout(() => setLegalToast(''), 4500);
                        return;
                    }
                    setLegalToast('✓ تم نقل الطلب إلى سلة المهملات.');
                    setTimeout(() => setLegalToast(''), 3500);
                },
            );
        },
        [id, moveLawyerRequestToTrash, promptMoveToTrash],
    );

    const handleMoveDecisionToTrash = useCallback(
        (decision: JudicialDecision) => {
            promptMoveToTrash(
                'نقل إلى سلة المهملات',
                'سيتم إخفاء بطاقة القرار مع إمكانية استرجاعها من سلة المهملات.',
                () => {
                    const err = moveJudicialDecisionToTrash(id, decision.id);
                    if (err) {
                        setLegalToast(err);
                        setTimeout(() => setLegalToast(''), 4500);
                        return;
                    }
                    setLegalToast('✓ تم نقل القرار إلى سلة المهملات.');
                    setTimeout(() => setLegalToast(''), 3500);
                },
            );
        },
        [id, moveJudicialDecisionToTrash, promptMoveToTrash],
    );

    const resolveConcernedPartyIds = (ids: string[]) => {
        const cleaned = ids.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0);
        if (autoConcernedPartyId) return [autoConcernedPartyId];
        return cleaned.length ? cleaned : undefined;
    };

    const loadRequestIntoModal = (request: LawyerRequest) => {
        const parsed = resolveRequestTypeTemplateFromStored(request.type, request.proceduralTemplate);
        let template = parsed.template;
        if (normalizeProceduralRequestTemplate(template) === ARREST_SUMMON_TEMPLATE) {
            const kind = request.orderEnforcement?.kind;
            if (kind === 'arrest') template = ARREST_ORDER_TEMPLATE;
            else if (kind === 'summons') template = SUMMON_ORDER_TEMPLATE;
        }
        setEditingRequestId(request.id);
        setReqDate(request.requestDate);
        setReqType(request.type);
        setReqTypeTemplate(template);
        setReqEntryLane(resolveRequestEntryLane(template));
        setReqCustomTypeName(parsed.customName);
        setReqIsAppealable(request.isAppealable === true);
        setReqNote(request.lawyerNote);
        setReqStatus(request.status);
        setReqJudgeMargin(String(request.judgeMargin ?? ''));
        setReqDecisionDate(String(request.decisionDate ?? '').trim() || new Date().toISOString().slice(0, 10));
        setReqDefendantIds(Array.isArray(request.defendantIds) ? request.defendantIds : []);
        const loadedDetentionStart = String(request.detentionStartDate ?? '').trim();
        const loadedDetentionEnd = String(request.detentionEndDate ?? '').trim();
        setReqDetentionStartDate(loadedDetentionStart);
        setReqDetentionEndDate(loadedDetentionEnd);
        const loadedPartyIds = Array.isArray(request.defendantIds) ? request.defendantIds : [];
        const detentionMap: Record<string, PartyDetentionDraft> = {};
        for (const partyId of loadedPartyIds) {
            detentionMap[partyId] = {
                startDate: loadedDetentionStart,
                endDate: loadedDetentionEnd,
            };
        }
        setReqDetentionByPartyId(detentionMap);
        const bail = request.defendantBail;
        const bailMap: Record<string, PartyBailDraft> = {};
        if (bail && (bail.kind === 'financial' || bail.kind === 'personal')) {
            for (const partyId of loadedPartyIds) {
                bailMap[partyId] = {
                    kind: bail.kind,
                    bailAmount: String(bail.bailAmount ?? '').trim(),
                    guarantors: Array.isArray(bail.guarantors)
                        ? bail.guarantors.map((g) => ({ ...g }))
                        : [],
                };
            }
        }
        setReqBailByPartyId(bailMap);
        setReqBailUnified(loadedPartyIds.length > 1 && Boolean(bail));
        setReqDetentionUnified(
            loadedPartyIds.length > 1 &&
                Boolean(loadedDetentionStart.trim() || loadedDetentionEnd.trim()),
        );
        setReqLegalArticleBasis(
            String(request.legalArticleBasis ?? request.orderEnforcement?.legalArticleBasis ?? activeLegalArticle).trim(),
        );
        setReqReferredCourtName(String(request.referredCourtName ?? '').trim());
        setReqIsStarred(request.isStarred === true);
        setReqDraftAttachments(
            Array.isArray(request.attachments) ? request.attachments.map((a) => ({ ...a })) : [],
        );
    };

    const modalLinkedRequest = useMemo(() => {
        if (!editingRequestId) return null;
        return lawyerRequests.find((r) => r.id === editingRequestId) ?? null;
    }, [editingRequestId, lawyerRequests]);

    const applyJudicialTemplate = (v: string, groupScope?: DecisionsPartyScope | null) => {
        setReqEntryLane('judicial');
        setReqJudicialEntryScope(groupScope ?? null);
        setReqTypeTemplate(v);
        if (!requiresDetentionDateRange(v)) {
            setReqDetentionStartDate('');
            setReqDetentionEndDate('');
            setReqDetentionByPartyId({});
            setReqDetentionUnified(false);
        }
        setReqJudgeMargin('');
        setReqDecisionDate('');
        setReqStatus('pending');
        if (!isCustomJudicialTemplate(v)) {
            setReqCustomTypeName('');
            setReqIsAppealable(isJuvenileJudgeCassationAppealableTemplate(v));
            setReqType(v);
        } else {
            setReqType(reqCustomTypeName);
            setReqIsAppealable(false);
            setReqDefendantIds([]);
        }
        if (isOrderEnforcementTemplate(v) && !reqLegalArticleBasis.trim()) {
            setReqLegalArticleBasis(activeLegalArticle);
        }
        if (!isComplaintCourtReferralTemplate(v)) {
            setReqReferredCourtName('');
        }
        if (!isDefendantBailTemplate(v)) {
            setReqBailByPartyId({});
            setReqBailUnified(false);
        }
        if (!isAssetSeizureTemplate(v)) {
            setReqSeizureSelectedDefendantIds([]);
            setReqSeizureDraftsByDefendant({});
        }
        if (
            isInvestigationPhase &&
            (isInvestigationPurgeDecisionTemplate(v) || isInvestigationExpirationJudicialTemplate(v))
        ) {
            const activeIds = new Set(filterActiveInvestigationDefendants(defendants).map((d) => d.id));
            let selectable = filterSelectableDefendantsForScope(defendants);
            const entryScope = resolveInvestigationJudicialEntryScope(
                v,
                groupScope ?? null,
                investigationDefendantsPartyMix,
            );
            if (entryScope === 'juvenile') {
                selectable = filterDefendantsByDecisionsScope(selectable, 'juvenile');
            } else if (entryScope === 'adult') {
                selectable = filterDefendantsByDecisionsScope(selectable, 'adult');
            }
            const selectableIds = new Set(selectable.map((d) => d.id));
            setReqDefendantIds((prev) => {
                const kept = prev.filter((id) => activeIds.has(id) && selectableIds.has(id));
                if (kept.length) return kept;
                return selectable.length === 1 ? [selectable[0]!.id] : [];
            });
        }
        if (!isInvestigationExpirationJudicialTemplate(v)) {
            setReqInvestigationExpirationReason('');
            setReqInvestigationExpirationCustomDetail('');
        }
        const entryScope = resolveInvestigationJudicialEntryScope(
            v,
            groupScope ?? null,
            investigationDefendantsPartyMix,
        );
        if (isInvestigationPhase && entryScope === 'juvenile') {
            let eligible = filterPartiesForRequestTemplate(activeParties, v, undefined, 'juvenile');
            eligible = eligible.filter((p) => p.source === 'defendant');
            setReqDefendantIds(eligible.length === 1 ? [eligible[0]!.id] : []);
        } else if (
            isInvestigationPhase &&
            entryScope === 'adult' &&
            (isDefendantTargetRequestTemplate(v) ||
                isDetentionDecisionTemplate(v) ||
                isDefendantBailTemplate(v)) &&
            !isInvestigationPurgeDecisionTemplate(v) &&
            !isInvestigationExpirationJudicialTemplate(v)
        ) {
            let eligible = filterPartiesForRequestTemplate(activeParties, v, undefined, 'adult');
            eligible = eligible
                .filter((p) => p.source === 'defendant')
                .filter((p) => {
                    const def = defendants.find((d) => d.id === p.id);
                    return def ? !isDefendantIdentityUnknown(def) : true;
                });
            setReqDefendantIds(eligible.length === 1 ? [eligible[0]!.id] : []);
        }
    };

    const applyLawyerTemplate = (v: string) => {
        setReqEntryLane('lawyer');
        setReqTypeTemplate(v);
        setReqStatus('pending');
        setReqJudgeMargin('');
        setReqDecisionDate('');
        setReqDetentionStartDate('');
        setReqDetentionEndDate('');
        setReqDetentionByPartyId({});
        setReqLegalArticleBasis('');
        setReqSeizureSelectedDefendantIds([]);
        setReqSeizureDraftsByDefendant({});
        if (!isCustomLawyerMotionTemplate(v)) {
            setReqCustomTypeName('');
            setReqIsAppealable(false);
            setReqType(v);
        } else {
            setReqType(reqCustomTypeName);
            setReqIsAppealable(false);
        }
    };

    const clearRequestEntryLane = () => {
        setReqEntryLane('');
        setReqJudicialEntryScope(null);
        setReqTypeTemplate('');
        setReqType('');
        setReqCustomTypeName('');
        setReqIsAppealable(false);
        setReqStatus('pending');
        setReqJudgeMargin('');
        setReqDecisionDate('');
        setReqDetentionStartDate('');
        setReqDetentionEndDate('');
        setReqDetentionByPartyId({});
        setReqLegalArticleBasis('');
        setReqReferredCourtName('');
        setReqBailByPartyId({});
        setReqBailUnified(false);
        setReqDetentionUnified(false);
        setReqSeizureSelectedDefendantIds([]);
        setReqSeizureDraftsByDefendant({});
        setReqInvestigationExpirationReason('');
        setReqInvestigationExpirationCustomDetail('');
    };

    useEffect(() => {
        if (!isRequestsModalOpen || requestModalLane !== 'judicial' || !reqTypeTemplate.trim()) return;
        const mix = investigationDefendantsPartyMix;
        const isJuvenileTpl = isJuvenileJudgeDecisionTemplateForMix(
            reqTypeTemplate,
            investigationDefendantsPartyMix,
        );
        const isAdultInvestigationTpl =
            isJudicialDecisionTemplate(reqTypeTemplate) &&
            !isJuvenileTpl &&
            !isCustomJudicialTemplate(reqTypeTemplate);
        if (
            (mix === 'juveniles_only' && isAdultInvestigationTpl) ||
            (mix === 'adults_only' && isJuvenileTpl)
        ) {
            clearRequestEntryLane();
        }
    }, [
        isRequestsModalOpen,
        requestModalLane,
        reqTypeTemplate,
        investigationDefendantsPartyMix,
    ]);

    const openPrefilledRequestModal = (
        template: string,
        defendantIds?: string[],
        opts?: { detentionStartDate?: string; detentionEndDate?: string },
    ) => {
        const isJudicial = isJudicialDecisionTemplate(template);
        setRequestModalLane(isJudicial ? 'judicial' : 'lawyer');
        setRequestModalMode('create');
        setEditingRequestId(null);
        setReqDate(new Date().toISOString().slice(0, 10));
        if (isJudicial) {
            applyJudicialTemplate(template);
        } else {
            applyLawyerTemplate(template);
        }
        setReqNote('');
        setReqJudgeMargin('');
        setReqDecisionDate('');
        setReqDefendantIds(
            defendantIds?.length
                ? defendantIds
                : autoRequestPartyId
                  ? [autoRequestPartyId]
                  : autoConcernedPartyId
                    ? [autoConcernedPartyId]
                    : [],
        );
        setReqDetentionStartDate(String(opts?.detentionStartDate ?? '').trim());
        setReqDetentionEndDate(String(opts?.detentionEndDate ?? '').trim());
        setReqLegalArticleBasis(activeLegalArticle);
        setReqReferredCourtName('');
        setReqBailByPartyId({});
        setReqBailUnified(false);
        setReqDetentionUnified(false);
        setReqSeizureSelectedDefendantIds([]);
        setReqSeizureDraftsByDefendant({});
        setReqIsStarred(false);
        setReqDraftAttachments([]);
        setIsRequestsModalOpen(true);
    };

    const openQuickBailFromDecision = (decision: JudicialDecision) => {
        const ids = (decision.defendantIds ?? decision.beneficiaryPartyIds ?? []).filter(Boolean);
        openPrefilledRequestModal(BAIL_RELEASE_TEMPLATE, ids);
    };

    /**
     * فتح مودال «تقديم طلب إلى قرارات القاضي» — مع نطاق بالغ/حدث في مرحلة التحقيق.
     */
    const openJudicialDecisionModal = () => {
        if (isInvestigationDossierSealed) {
            setLegalToast('الإضبارة مختومة — لا يُسمح بتسجيل قرارات أو طلبات جديدة.');
            setTimeout(() => setLegalToast(''), 5000);
            return;
        }
        setRequestModalLane('judicial');
        setRequestModalMode('create');
        setEditingRequestId(null);
        setReqDate(new Date().toISOString().slice(0, 10));
        const isCustomDefault = isEffectiveTrialCourtStage;
        if (isCustomDefault) {
            applyJudicialTemplate(CUSTOM_JUDICIAL_DECISION_TYPE);
        } else {
            setReqType('');
            setReqTypeTemplate('');
            setReqEntryLane('');
            setReqCustomTypeName('');
            setReqIsAppealable(false);
        }
        setReqNote('');
        setReqStatus('pending');
        setReqJudgeMargin('');
        setReqDecisionDate('');
        setReqDefendantIds(isCustomDefault ? [] : []);
        setReqDetentionStartDate('');
        setReqDetentionEndDate('');
        setReqDetentionByPartyId({});
        setReqLegalArticleBasis(activeLegalArticle);
        setReqReferredCourtName('');
        setReqBailByPartyId({});
        setReqBailUnified(false);
        setReqDetentionUnified(false);
        setReqSeizureSelectedDefendantIds([]);
        setReqSeizureDraftsByDefendant({});
        setReqIsStarred(false);
        setReqDraftAttachments([]);
        setIsRequestsModalOpen(true);
    };

    const openAdultJudicialDecisionModal = () => {
        setDecisionsKindFilter('judicial');
        openJudicialDecisionModal();
    };

    const openJuvenileJudicialDecisionModal = () => {
        setDecisionsKindFilter('juvenile_judicial');
        openJudicialDecisionModal();
    };

    /**
     * فتح مودال «طلبات المحامي» — حاوية طلبات المحامي (البنفسجية) فقط، بدون قائمة منسدلة لاختيار النوع.
     * تُفعَّل تلقائياً حالة الإدخال اليدوي عبر `applyLawyerTemplate(CUSTOM_LAWYER_MOTION_TYPE)`.
     */
    const openLawyerMotionModal = () => {
        if (isInvestigationDossierSealed) {
            setLegalToast('الإضبارة مختومة — لا يُسمح بتسجيل طلبات جديدة.');
            setTimeout(() => setLegalToast(''), 5000);
            return;
        }
        setRequestModalLane('lawyer');
        setRequestModalMode('create');
        setEditingRequestId(null);
        setReqDate(new Date().toISOString().slice(0, 10));
        applyLawyerTemplate(CUSTOM_LAWYER_MOTION_TYPE);
        setReqCustomTypeName('');
        setReqType('');
        setReqIsAppealable(false);
        setReqNote('');
        setReqStatus('pending');
        setReqJudgeMargin('');
        setReqDecisionDate('');
        setReqDefendantIds(autoRequestPartyId ? [autoRequestPartyId] : autoConcernedPartyId ? [autoConcernedPartyId] : []);
        setReqDetentionStartDate('');
        setReqDetentionEndDate('');
        setReqDetentionByPartyId({});
        setReqLegalArticleBasis(activeLegalArticle);
        setReqReferredCourtName('');
        setReqBailByPartyId({});
        setReqBailUnified(false);
        setReqDetentionUnified(false);
        setReqSeizureSelectedDefendantIds([]);
        setReqSeizureDraftsByDefendant({});
        setReqIsStarred(false);
        setReqDraftAttachments([]);
        setIsRequestsModalOpen(true);
    };

    const closeQuickFinalizeModal = () => {
        setQuickFinalizeRequest(null);
        setQuickFinalizeMargin('');
        setQuickFinalizeDate('');
        setQuickFinalizeStatus('approved');
    };

    const openRequestQuickFinalizeModal = (request: LawyerRequest) => {
        if (isLawyerRequestExecuted(request.status) || isLawyerRequestLocked(request)) {
            openRequestViewModal(request);
            return;
        }
        setQuickFinalizeRequest(request);
        setQuickFinalizeStatus('approved');
        setQuickFinalizeMargin('');
        setQuickFinalizeDate(new Date().toISOString().slice(0, 10));
    };

    const openRequestViewModal = (request: LawyerRequest) => {
        setRequestModalMode('view');
        setRequestModalLane(
            isJudicialDecisionTemplate(request.proceduralTemplate ?? request.type ?? '')
                ? 'judicial'
                : 'lawyer',
        );
        loadRequestIntoModal(request);
        setIsRequestsModalOpen(true);
    };

    const proceduralContainers = useMemo(
        () =>
            Array.isArray(criminalCase.proceduralContainers) ? criminalCase.proceduralContainers : [],
        [criminalCase.proceduralContainers],
    );

    const getProceduralRefsForRequest = useCallback(
        (requestId: string) =>
            findProceduralReferencesToLink(proceduralContainers, { kind: 'request', id: requestId }),
        [proceduralContainers],
    );

    const navigateToProceduralItem = (target: ProceduralNavTarget) => {
        setActiveTab('tracking');
        setProceduralNavTarget(target);
        setLinkedTimelineFromProcedural(null);
        if (isRequestsModalOpen) closeRequestsModal();
    };

    const openProceduralLinkedRecord = (link: ProceduralItemLink) => {
        if (link.kind === 'request') {
            const req = lawyerRequests.find((r) => r.id === link.id);
            if (!req) {
                setLegalToast('الطلب المرتبط لم يعد موجوداً في القضية.');
                setTimeout(() => setLegalToast(''), 4500);
                return;
            }
            setActiveTab('requests');
            window.setTimeout(() => openRequestViewModal(req), 0);
            return;
        }
        const events = Array.isArray(criminalCase.timelineEvents) ? criminalCase.timelineEvents : [];
        const ev = events.find((e) => e.id === link.id);
        if (!ev) {
            setLegalToast('حدث التايم لاين المرتبط غير موجود.');
            setTimeout(() => setLegalToast(''), 4500);
            return;
        }
        setLinkedTimelineFromProcedural(ev);
    };

    const closeRequestsModal = () => {
        setEditingRequestId(null);
        setRequestModalMode('create');
        setReqDetentionStartDate('');
        setReqDetentionEndDate('');
        setReqDetentionByPartyId({});
        setReqIsStarred(false);
        setReqDraftAttachments([]);
        setRequestMarginModalOpen(false);
        setIsRequestsModalOpen(false);
    };

    /** رجوع تدريجي: إغلاق الطبقات العلوية ثم التبويب ثم الخروج من الإضبارة. */
    const handleDashboardBack = useCallback(() => {
        if (confirmAction) {
            setConfirmAction(null);
            return;
        }
        if (cassationResultContext) {
            setCassationResultContext(null);
            return;
        }
        if (cassationAppealModal) {
            setCassationAppealModal(null);
            return;
        }
        if (quickFinalizeRequest) {
            closeQuickFinalizeModal();
            return;
        }
        if (requestMarginModalOpen) {
            setRequestMarginModalOpen(false);
            return;
        }
        if (isRequestsModalOpen) {
            closeRequestsModal();
            return;
        }
        if (linkedTimelineFromProcedural) {
            setLinkedTimelineFromProcedural(null);
            return;
        }
        if (isStatementModalOpen) {
            setIsStatementModalOpen(false);
            setEditingStatement(null);
            return;
        }
        if (isTrialDepositionModalOpen) {
            setIsTrialDepositionModalOpen(false);
            setEditingTrialDeposition(null);
            return;
        }
        if (isOtherEvidenceFormOpen) {
            setIsOtherEvidenceFormOpen(false);
            return;
        }
        if (isTrashModalOpen) {
            setIsTrashModalOpen(false);
            return;
        }
        if (isReopenCaseOpen) {
            setIsReopenCaseOpen(false);
            return;
        }
        if (isSendToCassationOpen) {
            setIsSendToCassationOpen(false);
            return;
        }
        if (isMergeCasesOpen) {
            setIsMergeCasesOpen(false);
            return;
        }
        if (isStageCloserOpen) {
            setIsStageCloserOpen(false);
            return;
        }
        if (isLegalEditOpen) {
            setIsLegalEditOpen(false);
            return;
        }
        if (isInvestigationDecisionOpen) {
            setIsInvestigationDecisionOpen(false);
            return;
        }
        if (isSeveranceOpen) {
            setIsSeveranceOpen(false);
            return;
        }
        if (isInlineSeveranceFormOpen) {
            setIsInlineSeveranceFormOpen(false);
            return;
        }
        if (identityEdit) {
            setIdentityEdit(null);
            return;
        }
        if (forfeitureModal) {
            setForfeitureModal(null);
            return;
        }
        if (selectedPartyFilterId) {
            setSelectedPartyFilterId('');
            return;
        }
        if (selectedJourneyBranchId) {
            setSelectedJourneyBranchId('');
            return;
        }
        if (selectedNodeFilter) {
            setSelectedNodeFilter('');
            return;
        }
        if (proceduralNavTarget) {
            setProceduralNavTarget(null);
            return;
        }
        if (activeTab !== 'requests') {
            switchDashboardTab('requests');
            return;
        }
        onClose?.();
    }, [
        activeTab,
        cassationAppealModal,
        cassationResultContext,
        confirmAction,
        forfeitureModal,
        identityEdit,
        isInlineSeveranceFormOpen,
        isInvestigationDecisionOpen,
        isLegalEditOpen,
        isMergeCasesOpen,
        isOtherEvidenceFormOpen,
        isReopenCaseOpen,
        isRequestsModalOpen,
        isSendToCassationOpen,
        isSeveranceOpen,
        isStageCloserOpen,
        isStatementModalOpen,
        isTrashModalOpen,
        isTrialDepositionModalOpen,
        linkedTimelineFromProcedural,
        onClose,
        proceduralNavTarget,
        quickFinalizeRequest,
        requestMarginModalOpen,
        selectedJourneyBranchId,
        selectedNodeFilter,
        selectedPartyFilterId,
        switchDashboardTab,
    ]);

    const syncRequestUxAfterCreate = (requestId: string) => {
        if (reqIsStarred) toggleRequestStar(id, requestId);
        reqDraftAttachments.forEach((att) => {
            if (att.name.trim()) addRequestAttachment(id, requestId, att.name.trim());
        });
    };

    const openForfeitureUpdate = (defendantId: string) => {
        const def = defendants.find((d) => d.id === defendantId) as any;
        const g = normalizeGuarantorDetails(def?.guarantorDetails);
        setForfeitureModal({
            defendantId,
            forfeitureNote: String(g?.guarantorInfo ?? ''),
        });
    };

    const buildRequestPayloadBase = () => {
        const cleanedSelectedIds = Array.isArray(reqDefendantIds)
            ? reqDefendantIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0)
            : [];
        const defendantIds = reqNeedsPurgeDefendantScope
            ? resolveEffectiveDefendantScopeIds(defendants, cleanedSelectedIds, reqTypeTemplate.trim())
            : (resolveRequestPartyIdsForPayload(
                    cleanedSelectedIds,
                    autoRequestPartyId,
                    requestEligibleParties,
                    reqTypeTemplate.trim(),
                    ourRepresentation,
                    requestPartyCtx,
                    requestDecisionsScope,
                ) ?? []);
        const resolved = resolveStoredRequestTypeFields(
            reqTypeTemplate.trim(),
            reqCustomTypeName.trim(),
            reqIsAppealable,
        );
        return {
            requestDate: reqDate.trim(),
            type: resolved.type,
            lawyerNote: reqNote.trim(),
            defendantIds: defendantIds.length ? defendantIds : undefined,
            proceduralTemplate: resolved.proceduralTemplate,
            isAppealable: resolved.isAppealable,
        };
    };

    const commitCreateRequest = (opts?: { silent?: boolean }) => {
        const buildDefendantBailPayload = (partyId: string) => {
            const draft = reqBailByPartyId[partyId] ?? emptyPartyBailDraft();
            if (draft.kind === 'financial') {
                const amt = draft.bailAmount.trim();
                if (!amt) return undefined;
                return { kind: 'financial' as const, bailAmount: amt };
            }
            if (draft.kind === 'personal') {
                const guarantors = draft.guarantors
                    .map((g) => ({
                        id: g.id,
                        fullName: String(g.fullName ?? '').trim(),
                    }))
                    .filter((g) => g.fullName.length > 0);
                if (!guarantors.length) return undefined;
                return { kind: 'personal' as const, guarantors };
            }
            return undefined;
        };

        /**
         * بيانات «حجز الأموال» — تُجمَّع لكل متهم هارب مُختار.
         * نُسقط الأصناف الفارغة (بدون وصف) قبل التمرير للمتجر.
         * نمرّر `id` مسوّدة محلّية ليُولّد المتجر معرّفاً نهائياً.
         */
        type AssetItemPayload = {
            description: string;
            referenceNumber?: string;
            seizureDate?: string;
            notes?: string;
        };
        type PerDefendantPayload = { defendantId: string; assets: AssetItemPayload[] };
        const assetSeizureInput = (() => {
            if (!reqIsAssetSeizureEntry) return undefined;
            const perDefendant = reqSeizureSelectedDefendantIds
                .map((did): PerDefendantPayload | null => {
                    const drafts = Array.isArray(reqSeizureDraftsByDefendant[did])
                        ? reqSeizureDraftsByDefendant[did]
                        : [];
                    const assets = drafts
                        .map((d): AssetItemPayload | null => {
                            const description = String(d?.description ?? '').trim();
                            if (!description) return null;
                            return {
                                description,
                                referenceNumber: String(d?.referenceNumber ?? '').trim() || undefined,
                                seizureDate: String(d?.seizureDate ?? '').trim() || undefined,
                                notes: String(d?.notes ?? '').trim() || undefined,
                            };
                        })
                        .filter((x): x is AssetItemPayload => x !== null);
                    if (!assets.length) return null;
                    return { defendantId: did, assets };
                })
                .filter((x): x is PerDefendantPayload => x !== null);
            return perDefendant.length ? { perDefendant } : undefined;
        })();

        /**
         * `defendantIds` لإجراء حجز الأموال = الهاربون المُختارون داخل المُحرِّر،
         * وليس قائمة `reqDefendantIds` الافتراضية (التي يُديرها party picker المغلق
         * لهذا القالب لأنّه يدير اختياره داخلياً).
         */
        const defendantIdsForPayload = reqIsAssetSeizureEntry
            ? reqSeizureSelectedDefendantIds.length > 0
                ? reqSeizureSelectedDefendantIds.slice()
                : undefined
            : reqIsDefendantBailEntry
              ? bailTargetDefendantIds.length
                  ? bailTargetDefendantIds.slice()
                  : buildRequestPayloadBase().defendantIds
              : buildRequestPayloadBase().defendantIds;

        const resolveDetentionDates = (partyId: string) => {
            const draft = reqDetentionByPartyId[partyId];
            return {
                start: (draft?.startDate ?? reqDetentionStartDate).trim() || undefined,
                end: (draft?.endDate ?? reqDetentionEndDate).trim() || undefined,
            };
        };

        const basePayload = {
            requestDate: reqDate.trim(),
            lawyerNote: reqNote.trim(),
            proceduralTemplate: reqTypeTemplate.trim(),
            customTypeName: reqCustomTypeName.trim(),
            isAppealable: reqIsAppealable,
            legalArticleBasis: reqLegalArticleBasis.trim() || undefined,
            referredCourtName: reqReferredCourtName.trim() || undefined,
            assetSeizure: assetSeizureInput,
        };

        const bailTargetIds = reqIsDefendantBailEntry
            ? bailTargetDefendantIds.length
                ? bailTargetDefendantIds
                : effectiveRequestPartyIds
            : [];

        if (reqIsDefendantBailEntry && bailTargetIds.length > 0) {
            if (reqBailUnified && bailTargetIds.length > 1) {
                const defendantBail = buildDefendantBailPayload(bailTargetIds[0]!);
                if (!defendantBail) {
                    setLegalToast('أكمل تفاصيل الكفالة لجميع المتهمين المُؤشَّرين.');
                    setTimeout(() => setLegalToast(''), 5000);
                    return null;
                }
                const { error, requestId } = createLawyerRequest(id, {
                    ...basePayload,
                    defendantIds: bailTargetIds.slice(),
                    defendantBail,
                });
                if (error) {
                    setLegalToast(error);
                    setTimeout(() => setLegalToast(''), 5000);
                    return null;
                }
                if (requestId) syncRequestUxAfterCreate(requestId);
                if (!opts?.silent) {
                    setLegalToast('✓ تم توثيق القرار في السجل.');
                    setTimeout(() => setLegalToast(''), 5000);
                }
                return requestId;
            }

            let lastRequestId: string | null = null;
            for (const partyId of bailTargetIds) {
                const defendantBail = buildDefendantBailPayload(partyId);
                if (!defendantBail) {
                    setLegalToast('أكمل تفاصيل الكفالة لكل متهم مُؤشَّر.');
                    setTimeout(() => setLegalToast(''), 5000);
                    return null;
                }
                const { error, requestId } = createLawyerRequest(id, {
                    ...basePayload,
                    defendantIds: [partyId],
                    defendantBail,
                });
                if (error) {
                    setLegalToast(error);
                    setTimeout(() => setLegalToast(''), 5000);
                    return null;
                }
                if (requestId) {
                    syncRequestUxAfterCreate(requestId);
                    lastRequestId = requestId;
                }
            }
            if (!opts?.silent) {
                setLegalToast('✓ تم توثيق القرار في السجل.');
                setTimeout(() => setLegalToast(''), 5000);
            }
            return lastRequestId;
        }

        const detentionTargetIds =
            reqNeedsDetentionDateRange && Array.isArray(defendantIdsForPayload)
                ? defendantIdsForPayload
                : [];

        if (reqNeedsDetentionDateRange && detentionTargetIds.length > 1 && !reqDetentionUnified) {
            let lastRequestId: string | null = null;
            for (const partyId of detentionTargetIds) {
                const { start, end } = resolveDetentionDates(partyId);
                const { error, requestId } = createLawyerRequest(id, {
                    ...basePayload,
                    defendantIds: [partyId],
                    detentionStartDate: start,
                    detentionEndDate: end,
                });
                if (error) {
                    setLegalToast(error);
                    setTimeout(() => setLegalToast(''), 5000);
                    return null;
                }
                if (requestId) {
                    syncRequestUxAfterCreate(requestId);
                    lastRequestId = requestId;
                }
            }
            if (!opts?.silent) {
                const msg = isJudicialDecisionTemplate(reqTypeTemplate)
                    ? '✓ تم توثيق القرار في السجل.'
                    : '✓ تم تسجيل الطلب.';
                setLegalToast(msg);
                setTimeout(() => setLegalToast(''), 5000);
            }
            return lastRequestId;
        }

        const singleDetentionPartyId =
            reqNeedsDetentionDateRange && detentionTargetIds.length >= 1
                ? detentionTargetIds.length === 1 || reqDetentionUnified
                    ? detentionTargetIds[0]
                    : undefined
                : undefined;
        const singleDetention = singleDetentionPartyId
            ? resolveDetentionDates(singleDetentionPartyId)
            : {
                  start: reqDetentionStartDate.trim() || undefined,
                  end: reqDetentionEndDate.trim() || undefined,
              };

        const { error, requestId } = createLawyerRequest(id, {
            ...basePayload,
            defendantIds: defendantIdsForPayload,
            detentionStartDate: singleDetention.start,
            detentionEndDate: singleDetention.end,
        });
        if (error) {
            setLegalToast(error);
            setTimeout(() => setLegalToast(''), 5000);
            return null;
        }
        if (requestId) syncRequestUxAfterCreate(requestId);
        if (!opts?.silent) {
            const msg = isJudicialDecisionTemplate(reqTypeTemplate)
                ? '✓ تم توثيق القرار في السجل.'
                : '✓ تم تسجيل الطلب.';
            setLegalToast(msg);
            setTimeout(() => setLegalToast(''), 5000);
        }
        return requestId;
    };

    const commitFinalizeRequest = (
        status: 'approved' | 'rejected',
        requestId: string,
        fields?: { judgeMargin: string; decisionDate: string },
    ) => {
        const judgeMargin = (fields?.judgeMargin ?? reqJudgeMargin).trim();
        const decisionDate = (fields?.decisionDate ?? reqDecisionDate).trim();
        const finalizedTemplate = reqTypeTemplate;
        const expirationReasonSnapshot = reqInvestigationExpirationReason;
        const expirationCustomSnapshot = reqInvestigationExpirationCustomDetail;
        const expirationDefendantIdsSnapshot = [...reqDefendantIds];
        const err = finalizeLawyerRequest(id, requestId, {
            status,
            judgeMargin,
            decisionDate,
        });
        if (err) {
            setLegalToast(err);
            setTimeout(() => setLegalToast(''), 5000);
            return;
        }
        if (
            status === 'approved' &&
            isInvestigationPhase &&
            isInvestigationExpirationJudicialTemplate(finalizedTemplate) &&
            expirationReasonSnapshot &&
            expirationDefendantIdsSnapshot.length
        ) {
            const expirationDetails =
                expirationReasonSnapshot === 'custom_manual'
                    ? expirationCustomSnapshot.trim() ||
                      reqNote.trim() ||
                      'انقضاء / سقوط الدعوى الجزائية'
                    : reqNote.trim() || 'انقضاء / سقوط الدعوى الجزائية';
            const conclusion: StageConclusion = {
                id:
                    globalThis.crypto && 'randomUUID' in globalThis.crypto
                        ? globalThis.crypto.randomUUID()
                        : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
                stageType: 'investigation',
                decisionType: 'expiration',
                date: decisionDate || new Date().toISOString().slice(0, 10),
                details: expirationDetails,
                defendantStatusAtDecision: 'bailed',
                expirationReason: expirationReasonSnapshot,
                defendantIds: expirationDefendantIdsSnapshot,
            };
            const stageErr = issueStageDecision(id, conclusion);
            if (stageErr) {
                setLegalToast(stageErr);
                setTimeout(() => setLegalToast(''), 5000);
                closeRequestsModal();
                closeQuickFinalizeModal();
                return;
            }
        }
        setLegalToast('تم تدوين هامش القاضي وقفل الطلب — أُدرج في سجل الطلب والقرار القضائي.');
        setTimeout(() => setLegalToast(''), 5000);
        closeRequestsModal();
        closeQuickFinalizeModal();
    };

    const promptFatalRequestLock = (
        status: 'approved' | 'rejected',
        onConfirm: () => void,
    ) => {
        setConfirmAction({
            title: 'تأكيد الحفظ النهائي',
            message: buildRequestFatalLockMessage(status),
            confirmText: 'تأكيد الحفظ',
            cancelText: 'إلغاء',
            onConfirm,
        });
    };

    const reqNeedsDetentionDateRange = requiresDetentionDateRange(reqTypeTemplate);
    const reqJuvenileDetentionLocked =
        reqNeedsDetentionDateRange &&
        partyIdsIncludeJuvenile(defendants, effectiveRequestPartyIds);

    const showJuvenileArrestLegalHint = useMemo(() => {
        if (requestModalLane !== 'judicial') return false;
        const tpl = normalizeProceduralRequestTemplate(reqTypeTemplate.trim());
        if (tpl !== ARREST_ORDER_TEMPLATE) return false;
        const partyId = String(effectiveRequestPartyIds[0] ?? '').trim();
        if (!partyId) return false;
        const def = defendants.find((d) => d.id === partyId);
        return Boolean((def as { isJuvenile?: boolean } | undefined)?.isJuvenile);
    }, [requestModalLane, reqTypeTemplate, effectiveRequestPartyIds, defendants]);
    const reqIsJudicialDecisionEntry = isJudicialDecisionTemplate(reqTypeTemplate);
    const reqIsLawyerMotionEntry = Boolean(reqTypeTemplate.trim()) && !reqIsJudicialDecisionEntry;
    const reqIsOrderEnforcementEntry = isOrderEnforcementTemplate(reqTypeTemplate);
    const reqNeedsLegalArticle = requiresLegalArticleBasis(reqTypeTemplate);

    const detentionRangeValid =
        !reqNeedsDetentionDateRange ||
        (reqDetentionUnified && effectiveRequestPartyIds.length > 1
            ? (() => {
                  const partyId = effectiveRequestPartyIds[0]!;
                  const draft = reqDetentionByPartyId[partyId] ?? {
                      startDate: reqDetentionStartDate,
                      endDate: reqDetentionEndDate,
                  };
                  return (
                      validateDetentionDateRange(draft.startDate.trim(), draft.endDate.trim()) === null
                  );
              })()
            : effectiveRequestPartyIds.every((partyId) => {
                  const draft = reqDetentionByPartyId[partyId] ?? {
                      startDate: reqDetentionStartDate,
                      endDate: reqDetentionEndDate,
                  };
                  return validateDetentionDateRange(draft.startDate.trim(), draft.endDate.trim()) === null;
              }));

    const reqIsComplaintReferralEntry = isComplaintCourtReferralTemplate(reqTypeTemplate);
    const reqNeedsCustomName =
        isCustomJudicialTemplate(reqTypeTemplate) || isCustomLawyerMotionTemplate(reqTypeTemplate);

    const reqIsDefendantBailEntry = isDefendantBailTemplate(reqTypeTemplate);
    const showPartyPickerFormUi =
        showRequestPartyPicker ||
        forceJudicialConcernedPartyPicker ||
        showConcernedPartyCardsUi ||
        showUnknownPartyNoticeInRequestModal ||
        reqIsDefendantBailEntry ||
        reqNeedsDetentionDateRange;
    const bailTargetDefendantIds = useMemo(() => {
        if (!reqIsDefendantBailEntry) return reqDefendantIds;
        const cleaned = reqDefendantIds.map((x) => String(x ?? '').trim()).filter(Boolean);
        if (cleaned.length) return cleaned;
        const resolved = resolveRequestPartyIdsForPayload(
            cleaned,
            autoRequestPartyId,
            requestEligibleParties,
            reqTypeTemplate.trim(),
            requestModalLane === 'lawyer' ? undefined : ourRepresentation,
            requestPartyCtx,
            requestDecisionsScope,
        );
        if (resolved?.length) return resolved;
        if (defendantTargetRequestParties.length === 1) {
            return [defendantTargetRequestParties[0]!.id];
        }
        return [];
    }, [
        reqIsDefendantBailEntry,
        reqDefendantIds,
        autoRequestPartyId,
        requestEligibleParties,
        reqTypeTemplate,
        requestModalLane,
        ourRepresentation,
        requestPartyCtx,
        requestDecisionsScope,
        defendantTargetRequestParties,
    ]);
    const bailFormValid = (() => {
        if (!reqIsDefendantBailEntry) return true;
        const targets = bailTargetDefendantIds.length ? bailTargetDefendantIds : effectiveRequestPartyIds;
        if (!targets.length) return false;
        if (reqBailUnified && targets.length > 1) {
            return isPartyBailDraftValid(reqBailByPartyId[targets[0]!]);
        }
        return targets.every((partyId) => isPartyBailDraftValid(reqBailByPartyId[partyId]));
    })();

    const syncUnifiedBailDrafts = (partyIds: string[]) => {
        if (partyIds.length < 2) return;
        const firstId = partyIds[0]!;
        const draft = reqBailByPartyId[firstId] ?? emptyPartyBailDraft();
        setReqBailByPartyId((prev) => {
            const next = { ...prev };
            for (const partyId of partyIds) {
                next[partyId] = {
                    kind: draft.kind,
                    bailAmount: draft.bailAmount,
                    guarantors: draft.guarantors.map((g) => ({ ...g })),
                };
            }
            return next;
        });
    };

    const syncUnifiedDetentionDrafts = (partyIds: string[]) => {
        if (partyIds.length < 2) return;
        const firstId = partyIds[0]!;
        const draft = reqDetentionByPartyId[firstId] ?? {
            startDate: reqDetentionStartDate,
            endDate: reqDetentionEndDate,
        };
        setReqDetentionByPartyId((prev) => {
            const next = { ...prev };
            for (const partyId of partyIds) {
                next[partyId] = { startDate: draft.startDate, endDate: draft.endDate };
            }
            return next;
        });
    };

    const handleReqBailUnifiedChange = (unified: boolean) => {
        setReqBailUnified(unified);
        if (unified) {
            const targets = bailTargetDefendantIds.length ? bailTargetDefendantIds : effectiveRequestPartyIds;
            syncUnifiedBailDrafts(targets);
        }
    };

    const handleReqDetentionUnifiedChange = (unified: boolean) => {
        setReqDetentionUnified(unified);
        if (unified) {
            syncUnifiedDetentionDrafts(effectiveRequestPartyIds);
        }
    };

    useEffect(() => {
        if (effectiveRequestPartyIds.length <= 1) {
            setReqBailUnified(false);
            setReqDetentionUnified(false);
        }
    }, [effectiveRequestPartyIds.length]);

    useEffect(() => {
        if (!isRequestsModalOpen || isRequestModalViewOnly || !reqIsDefendantBailEntry) return;
        if (reqDefendantIds.length === 0 && defendantTargetRequestParties.length === 1) {
            setReqDefendantIds([defendantTargetRequestParties[0]!.id]);
        }
    }, [
        isRequestsModalOpen,
        isRequestModalViewOnly,
        reqIsDefendantBailEntry,
        reqDefendantIds.length,
        defendantTargetRequestParties,
    ]);

    /**
     * === حجز الأموال — قائمة الهاربين + اختيار ذكي + تحقّق ===
     *
     * يَشمل المتهمين الأصليين الذين status='هارب'، إضافةً إلى المشتكين المتقابلين
     * (شكوى متقابلة) الذين accusedStatus='هارب' — وفقاً لازدواجية الصفة. لا نَنقل
     * كائن المشتكي إلى مصفوفة المتهمين؛ نَكتفي بدَمج العَرض ديناميكياً.
     */
    const fugitiveDefendants = useMemo(() => {
        const original = (Array.isArray(defendants) ? defendants : [])
            .filter((d) => d.status === 'هارب')
            .map((d) => ({
                id: d.id,
                fullName: String(d.fullName ?? '').trim() || 'متهم بلا اسم',
            }));
        const crossFugitives = (Array.isArray(complainants) ? complainants : [])
            .filter(
                (c) =>
                    (isMutualComplaint || (c as { isCrossComplaint?: boolean }).isCrossComplaint === true) &&
                    String((c as { accusedStatus?: string }).accusedStatus ?? '').trim() === 'هارب',
            )
            .map((c) => ({
                id: c.id,
                fullName: String(c.fullName ?? '').trim() || 'مشتكي بلا اسم',
            }));
        return [...original, ...crossFugitives];
    }, [defendants, complainants, isMutualComplaint]);
    const reqIsAssetSeizureEntry = isAssetSeizureTemplate(reqTypeTemplate);
    /**
     * عند تفعيل قالب «حجز الأموال» مع وجود هارب واحد فقط ⇒ نختاره ضمنياً.
     * لا نُجبر إعادة المزامنة في الحالات الأخرى لتجنّب مسح اختيار المستخدم.
     */
    useEffect(() => {
        if (!reqIsAssetSeizureEntry) return;
        if (fugitiveDefendants.length === 1) {
            const onlyId = fugitiveDefendants[0]!.id;
            setReqSeizureSelectedDefendantIds((prev) =>
                prev.length === 1 && prev[0] === onlyId ? prev : [onlyId],
            );
        } else if (fugitiveDefendants.length === 0) {
            setReqSeizureSelectedDefendantIds([]);
        } else {
            setReqSeizureSelectedDefendantIds((prev) =>
                prev.filter((id) => fugitiveDefendants.some((f) => f.id === id)),
            );
        }
    }, [reqIsAssetSeizureEntry, fugitiveDefendants]);

    const assetSeizureFormValid = (() => {
        if (!reqIsAssetSeizureEntry) return true;
        if (fugitiveDefendants.length === 0) return false;
        if (reqSeizureSelectedDefendantIds.length === 0) return false;
        return reqSeizureSelectedDefendantIds.every((did) => {
            const drafts = reqSeizureDraftsByDefendant[did];
            return Array.isArray(drafts) && drafts.some((a) => String(a?.description ?? '').trim().length > 0);
        });
    })();

    useEffect(() => {
        if (!isRequestsModalOpen || !reqNeedsPurgeDefendantScope || isRequestModalViewOnly) return;
        const selectable = filterSelectableDefendantsForScope(defendants);
        if (selectable.length === 1) {
            setReqDefendantIds([selectable[0]!.id]);
        }
    }, [isRequestsModalOpen, reqNeedsPurgeDefendantScope, isRequestModalViewOnly, defendants, reqTypeTemplate]);

    useEffect(() => {
        if (!isRequestsModalOpen || isRequestModalViewOnly || !isJuvenileJudgeDecisionEntry) return;
        if (requestEligibleParties.length !== 1) return;
        const soleId = requestEligibleParties[0]!.id;
        if (reqDefendantIds[0] !== soleId) setReqDefendantIds([soleId]);
    }, [
        isRequestsModalOpen,
        isRequestModalViewOnly,
        isJuvenileJudgeDecisionEntry,
        requestEligibleParties,
        reqDefendantIds,
    ]);

    useEffect(() => {
        if (!isRequestsModalOpen || isRequestModalViewOnly || !isAdultInvestigationJudicialEntry) return;
        if (!isDefendantTargetRequestTemplate(reqTypeTemplate)) return;
        if (requestEligibleParties.length !== 1) return;
        const soleId = requestEligibleParties[0]!.id;
        if (reqDefendantIds[0] !== soleId) setReqDefendantIds([soleId]);
    }, [
        isRequestsModalOpen,
        isRequestModalViewOnly,
        isAdultInvestigationJudicialEntry,
        reqTypeTemplate,
        requestEligibleParties,
        reqDefendantIds,
    ]);

    useEffect(() => {
        if (!reqIsDefendantBailEntry) return;
        setReqBailByPartyId((prev) => {
            const next: Record<string, PartyBailDraft> = {};
            for (const partyId of effectiveRequestPartyIds) {
                next[partyId] = prev[partyId] ?? emptyPartyBailDraft();
            }
            return next;
        });
    }, [reqIsDefendantBailEntry, effectiveRequestPartyIds]);

    useEffect(() => {
        if (!isRequestsModalOpen || isRequestModalViewOnly) return;
        if (!showRequestPartySection) return;
        if (requestEligibleParties.length === 1 && reqDefendantIds.length === 0) {
            setReqDefendantIds([requestEligibleParties[0]!.id]);
        }
    }, [
        isRequestsModalOpen,
        isRequestModalViewOnly,
        showRequestPartySection,
        reqTypeTemplate,
        requestEligibleParties,
        reqDefendantIds.length,
    ]);

    useEffect(() => {
        if (!reqNeedsDetentionDateRange) return;
        setReqDetentionByPartyId((prev) => {
            const next: Record<string, PartyDetentionDraft> = {};
            for (const partyId of effectiveRequestPartyIds) {
                next[partyId] = prev[partyId] ?? {
                    startDate: reqDetentionStartDate,
                    endDate: reqDetentionEndDate,
                };
            }
            return next;
        });
    }, [reqNeedsDetentionDateRange, effectiveRequestPartyIds, reqDetentionStartDate, reqDetentionEndDate]);

    const onAssetSeizureDraftsChange = (did: string, drafts: AssetSeizureDraftLocal[]) => {
        setReqSeizureDraftsByDefendant((prev) => ({ ...prev, [did]: drafts }));
    };

    const requestFormBaseValid =
        reqDate.trim().length > 0 &&
        reqTypeTemplate.trim().length > 0 &&
        reqEntryLane !== '' &&
        reqNote.trim().length > 0 &&
        (!reqNeedsCustomName || reqCustomTypeName.trim().length > 0) &&
        (!reqNeedsPurgeDefendantScope ||
            resolveEffectiveDefendantScopeIds(defendants, reqDefendantIds, reqTypeTemplate).length > 0) &&
        // قالب «حجز الأموال» يدير اختيار الأطراف داخلياً عبر مُحرّره الخاص.
        (reqIsAssetSeizureEntry ||
            !showRequestPartySection ||
            effectiveRequestPartyIds.length > 0) &&
        (!reqNeedsLegalArticle || reqLegalArticleBasis.trim().length > 0) &&
        (!reqIsComplaintReferralEntry || reqReferredCourtName.trim().length > 0) &&
        detentionRangeValid &&
        bailFormValid &&
        assetSeizureFormValid;

    const requestFormFinalValid =
        reqJudgeMargin.trim().length > 0 && reqDecisionDate.trim().length > 0 && !reqDecisionBeforeRequest;

    const submitRequest = () => {
        if (isRequestModalViewOnly) return;
        if (!requestFormBaseValid) {
            if (
                showRequestPartySection &&
                !isDefendantBailTemplate(reqTypeTemplate) &&
                effectiveRequestPartyIds.length === 0
            ) {
                setLegalToast('حدّد شخصاً واحداً على الأقل معنياً بالقرار.');
                setTimeout(() => setLegalToast(''), 5000);
            } else if (reqIsDefendantBailEntry && bailTargetDefendantIds.length === 0) {
                setLegalToast('اختر متهماً واحداً على الأقل لقرار التكفيل.');
                setTimeout(() => setLegalToast(''), 5000);
            } else if (reqIsDefendantBailEntry && !bailFormValid) {
                setLegalToast('أكمل تفاصيل الكفالة لكل متهم مُؤشَّر.');
                setTimeout(() => setLegalToast(''), 5000);
            } else if (reqNeedsDetentionDateRange && !detentionRangeValid) {
                const firstInvalid = effectiveRequestPartyIds.find((partyId) => {
                    const draft = reqDetentionByPartyId[partyId] ?? {
                        startDate: reqDetentionStartDate,
                        endDate: reqDetentionEndDate,
                    };
                    return validateDetentionDateRange(draft.startDate.trim(), draft.endDate.trim()) !== null;
                });
                const draft = firstInvalid
                    ? (reqDetentionByPartyId[firstInvalid] ?? {
                          startDate: reqDetentionStartDate,
                          endDate: reqDetentionEndDate,
                      })
                    : { startDate: '', endDate: '' };
                const detentionErr =
                    validateDetentionDateRange(draft.startDate.trim(), draft.endDate.trim()) ||
                    'أدخل تاريخ بدء وانتهاء التوقيف لكل متهم مُؤشَّر.';
                setLegalToast(detentionErr);
                setTimeout(() => setLegalToast(''), 5000);
            } else if (!reqNote.trim()) {
                setLegalToast(
                    reqIsJudicialDecisionEntry ? 'أدخل تفاصيل / وقائع القرار.' : 'أدخل تفاصيل الطلب.',
                );
                setTimeout(() => setLegalToast(''), 5000);
            }
            return;
        }

        if (reqIsJudicialDecisionEntry) {
            if (
                isInvestigationPhase &&
                isInvestigationExpirationJudicialTemplate(reqTypeTemplate)
            ) {
                const expirationErr = validateExpirationReasonSelection(
                    reqInvestigationExpirationReason,
                    reqInvestigationExpirationCustomDetail,
                );
                if (expirationErr || !reqDefendantIds.length) {
                    setLegalToast(expirationErr || 'حدّد متهماً واحداً على الأقل.');
                    setTimeout(() => setLegalToast(''), 5000);
                    return;
                }
            }
            if (isPrivateRightWaiverTemplate(reqTypeTemplate)) {
                setConfirmAction({
                    title: 'تأكيد صلح/تنازل',
                    message:
                        'هل أنت متأكد من توثيق قرار الصلح والتنازل؟ يُشمَع الإضبارة ويُسقَط الحق الشخصي وفق هذا القرار.',
                    confirmText: 'توثيق القرار',
                    cancelText: 'مراجعة',
                    onConfirm: () => {
                        if (isRequestCreateMode) {
                            const requestId = commitCreateRequest();
                            if (requestId) closeRequestsModal();
                        }
                    },
                });
                return;
            }
            if (isRequestCreateMode) {
                const requestId = commitCreateRequest();
                if (requestId) closeRequestsModal();
            }
            return;
        }

        if (!isRequestFinalStatus) {
            if (isRequestCreateMode) {
                const requestId = commitCreateRequest();
                if (requestId) closeRequestsModal();
            }
            return;
        }

        if (!requestFormFinalValid) return;

        const status = reqStatus;
        promptFatalRequestLock(status, () => {
            const requestId = commitCreateRequest({ silent: true });
            if (!requestId) return;
            commitFinalizeRequest(status, requestId);
        });
    };

    const quickFinalizeDecisionBeforeRequest = useMemo(() => {
        if (!quickFinalizeRequest) return false;
        const requestDate = String(quickFinalizeRequest.requestDate ?? '').trim();
        const decisionDate = quickFinalizeDate.trim();
        if (!requestDate || !decisionDate) return false;
        return isTimelineNextDateInvalid(requestDate, decisionDate);
    }, [quickFinalizeRequest, quickFinalizeDate]);

    const submitQuickFinalize = () => {
        if (!quickFinalizeRequest) return;
        const judgeMargin = quickFinalizeMargin.trim();
        const decisionDate = quickFinalizeDate.trim();
        if (!judgeMargin || !decisionDate || quickFinalizeDecisionBeforeRequest) return;
        promptFatalRequestLock(quickFinalizeStatus, () =>
            commitFinalizeRequest(quickFinalizeStatus, quickFinalizeRequest.id, {
                judgeMargin,
                decisionDate,
            }),
        );
    };

    const openLegalEdit = () => {
        setLegalArticleNext('');
        setLegalChangedBy('trial_court');
        setIsLegalEditOpen(true);
    };

    const submitLegalEdit = () => {
        const article = legalArticleNext.trim();
        if (!article) return;
        const change: LegalArticleChange = {
            id:
                globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
                    ? globalThis.crypto.randomUUID()
                    : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            article,
            changedAtDate: new Date().toISOString().slice(0, 10),
            changedBy: legalChangedBy,
        };
        try {
            updateLegalArticle(id, change);
        } catch {
            showLegalError();
            return;
        }
        setIsLegalEditOpen(false);
    };

    const patchSocialInquiryReport = (patch: {
        workflowStatus?: SocialInquiryWorkflowStatus;
        isAttached?: boolean;
        receivedDate?: string;
        investigatorName?: string;
        recommendations?: string;
    }) => {
        if (!firstJuvenileDefendant) return;
        const base = ((firstJuvenileDefendant as any).socialInquiryReport ?? { isAttached: false, workflowStatus: 'not_requested' }) as any;
        const nextWorkflow =
            typeof patch.workflowStatus === 'string' && isValidSocialInquiryWorkflowStatus(patch.workflowStatus)
                ? patch.workflowStatus
                : (base.workflowStatus as SocialInquiryWorkflowStatus | undefined) ?? 'not_requested';
        const nextAttached =
            typeof patch.isAttached === 'boolean' ? patch.isAttached : nextWorkflow === 'submitted' || base.isAttached === true;
        updateJuvenileSocialInquiryReport(id, (firstJuvenileDefendant as any).id, {
            workflowStatus: nextWorkflow,
            isAttached: nextAttached,
            receivedDate: typeof patch.receivedDate === 'string' ? patch.receivedDate : String(base.receivedDate ?? ''),
            investigatorName:
                typeof patch.investigatorName === 'string' ? patch.investigatorName : String(base.investigatorName ?? ''),
            recommendations:
                typeof patch.recommendations === 'string' ? patch.recommendations : String(base.recommendations ?? ''),
        });
    };

    const firstJuvenileSocialWorkflow: SocialInquiryWorkflowStatus = (() => {
        const raw = String((firstJuvenileDefendant as any)?.socialInquiryReport?.workflowStatus ?? '').trim();
        if (isValidSocialInquiryWorkflowStatus(raw)) return raw;
        return (firstJuvenileDefendant as any)?.socialInquiryReport?.isAttached === true ? 'submitted' : 'not_requested';
    })();

    const isCriminalCaseStage = (v: string): v is CriminalCaseStage => isValidCriminalStage(v);

    const isReferralStageValue = (v: string): v is 'محكمة الجنح' | 'محكمة الجنايات' => isReferralTrialStage(v);

    const isStageDecisionType = (v: string): v is StageConclusion['decisionType'] =>
        v === 'referral' ||
        v === 'closing' ||
        v === 'temporary_closing' ||
        v === 'conviction' ||
        v === 'juvenile_deliver_guardian' ||
        v === 'juvenile_behavioral_surveillance' ||
        v === 'juvenile_reform_boys' ||
        v === 'juvenile_youth_school' ||
        v === 'juvenile_fine' ||
        v === 'juvenile_severance_referral' ||
        v === 'acquittal' ||
        v === 'release' ||
        v === 'expiration' ||
        v === 'cassation_confirm' ||
        v === 'cassation_quash_remand' ||
        v === 'cassation_quash_reduce' ||
        v === 'cassation_quash_acquit_release' ||
        v === 'case_split_fugitive_referral' ||
        v === 'temporary_release_insufficient_evidence' ||
        v === 'postpone_article_183' ||
        v === 'default_judgment_issue' ||
        v === 'default_judgment_opposition' ||
        isProceduralRouteDecisionType(v);

    const isDecisionDefendantStatus = (v: string): v is StageConclusion['defendantStatusAtDecision'] =>
        v === 'detained' || v === 'bailed' || v === 'fugitive';

    const isLegalChangedByValue = (v: string): v is LegalArticleChange['changedBy'] =>
        v === 'police' || v === 'investigation_judge' || v === 'trial_court';

    const isDefendantStatusValue = (v: string): v is DefendantStatus =>
        v === 'حر' ||
        v === 'مستقدم' ||
        v === 'هارب' ||
        v === 'ملقى القبض عليه' ||
        v === 'موقوف' ||
        v === 'مكفل' ||
        v === 'bailed_pending_appeal' ||
        v === 'psychiatric_eval' ||
        v === 'provisional_delivery' ||
        v === 'behavioral_surveillance' ||
        v === 'juvenile_detention' ||
        v === 'متوفى' ||
        v === 'مشمول بالعفو';

    const stageTypeFromStage = (s: string): StageConclusion['stageType'] | null => {
        if (isInvestigationStoredStage(s)) return 'investigation';
        if (s === 'محكمة الجنح' || s === 'محكمة الأحداث') return 'misdemeanor';
        if (s === 'محكمة الجنايات') return 'felony';
        if (s === 'cassation_court') return 'cassation';
        return null;
    };

    const useStageFinalDecisionSystem =
        isTrialCourtStage && !isJuvenileTrial && !isCassationStage;

    const caseSovereignContext = useMemo(
        () => (rawCase ? resolveCaseSovereignContext(rawCase) : null),
        [rawCase],
    );

    const openStageFinalDecisionModal = () => {
        if (isPrejudicialFrozen) return;
        ensureCaseSovereignContext(id);
        setStageFinalDecisionError('');
        setIsStageFinalDecisionOpen(true);
    };

    const openInvestigationDecisionModal = () => {
        if (isPrejudicialFrozen) return;
        if (investigationHasMixedUnknownAndIdentified) {
            setLegalToast(INVESTIGATION_MIXED_UNKNOWN_IDENTIFIED_REFERRAL_BLOCKED_MESSAGE);
            setTimeout(() => setLegalToast(''), 6000);
            return;
        }
        if (investigationDefendantsPartyMix === 'mixed') {
            setLegalToast(INVESTIGATION_MIXED_JUVENILE_ADULT_REFERRAL_BLOCKED_MESSAGE);
            setTimeout(() => setLegalToast(''), 6000);
            return;
        }
        setInvestigationDecisionError('');
        setIsInvestigationDecisionOpen(true);
    };

    const openStageCloser = () => {
        if (isPrejudicialFrozen) return;
        if (isInvestigationPhase) {
            return;
        }

        const defaultStatus: StageConclusion['defendantStatusAtDecision'] = defendants.some((d) => d.status === 'موقوف' || d.status === 'ملقى القبض عليه')
            ? 'detained'
            : defendants.some((d) => d.status === 'مكفل' || d.status === 'bailed_pending_appeal')
              ? 'bailed'
              : defendants.some((d) => d.status === 'هارب')
                ? 'fugitive'
                : 'bailed';

        setStageCloserError('');
        setClosureDecisionType('');
        setClosureDate(new Date().toISOString().slice(0, 10));
        setClosureDetails('');
        setClosureDefendantStatus(defaultStatus);
        setClosureExpirationReason('');
        setClosureExpirationDefendantIds([]);
        setClosureReferralStage('');
        setClosureReferralCourtName('');
        setClosureReferralCaseNumber('');
        setClosureSuspendedExecution(false);
        setClosurePunishmentType('other');
        setClosureJuvenileSeverDefendantId('');
        setClosureScopedDefendantIds(defendants.map((d) => d.id));
        setClosureSharedObjective269b(false);
        setStageCloserReferralOnly(false);
        setIsStageCloserOpen(true);
    };

    const canConcludeStageValue = resolveCanConcludeStage({
        isDefaultJudgmentArchived,
        isArchived,
        isPrejudicialFrozen,
        finalDecision,
        isInvestigationPhase,
        hasTrialStageType: Boolean(stageTypeFromStage(stage)),
    });

    const openDefaultJudgmentOpposition =
        isDefaultJudgmentArchived && isArchived
            ? () => {
                  setStageCloserError('');
                  setClosureDecisionType('default_judgment_opposition');
                  setClosureDate(new Date().toISOString().slice(0, 10));
                  setClosureDetails('');
                  setClosureScopedDefendantIds(defendants.map((d) => d.id));
                  setIsStageCloserOpen(true);
              }
            : null;

    const isTemporaryClosingFollowUpStage =
        canConcludeStageValue && isTemporaryClosingFollowUp(finalDecision);

    const hasStageFinalVerdictCard = useMemo(
        () =>
            (Array.isArray(criminalCase.verdictCards) ? criminalCase.verdictCards : []).some((c) =>
                Boolean(c.finalDecisionKind),
            ),
        [criminalCase.verdictCards],
    );

    const showInvestigationFinalDecisionAction =
        isInvestigationPhase &&
        shouldOpenInvestigationDecisionModal({ isInvestigationPhase, finalDecision }) &&
        !isTimelineArchiveReadOnly &&
        !isDashboardReadOnly &&
        !isPrejudicialFrozen &&
        !isInvestigationDossierSealed;

    const finalDecisionActionLabel = openDefaultJudgmentOpposition
        ? 'طعن واعتراض غيابي'
        : isTemporaryClosingFollowUpStage
          ? 'متابعة بعد الغلق'
          : showInvestigationFinalDecisionAction
            ? 'الإحالة'
            : 'إصدار القرار الختامي';

    const showTrialFinalDecisionInHeader =
        useStageFinalDecisionSystem &&
        !isInvestigationPhase &&
        !isTimelineArchiveReadOnly &&
        !isDashboardReadOnly &&
        !isPrejudicialFrozen &&
        (Boolean(openDefaultJudgmentOpposition) ||
            isTemporaryClosingFollowUpStage ||
            canConcludeStageValue ||
            !hasStageFinalVerdictCard);

    const showFinalDecisionAction = showInvestigationFinalDecisionAction || showTrialFinalDecisionInHeader;

    /** إحالة التحقيق — في شريط مسار الإضبارة (يمين)، لا في ترويسة البطاقة. */
    const showInvestigationReferralInJourney =
        showInvestigationFinalDecisionAction &&
        !isTemporaryClosingFollowUpStage &&
        !openDefaultJudgmentOpposition;

    const trialFinalDecisionViaSessionOnly =
        showTrialsTab &&
        useStageFinalDecisionSystem &&
        !openDefaultJudgmentOpposition &&
        !isTemporaryClosingFollowUpStage;

    const showFinalDecisionInCriminalHeader =
        !isTimelineArchiveReadOnly &&
        !isDashboardReadOnly &&
        (Boolean(openDefaultJudgmentOpposition) ||
            isTemporaryClosingFollowUpStage ||
            (showTrialFinalDecisionInHeader && !trialFinalDecisionViaSessionOnly));

    const openTrialReferralOrders = () => {
        if (!showJourneyReferralButton) return;
        if (isPrejudicialFrozen || isTimelineArchiveReadOnly || isDashboardReadOnly) return;

        const defaultStatus: StageConclusion['defendantStatusAtDecision'] = defendants.some(
            (d) => d.status === 'موقوف' || d.status === 'ملقى القبض عليه',
        )
            ? 'detained'
            : defendants.some((d) => d.status === 'مكفل' || d.status === 'bailed_pending_appeal')
              ? 'bailed'
              : defendants.some((d) => d.status === 'هارب')
                ? 'fugitive'
                : 'bailed';

        setStageCloserError('');
        setClosureDecisionType('');
        setClosureDate(new Date().toISOString().slice(0, 10));
        setClosureDetails('');
        setClosureDefendantStatus(defaultStatus);
        setClosureExpirationReason('');
        setClosureExpirationDefendantIds([]);
        setClosureReferralStage('');
        setClosureReferralCourtName('');
        setClosureReferralCaseNumber('');
        setClosureSuspendedExecution(false);
        setClosurePunishmentType('other');
        setClosureJuvenileSeverDefendantId('');
        setClosureScopedDefendantIds(defendants.map((d) => d.id));
        setClosureSharedObjective269b(false);
        setStageCloserReferralOnly(true);
        setIsStageCloserOpen(true);
    };

    const openFinalDecisionEntry = openDefaultJudgmentOpposition
        ? openDefaultJudgmentOpposition
        : isInvestigationPhase && isTemporaryClosingFollowUpStage
          ? openJudicialDecisionModal
          : isInvestigationPhase
            ? openInvestigationDecisionModal
            : useStageFinalDecisionSystem && !isTemporaryClosingFollowUpStage
              ? openStageFinalDecisionModal
              : openStageCloser;

    const openStageFinalDecisionFromTrialSession = useCallback(
        (sessionId: string) => {
            if (isPrejudicialFrozen) return;
            trialFinalDecisionSessionIdRef.current = sessionId;
            ensureCaseSovereignContext(id);
            setStageFinalDecisionError('');
            setIsStageFinalDecisionOpen(true);
        },
        [ensureCaseSovereignContext, id, isPrejudicialFrozen],
    );

    const submitStageFinalDecision = (
        payload: StageFinalDecisionFormPayload,
        meta: { defendantStatusAtDecision: StageConclusion['defendantStatusAtDecision'] },
    ) => {
        setStageFinalDecisionError('');
        const err = registerStageFinalDecision(id, payload, meta);
        if (err) {
            setStageFinalDecisionError(err);
            return;
        }
        const linkedSessionId = trialFinalDecisionSessionIdRef.current;
        if (linkedSessionId) {
            const syncErr = syncTrialSessionVerdictFromStageFinal(id, linkedSessionId, {
                kind: payload.kind,
                issuedAt: payload.issuedAt,
                presenceType: payload.presenceType,
            });
            if (syncErr) {
                setStageFinalDecisionError(syncErr);
                return;
            }
            trialFinalDecisionSessionIdRef.current = null;
            setTrialSessionAddModalOpen(false);
        }
        setIsStageFinalDecisionOpen(false);
        setLegalToast('✓ تم حفظ القرار الختامي وتوليد بطاقة الحكم.');
        setTimeout(() => setLegalToast(''), 4500);
    };

    const submitPrivateRightWaiverDecision = (date: string) => {
        if (isPrivateRightWaived) {
            setStageCloserError('تم تسجيل التنازل عن الحق الشخصي مسبقاً.');
            setInvestigationDecisionError('تم تسجيل التنازل عن الحق الشخصي مسبقاً.');
            return false;
        }
        try {
            waivePrivateRight(id, date);
        } catch {
            showLegalError();
            return false;
        }
        return true;
    };

    const submitStageCloser = () => {
        const stageType = stageTypeFromStage(stage);
        if (!stageType) return;

        setStageCloserError('');
        let decisionType = closureDecisionType;
        const date = closureDate.trim();
        const detailsRaw = closureDetails.trim();
        if (!decisionType || !date || !detailsRaw) return;

        if (isPrivateRightWaiverDecisionValue(decisionType)) {
            if (!submitPrivateRightWaiverDecision(date)) return;
            setIsStageCloserOpen(false);
            return;
        }

        if (decisionType === 'juvenile_severance_referral') {
            const defId = String(closureJuvenileSeverDefendantId ?? '').trim();
            if (!defId) return;
            severJuvenileDefendantToJuvenileCourt(id, defId, date, detailsRaw);
            setIsStageCloserOpen(false);
            return;
        }

        if (isJuvenileTrial) {
            const needsReport = [
                'juvenile_deliver_guardian',
                'juvenile_behavioral_surveillance',
                'juvenile_reform_boys',
            ].includes(decisionType);
            if (needsReport) {
                const hasMissing = juvenileDefendants.some((d) => {
                    const ws = String((d as any)?.socialInquiryReport?.workflowStatus ?? '').trim();
                    if (ws === 'submitted') return false;
                    return !(d as any)?.socialInquiryReport?.isAttached;
                });
                if (hasMissing) {
                    setStageCloserError(
                            'ℹ️ تنبيه استرشادي: يفضّل إرفاق تقرير الباحث الاجتماعي وتدوين توصياته قبل إصدار هذا التدبير (م 57). يمكنك المتابعة بالتوثيق وتعديل التفاصيل لاحقاً.',
                    );
                }
            }

        }

        const isExpiration = decisionType === 'expiration';
        const expirationReason = closureExpirationReason;
        const expirationDefendantIds = Array.isArray(closureExpirationDefendantIds)
            ? closureExpirationDefendantIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0)
            : [];
        if (isExpiration) {
            const expirationValidation = validateExpirationReasonSelection(
                expirationReason,
                closureExpirationCustomDetail,
            );
            if (expirationValidation || !expirationDefendantIds.length) {
                setStageCloserError(
                    expirationValidation || 'حدّد متهماً واحداً على الأقل مشمولاً بالانقضاء.',
                );
                return;
            }
        }
        const expirationReasonValue: StageConclusion['expirationReason'] | undefined =
            isExpiration && expirationReason ? expirationReason : undefined;
        const expirationDetailsValue =
            isExpiration && expirationReason === 'custom_manual'
                ? closureExpirationCustomDetail.trim() || closureDetails.trim()
                : closureDetails.trim();

        const isReferral = decisionType === 'referral';
        const isCaseSplit = decisionType === 'case_split_fugitive_referral';
        const referralStage = closureReferralStage;
        const referralCourtName = closureReferralCourtName.trim();
        const referralCaseNumber = closureReferralCaseNumber.trim();
        if ((isReferral || isCaseSplit) && (!referralStage || !referralCourtName || !referralCaseNumber)) return;
        if ((isReferral || isCaseSplit) && !isReferralStageValue(referralStage)) return;

        const needsRouteCourt =
            decisionType === 'misdemeanor_to_felony_jurisdiction' ||
            decisionType === 'felony_to_misdemeanor_jurisdiction';

        const referralArg =
            (isReferral || isCaseSplit) && isReferralStageValue(referralStage)
                ? {
                      stage: referralStage,
                      courtName: referralCourtName,
                      caseNumber: referralCaseNumber,
                  }
                : needsRouteCourt
                  ? {
                        stage:
                            decisionType === 'misdemeanor_to_felony_jurisdiction'
                                ? ('محكمة الجنايات' as const)
                                : ('محكمة الجنح' as const),
                        courtName: referralCourtName,
                        caseNumber: referralCaseNumber,
                    }
                  : undefined;

        const detailsBase =
            isExpiration && expirationReason === 'custom_manual'
                ? expirationDetailsValue || detailsRaw
                : detailsRaw;
        const details = closureSuspendedExecution ? `إيقاف تنفيذ: ${detailsBase}` : detailsBase;
        const punishmentType = closurePunishmentType;
        if (decisionType === 'conviction' && (punishmentType !== 'death' && punishmentType !== 'life' && punishmentType !== 'other'))
            return;

        const isClosureQuash = isCassationClosureQuashDecision(decisionType);
        const needsPersonalBeneficiaries = isClosureQuash && !closureSharedObjective269b;
        const scopeIds =
            isExpiration
                ? expirationDefendantIds
                : isClosureQuash && closureSharedObjective269b
                  ? defendants.map((d) => d.id)
                  : decisionRequiresDefendantScope(decisionType)
                    ? resolveEffectiveDefendantScopeIds(defendants, closureScopedDefendantIds)
                    : undefined;
        if (needsPersonalBeneficiaries && !(scopeIds?.length ?? 0)) {
            setStageCloserError('حدّد الطاعن/المستفيدين من النقض (أسباب شخصية — م 269/ب).');
            return;
        }
        if (
            decisionRequiresDefendantScope(decisionType) &&
            shouldShowDefendantDecisionScopePicker(defendants) &&
            !isClosureQuash &&
            !(scopeIds?.length ?? 0)
        ) {
            setStageCloserError('حدّد متهماً واحداً على الأقل مشمولاً بالقرار.');
            return;
        }

        const conclusion: StageConclusion = {
            id:
                globalThis.crypto && 'randomUUID' in globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function'
                    ? globalThis.crypto.randomUUID()
                    : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            stageType,
            decisionType,
            date,
            details,
            defendantStatusAtDecision: closureDefendantStatus,
            defendantIds: scopeIds?.length ? scopeIds : undefined,
            targetDefendantIds: scopeIds?.length ? scopeIds : undefined,
            sharedObjectiveGrounds269b: isClosureQuash ? closureSharedObjective269b : undefined,
            punishmentType: decisionType === 'conviction' ? punishmentType : undefined,
            expirationReason: expirationReasonValue,
        };

        if (decisionType === 'referral' && referralArg) {
            referAndGenerateCase(id, referralArg.stage, conclusion, {
                courtName: referralArg.courtName,
                caseNumber: referralArg.caseNumber,
            });
        } else {
            const err = issueStageDecision(id, conclusion, referralArg);
            if (err) {
                setStageCloserError(err);
                return;
            }
        }

        setStageCloserReferralOnly(false);
        setIsStageCloserOpen(false);
    };

    const statementRoleLabel = (giverType: Statement['giverType']) => {
        if (giverType === 'complainant') return 'مشتكي/مجني عليه';
        if (giverType === 'defendant') return 'مشكو منه/متهم';
        if (giverType === 'witness') return 'شاهد';
        if (giverType === 'informant') return 'مخبر';
        return '—';
    };

    const statementRoleStyle = (giverType: Statement['giverType']) => {
        if (giverType === 'complainant') return 'border-sky-500/40 bg-sky-500/15 text-sky-200';
        if (giverType === 'defendant') return 'border-red-500/40 bg-red-500/15 text-red-200';
        if (giverType === 'witness') return 'border-violet-400/50 bg-violet-500/20 text-violet-100';
        return 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-200';
    };

    const renderStatementCard = useCallback(
        (st: Statement) => {
            const roleLabel = statementRoleLabel(st.giverType);
            const roleStyle = statementRoleStyle(st.giverType);
            const isRatified = Boolean(st.isJudiciallyRatified);
            const isWitness = st.giverType === 'witness';
            const witnessDisplayName = String(st.witnessName ?? '').trim() || st.giverName.trim();
            const witnessScopeLabel = (() => {
                if (!isWitness) return '';
                const side = st.witnessPartySide;
                const ids = st.witnessPartyIds ?? [];
                const pool =
                    side === 'complainant'
                        ? complainants
                        : side === 'defendant'
                          ? defendants
                          : [];
                const names = ids
                    .map((pid) => pool.find((p) => p.id === pid)?.fullName?.trim())
                    .filter(Boolean);
                if (names.length) {
                    return side === 'complainant'
                        ? `يخص المشتكي/المجني عليه: ${names.join('، ')}`
                        : `يخص المشكو منه/المتهم: ${names.join('، ')}`;
                }
                if (st.witnessKind === 'prosecution') return 'يخص المشتكي/المجني عليه';
                if (st.witnessKind === 'defense') return 'يخص المشكو منه/المتهم';
                return '';
            })();
            return (
                <div
                    key={st.id}
                    className={
                        isRatified
                            ? 'w-full rounded-2xl border border-[#E6C673]/60 bg-[#E6C673]/5 p-4'
                            : isWitness
                              ? 'w-full rounded-2xl border border-violet-500/45 bg-violet-950/40 p-4'
                              : 'w-full rounded-2xl border border-slate-700 bg-slate-800/40 p-4'
                    }
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="text-white/70 font-bold text-xs whitespace-normal break-words">
                            {st.date}
                        </div>
                        <div
                            className={
                                isWitness
                                    ? 'text-violet-200 font-black text-base whitespace-normal break-words'
                                    : 'text-white font-black text-sm whitespace-normal break-words'
                            }
                        >
                            {isWitness ? witnessDisplayName : st.giverName}
                        </div>
                        <div className="flex items-center gap-2">
                            <div
                                className={`rounded-full border px-2.5 py-1 text-[11px] font-black whitespace-normal break-words ${roleStyle}`}
                            >
                                {roleLabel}
                            </div>
                            <JourneyStageBadge
                                stageJourney={stageJourney}
                                item={{ date: st.date, proceduralNodeId: st.proceduralNodeId }}
                            />
                            {isRatified ? (
                                <div className="rounded-full border border-[#E6C673]/60 bg-[#E6C673]/10 px-2.5 py-1 text-[11px] font-black text-[#E6C673] whitespace-normal break-words">
                                    ✓ مُصدّقة قضائياً
                                </div>
                            ) : null}
                            {!isStatementsTabReadOnly ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmAction({
                                            title: 'نقل إلى سلة المهملات',
                                            message:
                                                'سيتم إخفاء الإفادة مع إمكانية استرجاعها من سلة المهملات.',
                                            confirmText: 'نقل للسلة',
                                            onConfirm: () => {
                                                const err = moveStatementToTrash(id, st.id);
                                                if (err) {
                                                    setLegalToast(err);
                                                    setTimeout(() => setLegalToast(''), 4500);
                                                }
                                            },
                                        });
                                    }}
                                    className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-black text-red-200/80 hover:text-red-200 hover:bg-red-500/15 transition print:hidden"
                                    aria-label="حذف الإفادة"
                                >
                                    🗑️
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {isWitness && witnessScopeLabel ? (
                        <div className="mt-1 text-violet-200/85 text-[11px] font-bold whitespace-normal break-words print:text-black">
                            {witnessScopeLabel}
                        </div>
                    ) : null}

                    {isWitness && st.witnessDetails?.trim() ? (
                        <div className="mt-2 text-violet-200/90 text-xs font-bold whitespace-normal break-words print:text-black">
                            {st.witnessDetails.trim()}
                        </div>
                    ) : null}

                    <div className="mt-3 text-white/90 text-sm whitespace-normal break-words leading-relaxed print:text-black">
                        <span className="text-white/60 font-black ml-2">❝</span>
                        <StatementHighlightedContent
                            content={st.content}
                            highlights={st.contentHighlights}
                        />
                    </div>
                </div>
            );
        },
        [complainants, defendants, isStatementsTabReadOnly, id, moveStatementToTrash, setConfirmAction, setLegalToast, stageJourney],
    );

    const submitOtherEvidenceItem = useCallback(() => {
        const evidenceType = otherEvidenceTypeInput.trim();
        if (!evidenceType) {
            setLegalToast('يرجى إدخال نوع الدليل.');
            setTimeout(() => setLegalToast(''), 4500);
            return;
        }
        if (otherEvidenceLinkedInput && !otherEvidenceDateInput.trim()) {
            setLegalToast('يرجى إدخال تاريخ الإرفاق عند تفعيل الربط في الإضبارة.');
            setTimeout(() => setLegalToast(''), 4500);
            return;
        }
        const err = addOtherEvidenceItem(id, {
            id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            evidenceType,
            isLinkedToDossier: otherEvidenceLinkedInput,
            attachmentDate: otherEvidenceLinkedInput ? otherEvidenceDateInput.trim() : undefined,
            notes: otherEvidenceNotesInput.trim(),
        });
        if (err) {
            setLegalToast(err);
            setTimeout(() => setLegalToast(''), 4500);
            return;
        }
        setLegalToast('✓ تم حفظ الدليل في سجل الإثبات.');
        setTimeout(() => setLegalToast(''), 3500);
        setOtherEvidenceTypeInput('');
        setOtherEvidenceLinkedInput(false);
        setOtherEvidenceDateInput('');
        setOtherEvidenceNotesInput('');
        setIsOtherEvidenceFormOpen(false);
    }, [
        addOtherEvidenceItem,
        id,
        otherEvidenceDateInput,
        otherEvidenceLinkedInput,
        otherEvidenceNotesInput,
        otherEvidenceTypeInput,
    ]);

    const renderOtherEvidenceCard = useCallback(
        (item: OtherEvidenceItem) => {
            const notes = String(item.notes ?? '').trim();
            return (
            <div
                key={item.id}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.18)] ring-1 ring-white/[0.06]"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <div className="text-white/90 font-black text-base whitespace-normal break-words">
                        {item.evidenceType}
                    </div>
                    <JourneyStageBadge
                        stageJourney={stageJourney}
                        item={{
                            attachmentDate: item.attachmentDate ?? item.createdAt,
                            proceduralNodeId: item.proceduralNodeId,
                        }}
                    />
                    <div
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-black whitespace-normal break-words ${
                            item.isLinkedToDossier
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                                : 'border-slate-600/60 bg-slate-700/40 text-white/80'
                        }`}
                    >
                        {item.isLinkedToDossier ? 'مرتبط في الإضبارة' : 'غير مرتبط في الإضبارة'}
                    </div>
                    {item.attachmentDate ? (
                        <div className="rounded-full border border-[#E6C673]/45 bg-[#E6C673]/10 px-2.5 py-1 text-[11px] font-black text-[#E6C673]">
                            إرفاق: {item.attachmentDate}
                        </div>
                    ) : item.createdAt ? (
                        <div className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-black text-white/70">
                            {item.createdAt}
                        </div>
                    ) : null}
                    {!isOtherEvidenceReadOnly ? (
                        <button
                            type="button"
                            onClick={() => {
                                setConfirmAction({
                                    title: 'نقل إلى سلة المهملات',
                                    message:
                                        'سيتم إخفاء الدليل مع إمكانية استرجاعه من سلة المهملات.',
                                    confirmText: 'نقل للسلة',
                                    onConfirm: () => {
                                        const delErr = moveOtherEvidenceToTrash(id, item.id);
                                        if (delErr) {
                                            setLegalToast(delErr);
                                            setTimeout(() => setLegalToast(''), 4500);
                                            return;
                                        }
                                        setLegalToast('✓ تم نقل الدليل إلى سلة المهملات.');
                                        setTimeout(() => setLegalToast(''), 3500);
                                    },
                                });
                            }}
                            className="mr-auto rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-[11px] font-black text-red-200/80 hover:text-red-200 hover:bg-red-500/15 transition print:hidden"
                            aria-label="نقل الدليل إلى سلة المهملات"
                        >
                            🗑️
                        </button>
                    ) : null}
                </div>
                {notes ? (
                    <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-white/80 text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {notes}
                    </div>
                ) : null}
            </div>
            );
        },
        [id, isOtherEvidenceReadOnly, moveOtherEvidenceToTrash, setConfirmAction, setLegalToast, stageJourney],
    );

    const closeConfirmAction = () => setConfirmAction(null);
    const runConfirmAction = () => {
        const action = confirmAction;
        if (!action) return;
        setConfirmAction(null);
        action.onConfirm();
    };

    const openReopenCase = () => {
        setReopenCaseReason('');
        setIsReopenCaseOpen(true);
    };

    const submitReopenCase = () => {
        const reason = reopenCaseReason.trim();
        if (!reason) return;
        reopenClosedCase(id, reason);
        setIsReopenCaseOpen(false);
    };

    const verdictDate =
        String((criminalCase as any).verdictDate ?? '').trim() ||
        (() => {
            const relevant = (Array.isArray(criminalCase.timelineEvents) ? criminalCase.timelineEvents : []).filter((e: any) =>
                /نطق بالقرار|قرار حكم/.test(String(e?.category ?? '').trim()),
            );
            if (!relevant.length) return '';
            relevant.sort((a: any, b: any) => (Date.parse(String(b?.date ?? '')) || 0) - (Date.parse(String(a?.date ?? '')) || 0));
            return String(relevant[0]?.date ?? '').trim();
        })();

    const mandatoryCassationAutoSend = Boolean(
        finalDecision?.decisionType === 'conviction' &&
            ((finalDecision as any).punishmentType === 'death' || (finalDecision as any).punishmentType === 'life'),
    );

    const effectiveVerdictDate =
        verdictDate || (finalDecision?.decisionType === 'conviction' ? String(finalDecision?.date ?? '').trim() : '');

    const cassationDeadlineDaysLeft = useMemo(() => {
        if (!effectiveVerdictDate) return null;
        const window = computeOrdinaryCassationWindow(
            effectiveVerdictDate,
            mandatoryCassationAutoSend ? new Date() : new Date(),
        );
        if (mandatoryCassationAutoSend) {
            const base = Date.parse(effectiveVerdictDate);
            if (!Number.isFinite(base) || base <= 0) return null;
            const deadline = base + 10 * 24 * 60 * 60 * 1000;
            return Math.max(0, Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000)));
        }
        return window.isExpired ? 0 : window.remainingDays;
    }, [effectiveVerdictDate, mandatoryCassationAutoSend]);

    const availableCassationFilingTypes = useMemo(
        () => availableCassationTypesForStage(stage, caseStage),
        [stage, caseStage],
    );

    const showCassationCountdownBanner =
        (stage === 'محكمة الجنح' || stage === 'محكمة الجنايات') &&
        Boolean(effectiveVerdictDate) &&
        !isSentToCassation &&
        !isArchived &&
        cassationDeadlineDaysLeft !== null;

    const inAbsentiaBanners = useMemo(() => {
        const list = Array.isArray(defendants) ? defendants : [];
        const today = new Date();
        const todayMs = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
        const parseYmdUtc = (ymd: string): number | null => {
            const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd ?? '').trim());
            if (!m) return null;
            return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        };
        return list
            .map((d) => {
                const det = (d as any).inAbsentiaDetails as
                    | { verdictDate?: string; objectionDeadline?: string; isObjectionFiled?: boolean; notifiedDate?: string; notificationMethod?: string }
                    | undefined;
                if (!det || det.isObjectionFiled) return null;
                const notifiedDate = String(det.notifiedDate ?? '').trim();
                const deadline = String(det.objectionDeadline ?? '').trim();
                const deadlineMs = parseYmdUtc(deadline);
                const daysLeft =
                    typeof deadlineMs === 'number' ? Math.ceil((deadlineMs - todayMs) / (24 * 60 * 60 * 1000)) : null;
                const isExpired = typeof daysLeft === 'number' ? daysLeft < 0 : false;
                const needsNotification = !notifiedDate || !deadline;
                return {
                    id: d.id,
                    name: String(d.fullName ?? '').trim() || '—',
                    objectionDeadline: deadline,
                    daysLeft,
                    isExpired,
                    needsNotification,
                };
            })
            .filter(Boolean) as {
            id: string;
            name: string;
            objectionDeadline: string;
            daysLeft: number | null;
            isExpired: boolean;
            needsNotification: boolean;
        }[];
    }, [defendants]);

    const openSendToCassation = () => {
        setCassationNumber('');
        setCassationSentDate(new Date().toISOString().slice(0, 10));
        setCassationPanelName('');
        setCassationFilingDetails('');
        const defaultType: CassationType =
            caseStage === 'investigation'
                ? 'investigation_judge_appeal'
                : caseStage === 'felony'
                  ? 'federal_cassation_felony'
                  : 'criminal_cassation_misdemeanor';
        const allowed = availableCassationTypesForStage(stage, caseStage);
        setCassationType(allowed.includes(defaultType) ? defaultType : allowed[0] ?? defaultType);
        setCassationInterventionBasis('prosecutor_general_review');
        setCassationAppellantIds(defendants.map((d) => d.id));
        setIsSendToCassationOpen(true);
    };

    const sendToCassationOnVerdictCard =
        showCassationCountdownBanner && !isDecisionsTabMaterialReadOnly
            ? {
                  label: mandatoryCassationAutoSend
                      ? '⚖️ توثيق إرسال الإضبارة للتمييز (10 أيام)'
                      : '⚖️ تسجيل إرسال الإضبارة للتمييز',
                  urgent: mandatoryCassationAutoSend,
                  onClick: openSendToCassation,
              }
            : undefined;

    const submitSendToCassation = () => {
        const cn = cassationNumber.trim();
        const sd = cassationSentDate.trim() || new Date().toISOString().slice(0, 10);
        const pn = cassationPanelName.trim();
        if (!cn) return;
        if (cassationType !== 'prosecution_intervention_264b' && !pn) return;
        const appellants = cassationAppellantIds.length ? cassationAppellantIds : defendants.map((d) => d.id);
        initiateCassationProceeding(id, {
            cassationType,
            filedAt: sd,
            details: cassationFilingDetails.trim() || 'تقديم طعن/تدخل تمييزي',
            cassationNumber: cn,
            panelName: pn || undefined,
            sentDate: sd,
            interventionBasis:
                cassationType === 'prosecution_intervention_264b' ? cassationInterventionBasis : undefined,
            appellantDefendantIds: appellants,
        });
        setIsSendToCassationOpen(false);
    };

    const mergedCaseIds = useMemo(() => resolveMergedCaseIds(criminalCase), [criminalCase]);

    const mergedCaseDisplayLinks = useMemo(
        () => buildMergedCaseHeaderBadges(criminalCase, displayCasesById),
        [criminalCase, displayCasesById],
    );

    const mergedChildIds = useMemo(() => new Set(mergedCaseIds), [mergedCaseIds]);

    const canShowMergeMenuItem = !isEffectivelyArchived && !isDashboardReadOnly;
    const isMergeMenuItemDisabled = false;

    const hasMergedChildDossiers = mergedChildIds.size > 0;

    const openMergeCases = () => {
        setMergeTargetCaseId('');
        setMergeReason('');
        setIsMergeCasesOpen(true);
    };

    const submitMergeCases = () => {
        const targetId = mergeTargetCaseId.trim();
        const reason = mergeReason.trim();
        if (!targetId || !reason) {
            setLegalToast('تعذّر تنفيذ الضم: اختر الإضبارة المُستهدفة واكتب السبب القانوني.');
            setTimeout(() => setLegalToast(''), 5500);
            return;
        }
        try {
            mergeCases(id, targetId, reason);
        } catch (err) {
            const isValidation = err instanceof MergeValidationError;
            const msg = err instanceof Error && err.message ? err.message : '';
            setLegalToast(msg || 'تعذّر تنفيذ الضم.');
            setTimeout(() => setLegalToast(''), isValidation ? 7000 : 5500);
            return;
        }
        setIsMergeCasesOpen(false);
        setMergeTargetCaseId('');
        setMergeReason('');
        // الواجهة الحالية هي الإضبارة الأم بالفِعل — تَحديث الـ store يَتسبَّب بإعادة render تلقائياً
        // فيُعرض الترحيل الجديد (التايم لاين / القرارات / الإفادات / الطلبات) بدون تَدخّل إضافي.
    };

    return (
        <div className="fixed inset-0 z-[220] flex flex-col overflow-hidden bg-slate-900 print:bg-white">
            {legalToast ? (
                <div className="fixed top-4 left-4 right-4 z-[260] flex items-center justify-center print:hidden pointer-events-none">
                    <div
                        className={`max-w-3xl w-full rounded-2xl border px-4 py-3 font-black text-sm text-center whitespace-normal break-words shadow-lg ${
                            legalToast.startsWith('✓')
                                ? 'border-emerald-500/45 bg-emerald-900/35 text-emerald-100'
                                : 'border-red-500/40 bg-red-900/25 text-red-200'
                        }`}
                    >
                        {legalToast}
                    </div>
                </div>
            ) : null}
            <div
                dir="rtl"
                className="flex flex-1 min-h-0 flex-col w-full bg-slate-900 text-white overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] print:overflow-visible print:min-h-screen print:bg-white print:text-black"
            >
                {shouldShowMandatoryCassationBanner ? (
                    <div className="w-full border-b-2 border-red-300 bg-red-600 text-white print:hidden">
                        <div className="max-w-6xl mx-auto w-full px-4 py-3 font-black text-sm text-center whitespace-normal break-words">
                            تنبيه: يُستحسن توثيق إرسال الإضبارة إلى محكمة التمييز خلال المهلة القانونية (10 أيام).
                        </div>
                    </div>
                ) : null}
                {shouldShowArticle3DeadlineBanner ? (
                    <div className="w-full border-b border-amber-500/40 bg-amber-500/15 text-amber-100 print:hidden">
                        <div className="max-w-6xl mx-auto w-full px-4 py-3 font-black text-sm text-center whitespace-normal break-words">
                            تنبيه (المادة 3/6 أصول): مضى أكثر من 90 يوماً على تاريخ العلم بالواقعة
                            {typeof article3ElapsedDays === 'number' ? ` (${article3ElapsedDays} يوم)` : ''}.
                        </div>
                    </div>
                ) : null}
                {pendingSeveranceContext?.parentCaseId === id && !isInlineSeveranceFormOpen ? (
                    <PendingSeveranceResumeBar
                        parentCaseId={id}
                        onResume={openInlineSeveranceForm}
                    />
                ) : null}
                {isPrejudicialFrozen ? (
                    <div className="w-full border-b-2 border-red-500/50 bg-red-950/40 text-red-100 print:hidden">
                        <div className="max-w-6xl mx-auto w-full px-4 py-3 font-black text-sm text-center whitespace-normal break-words">
                            ⏳ الدعوى مستأخرة جزائياً بقرار قضائي لحين الفصل بالدعوى المرتبطة
                        </div>
                    </div>
                ) : null}
                {isInterventionReview ? (
                    <div className="w-full border-b-2 border-yellow-400/60 bg-yellow-400/15 text-yellow-100 print:hidden">
                        <div className="max-w-6xl mx-auto w-full px-4 py-3 font-black text-sm text-center whitespace-normal break-words">
                            تدخل تمييزي (م 264/ب): الإضبارة قيد مراجعة التدخل؛ تعليق الإجراءات المادية لحين سحب أصل الأوراق.
                        </div>
                    </div>
                ) : null}
                {isCassationFilterReadOnly ? (
                    <div className="w-full border-b border-violet-500/35 bg-violet-500/10 print:hidden">
                        <div className="max-w-6xl mx-auto w-full px-4 py-2 text-violet-100 font-black text-xs text-center whitespace-normal break-words">
                            فلتر لوائح التمييز — «{selectedJourneyNode?.label ?? '—'}» (قراءة فقط)
                        </div>
                    </div>
                ) : null}
                <CriminalDashboardHeader
                    key={id}
                    headerTitle={headerTitle}
                    stage={stage}
                    activeLegalArticle={activeLegalArticle}
                    isMutualComplaint={isMutualComplaint}
                    isFrozen={isFrozen}
                    hasPendingBail={hasPendingBail}
                    canConfirmPendingBail={hasPendingBail}
                    onConfirmPendingBail={() => confirmBailAfterAppeal(id, pendingBailDefendantIds)}
                    showReopenClosedCase={
                        isInvestigationStoredStage(stage) &&
                        Boolean(finalDecision) &&
                        finalDecision?.decisionType !== 'referral' &&
                        !isArchived
                    }
                    onOpenReopenClosedCase={openReopenCase}
                    canManageDossier={canManageDossier}
                    showMergeCases={canShowMergeMenuItem}
                    mergeCasesDisabled={isMergeMenuItemDisabled}
                    onOpenMergeCases={openMergeCases}
                    mergedCaseDisplayLinks={mergedCaseDisplayLinks}
                    isUnifiedParentDossier={mergedCaseIds.length > 0}
                    onOpenMergedChildCase={onOpenCase}
                    canEditIdentity={canEditIdentity}
                    showEditHeaderInfo={showEditVenueIdentity && !isTimelineArchiveReadOnly}
                    onEditHeaderInfo={() => {
                        setIdentityEditError('');
                        setIdentityEdit({ mode: 'venue' });
                    }}
                    showSeverance={
                        canManageDossier &&
                        !isEffectivelyArchived &&
                        !isInvestigationDossierSealed &&
                        allowSeveranceOrDossierStrike &&
                        allowDefendantSeverance
                    }
                    onOpenSeverance={() => {
                        setSeveranceError('');
                        setIsSeveranceOpen(true);
                    }}
                    finalDecision={finalDecision}
                    physicalLocation={physicalLocation}
                    physicalLocationCustomName={physicalLocationCustomName}
                    onUpdatePhysicalLocation={(loc, custom) => {
                        try {
                            updateCasePhysicalLocation(id, loc, custom);
                        } catch (e) {
                            showLegalError();
                        }
                    }}
                    showFinalDecisionAction={showFinalDecisionInCriminalHeader}
                    finalDecisionLabel={finalDecisionActionLabel}
                    finalDecisionTitle={
                        openDefaultJudgmentOpposition
                            ? 'تقديم طعن واعتراض معارضة غيابية يكسر الأرشفة ويفتح محاكمة وجاهية'
                            : isTemporaryClosingFollowUpStage
                              ? 'متابعة بعد الغلق المؤقت — قرارات القاضي (غلق، صلح، أو إحالة)'
                              : showInvestigationFinalDecisionAction
                                ? 'إحالة الإضبارة إلى محكمة الموضوع (جنح أو جنايات)'
                                : 'إحالة، غلق، انقضاء، أو حكم — ينقل الإضبارة بين المراحل الإجرائية'
                    }
                    onOpenFinalDecision={openFinalDecisionEntry}
                    investigationDossierSealLabel={investigationDossierSealLabel}
                    investigationDossierIsFinalClosure={investigationDossierClosure?.kind === 'final'}
                    onOpenTrash={() => setIsTrashModalOpen(true)}
                    trashCount={trashCount}
                    showEndTemporaryClosureAction={isInvestigationPhase && showEndTemporaryClosureAction}
                    onEndTemporaryClosure={() => {
                        const err = endInvestigationTemporaryClosure(id);
                        if (err) {
                            setLegalToast(err);
                            setTimeout(() => setLegalToast(''), 5000);
                            return;
                        }
                        setLegalToast('✓ تم إعادة الشكوى وإنهاء الغلق المؤقت — الإضبارة نشطة مجدداً.');
                        setTimeout(() => setLegalToast(''), 5000);
                    }}
                />
                <CaseJourneyHeader
                    journey={stageJourney}
                    defendants={defendants}
                    selectedNodeId={selectedNodeFilter}
                    selectedPartyId={selectedPartyFilterId}
                    selectedBranchId={selectedJourneyBranchId}
                    onSelectNode={setSelectedNodeFilter}
                    onSelectParty={setSelectedPartyFilterId}
                    onSelectBranch={setSelectedJourneyBranchId}
                    showReferralButton={showInvestigationReferralInJourney || showJourneyReferralButton}
                    onOpenReferral={() => {
                        if (showInvestigationReferralInJourney) {
                            openInvestigationDecisionModal();
                            return;
                        }
                        openTrialReferralOrders();
                    }}
                    referralButtonLabel={showInvestigationReferralInJourney ? 'الإحالة' : 'إحالة'}
                    referralButtonTitle={
                        showInvestigationReferralInJourney
                            ? 'إحالة الإضبارة إلى محكمة الموضوع (جنح أو جنايات)'
                            : 'إحالة أو تبديل اختصاص'
                    }
                    referralButtonDisabled={
                        isTimelineArchiveReadOnly || isDashboardReadOnly || isPrejudicialFrozen
                    }
                />

                {isDashboardReadOnly && mergedIntoCaseId ? (
                    <div className="w-full border-b-2 border-amber-500/50 bg-amber-950/40 print:hidden">
                        <div className="max-w-5xl mx-auto w-full px-4 py-4 text-center">
                            <p className="text-amber-100 font-black text-sm md:text-base whitespace-normal break-words leading-relaxed">
                                ⚠️ هذه الإضبارة مغلقة إدارياً لصدور قرار قضائي بضمها إلى الإضبارة{' '}
                                <span className="text-white">{mergedIntoCaseNumber || '—'}</span>. لمتابعة الإجراءات
                                والتايم لاين الحالي، اضغط هنا:{' '}
                                <button
                                    type="button"
                                    onClick={() => onOpenCase?.(mergedIntoCaseId)}
                                    className="inline text-[#E6C673] font-black underline underline-offset-2 hover:brightness-110 transition"
                                >
                                    الانتقال للإضبارة الأم
                                </button>
                            </p>
                        </div>
                    </div>
                ) : null}

                <div
                    className={
                        isDashboardReadOnly
                            ? 'select-none opacity-55 print:opacity-100'
                            : ''
                    }
                >
                {isSentToCassation && cassationCaseDetails ? (
                    <div className="w-full border-b border-slate-700 bg-blue-500/10 p-4">
                        <div className="max-w-5xl mx-auto w-full">
                            <div className="rounded-2xl border border-blue-500/30 bg-blue-950/30 p-4 text-blue-100 font-black text-sm whitespace-normal break-words text-center">
                                ✈️ الأوراق أرسلت إلى محكمة التمييز بموجب الكتاب المرقم{' '}
                                {String(cassationCaseDetails.cassationNumber ?? '').trim() || '—'} بتاريخ{' '}
                                {String(cassationCaseDetails.sentDate ?? '').trim() || '—'} — الإضبارة المحلية معلقة بانتظار التدقيق
                                التمييزي
                            </div>
                        </div>
                    </div>
                ) : null}

                {inAbsentiaBanners.length ? (
                    <div className="w-full border-b border-slate-700 p-4">
                        <div className="max-w-5xl mx-auto w-full flex flex-col md:flex-row items-center justify-between gap-3">
                            <div
                                className={
                                    inAbsentiaBanners[0]?.isExpired
                                        ? 'rounded-2xl border border-red-500/40 bg-red-900/20 px-4 py-2 text-red-200 font-black text-sm whitespace-normal break-words'
                                        : 'rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-amber-200 font-black text-sm whitespace-normal break-words'
                                }
                            >
                                {inAbsentiaBanners[0]?.needsNotification
                                    ? `⏳ حكم غيابي بحق المتهم (${inAbsentiaBanners[0]?.name}) — بانتظار تسجيل التبليغ الرسمي لبدء احتساب ميعاد الاعتراض (م 243).`
                                    : inAbsentiaBanners[0]?.isExpired
                                      ? 'ℹ️ تنبيه استرشادي: تجاوز ميعاد الاعتراض؛ قد يُرد شكلاً (مع إمكانية الدفع ببطلان التبليغ/عذر مشروع).'
                                      : `⚠️ صدر حكم غيابي بحق المتهم (${inAbsentiaBanners[0]?.name}) — متبقي ${
                                            inAbsentiaBanners[0]?.daysLeft ?? '—'
                                        } يوم للاعتراض حتى ${inAbsentiaBanners[0]?.objectionDeadline || '—'}.`}
                            </div>
                            {isDefense ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        try {
                                            fileInAbsentiaObjection(id, inAbsentiaBanners[0]!.id);
                                        } catch {
                                            showLegalError();
                                        }
                                    }}
                                    className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black px-4 py-2 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                                >
                                    📝 تقديم لائحة الاعتراض وتسليم المتهم
                                </button>
                            ) : null}
                        </div>
                    </div>
                ) : null}

                <CriminalPartiesGrid
                    caseId={id}
                    complainants={complainants}
                    defendants={visibleDefendants}
                    crimeType={crimeType}
                    stage={stage}
                    isMutualComplaint={isMutualComplaint}
                    isUnknownPerpetrator={hasUnrevealedUnknown}
                    isFrozen={isFrozen || isDashboardReadOnly}
                    isPrivateRightWaived={isPrivateRightWaived}
                    waiverDate={waiverDate}
                    showDetentionIndicators={isDefense}
                    isConfidential={false}
                    ourRepresentation={ourRepresentation}
                    lockPartyMenus={
                        isStageCloserOpen ||
                        isStatementModalOpen ||
                        isTrialDepositionModalOpen ||
                        isRequestsModalOpen ||
                        Boolean(confirmAction)
                    }
                    canEditPartyNames={canEditIdentity}
                    onEditPartyName={(kind, partyId, snapshot) => {
                        setIdentityEditError('');
                        setIdentityEdit({
                            mode: 'party',
                            kind,
                            id: partyId,
                            fullName: snapshot.fullName,
                            phone: snapshot.phone,
                            address: snapshot.address,
                        });
                    }}
                />

                {defendants.some((d: any) => isGuarantorForfeited(d?.guarantorDetails)) ? (
                    <div className="max-w-5xl mx-auto w-full px-6 pb-2 print:hidden">
                        <div className="space-y-3">
                            {defendants
                                .filter((d: any) => isGuarantorForfeited(d?.guarantorDetails))
                                .map((d: any) => {
                                    const g = normalizeGuarantorDetails(d?.guarantorDetails);
                                    const notes = String(g?.guarantorInfo ?? '').trim();
                                    return (
                                        <div key={String(d.id)} className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="text-white font-black text-sm whitespace-normal break-words">
                                                    مصادرة الكفالة — المتهم: {String(d.fullName ?? '').trim() || '—'}
                                                </div>
                                                <div className="rounded-full border border-red-500/40 bg-red-500/15 px-3 py-1 text-[11px] font-black text-red-200 whitespace-normal break-words">
                                                    ⛔ مصادرة
                                                </div>
                                            </div>
                                            {notes ? (
                                                <div className="mt-3 rounded-xl border border-slate-700 bg-slate-800/30 p-3">
                                                    <div className="text-white/60 text-xs font-black mb-1 whitespace-normal break-words">
                                                        ملاحظات المتابعة
                                                    </div>
                                                    <div className="text-white font-black text-sm whitespace-normal break-words">
                                                        {notes}
                                                    </div>
                                                </div>
                                            ) : null}
                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openForfeitureUpdate(String(d.id))}
                                                    className="rounded-full border border-slate-600/60 bg-slate-800/50 px-3 py-1 text-[11px] font-black text-white/80 hover:text-white hover:bg-slate-800 transition whitespace-normal break-words"
                                                >
                                                    تحديث بيانات المصادرة
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                ) : null}

            <div className="max-w-5xl mx-auto w-full px-6 pb-1 print:hidden">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                        type="button"
                        onClick={() => switchDashboardTab('requests')}
                        className={criminalDashboardTabClass('requests', activeTab === 'requests')}
                    >
                        القرارات
                    </button>
                    <button
                        type="button"
                        onClick={() => switchDashboardTab('statements')}
                        className={criminalDashboardTabClass('statements', activeTab === 'statements')}
                    >
                        سجل الإفادات
                    </button>
                    <button
                        type="button"
                        onClick={() => switchDashboardTab('tracking')}
                        className={criminalDashboardTabClass('tracking', activeTab === 'tracking')}
                    >
                        مسارات التتبع
                    </button>
                    <button
                        type="button"
                        onClick={() => switchDashboardTab('legal_codes')}
                        className={criminalDashboardTabClass('legal_codes', activeTab === 'legal_codes')}
                    >
                        متون القوانين
                    </button>
                </div>
            </div>
            {onClose ? (
                <button
                    type="button"
                    onClick={handleDashboardBack}
                    title="رجوع"
                    aria-label="رجوع"
                    className="fixed bottom-2 right-2 z-[240] inline-flex items-center justify-center h-10 w-10 rounded-full border border-white/15 bg-white/[0.05] text-gray-300 hover:text-white hover:bg-white/[0.14] hover:border-white/30 transition print:hidden"
                >
                    <ArrowRight className="h-4.5 w-4.5" aria-hidden />
                </button>
            ) : null}

            {activeTab === 'statements' ? (
                <div
                    key="criminal-tab-statements"
                    className="flex flex-col p-6 max-w-5xl mx-auto w-full gap-6 print:text-black"
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-white/80 font-black text-sm whitespace-normal break-words">سجل الإفادات</div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsOtherEvidenceFormOpen((v) => !v)}
                                disabled={isOtherEvidenceReadOnly}
                                className="rounded-lg border border-white/15 bg-white/10 text-white px-4 py-2 text-sm font-black hover:bg-white/15 transition whitespace-normal break-words print:hidden disabled:opacity-40 disabled:pointer-events-none"
                            >
                                أدلة الإثبات الأخرى
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (isEffectiveTrialCourtStage) {
                                        setEditingTrialDeposition(null);
                                        setIsTrialDepositionModalOpen(true);
                                        return;
                                    }
                                    setEditingStatement(null);
                                    setIsStatementModalOpen(true);
                                }}
                                disabled={isStatementsTabReadOnly}
                                className="rounded-lg bg-[#E6C673] text-[#0B1021] px-4 py-2 text-sm font-black hover:brightness-110 active:brightness-95 transition whitespace-normal break-words print:hidden disabled:opacity-40 disabled:pointer-events-none"
                            >
                                + إضافة إلى سجل الإفادات
                            </button>
                        </div>
                    </div>
                    {isOtherEvidenceFormOpen ? (
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3 backdrop-blur-sm">
                            <div>
                                <label className="block text-white/70 text-xs mb-1">نوع الدليل</label>
                                <input
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={otherEvidenceTypeInput}
                                    onChange={(e) => setOtherEvidenceTypeInput(e.target.value)}
                                    placeholder="مثال: تقرير طبي / مخطط كشف / كاميرات مراقبة"
                                />
                            </div>
                            <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                                <div className="text-white/85 text-sm font-bold">هل تم ربطه في الإضبارة؟</div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = !otherEvidenceLinkedInput;
                                        setOtherEvidenceLinkedInput(next);
                                        if (!next) setOtherEvidenceDateInput('');
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
                                        otherEvidenceLinkedInput
                                            ? 'border-emerald-500/40 bg-emerald-500/20'
                                            : 'border-slate-600/60 bg-slate-800/60'
                                    }`}
                                    aria-pressed={otherEvidenceLinkedInput}
                                >
                                    <span
                                        className={`inline-block h-5 w-5 transform rounded-full bg-white/90 transition ${
                                            otherEvidenceLinkedInput ? 'translate-x-5' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            {otherEvidenceLinkedInput ? (
                                <div>
                                    <label className="block text-white/70 text-xs mb-1">تاريخ الإرفاق</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={otherEvidenceDateInput}
                                        onChange={(e) => setOtherEvidenceDateInput(e.target.value)}
                                    />
                                </div>
                            ) : null}
                            <div>
                                <label className="block text-white/70 text-xs mb-1">ملاحظات الدليل</label>
                                <textarea
                                    className="w-full min-h-[88px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                    value={otherEvidenceNotesInput}
                                    onChange={(e) => setOtherEvidenceNotesInput(e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={submitOtherEvidenceItem}
                                    className="rounded-lg bg-[#E6C673] text-[#0B1021] px-4 py-2 text-sm font-black hover:brightness-110 transition"
                                >
                                    حفظ الدليل
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOtherEvidenceFormOpen(false);
                                        setOtherEvidenceTypeInput('');
                                        setOtherEvidenceLinkedInput(false);
                                        setOtherEvidenceDateInput('');
                                        setOtherEvidenceNotesInput('');
                                    }}
                                    className="rounded-lg border border-white/15 bg-white/10 text-white px-4 py-2 text-sm font-black hover:bg-white/15 transition"
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {sortedOtherEvidenceForNode.length > 0 ? (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="text-white/80 font-black text-sm">أدلة الإثبات الأخرى</div>
                            <div className="text-white/45 text-[11px] font-bold">
                                {sortedOtherEvidenceForNode.length} دليل
                            </div>
                        </div>
                        <div className="space-y-3">{sortedOtherEvidenceForNode.map(renderOtherEvidenceCard)}</div>
                    </div>
                    ) : null}

                    {isEffectiveTrialCourtStage ? (
                        <Suspense fallback={<div className="text-white/60 text-xs">جاري تحميل سجل الإفادات...</div>}>
                        <LazyStatementsPhaseSections
                            trialStatements={partitionedStatements.trial}
                            investigationStatements={partitionedStatements.investigation}
                            trialDepositions={sortedTrialDepositions}
                            renderTrialDeposition={(dep) => (
                                <TrialDepositionWitnessCard
                                    key={dep.id}
                                    deposition={dep}
                                    investigationStatements={partitionedStatements.investigation}
                                    trialStatements={partitionedStatements.trial}
                                    allTrialDepositions={sortedTrialDepositions}
                                    readOnly={isStatementsTabReadOnly}
                                    onUpdate={(patch) => {
                                        const err = updateTrialDeposition(id, dep.id, patch);
                                        if (err) {
                                            setLegalToast(err);
                                            setTimeout(() => setLegalToast(''), 4500);
                                        }
                                    }}
                                    onEdit={
                                        isStatementsTabReadOnly
                                            ? undefined
                                            : () => {
                                                  setEditingTrialDeposition(dep);
                                                  setIsTrialDepositionModalOpen(true);
                                              }
                                    }
                                    onDelete={
                                        isStatementsTabReadOnly
                                            ? undefined
                                            : () => {
                                                  const err = deleteTrialDeposition(id, dep.id);
                                                  if (err) {
                                                      setLegalToast(err);
                                                      setTimeout(() => setLegalToast(''), 4500);
                                                  }
                                              }
                                    }
                                />
                            )}
                            renderStatement={renderStatementCard}
                        />
                        </Suspense>
                    ) : sortedStatementsForNode.length === 0 ? null : (
                        <div className="space-y-4">{sortedStatementsForNode.map(renderStatementCard)}</div>
                    )}
                </div>
            ) : activeTab === 'legal_codes' ? (
                <Suspense fallback={<div className="p-6 text-white/60 text-xs text-center max-w-5xl mx-auto">جاري تحميل متون القوانين...</div>}>
                    <LazyLegalCodesTab showJuvenileLawTab={hasJuvenileInCase} />
                </Suspense>
            ) : activeTab === 'tracking' ? (
                <div key="criminal-tab-tracking" className="flex flex-col w-full">
                    <Suspense fallback={<div className="p-6 text-white/60 text-xs text-center">جاري تحميل مسارات التتبع...</div>}>
                        <LazyRecursiveProceduralCanvas
                            key={`criminal-tab-tracking-canvas-${id}`}
                            caseId={id}
                            readOnly={isTimelineArchiveReadOnly || isDashboardReadOnly || isInvestigationMaterialReadOnly}
                            onOpenLinkedRecord={openProceduralLinkedRecord}
                            navTarget={proceduralNavTarget}
                            onNavTargetHandled={() => setProceduralNavTarget(null)}
                        />
                    </Suspense>
                </div>
            ) : activeTab === 'requests' ? (
                <div
                    key="criminal-tab-requests"
                    className="flex flex-col px-6 pt-2 pb-6 max-w-5xl mx-auto w-full gap-2 print:text-black"
                >
                    <div className="flex flex-col items-center gap-1 print:hidden">
                        <DecisionsCommandBar
                            activeFilter={decisionsKindFilter}
                            onFilterChange={setDecisionsKindFilter}
                            showInvestigationJudicialTabs={isInvestigationPhase}
                            partyMix={investigationDefendantsPartyMix}
                            showTrialSessionsFilter={showTrialsTab}
                            trialSessionsTabLabel={trialSessionsTabLabel}
                            onOpenTrialSessionModal={() => {
                                switchDashboardTab('requests');
                                setDecisionsKindFilter('trial_sessions');
                                setTrialSessionAddModalOpen(true);
                            }}
                            onOpenAdultJudicialDecisionModal={openAdultJudicialDecisionModal}
                            onOpenJuvenileJudicialDecisionModal={openJuvenileJudicialDecisionModal}
                            onOpenLawyerMotionModal={openLawyerMotionModal}
                            readOnly={!canCreateDecisionsOrRequests}
                        />
                        <DecisionsScopeFilterBar
                            value={decisionsScopeFilter}
                            onChange={setDecisionsScopeFilter}
                            options={decisionsScopeOptions}
                        />
                    </div>

                    {showTrialsTab &&
                    decisionsKindFilter === 'trial_sessions' &&
                    effectiveDecisionsScope === 'current' ? (
                        <VerdictCardsPanel
                            cards={currentVerdictCardsForPanel}
                            defendants={defendants}
                            caseStage={effectiveUiStage === 'felony' || effectiveUiStage === 'misdemeanor' ? effectiveUiStage : caseStage}
                            currentAccusationArticle={criminalCase.currentAccusationArticle ?? criminalCase.basics.legalArticle}
                            crimeType={criminalCase.basics.crimeType}
                            readOnly={isDecisionsTabMaterialReadOnly}
                            userRole={criminalCaseUserRole}
                            sendToCassation={sendToCassationOnVerdictCard}
                            onUpdateDraft={(cardId, draft) => updateVerdictCardDraft(id, cardId, draft)}
                            onSaveOrdinaryAppeal={(cardId, patch) =>
                                patchVerdictCardOrdinaryAppeal(id, cardId, patch)
                            }
                            onSaveVerdictCassationResult={(cardId, input) => {
                                const err = recordVerdictCardCassationResult(id, cardId, input);
                                if (err) {
                                    setLegalToast(err);
                                    setTimeout(() => setLegalToast(''), 4500);
                                    return err;
                                }
                                setLegalToast('✓ تم تسجيل قرار التمييز.');
                                setTimeout(() => setLegalToast(''), 4500);
                                return null;
                            }}
                            onSaveCorrectionAppeal={(cardId, patch) =>
                                patchVerdictCardCorrectionAppeal(id, cardId, patch)
                            }
                            onRecordAbsentiaPublication={(cardId, publicationDate) => {
                                const err = recordVerdictAbsentiaPublication(id, cardId, publicationDate);
                                if (err) {
                                    setLegalToast(err);
                                    setTimeout(() => setLegalToast(''), 4500);
                                }
                            }}
                            onRecordAbsentiaObjection={(cardId) => {
                                const err = recordVerdictAbsentiaObjection(id, cardId);
                                if (err) {
                                    setLegalToast(err);
                                    setTimeout(() => setLegalToast(''), 4500);
                                    return;
                                }
                                setLegalToast('✓ تم تسجيل الاعتراض الغيابي.');
                                setTimeout(() => setLegalToast(''), 4500);
                            }}
                            onOpenCassationFiling={openVerdictCassationFiling}
                        />
                    ) : null}

                    {decisionsKindFilter === 'trial_sessions' && showTrialsTab ? (
                        <Suspense
                            fallback={
                                <div className="text-white/60 text-xs text-center py-6">
                                    جاري تحميل جلسات المرافعة...
                                </div>
                            }
                        >
                            <LazyTrialsTab
                                embedded
                                caseId={id}
                                caseStage={caseStage}
                                sessions={phaseFilteredTrialSessions}
                                remandPivotDate={remandPivotDate}
                                judicialDecisions={judicialDecisionsLedger}
                                readOnly={isTimelineArchiveReadOnly || isDashboardReadOnly || isFrozen}
                                userRole={criminalCaseUserRole}
                                addModalOpen={trialSessionAddModalOpen}
                                onAddModalOpenChange={setTrialSessionAddModalOpen}
                                onAddSession={(payload) => addTrialSession(id, payload)}
                                onUpdateSession={(sessionId, payload) =>
                                    updateTrialSession(id, sessionId, payload)
                                }
                                onDocumentPreparatoryDecision={(input) =>
                                    documentTrialSessionPreparatoryDecision(id, input)
                                }
                                onPostpone={(sessionId, nextDate, reason, prepNote) =>
                                    postponeTrialSession(id, sessionId, nextDate, reason, prepNote)
                                }
                                onOpenStageFinalDecision={openStageFinalDecisionFromTrialSession}
                                onCassationAppeal={(d) => openAppealModal(d, 'ordinary')}
                                onInterventionCassation={handleInterventionCassation}
                                onCassationCorrection={handleCassationCorrection}
                                onDeclareJudgmentFinal={handleDeclareJudgmentFinal}
                                onRecordAppealResult={(d) => {
                                    const appeal = getPendingCassationAppealForResult(d);
                                    if (appeal) setCassationResultContext({ decision: d, appeal });
                                }}
                                currentAccusationArticle={currentAccusationArticle}
                                crimeType={criminalCase.basics.crimeType}
                                onError={(msg) => {
                                    setLegalToast(msg);
                                    setTimeout(() => setLegalToast(''), 4500);
                                }}
                            />
                        </Suspense>
                    ) : decisionsKindFilter !== 'trial_sessions' ? (
                    <JudicialDecisionsLedger
                        decisions={visibleJudicialDecisions}
                        parties={allParties}
                        defendants={defendants}
                        lawyerRequests={phaseFilteredLawyerRequests}
                        stageJourney={stageJourney}
                        readOnly={isTimelineArchiveReadOnly || isDashboardReadOnly}
                        investigationDossierSealed={isInvestigationDossierSealed}
                        kindFilter={decisionsKindFilter}
                        pendingLawyerRequests={
                            decisionsKindFilter === 'lawyer_motion' ? pendingLawyerRequestsForFeed : undefined
                        }
                        onRecordJudgeMargin={openRequestQuickFinalizeModal}
                        onMoveRequestToTrash={
                            isDecisionsTabMaterialReadOnly ? undefined : handleMoveRequestToTrash
                        }
                        investigationPurgeCase={isInvestigationPhase ? criminalCase : undefined}
                        caseStage={caseStage}
                        crimeTypeLabel={crimeType}
                        userRole={criminalCaseUserRole}
                        activeCaseArticle={activeLegalArticle}
                        onFileAppeal={(d) => openAppealModal(d, 'ordinary')}
                        onRecordAppealResult={(d, a) => setCassationResultContext({ decision: d, appeal: a })}
                        onInterventionCassation={handleInterventionCassation}
                        onCassationCorrection={handleCassationCorrection}
                        onDeclareJudgmentFinal={handleDeclareJudgmentFinal}
                        onRequestOrderProceedingsBlockChange={
                            isDecisionsTabMaterialReadOnly
                                ? undefined
                                : handleRequestOrderProceedingsBlockChange
                        }
                        onAddRequestMargin={(requestId, text) => addRequestMargin(id, requestId, text)}
                        onToggleRequestStar={(requestId) => toggleRequestStar(id, requestId)}
                        proceduralRefsForRequest={getProceduralRefsForRequest}
                        onNavigateProcedural={navigateToProceduralItem}
                        onMoveToTrash={
                            isDecisionsTabMaterialReadOnly ? undefined : handleMoveDecisionToTrash
                        }
                        renderLiveDetentionCard={({
                            decision,
                            allDecisions,
                            partyLabel,
                            caseStage: cardCaseStage,
                            crimeTypeLabel: cardCrimeType,
                            onAppeal,
                            onResult,
                            onInterventionCassation,
                            onCassationCorrection,
                            onDeclareJudgmentFinal,
                            onMoveToTrash,
                        }) => (
                            <LiveDetentionCard
                                decision={decision}
                                allDecisions={allDecisions}
                                userRole={criminalCaseUserRole}
                                defendants={defendants}
                                fallbackDefendantId={primaryDefendant?.id ?? autoConcernedPartyId}
                                readOnly={isDecisionsTabMaterialReadOnly}
                                partyLabel={partyLabel}
                                caseStage={cardCaseStage}
                                crimeTypeLabel={cardCrimeType}
                                onAppeal={onAppeal}
                                onResult={onResult}
                                onInterventionCassation={onInterventionCassation}
                                onCassationCorrection={onCassationCorrection}
                                onDeclareJudgmentFinal={onDeclareJudgmentFinal}
                                onMoveToTrash={onMoveToTrash}
                                onExtendDetention={(decision, newEndDate) => {
                                    const err = extendDetentionOnDecision(id, decision.id, newEndDate);
                                    if (err) return err;
                                    setLegalToast('✓ تم تحديث تاريخ انتهاء التوقيف على نفس البطاقة.');
                                    setTimeout(() => setLegalToast(''), 5000);
                                    return null;
                                }}
                                onDocumentRelease={(decision) => {
                                    const err = documentDetentionReleaseOnDecision(id, decision.id);
                                    if (err) {
                                        setLegalToast(err);
                                        setTimeout(() => setLegalToast(''), 5000);
                                        return err;
                                    }
                                    setLegalToast('✓ تم توثيق إطلاق السراح — البطاقة مغلقة.');
                                    setTimeout(() => setLegalToast(''), 5000);
                                    return null;
                                }}
                                onQuickBailRelease={openQuickBailFromDecision}
                            />
                        )}
                        renderLiveArrestSummonCard={({ decision, partyLabel, onMoveToTrash }) => (
                            <LiveArrestSummonCard
                                decision={decision}
                                readOnly={isTimelineArchiveReadOnly || isDashboardReadOnly}
                                partyLabel={partyLabel}
                                onMoveToTrash={onMoveToTrash}
                                onUpdateEnforcement={(patch) => {
                                    const err = updateOrderEnforcementOnDecision(id, decision.id, patch);
                                    if (err) {
                                        setLegalToast(err);
                                        setTimeout(() => setLegalToast(''), 5000);
                                        return err;
                                    }
                                    setLegalToast('✓ تم تحديث متابعة تنفيذ الأمر.');
                                    setTimeout(() => setLegalToast(''), 5000);
                                    return null;
                                }}
                            />
                        )}
                    />
                    ) : null}
                    {decisionsKindFilter !== 'trial_sessions' &&
                    kindFilteredJudicialDecisions.length > visibleJudicialDecisions.length ? (
                        <div className="flex justify-center pt-1">
                            <button
                                type="button"
                                onClick={() => setVisibleJudicialDecisionsCount((v) => v + DECISIONS_PAGE_SIZE)}
                                className="rounded-lg px-4 py-2 text-xs font-bold text-[#E6C673] hover:bg-[#E6C673]/10 border border-[#E6C673]/30"
                            >
                                تحميل المزيد من القرارات
                            </button>
                        </div>
                    ) : null}
                </div>
            ) : null}

                </div>

                <JudicialCassationAppealModal
                    open={Boolean(cassationAppealModal)}
                    decision={cassationAppealModal?.decision ?? null}
                    variant={cassationAppealModal?.variant ?? 'ordinary'}
                    parties={activeParties}
                    onClose={() => setCassationAppealModal(null)}
                    onSubmit={({ appellantType, appellantIds, targetDefendantIds, appellantManualLabel }) => {
                        if (!cassationAppealModal) return null;
                        const { decision, variant } = cassationAppealModal;
                        let err: string | null = null;
                        if (variant === 'declare_final') {
                            err = declareJudicialDecisionFinal(id, decision.id, {
                                declarerType: appellantType,
                                declarerIds: appellantIds,
                                declarerManualLabel,
                            });
                        } else {
                            err = fileJudicialDecisionAppeal(id, decision.id, {
                                appellantType,
                                appellantIds,
                                targetDefendantIds,
                                appellantManualLabel,
                                appealPath: variant,
                            });
                        }
                        if (err) {
                            setLegalToast(err);
                            setTimeout(() => setLegalToast(''), 5000);
                            return err;
                        }
                        const successByVariant: Record<JudicialCassationAppealModalVariant, string> = {
                            ordinary: '✓ تم تسجيل الطعن التمييزي — بانتظار نتيجة محكمة الطعن.',
                            intervention_264b: '✓ تم تسجيل طلب التدخل التمييزي — بانتظار النتيجة.',
                            correction_266: '✓ تم تسجيل طلب تصحيح القرار — بانتظار النتيجة.',
                            declare_final: '✓ تم إعلان الحكم باتاً واختتامه في السجل.',
                        };
                        setLegalToast(successByVariant[variant]);
                        setTimeout(() => setLegalToast(''), 5000);
                        setCassationAppealModal(null);
                        return null;
                        return null;
                    }}
                />

                <JudicialCassationResultModal
                    open={Boolean(cassationResultContext)}
                    decision={cassationResultContext?.decision ?? null}
                    appeal={cassationResultContext?.appeal ?? null}
                    parties={activeParties}
                    onClose={() => setCassationResultContext(null)}
                    onSubmit={(payload) => {
                        if (!cassationResultContext) return;
                        const err = recordJudicialAppealResult(
                            id,
                            cassationResultContext.decision.id,
                            cassationResultContext.appeal.id,
                            payload,
                        );
                        if (err) {
                            setLegalToast(err);
                            setTimeout(() => setLegalToast(''), 5000);
                            return;
                        }
                        setLegalToast('✓ تم تسجيل نتيجة الطعن التمييزي — القرار محصن ولا يُعاد فتحه.');
                        setTimeout(() => setLegalToast(''), 5000);
                        setCassationResultContext(null);
                    }}
                />

                <InvestigationDecisionModal
                    open={isInvestigationDecisionOpen}
                    onClose={() => setIsInvestigationDecisionOpen(false)}
                    error={investigationDecisionError}
                    defendants={defendants}
                    crossAccusedComplainants={complainants.filter(
                        (c) => isMutualComplaint || c.isCrossComplaint === true,
                    )}
                    activeLegalArticle={activeLegalArticle}
                    publicProsecutionNumber={criminalCase.location.publicProsecutionNumber}
                    onSubmitReferral={(payload) => {
                        if (hasUnrevealedUnknown && !hasIdentifiedDefendant(defendants)) {
                            setInvestigationDecisionError(
                                'لا يمكن إحالة إضبارة بلا متهم معروف — أكّد هوية متهم واحد على الأقل عبر «كشف الهوية».',
                            );
                            return;
                        }
                        const scopedIds = resolveEffectiveDefendantScopeIds(defendants, payload.defendantIds ?? [])
                            .filter((defId) => defendants.some((d) => d.id === defId));
                        if (shouldShowDefendantDecisionScopePicker(defendants) && !scopedIds.length) {
                            setInvestigationDecisionError('حدّد متهماً واحداً على الأقل مشمولاً بالإحالة.');
                            return;
                        }
                        const allCaseDefIds = defendants.map((d) => d.id);
                        const remainingOnCase = allCaseDefIds.filter((defId) => !scopedIds.includes(defId));
                        const isPartialReferral = scopedIds.length > 0 && remainingOnCase.length > 0;
                        const referralPayload = { ...payload, defendantIds: scopedIds };

                        setInvestigationDecisionError('');
                        if (isPartialReferral) {
                            const childId = referInvestigationDefendantToTrial(id, referralPayload);
                            if (!childId) {
                                setInvestigationDecisionError(
                                    'تعذّر إتمام الإحالة — تحقق من المتهمين النشطين والمحكمة.',
                                );
                                return;
                            }
                            setIsInvestigationDecisionOpen(false);
                            setLegalToast('✓ تمت الإحالة وإنشاء إضبارة المحكمة المختصة.');
                            setTimeout(() => setLegalToast(''), 5000);
                            onOpenCase?.(childId);
                            return;
                        }

                        applyInvestigationReferral(id, referralPayload);
                        setIsInvestigationDecisionOpen(false);
                        setLegalToast('✓ تمت الإحالة إلى محكمة الموضوع.');
                        setTimeout(() => setLegalToast(''), 5000);
                    }}
                />

                <SeveranceTargetPickerModal
                    open={isSeveranceOpen}
                    onClose={() => {
                        setIsSeveranceOpen(false);
                        setSeveranceError('');
                    }}
                    defendants={defendants}
                    defendantsPartyMix={investigationDefendantsPartyMix}
                    error={severanceError}
                    onContinue={(defendantIds, judicialSeveranceDraft) => {
                        const ok = beginSeveranceFromDossier(id, defendantIds, {
                            judicialSeveranceDraft,
                        });
                        if (!ok) {
                            setSeveranceError(
                                'تعذّر بدء عملية التفريق — تحقق من المتهمين المحددين وحالة الإضبارة.',
                            );
                            return;
                        }
                        setIsSeveranceOpen(false);
                        setSeveranceError('');
                        setLegalToast(
                            '✓ تم تجهيز مسار التفريق — أكمل بيانات الإضبارة الجديدة ثم «تنفيذ التفريق وإنشاء الإضبارة».',
                        );
                        setTimeout(() => setLegalToast(''), 6000);
                        openInlineSeveranceForm();
                    }}
                />

                {caseSovereignContext ? (
                    <StageFinalDecisionModal
                        open={isStageFinalDecisionOpen}
                        onClose={() => {
                            trialFinalDecisionSessionIdRef.current = null;
                            setIsStageFinalDecisionOpen(false);
                            setStageFinalDecisionError('');
                        }}
                        error={stageFinalDecisionError}
                        defendants={defendants}
                        caseContext={caseSovereignContext}
                        inferredPresenceType={inferredStageFinalPresence}
                        onSubmit={submitStageFinalDecision}
                    />
                ) : null}

                {isStageCloserOpen ? (
                    <div
                        className="fixed inset-0 z-[500] isolate bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden"
                        dir="rtl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="stage-closer-title"
                        onClick={() => {
                            setStageCloserReferralOnly(false);
                            setIsStageCloserOpen(false);
                        }}
                    >
                        <div
                            className="relative z-[501] w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 overflow-hidden isolate"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                                <div
                                    id="stage-closer-title"
                                    className="text-white font-black text-sm whitespace-normal break-words"
                                >
                                    {stageCloserReferralOnly
                                        ? 'أوامر الإحالة — محكمة الموضوع'
                                        : 'إصدار القرار الختامي للمرحلة'}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStageCloserReferralOnly(false);
                                        setIsStageCloserOpen(false);
                                    }}
                                    className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
                                >
                                    إغلاق
                                </button>
                            </div>

                            <div className="p-4 space-y-3 overflow-y-auto flex-1">
                                {stageCloserError ? (
                                    <div className="rounded-xl border border-red-500/40 bg-red-900/20 p-3 text-red-200 font-black text-sm whitespace-normal break-words">
                                        {stageCloserError}
                                    </div>
                                ) : null}
                                {stageCloserReferralOnly ? (
                                    <p className="text-[11px] font-bold text-sky-200/90 whitespace-normal break-words">
                                        قرار حالة حال — يُسجَّل في تبويب الطلبات والقرارات ويُمكن الطعن فيه بالتمييز. يُحدَّث مسار الإضبارة بعد الحفظ.
                                    </p>
                                ) : null}
                                {stageCloserReferralOnly ? (
                                    isTrialCourtStage ? (
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                نوع قرار الإحالة
                                            </label>
                                            <select
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                                value={closureDecisionType}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setClosureDecisionType(
                                                        isProceduralRouteDecisionType(val)
                                                            ? (val as StageConclusion['decisionType'])
                                                            : '',
                                                    );
                                                }}
                                            >
                                                <option value="" className="bg-slate-900 text-white">
                                                    اختر...
                                                </option>
                                                {getTrialCourtReferralOrderOptions(caseStage).map((opt) => (
                                                    <option
                                                        key={opt.actionId}
                                                        value={opt.actionId}
                                                        className="bg-slate-900 text-white"
                                                    >
                                                        {referralOrderMenuLabel(
                                                            opt.actionId as TrialReferralOrderActionId,
                                                        )}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : null
                                ) : (
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        نوع القرار
                                    </label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={closureSuspendedExecution ? 'conviction_suspended' : closureDecisionType}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'conviction_suspended') {
                                                setClosureDecisionType('conviction');
                                                setClosureSuspendedExecution(true);
                                                return;
                                            }
                                            if (val === PRIVATE_RIGHT_WAIVER_DECISION_VALUE) {
                                                setClosureDecisionType(PRIVATE_RIGHT_WAIVER_DECISION_VALUE);
                                                setClosureSuspendedExecution(false);
                                                return;
                                            }
                                            setClosureDecisionType(
                                                isStageDecisionType(val) || isProceduralRouteDecisionType(val)
                                                    ? (val as StageConclusion['decisionType'])
                                                    : '',
                                            );
                                            setClosureSuspendedExecution(false);
                                        }}
                                    >
                                        <option value="" className="bg-slate-900 text-white">
                                            اختر...
                                        </option>
                                        {isCassationStage ? (
                                            <>
                                                {getStageTransitionOptions('cassation').map((opt) => (
                                                    <option
                                                        key={opt.actionId}
                                                        value={opt.actionId}
                                                        className="bg-slate-900 text-white"
                                                    >
                                                        {opt.menuLabel}
                                                    </option>
                                                ))}
                                                <option value="cassation_quash_remand" className="bg-slate-900 text-white">
                                                    نقض الحكم وإعادة الأوراق لمحكمة الموضوع (تلقائي)
                                                </option>
                                                <option value="cassation_quash_reduce" className="bg-slate-900 text-white">
                                                    نقض الحكم وتخفيف العقوبة دون إعادة
                                                </option>
                                                <option
                                                    value="cassation_quash_acquit_release"
                                                    className="bg-slate-900 text-white"
                                                >
                                                    نقض الحكم وإلغاء التهمة والإفراج الفوري
                                                </option>
                                            </>
                                        ) : isInvestigationPhase ? (
                                            <>
                                                {INVESTIGATION_ARTICLE_130_DECISIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                                                        {opt.label}
                                                    </option>
                                                ))}
                                                {caseAllowsFugitiveParallelSplit(defendants) ? (
                                                    <option
                                                        value="case_split_fugitive_referral"
                                                        className="bg-slate-900 text-white"
                                                    >
                                                        ✂️{' '}
                                                        {INVESTIGATION_FUGITIVE_PARALLEL_SPLIT_LABEL}
                                                    </option>
                                                ) : null}
                                                <option
                                                    value="temporary_release_insufficient_evidence"
                                                    className="bg-slate-900 text-white"
                                                >
                                                    🔒 إفراج مؤقت لعدم كفاية الأدلة
                                                </option>
                                            </>
                                        ) : closureDecisionType === 'default_judgment_opposition' ? (
                                            <option value="default_judgment_opposition" className="bg-slate-900 text-white">
                                                🔓 تقديم طعن واعتراض معارضة غيابية
                                            </option>
                                        ) : isJuvenileTrial ? (
                                            <>
                                                {JUVENILE_REMEDIAL_DECISION_OPTIONS.map((opt) => (
                                                    <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                                                        {opt.label}
                                                    </option>
                                                ))}
                                                <option value="acquittal" className="bg-slate-900 text-white">
                                                    حكم بالبراءة / الإفراج لعدم كفاية الأدلة
                                                </option>
                                                <option value="release" className="bg-slate-900 text-white">
                                                    إفراج
                                                </option>
                                            </>
                                        ) : isTrialCourtStage ? (
                                            <>
                                                {getStageTransitionOptions(caseStage).map((opt) => (
                                                    <option
                                                        key={opt.actionId}
                                                        value={opt.actionId}
                                                        className="bg-slate-900 text-white"
                                                    >
                                                        {opt.menuLabel}
                                                    </option>
                                                ))}
                                                <option value="conviction" className="bg-slate-900 text-white">
                                                    إدانة
                                                </option>
                                                <option value="acquittal" className="bg-slate-900 text-white">
                                                    براءة
                                                </option>
                                                <option value="release" className="bg-slate-900 text-white">
                                                    إفراج
                                                </option>
                                                <option value="conviction_suspended" className="bg-slate-900 text-white">
                                                    إيقاف تنفيذ
                                                </option>
                                                <option value="expiration" className="bg-slate-900 text-white">
                                                    انقضاء/سقوط الدعوى الجزائية
                                                </option>
                                                <option value="postpone_article_183" className="bg-slate-900 text-white">
                                                    ⏳ إيقاف الدعوى واستئخارها للمادة 183
                                                </option>
                                                <option value="default_judgment_issue" className="bg-slate-900 text-white">
                                                    ⚖️ صدور حكم غيابي وأرشفة الدعوى
                                                </option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="conviction" className="bg-slate-900 text-white">
                                                    إدانة
                                                </option>
                                                {defendants.some((d) => Boolean((d as any).isJuvenile)) ? (
                                                    <option value="juvenile_severance_referral" className="bg-slate-900 text-white">
                                                        تفريق دعوى المتهم الحدث (مسار محكمة الأحداث)
                                                    </option>
                                                ) : null}
                                                <option value="acquittal" className="bg-slate-900 text-white">
                                                    براءة
                                                </option>
                                                <option value="release" className="bg-slate-900 text-white">
                                                    إفراج
                                                </option>
                                                <option value="conviction_suspended" className="bg-slate-900 text-white">
                                                    إيقاف تنفيذ
                                                </option>
                                                <option value="expiration" className="bg-slate-900 text-white">
                                                    انقضاء/سقوط الدعوى الجزائية
                                                </option>
                                            </>
                                        )}
                                        {!isPrivateRightWaived && !stageCloserReferralOnly ? (
                                            <option
                                                value={PRIVATE_RIGHT_WAIVER_DECISION_VALUE}
                                                className="bg-slate-900 text-white"
                                            >
                                                {PRIVATE_RIGHT_WAIVER_DECISION_LABEL}
                                            </option>
                                        ) : null}
                                    </select>
                                </div>
                                )}

                                {closureDecisionType &&
                                !isPrivateRightWaiverDecisionValue(closureDecisionType) &&
                                decisionRequiresDefendantScope(closureDecisionType) &&
                                shouldShowDefendantDecisionScopePicker(defendants) &&
                                closureDecisionType !== 'expiration' &&
                                closureDecisionType !== 'juvenile_severance_referral' &&
                                !(
                                    closureSharedObjective269b &&
                                    isCassationClosureQuashDecision(closureDecisionType)
                                ) ? (
                                    <DefendantDecisionScopePicker
                                        defendants={defendants}
                                        selectedIds={closureScopedDefendantIds}
                                        onChange={setClosureScopedDefendantIds}
                                    />
                                ) : null}

                                {isCassationClosureQuashDecision(closureDecisionType) ? (
                                    <label className="flex items-center justify-between gap-3 rounded-xl border border-violet-500/40 bg-violet-950/30 px-3 py-2.5 cursor-pointer">
                                        <span className="text-[11px] font-bold text-white/85 whitespace-normal break-words">
                                            هل أسباب النقض موضوعية مشتركة يستفيد منها بقية المتهمين؟ (المادة 269/ب أصولية)
                                        </span>
                                        <input
                                            type="checkbox"
                                            checked={closureSharedObjective269b}
                                            onChange={(e) => setClosureSharedObjective269b(e.target.checked)}
                                            className="h-5 w-5 accent-[#E6C673]"
                                        />
                                    </label>
                                ) : null}

                                {juvenileAccused && firstJuvenileDefendant ? (
                                    <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-3">
                                        <div className="text-white font-black text-sm whitespace-normal break-words">
                                            موقف تقرير الباحث الاجتماعي {JUVENILE_SOCIAL_INQUIRY_ARTICLE_REF}
                                        </div>
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                حالة التقرير
                                            </label>
                                            <select
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                                value={firstJuvenileSocialWorkflow}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    if (!isValidSocialInquiryWorkflowStatus(v)) return;
                                                    patchSocialInquiryReport({
                                                        workflowStatus: v,
                                                        isAttached: v === 'submitted',
                                                    });
                                                }}
                                            >
                                                <option value="not_requested" className="bg-slate-900 text-white">
                                                    {socialInquiryWorkflowLabel('not_requested')}
                                                </option>
                                                <option value="under_preparation" className="bg-slate-900 text-white">
                                                    {socialInquiryWorkflowLabel('under_preparation')}
                                                </option>
                                                <option value="submitted" className="bg-slate-900 text-white">
                                                    {socialInquiryWorkflowLabel('submitted')}
                                                </option>
                                            </select>
                                        </div>
                                        {firstJuvenileSocialWorkflow === 'submitted' ? (
                                            <>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                            تاريخ ورود التقرير
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                                            value={String((firstJuvenileDefendant as any)?.socialInquiryReport?.receivedDate ?? '')}
                                                            onChange={(e) => patchSocialInquiryReport({ receivedDate: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                            اسم الباحث الاجتماعي
                                                        </label>
                                                        <input
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                                            value={String((firstJuvenileDefendant as any)?.socialInquiryReport?.investigatorName ?? '')}
                                                            onChange={(e) => patchSocialInquiryReport({ investigatorName: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                        توصيات التقرير
                                                    </label>
                                                    <textarea
                                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[90px] resize-none"
                                                        value={String((firstJuvenileDefendant as any)?.socialInquiryReport?.recommendations ?? '')}
                                                        onChange={(e) => patchSocialInquiryReport({ recommendations: e.target.value })}
                                                    />
                                                </div>
                                            </>
                                        ) : null}
                                    </div>
                                ) : null}

                                {closureDecisionType === 'expiration' ? (
                                    <div className="rounded-xl border border-slate-700/80 bg-slate-800/20 p-2.5 space-y-2">
                                        <ExpirationReasonFields
                                            reason={closureExpirationReason}
                                            customDetail={closureExpirationCustomDetail}
                                            onReasonChange={setClosureExpirationReason}
                                            onCustomDetailChange={setClosureExpirationCustomDetail}
                                            compact
                                        />

                                        <div>
                                            <label className="block text-[#A0AEC0] text-[10px] font-light mb-1 whitespace-normal break-words">
                                                المتهم المعني بالانقضاء
                                            </label>
                                            <div className="rounded-lg border border-slate-700/60 bg-slate-900/40 p-2">
                                                {defendants.length ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                        {defendants.map((d) => {
                                                            const label = d.fullName.trim() || '—';
                                                            const checked = closureExpirationDefendantIds.includes(d.id);
                                                            return (
                                                                <label
                                                                    key={d.id}
                                                                    className="flex items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/30 px-2 py-1.5 text-xs font-medium text-white/80"
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        className="h-3.5 w-3.5 accent-[#E6C673]"
                                                                        checked={checked}
                                                                        onChange={() =>
                                                                            setClosureExpirationDefendantIds((prev) =>
                                                                                prev.includes(d.id)
                                                                                    ? prev.filter((x) => x !== d.id)
                                                                                    : [...prev, d.id],
                                                                            )
                                                                        }
                                                                    />
                                                                    <span className="whitespace-normal break-words">{label}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="text-white/60 text-xs whitespace-normal break-words">—</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {closureDecisionType === 'conviction' ? (
                                    <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-3">
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                نوع العقوبة
                                            </label>
                                            <select
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                                value={closurePunishmentType}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setClosurePunishmentType(v === 'death' || v === 'life' || v === 'other' ? v : 'other');
                                                }}
                                            >
                                                <option value="death" className="bg-slate-900 text-white">
                                                    إعدام
                                                </option>
                                                <option value="life" className="bg-slate-900 text-white">
                                                    سجن مؤبد
                                                </option>
                                                <option value="other" className="bg-slate-900 text-white">
                                                    عقوبات أخرى
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                ) : null}

                                {closureDecisionType === 'juvenile_severance_referral' ? (
                                    <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-3">
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                المتهم الحدث المراد تفريق دعواه (إجباري)
                                            </label>
                                            <select
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                                value={closureJuvenileSeverDefendantId}
                                                onChange={(e) => setClosureJuvenileSeverDefendantId(e.target.value)}
                                            >
                                                <option value="" className="bg-slate-900 text-white">
                                                    اختر...
                                                </option>
                                                {defendants
                                                    .filter((d) => Boolean((d as any).isJuvenile))
                                                    .map((d) => (
                                                        <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                                                            {String(d.fullName ?? '').trim() || '—'}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>
                                ) : null}

                                {closureDecisionType === 'referral' ||
                                closureDecisionType === 'case_split_fugitive_referral' ||
                                closureDecisionType === 'misdemeanor_to_felony_jurisdiction' ||
                                closureDecisionType === 'felony_to_misdemeanor_jurisdiction' ? (
                                    <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-3">
                                        {closureDecisionType === 'referral' ||
                                        closureDecisionType === 'case_split_fugitive_referral' ? (
                                            <div>
                                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                    المحكمة المحال إليها
                                                </label>
                                                <select
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                                    value={closureReferralStage}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setClosureReferralStage(isReferralStageValue(v) ? v : '');
                                                    }}
                                                >
                                                    <option value="" className="bg-slate-900 text-white">
                                                        اختر...
                                                    </option>
                                                    <option value="محكمة الجنح" className="bg-slate-900 text-white">
                                                        محكمة الجنح
                                                    </option>
                                                    <option value="محكمة الجنايات" className="bg-slate-900 text-white">
                                                        محكمة الجنايات
                                                    </option>
                                                </select>
                                            </div>
                                        ) : null}
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                اسم محكمة الموضوع
                                            </label>
                                            <input
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                                value={closureReferralCourtName}
                                                onChange={(e) => setClosureReferralCourtName(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                رقم الدعوى الجديد (اختياري)
                                            </label>
                                            <input
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                                value={closureReferralCaseNumber}
                                                onChange={(e) => setClosureReferralCaseNumber(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                ) : null}

                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">تاريخ صدور القرار</label>
                                    <input
                                        type="date"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={closureDate}
                                        onChange={(e) => setClosureDate(e.target.value)}
                                    />
                                </div>

                                {isCassationStage ? null : (
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                            حالة المتهم في لحظة القرار
                                        </label>
                                        <select
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                            value={closureDefendantStatus}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                if (isDecisionDefendantStatus(v)) setClosureDefendantStatus(v);
                                            }}
                                        >
                                            <option value="detained" className="bg-slate-900 text-white">
                                                موقوف
                                            </option>
                                            <option value="bailed" className="bg-slate-900 text-white">
                                                مكفل
                                            </option>
                                            <option value="fugitive" className="bg-slate-900 text-white">
                                                هارب
                                            </option>
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">نص القرار</label>
                                    <textarea
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[120px] resize-none"
                                        value={closureDetails}
                                        onChange={(e) => setClosureDetails(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStageCloserReferralOnly(false);
                                            setIsStageCloserOpen(false);
                                        }}
                                        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="button"
                                        onClick={submitStageCloser}
                                        disabled={
                                            !closureDecisionType ||
                                            !closureDate.trim() ||
                                            !closureDetails.trim() ||
                                            (closureDecisionType === 'expiration' &&
                                                (Boolean(
                                                    validateExpirationReasonSelection(
                                                        closureExpirationReason,
                                                        closureExpirationCustomDetail,
                                                    ),
                                                ) ||
                                                    !closureExpirationDefendantIds.length)) ||
                                            (closureDecisionType === 'juvenile_severance_referral' &&
                                                !closureJuvenileSeverDefendantId.trim()) ||
                                            ((closureDecisionType === 'referral' ||
                                                closureDecisionType === 'case_split_fugitive_referral') &&
                                                (!closureReferralStage.trim() ||
                                                    !closureReferralCourtName.trim() ||
                                                    !closureReferralCaseNumber.trim())) ||
                                            (decisionRequiresDefendantScope(closureDecisionType) &&
                                                shouldShowDefendantDecisionScopePicker(defendants) &&
                                                !isPrivateRightWaiverDecisionValue(closureDecisionType) &&
                                                closureDecisionType !== 'expiration' &&
                                                closureDecisionType !== 'juvenile_severance_referral' &&
                                                !(
                                                    closureSharedObjective269b &&
                                                    isCassationClosureQuashDecision(closureDecisionType)
                                                ) &&
                                                !closureScopedDefendantIds.length)
                                        }
                                        className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                                    >
                                        {stageCloserReferralOnly ? 'حفظ أمر الإحالة' : 'حفظ القرار الختامي'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {isLegalEditOpen ? (
                    <div className="fixed inset-0 z-[221] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden" dir="rtl">
                        <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                                <div className="text-white font-black text-sm whitespace-normal break-words">تعديل الوصف القانوني</div>
                                <button
                                    type="button"
                                    onClick={() => setIsLegalEditOpen(false)}
                                    className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
                                >
                                    إغلاق
                                </button>
                            </div>
                            <div className="p-4 space-y-3">
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">المادة الجديدة</label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={legalArticleNext}
                                        onChange={(e) => setLegalArticleNext(e.target.value)}
                                        placeholder='مثال: "مادة 446 عقوبات"، "مادة 411/ أولاً"'
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        الجهة التي قررت التعديل
                                    </label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={legalChangedBy}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (isLegalChangedByValue(v)) setLegalChangedBy(v);
                                        }}
                                    >
                                        <option value="police" className="bg-slate-900 text-white">
                                            الشرطة
                                        </option>
                                        <option value="investigation_judge" className="bg-slate-900 text-white">
                                            قاضي التحقيق
                                        </option>
                                        <option value="trial_court" className="bg-slate-900 text-white">
                                            محكمة الموضوع
                                        </option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsLegalEditOpen(false)}
                                        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="button"
                                        onClick={submitLegalEdit}
                                        disabled={!legalArticleNext.trim()}
                                        className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                                    >
                                        حفظ
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}


                <CriminalStatementModal
                    isOpen={activeTab === 'statements' && isStatementModalOpen}
                    initialStatement={editingStatement}
                    complainants={complainants}
                    defendants={statementEligibleDefendants}
                    ourRepresentation={ourRepresentation}
                    isMutualComplaint={isMutualComplaint}
                    showDepositionVenuePicker={isInvestigationPhase}
                    investigationPapersAt={criminalCase?.location.investigationPapersAt ?? ''}
                    onClose={() => {
                        setEditingStatement(null);
                        setIsStatementModalOpen(false);
                    }}
                    onCreate={(statement) => addStatement(id, statement)}
                    onUpdate={(statementId, updatedData) => updateStatement(id, statementId, updatedData)}
                    onError={showLegalError}
                />

                <TrialDepositionModal
                    isOpen={activeTab === 'statements' && isEffectiveTrialCourtStage && isTrialDepositionModalOpen}
                    initialDeposition={editingTrialDeposition}
                    sessions={sortedTrialSessionsForDepositions}
                    complainants={complainants}
                    defendants={defendants}
                    onClose={() => {
                        setEditingTrialDeposition(null);
                        setIsTrialDepositionModalOpen(false);
                    }}
                    onCreate={(payload) => {
                        const err = addTrialDeposition(id, payload);
                        if (err) {
                            setLegalToast(err);
                            setTimeout(() => setLegalToast(''), 4500);
                        }
                    }}
                    onUpdate={(depositionId, patch) => {
                        const err = updateTrialDeposition(id, depositionId, patch);
                        if (err) {
                            setLegalToast(err);
                            setTimeout(() => setLegalToast(''), 4500);
                        }
                    }}
                    onError={(msg) => {
                        setLegalToast(msg);
                        setTimeout(() => setLegalToast(''), 4500);
                    }}
                />

                {activeTab === 'requests' && isRequestsModalOpen ? (
                    <div className="fixed inset-0 z-[221] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden" dir="rtl">
                        <div className="w-full max-w-6xl rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
                            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="text-white font-black text-sm whitespace-normal break-words">
                                        {isRequestModalViewOnly
                                            ? requestModalLane === 'lawyer'
                                                ? 'عرض تفاصيل طلب المحامي'
                                                : 'عرض تفاصيل قرار القاضي'
                                            : requestModalLane === 'lawyer'
                                              ? 'طلبات المحامي'
                                              : 'تسجيل قرار قضائي'}
                                    </div>
                                    <RequestStarToggle
                                        starred={
                                            isRequestModalViewOnly
                                                ? modalLinkedRequest?.isStarred === true
                                                : reqIsStarred
                                        }
                                        disabled={
                                            isRequestModalViewOnly
                                                ? !editingRequestId ||
                                                  isTimelineArchiveReadOnly ||
                                                  isDashboardReadOnly
                                                : false
                                        }
                                        onToggle={() => {
                                            if (isRequestModalViewOnly && editingRequestId) {
                                                toggleRequestStar(id, editingRequestId);
                                            } else {
                                                setReqIsStarred((v) => !v);
                                            }
                                        }}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={closeRequestsModal}
                                    className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
                                >
                                    إغلاق
                                </button>
                            </div>

                            <div className="p-4 space-y-3">
                                {isRequestModalViewOnly && editingRequestId ? (
                                    <ProceduralBacklinks
                                        references={findProceduralReferencesToLink(proceduralContainers, {
                                            kind: 'request',
                                            id: editingRequestId,
                                        })}
                                        onNavigate={navigateToProceduralItem}
                                    />
                                ) : null}

                                {isRequestModalViewOnly ? (
                                    <>
                                        <RequestReadOnlyField
                                            label={
                                                requestModalLane === 'judicial' ? 'تاريخ القرار' : 'تاريخ الطلب'
                                            }
                                            value={reqDate}
                                        />
                                        <RequestReadOnlyField label="نوع الطلب / الإجراء" value={reqType} />
                                        {reqIsAppealable ? (
                                            <RequestReadOnlyField label="قابلية التمييز" value="نعم — إجراء مخصص قابل للطعن" />
                                        ) : null}
                                        {reqIsComplaintReferralEntry && reqReferredCourtName.trim() ? (
                                            <RequestReadOnlyField label="المحكمة الجديدة" value={reqReferredCourtName} />
                                        ) : null}
                                        {isCustomJudicialEntry ? (
                                            <RequestReadOnlyField
                                                label="الأمر يخص من"
                                                value={
                                                    customJudicialConcernedPartyId
                                                        ? customJudicialConcernedPartyOptions.find(
                                                              (p) => p.id === customJudicialConcernedPartyId,
                                                          )?.label ?? '—'
                                                        : 'قرار عام للإضبارة'
                                                }
                                            />
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                {requestModalLane === 'judicial' ? 'تاريخ القرار' : 'تاريخ الطلب'}
                                            </label>
                                            <input
                                                type="date"
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                                value={reqDate}
                                                onChange={(e) => setReqDate(e.target.value)}
                                            />
                                        </div>
                                        <RequestModalEntryLanes
                                            activeLane={requestModalLane}
                                            trialCourtManualOnly={isEffectiveTrialCourtStage}
                                            isInvestigationPhase={isInvestigationPhase}
                                            defendantsPartyMix={
                                                isInvestigationPhase
                                                    ? investigationDefendantsPartyMix
                                                    : 'adults_only'
                                            }
                                            reqJudicialEntryScope={reqJudicialEntryScope}
                                            mixedInvestigationScopedDefendantNames={
                                                mixedInvestigationScopedDefendantNames
                                            }
                                            reqJuvenileDetentionLocked={reqJuvenileDetentionLocked}
                                            isAllDefendantsUnknown={isAllDefendantsUnknown}
                                            reqEntryLane={reqEntryLane}
                                            reqTypeTemplate={reqTypeTemplate}
                                            reqCustomTypeName={reqCustomTypeName}
                                            reqIsAppealable={reqIsAppealable}
                                            reqStatus={reqStatus}
                                            reqJudgeMargin={reqJudgeMargin}
                                            reqDecisionDate={reqDecisionDate}
                                            reqDate={reqDate}
                                            reqDetentionStartDate={reqDetentionStartDate}
                                            reqDetentionEndDate={reqDetentionEndDate}
                                            reqLegalArticleBasis={reqLegalArticleBasis}
                                            reqReferredCourtName={reqReferredCourtName}
                                            reqNeedsDetentionDateRange={reqNeedsDetentionDateRange}
                                            hideGlobalDetentionFields={
                                                showRequestPartySection && !isRequestModalViewOnly
                                            }
                                            hideGlobalBailFields={
                                                showRequestPartySection && !isRequestModalViewOnly
                                            }
                                            reqIsOrderEnforcementEntry={reqIsOrderEnforcementEntry}
                                            isRequestFinalStatus={isRequestFinalStatus}
                                            reqDecisionBeforeRequest={reqDecisionBeforeRequest}
                                            assetSeizureFugitives={fugitiveDefendants}
                                            assetSeizureSelectedDefendantIds={reqSeizureSelectedDefendantIds}
                                            assetSeizureDraftsByDefendant={reqSeizureDraftsByDefendant}
                                            onAssetSeizureSelectedChange={setReqSeizureSelectedDefendantIds}
                                            onAssetSeizureDraftsChange={onAssetSeizureDraftsChange}
                                            onApplyJudicialTemplate={applyJudicialTemplate}
                                            onApplyLawyerTemplate={applyLawyerTemplate}
                                            onClearEntryLane={clearRequestEntryLane}
                                            onCustomTypeNameChange={(value) => {
                                                setReqCustomTypeName(value);
                                                setReqType(value);
                                            }}
                                            onAppealableChange={setReqIsAppealable}
                                            onStatusChange={setReqStatus}
                                            onJudgeMarginChange={setReqJudgeMargin}
                                            onDecisionDateChange={setReqDecisionDate}
                                            onDetentionStartChange={setReqDetentionStartDate}
                                            onDetentionEndChange={setReqDetentionEndDate}
                                            onLegalArticleBasisChange={setReqLegalArticleBasis}
                                            onReferredCourtNameChange={setReqReferredCourtName}
                                            customJudicialConcernedParties={customJudicialConcernedPartyOptions}
                                            customJudicialConcernedPartyId={customJudicialConcernedPartyId}
                                            onCustomJudicialConcernedPartyChange={(partyId) =>
                                                setReqDefendantIds(partyId ? [partyId] : [])
                                            }
                                        />
                                    </>
                                )}

                                {showPurgeDefendantPicker && !isRequestModalViewOnly ? (
                                    <DefendantDecisionScopePicker
                                        defendants={defendants}
                                        selectedIds={reqDefendantIds}
                                        onChange={setReqDefendantIds}
                                        proceduralTemplate={reqTypeTemplate}
                                    />
                                ) : null}

                                {isInvestigationPhase &&
                                isInvestigationExpirationJudicialTemplate(reqTypeTemplate) &&
                                !isRequestModalViewOnly ? (
                                    <div className="rounded-xl border border-slate-700/80 bg-slate-800/20 p-2.5">
                                        <ExpirationReasonFields
                                            reason={reqInvestigationExpirationReason}
                                            customDetail={reqInvestigationExpirationCustomDetail}
                                            onReasonChange={setReqInvestigationExpirationReason}
                                            onCustomDetailChange={setReqInvestigationExpirationCustomDetail}
                                            compact
                                        />
                                    </div>
                                ) : null}

                                {showRequestPartySection ? (
                                    <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-3 space-y-2">
                                        {isRequestModalViewOnly ? (
                                            <RequestReadOnlyField
                                                label="الطرف المعني بالطلب"
                                                value={
                                                    reqDefendantIds
                                                        .map((rid) => allParties.find((p) => p.id === rid))
                                                        .filter(Boolean)
                                                        .map((p) =>
                                                            formatConcernedPartyLabelWithContext(p!, {
                                                                showDeceasedBadge: true,
                                                            }),
                                                        )
                                                        .join(' • ') ||
                                                    autoRequestPartyLabel ||
                                                    autoConcernedPartyLabel ||
                                                    (requestEligibleParties[0]
                                                        ? formatConcernedPartyLabel(requestEligibleParties[0]!)
                                                        : '—')
                                                }
                                            />
                                        ) : (
                                            <>
                                                {showPartyPickerFormUi ? (
                                                    <ConcernedPartyDecisionPicker
                                                        parties={requestEligibleParties}
                                                        selectedIds={reqDefendantIds}
                                                        onChange={setReqDefendantIds}
                                                        label={
                                                            reqIsDefendantBailEntry
                                                                ? 'المتهمون المعنيون بالكفالة *'
                                                                : showJuvenileJudgeConcernedPartyPicker
                                                                  ? 'المقصود بالإجراء *'
                                                                  : requestModalLane === 'judicial'
                                                                    ? 'الأشخاص المعنيون بالقرار *'
                                                                    : isDefendantTargetRequestTemplate(reqTypeTemplate)
                                                                      ? 'الأشخاص المعنيون بالقرار *'
                                                                      : 'الأطراف المعنيون بالطلب *'
                                                        }
                                                        showPerPartyCards
                                                        showBailFields={reqIsDefendantBailEntry}
                                                        showDetentionFields={reqNeedsDetentionDateRange}
                                                        bailByPartyId={reqBailByPartyId}
                                                        onBailChange={patchReqBailForParty}
                                                        unifiedBailMode={reqBailUnified}
                                                        onUnifiedBailModeChange={handleReqBailUnifiedChange}
                                                        unifiedDetentionMode={reqDetentionUnified}
                                                        onUnifiedDetentionModeChange={handleReqDetentionUnifiedChange}
                                                        detentionByPartyId={reqDetentionByPartyId}
                                                        onDetentionChange={patchReqDetentionForParty}
                                                        requestDate={reqDate}
                                                        juvenileDetentionLocked={reqJuvenileDetentionLocked}
                                                        formatPartyLabel={(party) =>
                                                            formatConcernedPartyLabelWithContext(party, {
                                                                showDeceasedBadge: true,
                                                            })
                                                        }
                                                        unknownPartyRows={
                                                            showUnknownPartyNoticeInRequestModal ? (
                                                                <div className="space-y-2">
                                                                    {unknownDefendantsForPartyDisplay.map((d) => (
                                                                        <UnknownDefendantPartyBlockedRow
                                                                            key={d.id}
                                                                            fullName={String(d.fullName ?? '')}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            ) : undefined
                                                        }
                                                    />
                                                ) : null}
                                                {showJuvenileArrestLegalHint ? (
                                                    <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-[11px] font-bold text-sky-100/95 whitespace-normal break-words leading-relaxed">
                                                        (تنبيه قانوني: يُمنع احتجاز الحدث في مراكز الشرطة، ويودع وجوباً في دار الملاحظة)
                                                    </div>
                                                ) : null}
                                            </>
                                        )}
                                    </div>
                                ) : null}

                                {isRequestModalViewOnly ? (
                                    <>
                                        <RequestReadOnlyField label="التفاصيل" value={reqNote} />
                                        <RequestReadOnlyField
                                            label={reqIsJudicialDecisionEntry ? 'نوع التسجيل' : 'حالة الطلب'}
                                            value={formatLawyerRequestStatusLabel(reqStatus)}
                                        />
                                        {isLawyerRequestFinalStatus(reqStatus) && !reqIsJudicialDecisionEntry ? (
                                            <RequestReadOnlyField label="قرار / هامش القاضي الختامي" value={reqJudgeMargin} />
                                        ) : null}
                                        {isLawyerRequestFinalStatus(reqStatus) && !reqIsJudicialDecisionEntry ? (
                                            <RequestReadOnlyField label="تاريخ قرار القاضي" value={reqDecisionDate} />
                                        ) : null}
                                        {Object.entries(reqDetentionByPartyId).map(([partyId, draft]) => {
                                            if (!draft.startDate.trim() && !draft.endDate.trim()) return null;
                                            const party = allParties.find((p) => p.id === partyId);
                                            const label = party
                                                ? formatConcernedPartyLabelWithContext(party, {
                                                      showDeceasedBadge: true,
                                                  })
                                                : partyId;
                                            return (
                                                <div
                                                    key={partyId}
                                                    className="rounded-xl border border-slate-700/60 bg-slate-800/25 p-3 space-y-1"
                                                >
                                                    <div className="text-white/70 text-xs font-black">{label}</div>
                                                    {draft.startDate.trim() ? (
                                                        <RequestReadOnlyField
                                                            label="تاريخ بدء التوقيف"
                                                            value={draft.startDate}
                                                        />
                                                    ) : null}
                                                    {draft.endDate.trim() ? (
                                                        <RequestReadOnlyField
                                                            label="تاريخ انتهاء التوقيف"
                                                            value={draft.endDate}
                                                        />
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                        {!Object.keys(reqDetentionByPartyId).length && reqDetentionStartDate.trim() ? (
                                            <RequestReadOnlyField
                                                label="تاريخ بدء التوقيف"
                                                value={reqDetentionStartDate}
                                            />
                                        ) : null}
                                        {!Object.keys(reqDetentionByPartyId).length && reqDetentionEndDate.trim() ? (
                                            <RequestReadOnlyField
                                                label="تاريخ انتهاء التوقيف"
                                                value={reqDetentionEndDate}
                                            />
                                        ) : null}
                                        {reqIsOrderEnforcementEntry && reqLegalArticleBasis.trim() ? (
                                            <RequestReadOnlyField
                                                label="المادة القانونية المستند عليها"
                                                value={reqLegalArticleBasis}
                                            />
                                        ) : null}
                                        {modalLinkedRequest?.margins?.length ? (
                                            <div>
                                                <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                    هوامش ومتابعات
                                                </label>
                                                <LawyerRequestMarginsMiniTimeline margins={modalLinkedRequest.margins} />
                                            </div>
                                        ) : null}
                                        {!isTimelineArchiveReadOnly &&
                                        !isDashboardReadOnly &&
                                        modalLinkedRequest &&
                                        canAddLawyerRequestFollowUpMargin(modalLinkedRequest) ? (
                                            <RequestMarginAddButton onClick={() => setRequestMarginModalOpen(true)} />
                                        ) : null}
                                        {(modalLinkedRequest?.attachments?.length ?? 0) > 0 ||
                                        (modalLinkedRequest &&
                                            canEditLawyerRequestAttachments(modalLinkedRequest)) ? (
                                            <div className="rounded-xl border border-slate-700/60 bg-slate-800/25 p-3">
                                                <label className="block text-white/70 text-xs mb-2 whitespace-normal break-words">
                                                    مرفقات القرار
                                                    {modalLinkedRequest &&
                                                    !canEditLawyerRequestAttachments(modalLinkedRequest)
                                                        ? ' (للقراءة — الطلب مقفول)'
                                                        : ''}
                                                </label>
                                                <LawyerRequestAttachmentsEditor
                                                    attachments={modalLinkedRequest?.attachments ?? []}
                                                    readOnly={
                                                        isTimelineArchiveReadOnly ||
                                                        isDashboardReadOnly ||
                                                        !modalLinkedRequest ||
                                                        !canEditLawyerRequestAttachments(modalLinkedRequest)
                                                    }
                                                    onAddSimulated={() => {
                                                        if (!editingRequestId) return;
                                                        const n = (modalLinkedRequest?.attachments?.length ?? 0) + 1;
                                                        addRequestAttachment(
                                                            id,
                                                            editingRequestId,
                                                            `نسخة القرار الموثقة رقم ${n}`,
                                                        );
                                                    }}
                                                    onRemove={(attachmentId) => {
                                                        if (editingRequestId) {
                                                            removeRequestAttachment(id, editingRequestId, attachmentId);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : null}
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                                {reqIsJudicialDecisionEntry ? 'تفاصيل / وقائع القرار *' : 'التفاصيل *'}
                                            </label>
                                            <textarea
                                                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[120px] resize-none"
                                                value={reqNote}
                                                onChange={(e) => setReqNote(e.target.value)}
                                            />
                                        </div>
                                    </>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-2">
                                    {isRequestModalViewOnly ? (
                                        <button
                                            type="button"
                                            onClick={closeRequestsModal}
                                            className="rounded-xl border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-700/60 transition whitespace-normal break-words"
                                        >
                                            إغلاق
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={closeRequestsModal}
                                                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"
                                            >
                                                إلغاء
                                            </button>
                                            <button
                                                type="button"
                                                onClick={submitRequest}
                                                disabled={
                                                    !requestFormBaseValid ||
                                                    (reqIsLawyerMotionEntry &&
                                                        isRequestFinalStatus &&
                                                        !requestFormFinalValid)
                                                }
                                                className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                                            >
                                                {reqIsJudicialDecisionEntry
                                                    ? 'توثيق القرار في السجل'
                                                    : isRequestFinalStatus
                                                      ? 'حفظ هامش القاضي وقفل'
                                                      : 'تسجيل الطلب'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                <RequestMarginPromptModal
                    open={requestMarginModalOpen}
                    onClose={() => setRequestMarginModalOpen(false)}
                    onSubmit={(text) => {
                        if (editingRequestId) addRequestMargin(id, editingRequestId, text);
                    }}
                />

                <RequestQuickFinalizeModal
                    open={Boolean(quickFinalizeRequest)}
                    request={quickFinalizeRequest}
                    nextStatus={quickFinalizeStatus}
                    judgeMargin={quickFinalizeMargin}
                    decisionDate={quickFinalizeDate}
                    onStatusChange={setQuickFinalizeStatus}
                    onJudgeMarginChange={setQuickFinalizeMargin}
                    onDecisionDateChange={setQuickFinalizeDate}
                    onClose={closeQuickFinalizeModal}
                    onSave={submitQuickFinalize}
                />

                <ProceduralLinkedTimelineModal
                    open={linkedTimelineFromProcedural !== null}
                    event={linkedTimelineFromProcedural}
                    proceduralReferences={
                        linkedTimelineFromProcedural
                            ? findProceduralReferencesToLink(proceduralContainers, {
                                  kind: 'timeline',
                                  id: linkedTimelineFromProcedural.id,
                              })
                            : []
                    }
                    onNavigateToProcedural={navigateToProceduralItem}
                    onClose={() => setLinkedTimelineFromProcedural(null)}
                />

                {isReopenCaseOpen ? (
                    <div className="fixed inset-0 z-[221] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden" dir="rtl">
                        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                                <div className="text-white font-black text-sm whitespace-normal break-words">
                                    إعادة فتح الدعوى
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsReopenCaseOpen(false)}
                                    className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
                                >
                                    إغلاق
                                </button>
                            </div>

                            <div className="p-4 space-y-3">
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        سبب إعادة الفتح
                                    </label>
                                    <textarea
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 min-h-[130px] resize-none"
                                        value={reopenCaseReason}
                                        onChange={(e) => setReopenCaseReason(e.target.value)}
                                        placeholder="اكتب سبب إعادة الفتح..."
                                    />
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsReopenCaseOpen(false)}
                                        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="button"
                                        onClick={submitReopenCase}
                                        disabled={!reopenCaseReason.trim()}
                                        className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                                    >
                                        إعادة فتح
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                {isSendToCassationOpen ? (
                    <div className="fixed inset-0 z-[221] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden" dir="rtl">
                        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                                <div className="text-white font-black text-sm whitespace-normal break-words">
                                    تسجيل تقديم الطعن وإرسال الأوراق للتمييز
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsSendToCassationOpen(false)}
                                    className="text-white/70 hover:text-white transition text-sm font-bold whitespace-normal break-words"
                                >
                                    إغلاق
                                </button>
                            </div>

                            <div className="p-4 space-y-3">
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        قناة الطعن / التدخل
                                    </label>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={
                                            availableCassationFilingTypes.includes(cassationType)
                                                ? cassationType
                                                : (availableCassationFilingTypes[0] ?? cassationType)
                                        }
                                        onChange={(e) => setCassationType(e.target.value as CassationType)}
                                    >
                                        {availableCassationFilingTypes.map((type) => (
                                            <option key={type} value={type} className="bg-slate-900">
                                                {cassationFilingTypeLabel(type)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {cassationType === 'prosecution_intervention_264b' ? (
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                            أساس التدخل
                                        </label>
                                        <select
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                            value={cassationInterventionBasis}
                                            onChange={(e) =>
                                                setCassationInterventionBasis(e.target.value as ProsecutionInterventionBasis)
                                            }
                                        >
                                            <option value="prosecutor_general_review">مطالعة رئيس الادعاء العام</option>
                                            <option value="parties_request">طلب الخصوم</option>
                                            <option value="court_sua_sponte">المحكمة تلقائياً</option>
                                        </select>
                                    </div>
                                ) : null}
                                <div>
                                    <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                        رقم الإضبارة/كتاب الإرسال التمييزي
                                    </label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                        value={cassationNumber}
                                        onChange={(e) => setCassationNumber(e.target.value)}
                                        placeholder="مثال: 123/تمييز/2026"
                                    />
                                </div>
                                {cassationType !== 'prosecution_intervention_264b' ? (
                                    <div>
                                        <label className="block text-white/70 text-xs mb-1 whitespace-normal break-words">
                                            اسم الهيئة التمييزية المستلمة
                                        </label>
                                        <input
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                                            value={cassationPanelName}
                                            onChange={(e) => setCassationPanelName(e.target.value)}
                                            placeholder="مثال: الهيئة الجزائية/الموسعة..."
                                        />
                                    </div>
                                ) : null}
                                <DefendantDecisionScopePicker
                                    defendants={defendants}
                                    selectedIds={cassationAppellantIds}
                                    onChange={setCassationAppellantIds}
                                    title="الطاعن / المشمول بالطعن"
                                />
                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsSendToCassationOpen(false)}
                                        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-black text-white/80 hover:text-white hover:bg-slate-800/30 transition whitespace-normal break-words"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        type="button"
                                        onClick={submitSendToCassation}
                                        disabled={
                                            !cassationNumber.trim() ||
                                            (cassationType !== 'prosecution_intervention_264b' &&
                                                !cassationPanelName.trim())
                                        }
                                        className="rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-2.5 px-4 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                                    >
                                        حفظ وإرسال
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}

                <VerdictCassationFilingModal
                    open={Boolean(verdictCassationFilingCard)}
                    card={verdictCassationFilingCard}
                    caseStage={
                        effectiveUiStage === 'felony' || effectiveUiStage === 'misdemeanor'
                            ? effectiveUiStage
                            : caseStage
                    }
                    currentAccusationArticle={
                        criminalCase.currentAccusationArticle ?? criminalCase.basics.legalArticle
                    }
                    crimeType={criminalCase.basics.crimeType}
                    readOnly={isDecisionsTabMaterialReadOnly}
                    onClose={() => setVerdictCassationFilingCard(null)}
                    onSave={(patch) => {
                        if (!verdictCassationFilingCard) return;
                        patchVerdictCardOrdinaryAppeal(id, verdictCassationFilingCard.id, patch);
                        setVerdictCassationFilingCard(null);
                    }}
                />

                <PartyIdentityCorrectionModal
                    open={identityEdit?.mode === 'party'}
                    partyKind={identityEdit?.mode === 'party' ? identityEdit.kind : 'complainant'}
                    fullName={identityEdit?.mode === 'party' ? identityEdit.fullName : ''}
                    phone={identityEdit?.mode === 'party' ? identityEdit.phone : ''}
                    address={identityEdit?.mode === 'party' ? identityEdit.address : ''}
                    error={identityEditError}
                    onClose={() => {
                        setIdentityEdit(null);
                        setIdentityEditError('');
                    }}
                    onSubmit={({ newFullName, newPhone, newAddress, reason }) => {
                        if (identityEdit?.mode !== 'party') return;
                        const err = correctCasePartyName(id, {
                            partyKind: identityEdit.kind,
                            partyId: identityEdit.id,
                            newFullName,
                            newPhone,
                            newAddress,
                            reason,
                        });
                        if (err) {
                            setIdentityEditError(err);
                            return;
                        }
                        setIdentityEdit(null);
                        setIdentityEditError('');
                    }}
                />

                <VenueIdentityCorrectionModal
                    open={identityEdit?.mode === 'venue'}
                    error={identityEditError}
                    showInvestigationCourt={showEditInvestigationCourt}
                    investigationCourtName={criminalCase.location.investigationCourtName}
                    showTrialCourt={showEditTrialCourt}
                    trialCourtName={criminalCase.location.courtName}
                    showDeposition={showEditDeposition}
                    papersAt={
                        criminalCase.location.investigationPapersAt === 'مكتب تحقيق قضائي'
                            ? 'مكتب تحقيق قضائي'
                            : 'مركز شرطة'
                    }
                    depositionEntityName={depositEntityName}
                    legalArticle={activeLegalArticle}
                    showLegalArticle={canManageDossier && !isTimelineArchiveReadOnly}
                    showReferenceNumbers={canManageDossier && !isTimelineArchiveReadOnly && isTrialPhase}
                    courtCaseNumber={String(
                        criminalCase.courtCaseNumber ?? criminalCase.location.caseNumber ?? '',
                    ).trim()}
                    publicProsecutionNumber={String(
                        criminalCase.location.publicProsecutionNumber ?? '',
                    ).trim()}
                    onClose={() => {
                        setIdentityEdit(null);
                        setIdentityEditError('');
                    }}
                    onSubmit={({
                        investigationCourtName,
                        trialCourtName,
                        papersAt,
                        depositionEntityName,
                        legalArticle,
                        courtCaseNumber,
                        publicProsecutionNumber,
                        reason,
                    }) => {
                        let err: string | null = null;
                        if (legalArticle) {
                            err = correctCaseLegalArticle(id, { newArticle: legalArticle, reason });
                        }
                        if (!err && investigationCourtName) {
                            err = correctCaseCourtName(id, {
                                newCourtName: investigationCourtName,
                                reason,
                                scope: 'investigation',
                            });
                        }
                        if (!err && trialCourtName) {
                            err = correctCaseCourtName(id, {
                                newCourtName: trialCourtName,
                                reason,
                                scope: 'trial',
                            });
                        }
                        if (!err && papersAt && depositionEntityName) {
                            err = correctCaseDepositionLocation(id, {
                                papersAt,
                                entityName: depositionEntityName,
                                reason,
                            });
                        }
                        if (
                            !err &&
                            (courtCaseNumber !== undefined || publicProsecutionNumber !== undefined)
                        ) {
                            err = correctCaseReferenceNumbers(id, {
                                ...(courtCaseNumber !== undefined ? { courtCaseNumber } : {}),
                                ...(publicProsecutionNumber !== undefined
                                    ? { publicProsecutionNumber }
                                    : {}),
                                reason,
                            });
                        }
                        if (err) {
                            setIdentityEditError(err);
                            return;
                        }
                        setIdentityEdit(null);
                        setIdentityEditError('');
                    }}
                />

                <CriminalCaseTrashModal
                    open={isTrashModalOpen}
                    items={trashItems}
                    readOnly={isTimelineArchiveReadOnly || isDashboardReadOnly}
                    onClose={() => setIsTrashModalOpen(false)}
                    onRestore={(trashItemId) => {
                        const err = restoreTrashItem(id, trashItemId);
                        if (err) {
                            setLegalToast(err);
                            setTimeout(() => setLegalToast(''), 4500);
                            return;
                        }
                        setLegalToast('✓ تم استرجاع العنصر.');
                        setTimeout(() => setLegalToast(''), 4000);
                    }}
                    onPurge={(trashItemId) => {
                        setConfirmAction({
                            title: 'حذف نهائي',
                            message: 'لن يمكن استرجاع هذا العنصر بعد الحذف النهائي.',
                            confirmText: 'حذف نهائي',
                            onConfirm: () => {
                                const err = purgeTrashItem(id, trashItemId);
                                if (err) {
                                    setLegalToast(err);
                                    setTimeout(() => setLegalToast(''), 4500);
                                }
                            },
                        });
                    }}
                />

                <MergeCaseModal
                    open={isMergeCasesOpen}
                    parentCaseId={id}
                    parentCaseTitle={headerTitle.primary}
                    mergeTargetCaseId={mergeTargetCaseId}
                    mergeReason={mergeReason}
                    onTargetChange={setMergeTargetCaseId}
                    onReasonChange={setMergeReason}
                    onClose={() => setIsMergeCasesOpen(false)}
                    onSubmit={submitMergeCases}
                />

                <ConfirmActionModal
                    open={Boolean(confirmAction)}
                    title={confirmAction?.title}
                    message={confirmAction?.message ?? ''}
                    confirmText={confirmAction?.confirmText}
                    cancelText={confirmAction?.cancelText}
                    onConfirm={runConfirmAction}
                    onCancel={closeConfirmAction}
                />

                {forfeitureModal ? (
                    <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center print:hidden">
                        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                            <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                                <div className="text-white font-black text-sm whitespace-normal break-words">
                                    تحديث مصادرة الكفالة
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setForfeitureModal(null)}
                                    className="text-white/70 hover:text-white transition text-sm font-bold"
                                >
                                    إغلاق
                                </button>
                            </div>
                            {(() => {
                                const d = defendants.find((x: any) => String(x?.id) === forfeitureModal.defendantId) as any;
                                return (
                                    <div className="p-4 space-y-3">
                                        <div className="space-y-1">
                                            <label className="block text-white/70 text-xs font-black whitespace-normal break-words">
                                                بيانات الكفالة / ملاحظات المصادرة (نص حر)
                                            </label>
                                            <textarea
                                                value={forfeitureModal.forfeitureNote}
                                                onChange={(e) =>
                                                    setForfeitureModal((prev) =>
                                                        prev ? { ...prev, forfeitureNote: e.target.value } : prev,
                                                    )
                                                }
                                                className="w-full min-h-[120px] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-black text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#E6C673]/40"
                                                placeholder="مقدار الكفالة + معلومات الكفيل + أي ملاحظات مصادرة..."
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!d) return;
                                                try {
                                                    updateBailForfeiture(id, forfeitureModal.defendantId, {
                                                        forfeitureNote: forfeitureModal.forfeitureNote,
                                                    });
                                                } catch {
                                                    showLegalError();
                                                    return;
                                                }
                                                setForfeitureModal(null);
                                            }}
                                            className="w-full rounded-xl bg-[#E6C673] text-[#0B1021] font-black py-3 text-sm hover:brightness-110 active:brightness-95 transition disabled:opacity-40 whitespace-normal break-words"
                                        >
                                            حفظ التحديث وحقن الحدث
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                ) : null}
            </div>

            {isInlineSeveranceFormOpen && pendingSeveranceContext?.parentCaseId === id ? (
                <div
                    className="fixed inset-0 z-[230] flex flex-col min-h-0 bg-[#0B1021] print:hidden"
                    dir="rtl"
                    role="dialog"
                    aria-modal="true"
                    aria-label="تعبئة بيانات الإضبارة المفرّقة"
                >
                    <Suspense
                        fallback={
                            <div className="flex-1 grid place-items-center text-[#E6C673] text-sm font-bold animate-pulse">
                                جاري تحميل نموذج الإضبارة المفرّقة...
                            </div>
                        }
                    >
                        <LazyCriminalNewCase
                            embeddedOverlay
                            severanceFormMode
                            onBack={closeInlineSeveranceForm}
                            onClose={closeInlineSeveranceForm}
                            onCreated={(newCaseId) => {
                                setIsInlineSeveranceFormOpen(false);
                                if (onOpenCase) {
                                    onOpenCase(newCaseId);
                                }
                            }}
                        />
                    </Suspense>
                </div>
            ) : null}
        </div>
    );
};
