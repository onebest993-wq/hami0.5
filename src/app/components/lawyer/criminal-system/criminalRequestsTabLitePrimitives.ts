import type { JourneyNode } from '@/app/types/criminal';
import type { CriminalDefendant } from './criminalStore';
import type { JourneyBranchTrack } from './stageJourney';
import type { InvestigationDefendantsPartyMix } from './juvenileInvestigationRules';
import {
    getIdentifiedDefendantsLite as getIdentifiedDefendantsLiteCore,
    isDefendantIdentityUnknownLite,
} from './criminalDefendantLiteCore';

export function getIdentifiedDefendantsLite(defendants: CriminalDefendant[] | undefined): CriminalDefendant[] {
    return getIdentifiedDefendantsLiteCore(defendants);
}

function isInvestigationJuvenileCategoryDefendant(
    d: Pick<CriminalDefendant, 'isJuvenile' | 'isUnderSeven'>,
): boolean {
    return Boolean(d.isJuvenile) || Boolean(d.isUnderSeven);
}

function isInvestigationAdultCategoryDefendant(
    d: Pick<CriminalDefendant, 'isJuvenile' | 'isUnderSeven'>,
): boolean {
    return !isInvestigationJuvenileCategoryDefendant(d);
}

export function resolveInvestigationDefendantsPartyMixLite(
    defendants: CriminalDefendant[],
): InvestigationDefendantsPartyMix {
    const identified = defendants.filter((d) => !isDefendantIdentityUnknownLite(d));
    const withJuvenile = identified.some((d) => isInvestigationJuvenileCategoryDefendant(d));
    const withAdult = identified.some((d) => isInvestigationAdultCategoryDefendant(d));
    if (withJuvenile && withAdult) return 'mixed';
    if (withJuvenile) return 'juveniles_only';
    return 'adults_only';
}

export function parseEventDateKeyLite(date: string): number {
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

export function getCurrentJourneyNodeLite(
    nodes: JourneyNode[] | undefined,
    branchId?: string,
): JourneyNode | null {
    const list = Array.isArray(nodes) ? nodes : [];
    const currents = list.filter((n) => n.status === 'current');
    const normalizedBranchId = String(branchId ?? '').trim();
    if (normalizedBranchId && currents.length) {
        return (
            currents.find((n) => n.branchId === normalizedBranchId) ??
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

function nodeIdsInBranch(nodes: JourneyNode[], branchId: string): Set<string> {
    const normalizedBranchId = String(branchId ?? '').trim();
    const ids = new Set<string>();
    if (!normalizedBranchId) return ids;
    for (const node of nodes) {
        if (node.branchId === normalizedBranchId) ids.add(node.id);
    }
    const roots = nodes.filter(
        (node) =>
            node.isForkRoot &&
            Array.isArray(node.forkChildIds) &&
            node.forkChildIds.some((childId) => ids.has(childId)),
    );
    for (const root of roots) ids.add(root.id);
    return ids;
}

export function eventBelongsToJourneyBranchLite(
    event: { defendantIds?: string[]; targetDefendantId?: string | null; proceduralNodeId?: string },
    branch: JourneyBranchTrack,
    nodes: JourneyNode[],
): boolean {
    const branchNodeIds = nodeIdsInBranch(nodes, branch.branchId);
    if (event.proceduralNodeId && branchNodeIds.has(event.proceduralNodeId)) return true;
    const scopedDefendantIds = branch.defendantIds;
    if (!scopedDefendantIds.length) return !event.proceduralNodeId || branchNodeIds.has(event.proceduralNodeId);
    const ids = Array.isArray(event.defendantIds) ? event.defendantIds : [];
    if (event.targetDefendantId && scopedDefendantIds.includes(event.targetDefendantId)) return true;
    if (ids.length && ids.some((id) => scopedDefendantIds.includes(id))) return true;
    if (!ids.length && !event.proceduralNodeId) return true;
    return false;
}

function orderMainlineJourneyNodes(nodes: JourneyNode[]): JourneyNode[] {
    const main = nodes
        .filter((n) => !String(n.branchId ?? '').trim())
        .filter((n) => String(n.status ?? '').trim() !== 'future');
    return main.slice().sort((a, b) => {
        const aTime = parseEventDateKeyLite(String(a.startedAt ?? ''));
        const bTime = parseEventDateKeyLite(String(b.startedAt ?? ''));
        if (aTime !== bTime) return aTime - bTime;
        return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
    });
}

export function eventBelongsToJourneyNodeLite(
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
        const bound = nodes.find((candidate) => candidate.id === itemNodeId);
        if (bound && bound.stage !== node.stage) return false;
    }

    const startKey = node.startedAt ? parseEventDateKeyLite(node.startedAt) : 0;
    const itemTime = parseEventDateKeyLite(itemDate);
    if (node.startedAt && itemTime < startKey) return false;

    const ordered = orderMainlineJourneyNodes(nodes);
    const nodeIndex = ordered.findIndex((candidate) => candidate.id === node.id);
    if (nodeIndex < 0) return false;
    const nextNode = ordered[nodeIndex + 1];
    const endKey = node.endedAt
        ? parseEventDateKeyLite(node.endedAt)
        : nextNode?.startedAt
          ? parseEventDateKeyLite(nextNode.startedAt)
          : Number.POSITIVE_INFINITY;
    if (Number.isFinite(endKey) && itemTime >= endKey) return false;
    if (!node.startedAt && node.status === 'current') return true;
    if (!node.startedAt) return false;
    return true;
}
