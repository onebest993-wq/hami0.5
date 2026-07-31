import type { CaseStage, JourneyNode } from '@/app/types/criminal';
import { getCurrentJourneyNode, parseEventDateKey } from './stageJourneyRuntimeCore';

export type JourneyStageRecordRef = {
    date?: string;
    requestDate?: string;
    issuedAt?: string;
    attachmentDate?: string;
    proceduralNodeId?: string;
};

function orderJourneyNodesForLabels(nodes: JourneyNode[]): JourneyNode[] {
    return nodes
        .filter((n) => String(n.status ?? '').trim() !== 'future')
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

function investigationNodeOrdinal(node: JourneyNode, nodes: JourneyNode[]): number | null {
    const investigationNodes = orderJourneyNodesForLabels(nodes).filter((n) => n.stage === 'investigation');
    if (investigationNodes.length <= 1) return null;
    const idx = investigationNodes.findIndex((n) => n.id === node.id);
    return idx >= 0 ? idx + 1 : null;
}

function caseRecordPhaseShortLabel(stage: CaseStage): string {
    return stage === 'investigation' ? 'تحقيق' : 'محاكمة';
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
    return label || caseRecordPhaseShortLabel(node.stage);
}

export function resolveRecordJourneyStage(
    item: JourneyStageRecordRef,
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

export function resolveRecordJourneyStageLabel(
    item: JourneyStageRecordRef,
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
