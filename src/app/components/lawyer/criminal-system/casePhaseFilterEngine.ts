import type { CaseStage, JourneyNode } from '@/app/types/criminal';
import type { LawyerRequest, Statement } from './criminalCaseModel';
import type { JudicialDecision } from './judicialDecisionsEngine';
import { judicialDecisionPersistKey } from './judicialDecisionsEngine';
import type { TrialSession } from './trialSessionsEngine';
import { classifyDecisionLedgerKind } from './decisionsLedgerVisuals';
import type { DecisionsLedgerKindFilter } from './judicialDecisionsLedgerEngine';
import { applyDecisionsLedgerKindFilter } from './judicialDecisionsLedgerEngine';
import type { ProceduralContainer, ProceduralSubItem } from './proceduralContainersEngine';
import { isLawyerRequestPending } from './lawyerRequestStatusMachine';
import { getCurrentJourneyNode, parseEventDateKey } from './stageJourney';

export type CaseRecordPhase = 'investigation' | 'trial';
export type CasePhaseFilter = 'all' | 'investigation' | 'trial';

/** فلتر ذكي لقسم القرارات — مرحلة حالية/سابقة أو مرحلة محددة بوجود قرارات فعلية. */
export type DecisionsScopeFilter =
    | 'all'
    | 'current'
    | 'previous'
    | 'investigation'
    | 'misdemeanor'
    | 'felony';

export type DecisionsScopeOption = {
    value: DecisionsScopeFilter;
    label: string;
    count: number;
};

export function journeyNodeRecordPhase(node: JourneyNode): CaseRecordPhase {
    return node.stage === 'investigation' ? 'investigation' : 'trial';
}

/** تاريخ بداية مرحلة المحكمة المختصة — للفرز التاريخي الاحتياطي. */
export function resolveTrialPhasePivotMs(nodes: JourneyNode[] | undefined): number | null {
    const list = Array.isArray(nodes) ? nodes : [];
    const trialNode = list.find((n) => n.stage === 'misdemeanor' || n.stage === 'felony');
    if (!trialNode) return null;
    if (trialNode.startedAt) return parseEventDateKey(trialNode.startedAt);
    const invNodes = list.filter((n) => n.stage === 'investigation');
    const lastInv = invNodes[invNodes.length - 1];
    if (lastInv?.endedAt) return parseEventDateKey(lastInv.endedAt);
    return null;
}

export function resolveRecordCasePhase(
    item: {
        date?: string;
        requestDate?: string;
        issuedAt?: string;
        proceduralNodeId?: string;
    },
    stageJourney: JourneyNode[] | undefined,
): CaseRecordPhase {
    const nodes = Array.isArray(stageJourney) ? stageJourney : [];
    const nodeId = String(item.proceduralNodeId ?? '').trim();
    if (nodeId) {
        const node = nodes.find((n) => n.id === nodeId);
        if (node) return journeyNodeRecordPhase(node);
    }

    const itemDate = String(item.requestDate ?? item.date ?? item.issuedAt ?? '').trim();
    if (!itemDate) {
        const current = getCurrentJourneyNode(nodes);
        return current ? journeyNodeRecordPhase(current) : 'investigation';
    }

    return resolveCasePhaseByJourneyDate(itemDate, nodes);
}

function resolveCasePhaseByJourneyDate(itemDate: string, nodes: JourneyNode[]): CaseRecordPhase {
    const itemMs = parseEventDateKey(itemDate);
    const datedNodes = nodes
        .filter((n) => String(n.startedAt ?? '').trim().length > 0 && n.status !== 'future')
        .map((n) => ({ node: n, startMs: parseEventDateKey(String(n.startedAt ?? '')) }))
        .sort((a, b) => {
            if (a.startMs !== b.startMs) return a.startMs - b.startMs;
            return String(a.node.id).localeCompare(String(b.node.id), undefined, { numeric: true });
        });
    if (!datedNodes.length) return 'investigation';

    let winner = datedNodes[0]!;
    for (const entry of datedNodes) {
        if (entry.startMs <= itemMs) winner = entry;
        else break;
    }
    return journeyNodeRecordPhase(winner.node);
}

export function resolveStatementCasePhase(statement: Statement, stageJourney: JourneyNode[] | undefined): CaseRecordPhase {
    return resolveRecordCasePhase(
        { date: statement.date, proceduralNodeId: statement.proceduralNodeId },
        stageJourney,
    );
}

export function resolveLawyerRequestCasePhase(
    request: LawyerRequest,
    stageJourney: JourneyNode[] | undefined,
): CaseRecordPhase {
    return resolveRecordCasePhase(
        { requestDate: request.requestDate, proceduralNodeId: request.proceduralNodeId },
        stageJourney,
    );
}

export function resolveJudicialDecisionCasePhase(
    decision: JudicialDecision,
    stageJourney: JourneyNode[] | undefined,
): CaseRecordPhase {
    return resolveRecordCasePhase(
        { issuedAt: decision.issuedAt, proceduralNodeId: decision.proceduralNodeId },
        stageJourney,
    );
}

export function filterByCasePhase<T>(
    items: T[],
    filter: CasePhaseFilter,
    resolvePhase: (item: T) => CaseRecordPhase,
): T[] {
    if (filter === 'all') return items;
    return items.filter((item) => resolvePhase(item) === filter);
}

function orderJourneyNodesForLabels(nodes: JourneyNode[]): JourneyNode[] {
    return nodes
        .filter((n) => n.status !== 'future')
        .slice()
        .sort((a, b) => {
            const ta = parseEventDateKey(String(a.startedAt ?? ''));
            const tb = parseEventDateKey(String(b.startedAt ?? ''));
            if (ta !== tb) return ta - tb;
            return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
        });
}

function resolveJourneyNodeById(nodeId: string, nodes: JourneyNode[]): JourneyNode | undefined {
    const id = String(nodeId ?? '').trim();
    if (!id) return undefined;
    return nodes.find((n) => n.id === id);
}

function resolveJourneyNodeByRecordDate(itemDate: string, nodes: JourneyNode[]): JourneyNode | undefined {
    if (!itemDate.trim()) return undefined;
    const datedNodes = orderJourneyNodesForLabels(nodes).filter((n) => String(n.startedAt ?? '').trim());
    if (!datedNodes.length) return undefined;
    const itemMs = parseEventDateKey(itemDate);
    let winner = datedNodes[0]!;
    for (const node of datedNodes) {
        const startMs = parseEventDateKey(String(node.startedAt ?? ''));
        if (startMs <= itemMs) winner = node;
        else break;
    }
    return winner;
}

/** مرحلة الإضبارة الدقيقة لسجل (تحقيق/جنح/جنايات/…). */
export function resolveRecordJourneyStage(
    item: {
        date?: string;
        requestDate?: string;
        issuedAt?: string;
        attachmentDate?: string;
        proceduralNodeId?: string;
    },
    stageJourney: JourneyNode[] | undefined,
): CaseStage {
    const nodes = Array.isArray(stageJourney) ? stageJourney : [];
    const nodeId = String(item.proceduralNodeId ?? '').trim();
    const byId = nodeId ? resolveJourneyNodeById(nodeId, nodes) : undefined;
    if (byId) return byId.stage;

    const itemDate = String(
        item.requestDate ?? item.date ?? item.issuedAt ?? item.attachmentDate ?? '',
    ).trim();
    const byDate = itemDate ? resolveJourneyNodeByRecordDate(itemDate, nodes) : undefined;
    if (byDate) return byDate.stage;

    const current = getCurrentJourneyNode(nodes);
    return current?.stage ?? 'investigation';
}

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
    item: {
        date?: string;
        requestDate?: string;
        issuedAt?: string;
        attachmentDate?: string;
        proceduralNodeId?: string;
    },
    stageJourney: JourneyNode[] | undefined,
    _scope: DecisionsScopeFilter,
    _currentUiStage: CaseStage,
): CaseStage {
    return resolveRecordJourneyStage(item, stageJourney);
}

type ScopeRecordItem = {
    date?: string;
    requestDate?: string;
    issuedAt?: string;
    attachmentDate?: string;
    proceduralNodeId?: string;
};

export function itemMatchesDecisionsScope(
    item: {
        date?: string;
        requestDate?: string;
        issuedAt?: string;
        attachmentDate?: string;
        proceduralNodeId?: string;
    },
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
    resolveItem: (item: T) => {
        date?: string;
        requestDate?: string;
        issuedAt?: string;
        attachmentDate?: string;
        proceduralNodeId?: string;
    },
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

export function partitionStatementsByPhase(
    statements: Statement[],
    stageJourney: JourneyNode[] | undefined,
): { trial: Statement[]; investigation: Statement[] } {
    const trial: Statement[] = [];
    const investigation: Statement[] = [];
    for (const st of statements) {
        const phase = resolveStatementCasePhase(st, stageJourney);
        if (phase === 'trial') trial.push(st);
        else investigation.push(st);
    }
    return { trial, investigation };
}

export function caseRecordPhaseShortLabel(phase: CaseRecordPhase): string {
    return phase === 'investigation' ? 'تحقيق' : 'محاكمة';
}

function investigationNodeOrdinal(node: JourneyNode, nodes: JourneyNode[]): number | null {
    const investigationNodes = orderJourneyNodesForLabels(nodes).filter((n) => n.stage === 'investigation');
    if (investigationNodes.length <= 1) return null;
    const idx = investigationNodes.findIndex((n) => n.id === node.id);
    return idx >= 0 ? idx + 1 : null;
}

function formatJourneyNodeStageLabel(node: JourneyNode, nodes: JourneyNode[]): string {
    const label = String(node.label ?? '').trim();
    if (node.stage === 'investigation') {
        const ord = investigationNodeOrdinal(node, nodes);
        return ord && ord > 1 ? `مرحلة تحقيق ${ord}` : 'مرحلة التحقيق';
    }
    if (node.stage === 'misdemeanor') return label || 'محكمة الجنح';
    if (node.stage === 'felony') return label || 'محكمة الجنايات';
    if (node.stage === 'cassation') return label || 'مرحلة التمييز';
    if (node.stage === 'evading_arrest') return label || 'التملص من الوجه العدالة';
    if (node.stage === 'absentia_trial') return label || 'المحاكمة الغيابية';
    return label || caseRecordPhaseShortLabel(journeyNodeRecordPhase(node));
}

/** تسمية مرحلة الإضبارة لبطاقة إفادة/دليل/طلب — حسب العقدة الإجرائية أو التاريخ. */
export function resolveRecordJourneyStageLabel(
    item: {
        date?: string;
        requestDate?: string;
        issuedAt?: string;
        attachmentDate?: string;
        proceduralNodeId?: string;
    },
    stageJourney: JourneyNode[] | undefined,
): string {
    const nodes = Array.isArray(stageJourney) ? stageJourney : [];
    const nodeId = String(item.proceduralNodeId ?? '').trim();
    const byId = nodeId ? resolveJourneyNodeById(nodeId, nodes) : undefined;
    if (byId) return formatJourneyNodeStageLabel(byId, nodes);

    const itemDate = String(
        item.requestDate ?? item.date ?? item.issuedAt ?? item.attachmentDate ?? '',
    ).trim();
    const byDate = itemDate ? resolveJourneyNodeByRecordDate(itemDate, nodes) : undefined;
    if (byDate) return formatJourneyNodeStageLabel(byDate, nodes);

    const current = getCurrentJourneyNode(nodes);
    if (current) return formatJourneyNodeStageLabel(current, nodes);

    return 'مرحلة غير محددة';
}

export function filterJudicialDecisionsForLedger(
    decisions: JudicialDecision[],
    kindFilter: DecisionsLedgerKindFilter | undefined,
    scopeFilter: DecisionsScopeFilter,
    currentUiStage: CaseStage,
    stageJourney: JourneyNode[] | undefined,
): JudicialDecision[] {
    const phaseScoped = filterByDecisionsScope(
        decisions,
        scopeFilter,
        currentUiStage,
        stageJourney,
        (d) => ({ issuedAt: d.issuedAt, proceduralNodeId: d.proceduralNodeId }),
    );
    if (!kindFilter || kindFilter === 'all') return phaseScoped;
    if (kindFilter === 'lawyer_motion') {
        return phaseScoped.filter((d) => classifyDecisionLedgerKind(d) === 'lawyer_motion');
    }
    if (kindFilter === 'trial_sessions') {
        return [];
    }
    if (kindFilter === 'juvenile_judicial' || kindFilter === 'judicial') {
        return applyDecisionsLedgerKindFilter(phaseScoped, kindFilter);
    }
    return phaseScoped;
}

type DecisionsLedgerScopedSnapshot = {
    decisions: JudicialDecision[];
    lawyerRequests: LawyerRequest[];
    trialSessions: TrialSession[];
    verdictCards: ScopeRecordItem[];
};

export function countDecisionsLedgerKinds(
    decisions: JudicialDecision[],
    lawyerRequests: LawyerRequest[],
    scopeFilter: DecisionsScopeFilter,
    currentUiStage: CaseStage,
    stageJourney: JourneyNode[] | undefined,
    trialSessions: TrialSession[] = [],
    verdictCards: ScopeRecordItem[] = [],
    scopedSnapshot?: DecisionsLedgerScopedSnapshot,
): { all: number; trial_sessions: number; lawyer_motion: number } {
    const phaseScopedDecisions =
        scopedSnapshot?.decisions ??
        filterByDecisionsScope(
            decisions,
            scopeFilter,
            currentUiStage,
            stageJourney,
            (d) => ({ issuedAt: d.issuedAt, proceduralNodeId: d.proceduralNodeId }),
        );
    const phaseScopedRequests =
        scopedSnapshot?.lawyerRequests ??
        filterByDecisionsScope(
            lawyerRequests,
            scopeFilter,
            currentUiStage,
            stageJourney,
            (r) => ({ requestDate: r.requestDate, proceduralNodeId: r.proceduralNodeId }),
        );
    const pendingCount = phaseScopedRequests.filter((r) => {
        const s = String(r.status ?? '').trim();
        return s === 'قيد النظر' || s === 'pending';
    }).length;
    let lawyerMotionDecisionCount = 0;
    for (const d of phaseScopedDecisions) {
        const kind = classifyDecisionLedgerKind(d);
        if (kind === 'lawyer_motion') lawyerMotionDecisionCount += 1;
    }
    const scopedTrialSessions =
        scopedSnapshot?.trialSessions ??
        filterTrialSessionsByDecisionsScope(trialSessions, scopeFilter, currentUiStage, stageJourney);
    const scopedVerdictCards =
        scopedSnapshot?.verdictCards ??
        filterByDecisionsScope(
            verdictCards,
            scopeFilter,
            currentUiStage,
            stageJourney,
            (c) => ({ issuedAt: c.issuedAt, proceduralNodeId: c.proceduralNodeId }),
        );
    return {
        all:
            phaseScopedDecisions.length +
            scopedVerdictCards.length +
            phaseScopedRequests.filter((r) => {
                const s = String(r.status ?? '').trim();
                return s === 'قيد النظر' || s === 'pending';
            }).length,
        trial_sessions: scopedTrialSessions.length,
        lawyer_motion: pendingCount + lawyerMotionDecisionCount,
    };
}

function collectContainerDates(container: ProceduralContainer): string[] {
    const dates: string[] = [];
    const walk = (items: ProceduralSubItem[]) => {
        for (const item of items) {
            if (item.type === 'action' && item.date) dates.push(String(item.date).trim());
            if (item.type === 'container') collectContainerDates(item.container);
        }
    };
    walk(container.subItems);
    if (container.pathEndedAt) dates.push(String(container.pathEndedAt).trim());
    return dates.filter(Boolean);
}

function maxIsoDate(dates: string[]): string {
    const list = dates.filter(Boolean);
    if (!list.length) return '';
    return list.sort((a, b) => parseEventDateKey(a) - parseEventDateKey(b))[list.length - 1] ?? '';
}

/** مرحلة المسار الجذري — من تاريخ الإنهاء/آخر نشاط مقابل بداية المحاكمة. */
export function resolveProceduralRootCasePhase(
    root: ProceduralContainer,
    stageJourney: JourneyNode[] | undefined,
): CaseRecordPhase {
    if (root.parentId != null) return 'investigation';

    const dates = collectContainerDates(root);
    let referenceDate = '';

    if (root.pathStatus === 'completed') {
        referenceDate = String(root.pathEndedAt ?? '').trim() || maxIsoDate(dates);
    } else if (dates.length) {
        referenceDate = maxIsoDate(dates);
    }

    if (!referenceDate) {
        const current = getCurrentJourneyNode(Array.isArray(stageJourney) ? stageJourney : []);
        return current ? journeyNodeRecordPhase(current) : 'investigation';
    }

    return resolveCasePhaseByJourneyDate(referenceDate, Array.isArray(stageJourney) ? stageJourney : []);
}

/** مسار جذري مُغلق في مرحلة التحقيق — يُخفّى/يُبهت في عرض المحاكمة. */
export function isInvestigationClosedProceduralRoot(
    root: ProceduralContainer,
    stageJourney: JourneyNode[] | undefined,
): boolean {
    if (root.parentId != null) return false;
    if (root.pathStatus !== 'completed') return false;
    return resolveProceduralRootCasePhase(root, stageJourney) === 'investigation';
}
