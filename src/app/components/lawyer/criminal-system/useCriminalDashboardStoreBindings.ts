import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useCriminalStore, type CriminalCase, resolveMergedCaseIds } from './criminalStore';
import { resolveCriminalCaseForDisplay } from './caseSeveranceView';
import { makeInitialDraft } from './criminalCaseDraftFactory';
import { buildInitialStageJourney } from './stageJourneyRuntimeCore';
import { canMutateCriminalCaseForLawyer, isOrphanCriminalCase } from './criminalCaseOwner';

function createMissingCriminalCase(id: string): CriminalCase {
    const draft = makeInitialDraft();
    return {
        ...draft,
        id,
        createdAt: '',
        legalArticleHistory: [],
        stageJourney: buildInitialStageJourney(),
        caseStage: 'investigation',
    };
}

/**
 * كل روابط الـ store الخاصة بـ CriminalDashboardResolvedRuntime في مكان واحد:
 * حل القضية المعروضة (مع الدمج/الشطر) + كل الإجراءات (actions) التي يستدعيها Runtime.
 * الهدف تقليص composition root دون أي تغيير في سلوك الـ selectors.
 */
export function useCriminalDashboardStoreBindings(id: string) {
    const trimmedId = String(id ?? '').trim();
    const rawCase = useCriminalStore(
        useShallow((s) => {
            const direct = s.casesById[trimmedId];
            if (direct) return direct;
            // قد يُحقَن السجل بمفتاح id الداخلي إن اختلف عن مفتاح الخريطة
            for (const row of Object.values(s.casesById)) {
                if (row && String(row.id ?? '').trim() === trimmedId) return row;
            }
            return null;
        }),
    );
    const [hasHydrated, setHasHydrated] = useState(() =>
        typeof useCriminalStore.persist?.hasHydrated === 'function'
            ? useCriminalStore.persist.hasHydrated()
            : true,
    );
    useEffect(() => {
        if (hasHydrated) return;
        if (typeof useCriminalStore.persist?.onFinishHydration !== 'function') {
            setHasHydrated(true);
            return;
        }
        const unsub = useCriminalStore.persist.onFinishHydration(() => setHasHydrated(true));
        if (useCriminalStore.persist.hasHydrated()) setHasHydrated(true);
        // بعد التهيئة عند الفتح (prime) لا نُطيل BootChrome أكثر من اللازم
        const safety = window.setTimeout(() => setHasHydrated(true), 3_500);
        return () => {
            unsub();
            window.clearTimeout(safety);
        };
    }, [hasHydrated]);
    const mergedCaseIdsForLookup = useMemo(
        () => resolveMergedCaseIds(rawCase ?? undefined),
        [rawCase],
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
    const resolvedCriminalCase = useMemo(
        () => resolveCriminalCaseForDisplay(rawCase, displayCasesById),
        [rawCase, displayCasesById],
    );
    const isCaseHydrating = !resolvedCriminalCase && !hasHydrated;
    const isMissingCase = !resolvedCriminalCase && hasHydrated;
    const sessionOwnerLawyerId = useCriminalStore((s) => s.sessionOwnerLawyerId);
    const isAccessDenied =
        Boolean(resolvedCriminalCase) &&
        !canMutateCriminalCaseForLawyer(resolvedCriminalCase, sessionOwnerLawyerId);
    const isOrphanLegacyCase =
        Boolean(resolvedCriminalCase) &&
        isOrphanCriminalCase(resolvedCriminalCase) &&
        Boolean(String(sessionOwnerLawyerId ?? '').trim());
    const criminalCase = useMemo(
        () => resolvedCriminalCase ?? createMissingCriminalCase(id),
        [resolvedCriminalCase, id],
    );

    const pendingSeveranceContext = useCriminalStore((s) => s.pendingSeveranceContext);
    const resumePendingSeveranceForm = useCriminalStore((s) => s.resumePendingSeveranceForm);
    const stashPendingSeveranceForm = useCriminalStore((s) => s.stashPendingSeveranceForm);
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
    const registerInitialTrialHearingDate = useCriminalStore((s) => s.registerInitialTrialHearingDate);
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
    const extendDetentionOnDecision = useCriminalStore((s) => s.extendDetentionOnDecision);
    const documentDetentionReleaseOnDecision = useCriminalStore((s) => s.documentDetentionReleaseOnDecision);
    const updateOrderEnforcementOnDecision = useCriminalStore((s) => s.updateOrderEnforcementOnDecision);
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
    const updateJuvenileSocialInquiryReport = useCriminalStore((s) => s.updateJuvenileSocialInquiryReport);
    const mergeCases = useCriminalStore((s) => s.mergeCases);
    const severJuvenileDefendantToJuvenileCourt = useCriminalStore((s) => s.severJuvenileDefendantToJuvenileCourt);
    const claimCriminalCaseOwnership = useCriminalStore((s) => s.claimCriminalCaseOwnership);

    return {
        rawCase,
        displayCasesById,
        resolvedCriminalCase,
        isCaseHydrating,
        isMissingCase,
        isAccessDenied,
        isOrphanLegacyCase,
        criminalCase,

        pendingSeveranceContext,
        resumePendingSeveranceForm,
        stashPendingSeveranceForm,
        addStatement,
        addOtherEvidenceItem,
        updateStatement,
        moveStatementToTrash,
        moveLawyerRequestToTrash,
        moveJudicialDecisionToTrash,
        moveOtherEvidenceToTrash,
        restoreTrashItem,
        purgeTrashItem,
        addTrialSession,
        updateTrialSession,
        postponeTrialSession,
        registerInitialTrialHearingDate,
        documentTrialSessionPreparatoryDecision,
        addTrialDeposition,
        updateTrialDeposition,
        deleteTrialDeposition,
        correctCasePartyName,
        correctCaseCourtName,
        correctCaseLegalArticle,
        correctCaseReferenceNumbers,
        correctCaseDepositionLocation,
        extendDetentionOnDecision,
        documentDetentionReleaseOnDecision,
        updateOrderEnforcementOnDecision,
        addRequestMargin,
        toggleRequestStar,
        addRequestAttachment,
        removeRequestAttachment,
        fileJudicialDecisionAppeal,
        recordJudicialAppealResult,
        declareJudicialDecisionFinal,
        patchJudicialDecisionLifecycle,
        updateVerdictCardDraft,
        patchVerdictCardOrdinaryAppeal,
        recordVerdictCardCassationResult,
        patchVerdictCardCorrectionAppeal,
        registerStageFinalDecision,
        syncTrialSessionVerdictFromStageFinal,
        recordVerdictAbsentiaPublication,
        recordVerdictAbsentiaObjection,
        refreshVerdictCardLifecycles,
        ensureCaseSovereignContext,
        confirmBailAfterAppeal,
        fileInAbsentiaObjection,
        updateBailForfeiture,
        updateCasePhysicalLocation,
        updateLegalArticle,
        waivePrivateRight,
        issueStageDecision,
        applyInvestigationReferral,
        referInvestigationDefendantToTrial,
        beginSeveranceFromDossier,
        referAndGenerateCase,
        reopenClosedCase,
        endInvestigationTemporaryClosure,
        initiateCassationProceeding,
        updateJuvenileSocialInquiryReport,
        mergeCases,
        severJuvenileDefendantToJuvenileCourt,
        claimCriminalCaseOwnership,
    };
}
