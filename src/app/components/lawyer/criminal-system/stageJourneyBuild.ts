import type {
    CaseStage,
    JourneyNode,
    JourneyPhaseOverlay,
    JourneyTransitionKind,
    ProceduralNode,
    ProceduralTransitionActionId,
} from '@/app/types/criminal';
import { proceduralArrowToJourneyKind } from './stageJourneyTransitions';
import type { JourneyBranchTrack } from './stageJourneyTypes';

/** العقدة الافتتاحية عند إنشاء الإضبارة. */
export function buildInitialStageJourney(): JourneyNode[] {
    return [{ id: '1', stage: 'investigation', label: 'مرحلة التحقيق', status: 'current' }];
}

export function hasActiveJourneyFork(nodes: JourneyNode[] | undefined): boolean {
    const list = Array.isArray(nodes) ? nodes : [];
    return list.filter((n) => n.status === 'current' && String(n.branchId ?? '').trim()).length >= 2;
}

export function getJourneyBranchTracks(nodes: JourneyNode[] | undefined): JourneyBranchTrack[] {
    const list = Array.isArray(nodes) ? nodes : [];
    const currents = list.filter((n) => n.status === 'current' && String(n.branchId ?? '').trim());
    if (currents.length < 2) return [];
    return currents.map((n) => ({
        branchId: String(n.branchId),
        label: String(n.branchLabel ?? n.label ?? '—'),
        defendantIds: Array.isArray(n.defendantIds) ? n.defendantIds : [],
        currentNode: n,
    }));
}

/** تفرع متوازٍ من العقدة الحالية دون مسح التاريخ. */
export function forkStageJourneyFromCurrent(
    nodes: JourneyNode[],
    fork: {
        startedAt: string;
        transitionText: string;
        branches: Array<{
            branchId: string;
            branchLabel: string;
            stage: CaseStage;
            label: string;
            defendantIds?: string[];
            phaseOverlay?: JourneyPhaseOverlay;
            transitionKind?: JourneyTransitionKind;
        }>;
    },
): JourneyNode[] {
    const startedAt = String(fork.startedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    const current = nodes.find((n) => n.status === 'current');
    if (!current || !fork.branches.length) return nodes;

    const forkRootId = current.id;
    const childIds = fork.branches.map((_, i) => `${forkRootId}-fork-${i + 1}`);
    const past = nodes.map((n) =>
        n.status === 'current'
            ? {
                  ...n,
                  status: 'past' as const,
                  endedAt: startedAt,
                  isForkRoot: true,
                  forkChildIds: childIds,
              }
            : n,
    );
    const children: JourneyNode[] = fork.branches.map((b, i) => ({
        id: childIds[i]!,
        parentId: forkRootId,
        branchId: b.branchId,
        branchLabel: b.branchLabel,
        stage: b.stage,
        label: b.label,
        status: 'current',
        transitionText: fork.transitionText,
        transitionKind: b.transitionKind ?? 'parallel_fork',
        startedAt,
        defendantIds: b.defendantIds,
        phaseOverlay: b.phaseOverlay,
    }));
    return [...past, ...children];
}

/** إضافة محطة: الحالية تصبح past (مع endedAt) والجديدة current — لا يمسح التاريخ. */
export function appendStageJourneyNode(
    nodes: JourneyNode[],
    next: {
        stage: CaseStage;
        label: string;
        transitionText: string;
        transitionKind: JourneyTransitionKind;
        startedAt?: string;
        id?: string;
        phaseOverlay?: JourneyPhaseOverlay;
        branchId?: string;
        branchLabel?: string;
        defendantIds?: string[];
        parentId?: string;
        cassationType?: import('@/app/types/criminal').CassationType;
        isCassationFilterNode?: boolean;
        arrowLabel?: string;
        targetDefendantIds?: string[];
    },
): JourneyNode[] {
    const startedAt = String(next.startedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    const nextId = String(next.id ?? '').trim() || String(nodes.length + 1);
    const closeBranch = String(next.branchId ?? '').trim();
    const past = nodes.map((n) => {
        if (n.status !== 'current') return n;
        if (closeBranch && n.branchId !== closeBranch) return n;
        return { ...n, status: 'past' as const, endedAt: startedAt };
    });
    return [
        ...past,
        {
            id: nextId,
            stage: next.stage,
            label: next.label,
            status: 'current',
            transitionText: next.transitionText,
            transitionKind: next.transitionKind,
            startedAt,
            phaseOverlay: next.phaseOverlay,
            // لا نورّث الـ branch تلقائياً؛ الانتقال الخطي يجب أن يُسجَّل على المسار الرئيسي.
            // أي انتقال داخل فرع يجب أن يمرّر branchId صراحة.
            branchId: next.branchId,
            branchLabel: next.branchLabel,
            defendantIds: next.defendantIds,
            parentId: next.parentId,
            cassationType: next.cassationType,
            isCassationFilterNode: next.isCassationFilterNode,
            arrowLabel: next.arrowLabel,
            targetDefendantIds: next.targetDefendantIds,
        },
    ];
}

/** إلحاق محطة مع طبقة استثنائية دون تغيير المرحلة القضائية. */
export function appendStageJourneyPhaseOverlay(
    nodes: JourneyNode[],
    overlay: JourneyPhaseOverlay,
    meta: { transitionText: string; startedAt?: string; labelSuffix?: string },
): JourneyNode[] {
    const startedAt = String(meta.startedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    const current = nodes.find((n) => n.status === 'current');
    if (!current) return nodes;
    const suffix = String(meta.labelSuffix ?? '').trim();
    const label = suffix ? `${current.label} — ${suffix}` : current.label;
    return appendStageJourneyNode(nodes, {
        stage: current.stage,
        label,
        transitionText: meta.transitionText,
        transitionKind: 'backward_reversal',
        startedAt,
        phaseOverlay: overlay,
        branchId: current.branchId,
        branchLabel: current.branchLabel,
        defendantIds: current.defendantIds,
        parentId: current.parentId,
    });
}

export function migrateProceduralNodesToStageJourney(nodes: ProceduralNode[]): JourneyNode[] {
    return nodes.map((n, index) => {
        const actionGuess: ProceduralTransitionActionId | null =
            n.arrivalArrowType === 'backward_reversal'
                ? 'return_investigation_deficiency'
                : n.arrivalArrowType === 'cassation_override'
                  ? 'cassation_quash_investigation'
                  : n.stage === 'misdemeanor'
                    ? 'refer_misdemeanor'
                    : n.stage === 'felony'
                      ? 'refer_felony'
                      : null;
        const kind =
            index > 0 && actionGuess
                ? proceduralArrowToJourneyKind(n.arrivalArrowType, actionGuess)
                : undefined;
        return {
            id: n.id || String(index + 1),
            stage: n.stage,
            label: n.label,
            status: n.status === 'active' ? ('current' as const) : ('past' as const),
            transitionText: index > 0 ? n.arrowLabel : undefined,
            transitionKind: kind,
            startedAt: n.startedAt,
            endedAt: n.endedAt,
        };
    });
}
