import type { CaseStage, JourneyNode } from '@/app/types/criminal';
import type { LawyerRequest } from './criminalCaseModel';
import type { JudicialDecision } from './judicialDecisionsEngine';
import { judicialDecisionPersistKey } from './judicialDecisionsEngine';
import type { TrialSession } from './trialSessionsEngine';
import type { DecisionsLedgerKindFilter } from './judicialDecisionsLedgerEngine';
import { isLawyerRequestPending } from './lawyerRequestStatusMachine';
import type {
    DecisionsScopeFilter,
    DecisionsScopeOption,
    RecordPhaseLookupItem,
    ScopeRecordItem,
} from './casePhaseFilterTypes';
import { resolveRecordJourneyStage } from './casePhaseJourneyStage';

function stagesForCurrentScope(currentUiStage: CaseStage): CaseStage[] {
    if (currentUiStage === 'misdemeanor') return ['misdemeanor'];
    if (currentUiStage === 'felony') return ['felony'];
    if (currentUiStage === 'cassation') return ['cassation'];
    if (currentUiStage === 'investigation') return ['investigation'];
    if (currentUiStage === 'evading_arrest') return ['evading_arrest'];
    if (currentUiStage === 'absentia_trial') return ['absentia_trial'];
    return [currentUiStage];
}

function stagesForPreviousScope(currentUiStage: CaseStage): CaseStage[] {
    if (currentUiStage === 'investigation') return ['misdemeanor', 'felony', 'cassation'];
    if (currentUiStage === 'misdemeanor') return ['investigation'];
    if (currentUiStage === 'felony') return ['misdemeanor', 'investigation'];
    if (currentUiStage === 'cassation') return ['felony', 'misdemeanor', 'investigation'];
    return [];
}

/** مرحلة تحقيق أولى — لا عُقد ماضية بعد؛ فلتر الحالية/السابقة غير ذي معنى. */
export function isFirstInvestigationStageOnly(
    currentUiStage: CaseStage,
    stageJourney: JourneyNode[] | undefined,
): boolean {
    if (currentUiStage !== 'investigation') return false;
    const nodes = Array.isArray(stageJourney) ? stageJourney : [];
    return !nodes.some((n) => n.status === 'past');
}

export function shouldShowDecisionsScopeFilterBar(
    currentUiStage: CaseStage,
    stageJourney: JourneyNode[] | undefined,
): boolean {
    if (isFirstInvestigationStageOnly(currentUiStage, stageJourney)) return false;
    if (currentUiStage === 'investigation') return true;
    return stagesForPreviousScope(currentUiStage).length > 0;
}

function currentScopeShortLabel(_currentUiStage: CaseStage): string {
    return 'الحالية';
}

function previousScopeShortLabel(_currentUiStage: CaseStage): string {
    return 'المرحلة السابقة';
}

/** تصنيف السجل — «الحالية/السابقة» تعتمد على proceduralNodeId عند الإصدار، ثم التاريخ احتياطاً. */
function resolveItemStageForScope(
    item: RecordPhaseLookupItem,
    stageJourney: JourneyNode[] | undefined,
    _scope: DecisionsScopeFilter,
    _currentUiStage: CaseStage,
): CaseStage {
    return resolveRecordJourneyStage(item, stageJourney);
}

function itemMatchesDecisionsScope(
    item: RecordPhaseLookupItem,
    scope: DecisionsScopeFilter,
    currentUiStage: CaseStage,
    stageJourney: JourneyNode[] | undefined,
): boolean {
    if (scope === 'all') return true;
    const stage = resolveItemStageForScope(item, stageJourney, scope, currentUiStage);
    if (scope === 'investigation') return stage === 'investigation';
    if (scope === 'misdemeanor') return stage === 'misdemeanor';
    if (scope === 'felony') return stage === 'felony';
    if (scope === 'current') return stagesForCurrentScope(currentUiStage).includes(stage);
    if (scope === 'previous') return stagesForPreviousScope(currentUiStage).includes(stage);
    return true;
}

export function filterTrialSessionsByDecisionsScope(
    sessions: TrialSession[],
    scope: DecisionsScopeFilter,
    currentUiStage: CaseStage,
    stageJourney: JourneyNode[] | undefined,
): TrialSession[] {
    if (scope === 'all') return sessions;
    return sessions.filter((session) =>
        itemMatchesDecisionsScope(
            {
                date: session.date,
                proceduralNodeId: (session as { proceduralNodeId?: string }).proceduralNodeId,
            },
            scope,
            currentUiStage,
            stageJourney,
        ),
    );
}

export function filterByDecisionsScope<T>(
    items: T[],
    scope: DecisionsScopeFilter,
    currentUiStage: CaseStage,
    stageJourney: JourneyNode[] | undefined,
    resolveItem: (item: T) => RecordPhaseLookupItem,
): T[] {
    if (scope === 'all') return items;
    return items.filter((item) =>
        itemMatchesDecisionsScope(resolveItem(item), scope, currentUiStage, stageJourney),
    );
}

/** طلبات قيد النظر غير مُمثَّلة بعد في سجل القرارات المدمج — لتفادي عدّ مزدوج. */
function orphanPendingLawyerRequests(
    decisions: JudicialDecision[],
    lawyerRequests: LawyerRequest[],
): LawyerRequest[] {
    const ledgerKeys = new Set(decisions.map((d) => judicialDecisionPersistKey(d)));
    return lawyerRequests.filter((r) => {
        if (!isLawyerRequestPending(r)) return false;
        const rid = String(r.id ?? '').trim();
        return !ledgerKeys.has(rid);
    });
}

/** إجمالي عناصر «القرارات والطعون» القابلة للعرض — مصدر واحد مع السجل المدمج. */
export function countDecisionsScopeDisplayTotal(
    decisions: JudicialDecision[],
    lawyerRequests: LawyerRequest[],
    trialSessions: TrialSession[] = [],
    verdictCards: ScopeRecordItem[] = [],
): number {
    return (
        decisions.length +
        orphanPendingLawyerRequests(decisions, lawyerRequests).length +
        trialSessions.length +
        verdictCards.length
    );
}

/** عدّ موحّد لكل محتوى «القرارات والطعون» — بغضّ عن SplitTab الفرعي. */
function countUnifiedDecisionsScopeRows(
    decisions: JudicialDecision[],
    lawyerRequests: LawyerRequest[],
    trialSessions: TrialSession[],
    verdictCards: ScopeRecordItem[],
    scope: DecisionsScopeFilter,
    currentUiStage: CaseStage,
    stageJourney: JourneyNode[] | undefined,
): number {
    const resolveDecision = (d: JudicialDecision) => ({
        issuedAt: d.issuedAt,
        proceduralNodeId: d.proceduralNodeId,
    });
    const resolveRequest = (r: LawyerRequest) => ({
        requestDate: r.requestDate,
        proceduralNodeId: r.proceduralNodeId,
    });
    const resolveVerdictCard = (c: ScopeRecordItem) => ({
        issuedAt: c.issuedAt,
        proceduralNodeId: c.proceduralNodeId,
    });
    const scopedDecisions = filterByDecisionsScope(
        decisions,
        scope,
        currentUiStage,
        stageJourney,
        resolveDecision,
    );
    const scopedRequests = filterByDecisionsScope(
        lawyerRequests,
        scope,
        currentUiStage,
        stageJourney,
        resolveRequest,
    );
    const pendingOrphan = orphanPendingLawyerRequests(decisions, scopedRequests);
    const scopedSessions = filterTrialSessionsByDecisionsScope(
        trialSessions,
        scope,
        currentUiStage,
        stageJourney,
    );
    const scopedVerdictCards = filterByDecisionsScope(
        verdictCards,
        scope,
        currentUiStage,
        stageJourney,
        resolveVerdictCard,
    );
    return (
        scopedDecisions.length +
        pendingOrphan.length +
        scopedSessions.length +
        scopedVerdictCards.length
    );
}

export function buildDecisionsScopeFilterOptions(
    decisions: JudicialDecision[],
    lawyerRequests: LawyerRequest[],
    stageJourney: JourneyNode[] | undefined,
    currentUiStage: CaseStage,
    trialSessions: TrialSession[] = [],
    verdictCards: ScopeRecordItem[] = [],
    _activeTab: DecisionsLedgerKindFilter = 'all',
): DecisionsScopeOption[] {
    if (isFirstInvestigationStageOnly(currentUiStage, stageJourney)) {
        const currentCount = countUnifiedDecisionsScopeRows(
            decisions,
            lawyerRequests,
            trialSessions,
            verdictCards,
            'current',
            currentUiStage,
            stageJourney,
        );
        if (currentCount <= 0) return [];
        return [
            {
                value: 'current',
                label: currentScopeShortLabel(currentUiStage),
                count: currentCount,
            },
        ];
    }

    if (!shouldShowDecisionsScopeFilterBar(currentUiStage, stageJourney)) {
        return [];
    }

    const currentCount = countUnifiedDecisionsScopeRows(
        decisions,
        lawyerRequests,
        trialSessions,
        verdictCards,
        'current',
        currentUiStage,
        stageJourney,
    );
    const previousCount = countUnifiedDecisionsScopeRows(
        decisions,
        lawyerRequests,
        trialSessions,
        verdictCards,
        'previous',
        currentUiStage,
        stageJourney,
    );

    return [
        { value: 'current', label: currentScopeShortLabel(currentUiStage), count: currentCount },
        { value: 'previous', label: previousScopeShortLabel(currentUiStage), count: previousCount },
    ];
}

export function defaultDecisionsScopeForStage(_currentUiStage: CaseStage): DecisionsScopeFilter {
    return 'current';
}
