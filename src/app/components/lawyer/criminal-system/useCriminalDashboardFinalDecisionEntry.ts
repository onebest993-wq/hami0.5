import { useCallback, useMemo, type Dispatch, type SetStateAction } from 'react';
import {
    normalizeGuarantorDetails,
    type CriminalCase,
    type CriminalDefendant,
    type CriminalStoreState,
    type LegalArticleChange,
    type StageConclusion,
} from './criminalStore';
import { isValidSocialInquiryWorkflowStatus } from './criminalStagePresentationCore';
import type { SocialInquiryWorkflowStatus } from './criminalStageUtils';
import type { InvestigationDefendantsPartyMix } from './juvenileInvestigationRules';
import { stageTypeFromStage } from './criminalStageRuntimeCore';
import {
    isTemporaryClosingFollowUp,
    resolveCanConcludeStage,
    shouldOpenInvestigationDecisionModal,
} from './criminalDashboardStageAccess';
import {
    INVESTIGATION_MIXED_JUVENILE_ADULT_REFERRAL_BLOCKED_MESSAGE,
    INVESTIGATION_MIXED_UNKNOWN_IDENTIFIED_REFERRAL_BLOCKED_MESSAGE,
} from './investigationPhaseGuidance';
import { resolveCaseSovereignContext } from './caseClassificationEngine';
import type { StageFinalDecisionFormPayload } from './stageFinalDecisionEngine';
import type { CriminalDashboardModalUiState } from './useCriminalDashboardModalUiState';
import type { CriminalStageCloserOrchestratorSlice } from './orchestrators/criminalOrchestratorSliceTypes';

type UseCriminalDashboardFinalDecisionEntryParams = {
    id: string;
    criminalCase: CriminalCase;
    rawCase: CriminalCase | null;
    stage: string;
    isInvestigationPhase: boolean;
    isTrialCourtStage: boolean;
    isJuvenileTrial: boolean;
    isCassationStage: boolean;
    isPrejudicialFrozen: boolean;
    isTimelineArchiveReadOnly: boolean;
    isDashboardReadOnly: boolean;
    isInvestigationDossierSealed: boolean;
    isArchived: boolean;
    isDefaultJudgmentArchived: boolean;
    finalDecision: CriminalCase['finalDecision'];
    showTrialsTab: boolean;
    showJourneyReferralButton: boolean;
    defendants: CriminalDefendant[];
    investigationHasMixedUnknownAndIdentified: boolean;
    investigationDefendantsPartyMix: InvestigationDefendantsPartyMix;
    firstJuvenileDefendant: CriminalDefendant | null;
    modalUiState: CriminalDashboardModalUiState;
    stageCloserOrchestrator: CriminalStageCloserOrchestratorSlice;
    openJudicialDecisionModal: () => void;
    setTrialSessionAddModalOpen: Dispatch<SetStateAction<boolean>>;
    ensureCaseSovereignContext: CriminalStoreState['ensureCaseSovereignContext'];
    registerStageFinalDecision: CriminalStoreState['registerStageFinalDecision'];
    syncTrialSessionVerdictFromStageFinal: CriminalStoreState['syncTrialSessionVerdictFromStageFinal'];
    updateJuvenileSocialInquiryReport: CriminalStoreState['updateJuvenileSocialInquiryReport'];
    updateLegalArticle: CriminalStoreState['updateLegalArticle'];
    showLegalToast: (message: string, durationMs?: number) => void;
    showLegalError: (message?: string) => void;
};

/**
 * مدخل «القرار الختامي» بكل تفرّعاته (تحقيق/محاكمة/تمييز/طعن غيابي/متابعة بعد الغلق) + مودالات
 * الغلق الختامي، التعديل القانوني، ومصادرة الكفالة، والتحقيق الاجتماعي للقاصر — مستخرَجة من
 * الـ runtime دون أي تغيير في المنطق أو الترتيب.
 */
export function useCriminalDashboardFinalDecisionEntry({
    id,
    criminalCase,
    rawCase,
    stage,
    isInvestigationPhase,
    isTrialCourtStage,
    isJuvenileTrial,
    isCassationStage,
    isPrejudicialFrozen,
    isTimelineArchiveReadOnly,
    isDashboardReadOnly,
    isInvestigationDossierSealed,
    isArchived,
    isDefaultJudgmentArchived,
    finalDecision,
    showTrialsTab,
    showJourneyReferralButton,
    defendants,
    investigationHasMixedUnknownAndIdentified,
    investigationDefendantsPartyMix,
    firstJuvenileDefendant,
    modalUiState,
    stageCloserOrchestrator,
    openJudicialDecisionModal,
    setTrialSessionAddModalOpen,
    ensureCaseSovereignContext,
    registerStageFinalDecision,
    syncTrialSessionVerdictFromStageFinal,
    updateJuvenileSocialInquiryReport,
    updateLegalArticle,
    showLegalToast,
    showLegalError,
}: UseCriminalDashboardFinalDecisionEntryParams) {
    const {
        setForfeitureModal,
        setIsLegalEditOpen,
        legalArticleNext,
        legalChangedBy,
        setInvestigationDecisionError,
        setIsInvestigationDecisionOpen,
        setIsStageFinalDecisionOpen,
        trialFinalDecisionSessionIdRef,
        setStageFinalDecisionError,
    } = modalUiState;
    const {
        setStageCloserError,
        setClosureDecisionType,
        setClosureDate,
        setClosureDetails,
        setClosureDefendantStatus,
        setClosureExpirationReason,
        setClosureExpirationDefendantIds,
        setClosureReferralStage,
        setClosureReferralCourtName,
        setClosureReferralCaseNumber,
        setClosureSuspendedExecution,
        setClosurePunishmentType,
        setClosureJuvenileSeverDefendantId,
        setClosureScopedDefendantIds,
        setClosureSharedObjective269b,
        setStageCloserReferralOnly,
        setIsStageCloserOpen,
    } = stageCloserOrchestrator;

    const openForfeitureUpdate = useCallback(
        (defendantId: string) => {
            const def = defendants.find((d) => d.id === defendantId);
            const g = normalizeGuarantorDetails(def?.guarantorDetails);
            setForfeitureModal({
                defendantId,
                forfeitureNote: String(g?.guarantorInfo ?? ''),
            });
        },
        [defendants, setForfeitureModal],
    );

    const submitLegalEdit = useCallback(() => {
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
    }, [id, legalArticleNext, legalChangedBy, setIsLegalEditOpen, showLegalError, updateLegalArticle]);

    const patchSocialInquiryReport = useCallback(
        (patch: {
            workflowStatus?: SocialInquiryWorkflowStatus;
            isAttached?: boolean;
            receivedDate?: string;
            investigatorName?: string;
            recommendations?: string;
        }) => {
            if (!firstJuvenileDefendant) return;
            const base = firstJuvenileDefendant.socialInquiryReport ?? {
                isAttached: false,
                workflowStatus: 'not_requested' as const,
            };
            const nextWorkflow =
                typeof patch.workflowStatus === 'string' && isValidSocialInquiryWorkflowStatus(patch.workflowStatus)
                    ? patch.workflowStatus
                    : base.workflowStatus ?? 'not_requested';
            const nextAttached =
                typeof patch.isAttached === 'boolean' ? patch.isAttached : nextWorkflow === 'submitted' || base.isAttached === true;
            updateJuvenileSocialInquiryReport(id, firstJuvenileDefendant.id, {
                workflowStatus: nextWorkflow,
                isAttached: nextAttached,
                receivedDate: typeof patch.receivedDate === 'string' ? patch.receivedDate : String(base.receivedDate ?? ''),
                investigatorName:
                    typeof patch.investigatorName === 'string' ? patch.investigatorName : String(base.investigatorName ?? ''),
                recommendations:
                    typeof patch.recommendations === 'string' ? patch.recommendations : String(base.recommendations ?? ''),
            });
        },
        [firstJuvenileDefendant, id, updateJuvenileSocialInquiryReport],
    );

    const useStageFinalDecisionSystem =
        isTrialCourtStage && !isJuvenileTrial && !isCassationStage;

    const caseSovereignContext = useMemo(
        () => (rawCase ? resolveCaseSovereignContext(rawCase) : null),
        [rawCase],
    );

    const openStageFinalDecisionModal = useCallback(() => {
        if (isPrejudicialFrozen) return;
        ensureCaseSovereignContext(id);
        setStageFinalDecisionError('');
        setIsStageFinalDecisionOpen(true);
    }, [ensureCaseSovereignContext, id, isPrejudicialFrozen, setIsStageFinalDecisionOpen, setStageFinalDecisionError]);

    const openInvestigationDecisionModal = useCallback(() => {
        if (isPrejudicialFrozen) return;
        if (investigationHasMixedUnknownAndIdentified) {
            showLegalToast(INVESTIGATION_MIXED_UNKNOWN_IDENTIFIED_REFERRAL_BLOCKED_MESSAGE, 6000);
            return;
        }
        if (investigationDefendantsPartyMix === 'mixed') {
            showLegalToast(INVESTIGATION_MIXED_JUVENILE_ADULT_REFERRAL_BLOCKED_MESSAGE, 6000);
            return;
        }
        setInvestigationDecisionError('');
        setIsInvestigationDecisionOpen(true);
    }, [
        investigationDefendantsPartyMix,
        investigationHasMixedUnknownAndIdentified,
        isPrejudicialFrozen,
        setIsInvestigationDecisionOpen,
        setInvestigationDecisionError,
        showLegalToast,
    ]);

    /** يهيّئ مسودة مودال الغلق الختامي/الإحالة بالقيم الافتراضية — مُشترَك بين فتح الغلق وفتح إحالة المحاكمة. */
    const openStageCloserDraft = useCallback(
        (referralOnly: boolean) => {
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
            setStageCloserReferralOnly(referralOnly);
            setIsStageCloserOpen(true);
        },
        [
            defendants,
            setClosureDate,
            setClosureDecisionType,
            setClosureDefendantStatus,
            setClosureDetails,
            setClosureExpirationDefendantIds,
            setClosureExpirationReason,
            setClosureJuvenileSeverDefendantId,
            setClosurePunishmentType,
            setClosureReferralCaseNumber,
            setClosureReferralCourtName,
            setClosureReferralStage,
            setClosureScopedDefendantIds,
            setClosureSharedObjective269b,
            setClosureSuspendedExecution,
            setIsStageCloserOpen,
            setStageCloserError,
            setStageCloserReferralOnly,
        ],
    );

    const openStageCloser = useCallback(() => {
        if (isPrejudicialFrozen) return;
        if (isInvestigationPhase) return;
        openStageCloserDraft(false);
    }, [isInvestigationPhase, isPrejudicialFrozen, openStageCloserDraft]);

    const canConcludeStageValue = resolveCanConcludeStage({
        isDefaultJudgmentArchived,
        isArchived,
        isPrejudicialFrozen,
        finalDecision,
        isInvestigationPhase,
        hasTrialStageType: Boolean(stageTypeFromStage(stage)),
    });

    const openDefaultJudgmentOpposition = useMemo(
        () =>
            isDefaultJudgmentArchived && isArchived
                ? () => {
                      setStageCloserError('');
                      setClosureDecisionType('default_judgment_opposition');
                      setClosureDate(new Date().toISOString().slice(0, 10));
                      setClosureDetails('');
                      setClosureScopedDefendantIds(defendants.map((d) => d.id));
                      setIsStageCloserOpen(true);
                  }
                : null,
        [
            defendants,
            isArchived,
            isDefaultJudgmentArchived,
            setClosureDate,
            setClosureDecisionType,
            setClosureDetails,
            setClosureScopedDefendantIds,
            setIsStageCloserOpen,
            setStageCloserError,
        ],
    );

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

    const openTrialReferralOrders = useCallback(() => {
        if (!showJourneyReferralButton) return;
        if (isPrejudicialFrozen || isTimelineArchiveReadOnly || isDashboardReadOnly) return;
        openStageCloserDraft(true);
    }, [isDashboardReadOnly, isPrejudicialFrozen, isTimelineArchiveReadOnly, openStageCloserDraft, showJourneyReferralButton]);

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
        [ensureCaseSovereignContext, id, isPrejudicialFrozen, setIsStageFinalDecisionOpen, setStageFinalDecisionError, trialFinalDecisionSessionIdRef],
    );

    const submitStageFinalDecision = useCallback(
        (
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
            showLegalToast('✓ تم حفظ القرار الختامي وتوليد بطاقة الحكم.', 4500);
        },
        [
            id,
            registerStageFinalDecision,
            setIsStageFinalDecisionOpen,
            setStageFinalDecisionError,
            setTrialSessionAddModalOpen,
            showLegalToast,
            syncTrialSessionVerdictFromStageFinal,
            trialFinalDecisionSessionIdRef,
        ],
    );

    return {
        openForfeitureUpdate,
        submitLegalEdit,
        patchSocialInquiryReport,
        useStageFinalDecisionSystem,
        caseSovereignContext,
        openStageFinalDecisionModal,
        openInvestigationDecisionModal,
        openDefaultJudgmentOpposition,
        isTemporaryClosingFollowUpStage,
        showInvestigationFinalDecisionAction,
        finalDecisionActionLabel,
        showInvestigationReferralInJourney,
        showFinalDecisionInCriminalHeader,
        openTrialReferralOrders,
        openFinalDecisionEntry,
        openStageFinalDecisionFromTrialSession,
        submitStageFinalDecision,
    };
}
