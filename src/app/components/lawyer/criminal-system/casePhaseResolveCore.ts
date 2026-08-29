import type { JourneyNode } from '@/app/types/criminal';
import type { LawyerRequest, Statement } from './criminalCaseModel';
import type { JudicialDecision } from './judicialDecisionsEngine';
import { getCurrentJourneyNode, parseEventDateKey } from './stageJourney';
import type { CasePhaseFilter, CaseRecordPhase, RecordPhaseLookupItem } from './casePhaseFilterTypes';

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
    item: RecordPhaseLookupItem,
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

export function resolveCasePhaseByJourneyDate(itemDate: string, nodes: JourneyNode[]): CaseRecordPhase {
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

export function resolveStatementCasePhase(
    statement: Statement,
    stageJourney: JourneyNode[] | undefined,
): CaseRecordPhase {
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
