import { useEffect, useMemo } from 'react';
import type { CaseStage, JourneyNode } from '@/app/types/criminal';
import type { CriminalCase, CriminalStoreState } from './criminalStore';
import type { JourneyBranchTrack } from './stageJourneyRuntimeCore';
import { eventBelongsToJourneyBranch, eventBelongsToJourneyNode } from './stageJourneyRuntimeCore';
import { inferDecisionPresenceFromTrialSessions, sortTrialSessionsAsc } from './trialSessionsEngine';
import { resolveCurrentAccusationArticleFromCase } from './trialChargeEngine';
import { normalizeVerdictCards, resolveVerdictCardsLifecycle } from './verdictCardsEngine';

type UseCriminalDashboardCaseCollectionsParams = {
    id: string;
    criminalCase: CriminalCase;
    rawCase: CriminalCase | null;
    requestsTabActive: boolean;
    statementsTabActive: boolean;
    stageJourney: JourneyNode[];
    selectedJourneyNode: JourneyNode | null;
    isHistoricalNodeView: boolean;
    activeJourneyBranch: JourneyBranchTrack | null;
    legalArticleHistory: CriminalCase['legalArticleHistory'];
    effectiveUiStage: CaseStage;
    refreshVerdictCardLifecycles: CriminalStoreState['refreshVerdictCardLifecycles'];
};

/**
 * مجموعات/قوائم القضية المشتقّة (إفادات، أدلة أخرى، طلبات محامي مرتّبة، جلسات محاكمة، محاضر مرافعة،
 * بطاقات الحكم) — مستخرَجة من الـ runtime دون أي تغيير في المنطق أو الترتيب.
 */
export function useCriminalDashboardCaseCollections({
    id,
    criminalCase,
    rawCase,
    requestsTabActive,
    statementsTabActive,
    stageJourney,
    selectedJourneyNode,
    isHistoricalNodeView,
    activeJourneyBranch,
    legalArticleHistory,
    effectiveUiStage,
    refreshVerdictCardLifecycles,
}: UseCriminalDashboardCaseCollectionsParams) {
    const statements = Array.isArray(criminalCase.statements) ? criminalCase.statements : [];
    const otherEvidenceItems = Array.isArray(criminalCase.otherEvidenceItems)
        ? criminalCase.otherEvidenceItems
        : [];

    const lawyerRequests = useMemo(
        () => (Array.isArray(criminalCase.lawyerRequests) ? criminalCase.lawyerRequests : []),
        [criminalCase.lawyerRequests],
    );
    const trialSessions = useMemo(
        () => (Array.isArray(criminalCase.trials) ? criminalCase.trials : []),
        [criminalCase.trials],
    );
    const inferredStageFinalPresence = useMemo(
        () => inferDecisionPresenceFromTrialSessions(trialSessions),
        [trialSessions],
    );
    const trialDepositions = Array.isArray(criminalCase.trialDepositions) ? criminalCase.trialDepositions : [];
    const currentAccusationArticle = resolveCurrentAccusationArticleFromCase({
        currentAccusationArticle: criminalCase.currentAccusationArticle,
        chargeModifications: criminalCase.chargeModifications,
        referralArticle: criminalCase.referralArticle,
        legalArticleHistory: legalArticleHistory,
        basicsLegalArticle: criminalCase.basics.legalArticle,
    });
    const sortedLawyerRequests = useMemo(() => {
        if (!requestsTabActive) return [];
        const list = [...lawyerRequests];
        list.sort((a, b) => {
            const aTime = typeof a.requestDate === 'string' ? Date.parse(a.requestDate) : 0;
            const bTime = typeof b.requestDate === 'string' ? Date.parse(b.requestDate) : 0;
            return bTime - aTime;
        });
        return list;
    }, [requestsTabActive, lawyerRequests]);

    const sortedLawyerRequestsForNode = useMemo(() => {
        if (!requestsTabActive) return [];
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
    }, [requestsTabActive, activeJourneyBranch, isHistoricalNodeView, stageJourney, selectedJourneyNode, sortedLawyerRequests]);

    const verdictCards = useMemo(
        () => resolveVerdictCardsLifecycle(normalizeVerdictCards(rawCase?.verdictCards)),
        [rawCase?.verdictCards],
    );

    useEffect(() => {
        if (!id) return;
        refreshVerdictCardLifecycles(id);
    }, [id, refreshVerdictCardLifecycles]);

    const sortedTrialSessionsForDepositions = useMemo(
        () => (statementsTabActive ? sortTrialSessionsAsc(trialSessions) : []),
        [statementsTabActive, trialSessions],
    );

    const trialSessionsTabLabel =
        effectiveUiStage === 'felony' ? 'جلسات محكمة الجنايات' : 'جلسات ومحاضر المرافعة';

    return {
        statements,
        otherEvidenceItems,
        lawyerRequests,
        trialSessions,
        inferredStageFinalPresence,
        trialDepositions,
        currentAccusationArticle,
        sortedLawyerRequests,
        sortedLawyerRequestsForNode,
        verdictCards,
        sortedTrialSessionsForDepositions,
        trialSessionsTabLabel,
    };
}
