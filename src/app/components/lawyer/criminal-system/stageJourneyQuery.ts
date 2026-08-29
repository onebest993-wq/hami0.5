import type { JourneyNode } from '@/app/types/criminal';
import type { JourneyBranchTrack } from './stageJourneyTypes';

export function parseEventDateKey(date: string): number {
    const parsed = Date.parse(String(date ?? '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
}

function pickPreferredCurrentJourneyNode(currents: JourneyNode[]): JourneyNode | null {
    const trial = currents.find(
        (n) => (n.stage === 'misdemeanor' || n.stage === 'felony') && !n.isCassationFilterNode,
    );
    if (trial) return trial;
    const cassation = currents.find((n) => n.stage === 'cassation' || n.isCassationFilterNode === true);
    if (cassation) return cassation;
    return currents[0] ?? null;
}

function orderMainlineJourneyNodes(nodes: JourneyNode[]): JourneyNode[] {
    const main = nodes
        .filter((n) => !String(n.branchId ?? '').trim())
        .filter((n) => n.status !== 'future');
    return main.slice().sort((a, b) => {
        const ta = parseEventDateKey(String(a.startedAt ?? ''));
        const tb = parseEventDateKey(String(b.startedAt ?? ''));
        if (ta !== tb) return ta - tb;
        return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
    });
}

export function isJourneyTenureArchived(nodes: JourneyNode[] | undefined, nodeId: string | undefined): boolean {
    if (!nodeId) return false;
    const list = Array.isArray(nodes) ? nodes : [];
    return list.some((n) => n.id === nodeId && n.status === 'past');
}

export function getCurrentJourneyNode(
    nodes: JourneyNode[] | undefined,
    branchId?: string,
): JourneyNode | null {
    const list = Array.isArray(nodes) ? nodes : [];
    const currents = list.filter((n) => n.status === 'current');
    const bid = String(branchId ?? '').trim();
    if (bid && currents.length) {
        return (
            currents.find((n) => n.branchId === bid) ??
            pickPreferredCurrentJourneyNode(currents) ??
            currents[0] ??
            null
        );
    }
    if (currents.length > 1) {
        return pickPreferredCurrentJourneyNode(currents) ?? currents[0] ?? null;
    }
    return currents[0] ?? list[list.length - 1] ?? null;
}

export function resolveCurrentJourneyNodeId(nodes: JourneyNode[] | undefined): string {
    return getCurrentJourneyNode(nodes)?.id ?? '';
}

/** عقدة حية واحدة فقط — يُفضَّل محكمة الموضوع على التحقيق عند التعارض. */
export function enforceSingleCurrentJourneyNode(nodes: JourneyNode[]): JourneyNode[] {
    const preferred = getCurrentJourneyNode(nodes);
    if (!preferred) return nodes;
    const currents = nodes.filter((n) => n.status === 'current');
    if (currents.length === 1 && currents[0]!.id === preferred.id) return nodes;

    const closeDate = String(preferred.startedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    return nodes.map((n) => {
        if (n.id === preferred.id) {
            return {
                ...n,
                status: 'current' as const,
                endedAt: undefined,
                phaseOverlay: n.id === preferred.id ? n.phaseOverlay : undefined,
            };
        }
        if (n.status === 'current') {
            return { ...n, status: 'past' as const, endedAt: n.endedAt ?? closeDate };
        }
        return n;
    });
}

export function nodeIdsInBranch(nodes: JourneyNode[], branchId: string): Set<string> {
    const bid = String(branchId ?? '').trim();
    const ids = new Set<string>();
    if (!bid) return ids;
    for (const n of nodes) {
        if (n.branchId === bid) ids.add(n.id);
    }
    const roots = nodes.filter((n) => n.isForkRoot && Array.isArray(n.forkChildIds) && n.forkChildIds.some((c) => ids.has(c)));
    for (const r of roots) ids.add(r.id);
    return ids;
}

export function eventBelongsToJourneyBranch(
    event: { defendantIds?: string[]; targetDefendantId?: string | null; proceduralNodeId?: string },
    branch: JourneyBranchTrack,
    nodes: JourneyNode[],
): boolean {
    const branchNodeIds = nodeIdsInBranch(nodes, branch.branchId);
    if (event.proceduralNodeId && branchNodeIds.has(event.proceduralNodeId)) return true;
    const scoped = branch.defendantIds;
    if (!scoped.length) return !event.proceduralNodeId || branchNodeIds.has(event.proceduralNodeId);
    const ids = Array.isArray(event.defendantIds) ? event.defendantIds : [];
    if (event.targetDefendantId && scoped.includes(event.targetDefendantId)) return true;
    if (ids.length && ids.some((id) => scoped.includes(id))) return true;
    if (!ids.length && !event.proceduralNodeId) return true;
    return false;
}

export function eventBelongsToJourneyNode(
    itemDate: string,
    itemNodeId: string | undefined,
    node: JourneyNode,
    nodes: JourneyNode[],
): boolean {
    if (node.branchId && itemNodeId) {
        const branchIds = nodeIdsInBranch(nodes, node.branchId);
        if (!branchIds.has(itemNodeId) && itemNodeId !== node.id) return false;
    }
    if (itemNodeId && itemNodeId === node.id) return true;
    if (itemNodeId && itemNodeId !== node.id) {
        const bound = nodes.find((n) => n.id === itemNodeId);
        if (bound && bound.stage !== node.stage) return false;
    }

    const startKey = node.startedAt ? parseEventDateKey(node.startedAt) : 0;
    const t = parseEventDateKey(itemDate);
    if (node.startedAt && t < startKey) return false;

    const ordered = orderMainlineJourneyNodes(nodes);
    const idx = ordered.findIndex((n) => n.id === node.id);
    if (idx < 0) return false;
    const nextNode = ordered[idx + 1];
    const endKey = node.endedAt
        ? parseEventDateKey(node.endedAt)
        : nextNode?.startedAt
          ? parseEventDateKey(nextNode.startedAt)
          : Number.POSITIVE_INFINITY;
    if (Number.isFinite(endKey) && t >= endKey) return false;
    if (!node.startedAt && node.status === 'current') return true;
    if (!node.startedAt) return false;
    return true;
}
