// @ts-nocheck
import type {
    CaseStage,
    JourneyNode,
    JourneyPhaseOverlay,
    JourneyTransitionKind,
    ProceduralArrowType,
    ProceduralNode,
    ProceduralTransitionActionId,
} from '@/app/types/criminal';

export type { JourneyNode, JourneyTransitionKind, ProceduralTransitionActionId } from '@/app/types/criminal';

/** عدد مسارات التحول المعتمدة في محرّك التنقلات (قرار ختامي). */
export const CRIMINAL_JOURNEY_ROUTE_COUNT = 9;

export type ProceduralTransitionOption = {
    actionId: ProceduralTransitionActionId;
    menuLabel: string;
    targetStage: CaseStage;
    arrowType: ProceduralArrowType;
    arrowLabel: string;
    nodeLabel: string;
};

const INVESTIGATION_REFERRAL_MISDEMEANOR_SHORT = 'إحالة جنح';
const INVESTIGATION_REFERRAL_FELONY_SHORT = 'إحالة جنايات';

export const JUVENILE_TRIAL_JOURNEY_LABEL = 'محكمة الأحداث';

export type JourneyNodeLabelOptions = {
    /** عرض مسار الأحداث — يستبدل تسميات الجنح/الجنايات بمحكمة الأحداث دون تغيير stage. */
    juvenileTrialDisplay?: boolean;
};

export type JourneyNodeLabelStage = CaseStage | 'juvenile';

function isGenericJuvenileTrialJourneyLabel(label: string): boolean {
    const l = String(label ?? '').trim();
    return l === JUVENILE_TRIAL_JOURNEY_LABEL || (l.startsWith('محكمة الأحداث') && !l.includes(':'));
}

export const PROCEDURAL_ROUTE_DECISION_TYPES = [
    'return_investigation_deficiency',
    'misdemeanor_to_felony_jurisdiction',
    'felony_to_misdemeanor_jurisdiction',
    'trial_cassation_appeal',
    'cassation_quash_investigation',
    'cassation_quash_trial_misdemeanor',
    'cassation_quash_trial_felony',
] as const;

export type ProceduralRouteDecisionType = (typeof PROCEDURAL_ROUTE_DECISION_TYPES)[number];

export function isProceduralRouteDecisionType(v: string): v is ProceduralRouteDecisionType {
    return (PROCEDURAL_ROUTE_DECISION_TYPES as readonly string[]).includes(v);
}

export function journeyNodeLabel(
    stage: JourneyNodeLabelStage,
    _courtCaseNumber?: string,
    options?: JourneyNodeLabelOptions,
): string {
    const juvenileTrial =
        options?.juvenileTrialDisplay === true || stage === 'juvenile';
    if (stage === 'investigation') return 'مرحلة التحقيق';
    if (juvenileTrial && (stage === 'juvenile' || stage === 'misdemeanor' || stage === 'felony')) {
        return JUVENILE_TRIAL_JOURNEY_LABEL;
    }
    if (stage === 'misdemeanor') return 'محكمة الجنح';
    if (stage === 'felony') return 'محكمة الجنايات';
    if (stage === 'evading_arrest') return 'تخفي / هروب — نشر وتعقب';
    if (stage === 'absentia_trial') return 'محاكمة غيابية';
    return 'محكمة التمييز';
}

/** تسمية العرض في شريط مسار التتبع — اسم المرحلة فقط (بلا أرقام دعوى). */
export function formatJourneyPathDisplayLabel(node: Pick<JourneyNode, 'label' | 'stage'>): string {
    const raw = String(node.label ?? '').trim();
    if (!raw) return '—';
    if (node.stage === 'investigation' || raw.startsWith('مرحلة التحقيق')) return raw;
    const stripped = raw.replace(/\s*[:：]\s*.+$/u, '').trim();
    if (stripped === 'محكمة جنح') return 'محكمة الجنح';
    if (stripped === 'محكمة جنايات') return 'محكمة الجنايات';
    return stripped || raw;
}

export function journeyNodeLabelForAppend(
    stage: JourneyNodeLabelStage,
    existingNodes: JourneyNode[],
    courtCaseNumber?: string,
    options?: JourneyNodeLabelOptions,
): string {
    if (stage === 'investigation') {
        const priorInv = existingNodes.filter((n) => n.stage === 'investigation').length;
        return priorInv >= 1
            ? `مرحلة التحقيق (${priorInv + 1})`
            : journeyNodeLabel(stage, courtCaseNumber, options);
    }
    return journeyNodeLabel(stage, courtCaseNumber, options);
}

/** إعادة كتابة تسمية عقدة محاكمة للعرض/التخزين — دون تغيير stage. */
export function coerceJuvenileTrialJourneyNodeLabel(
    node: Pick<JourneyNode, 'stage' | 'label'>,
    courtCaseNumber?: string,
    juvenileTrialDisplay?: boolean,
): string {
    const label = String(node.label ?? '').trim();
    if (!juvenileTrialDisplay) return formatJourneyPathDisplayLabel(node);
    if (node.stage !== 'misdemeanor' && node.stage !== 'felony') return formatJourneyPathDisplayLabel(node);
    return journeyNodeLabel(node.stage, courtCaseNumber, { juvenileTrialDisplay: true });
}

export function sanitizeJourneyNodeLabelsForJuvenileScope(
    nodes: JourneyNode[],
    shouldCoerce: (node: JourneyNode) => boolean,
    courtCaseNumber?: string,
): JourneyNode[] {
    let changed = false;
    const next = nodes.map((n) => {
        if ((n.stage !== 'misdemeanor' && n.stage !== 'felony') || !shouldCoerce(n)) return n;
        const coerced = coerceJuvenileTrialJourneyNodeLabel(n, courtCaseNumber, true);
        if (coerced === n.label) return n;
        changed = true;
        return { ...n, label: coerced };
    });
    return changed ? next : nodes;
}

export function proceduralActionFromConclusion(
    decisionType: string,
    currentStage: CaseStage,
    crimeType?: string,
): ProceduralTransitionActionId | null {
    if (decisionType === 'return_investigation_deficiency') return 'return_investigation_deficiency';
    if (decisionType === 'misdemeanor_to_felony_jurisdiction') return 'misdemeanor_to_felony_jurisdiction';
    if (decisionType === 'felony_to_misdemeanor_jurisdiction') return 'felony_to_misdemeanor_jurisdiction';
    if (decisionType === 'trial_cassation_appeal') return 'trial_cassation_appeal';
    if (decisionType === 'cassation_quash_investigation') return 'cassation_quash_investigation';
    if (decisionType === 'cassation_quash_trial_misdemeanor') return 'cassation_quash_trial_misdemeanor';
    if (decisionType === 'cassation_quash_trial_felony') return 'cassation_quash_trial_felony';
    if (decisionType === 'cassation_quash_remand' && currentStage === 'cassation') {
        return String(crimeType ?? '').trim() === 'جناية'
            ? 'cassation_quash_trial_felony'
            : 'cassation_quash_trial_misdemeanor';
    }
    if (decisionType === 'cassation_confirm' && currentStage === 'cassation') return 'cassation_confirm';
    return null;
}

/** العقدة الافتتاحية عند إنشاء الإضبارة. */
export function buildInitialStageJourney(): JourneyNode[] {
    return [{ id: '1', stage: 'investigation', label: 'مرحلة التحقيق', status: 'current' }];
}

export function proceduralArrowToJourneyKind(
    arrowType: ProceduralArrowType,
    actionId: ProceduralTransitionActionId,
): JourneyTransitionKind {
    if (actionId === 'return_investigation_deficiency') return 'backward_reversal';
    if (actionId === 'misdemeanor_to_felony_jurisdiction' || actionId === 'felony_to_misdemeanor_jurisdiction') {
        return 'jurisdiction_swap';
    }
    if (actionId === 'trial_cassation_appeal') return 'cassation_ascend';
    if (
        actionId === 'cassation_quash_investigation' ||
        actionId === 'cassation_quash_trial_misdemeanor' ||
        actionId === 'cassation_quash_trial_felony'
    ) {
        return 'cassation_descend';
    }
    if (actionId === 'cassation_confirm') return 'cassation_confirm';
    if (arrowType === 'backward_reversal') return 'backward_reversal';
    if (arrowType === 'cassation_override') return 'cassation_descend';
    return 'forward_referral';
}

const JOURNEY_LEGAL_TRANSITION_TEXT: Record<ProceduralTransitionActionId, string> = {
    refer_misdemeanor: 'قرار إحالة (محكمة الجنح)',
    refer_felony: 'قرار إحالة (محكمة الجنايات)',
    return_investigation_deficiency: 'إعادة للتحقيق لوجود نقص',
    misdemeanor_to_felony_jurisdiction: 'إحالة لعدم الاختصاص النوعي',
    felony_to_misdemeanor_jurisdiction: 'إحالة لعدم الاختصاص — محكمة الجنح',
    trial_cassation_appeal: 'طعن تمييزي — إحالة لمحكمة التمييز',
    cassation_quash_investigation: 'نقض تمييزي — إعادة للتحقيق',
    cassation_quash_trial_misdemeanor: 'نقض تمييزي — إعادة لمحكمة الجنح',
    cassation_quash_trial_felony: 'نقض تمييزي — إعادة لمحكمة الجنايات',
    cassation_confirm: 'تصديق الحكم الختامي',
};

/** بيانات مسار القرار الختامي — المحرك الوحيد لحقن stageJourney. */
export function resolveJourneyTransitionMeta(
    actionId: ProceduralTransitionActionId,
    option: ProceduralTransitionOption,
): { transitionKind: JourneyTransitionKind; transitionText: string } {
    return {
        transitionKind: proceduralArrowToJourneyKind(option.arrowType, actionId),
        transitionText: JOURNEY_LEGAL_TRANSITION_TEXT[actionId] ?? option.arrowLabel,
    };
}

export type JourneyBranchTrack = {
    branchId: string;
    label: string;
    defendantIds: string[];
    currentNode: JourneyNode;
};

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

const SAME_COURT_TRIAL_STAGES: CaseStage[] = ['misdemeanor', 'felony'];

function pickOriginalSameCourtTrialNode(trialNodes: JourneyNode[]): JourneyNode | undefined {
    const generic = trialNodes.find((n) => {
        const label = String(n.label ?? '').trim();
        if (n.stage === 'misdemeanor') {
            return (
                label === 'محكمة الجنح' ||
                isGenericJuvenileTrialJourneyLabel(label) ||
                (label.startsWith('محكمة جن') && !label.includes(':'))
            );
        }
        if (n.stage === 'felony') {
            return (
                label === 'محكمة الجنايات' ||
                isGenericJuvenileTrialJourneyLabel(label) ||
                (label.startsWith('محكمة جنا') && !label.includes(':'))
            );
        }
        return false;
    });
    return generic ?? trialNodes.find((n) => n.status === 'past') ?? trialNodes[0];
}

/** بعد نقض تمييزي لمحكمة الموضوع — إغلاق التحقيق الخاطئ وإعادة فتح محكمة الجنح/الجنايات. */
function reconcilePostCassationTrialRemandCurrentNode(nodes: JourneyNode[]): JourneyNode[] {
    const cassationStillActive = nodes.some(
        (n) => n.status === 'current' && (n.stage === 'cassation' || n.isCassationFilterNode === true),
    );
    if (cassationStillActive) return nodes;

    const hadCassation = nodes.some(
        (n) => (n.stage === 'cassation' || n.isCassationFilterNode === true) && n.status === 'past',
    );
    if (!hadCassation) return nodes;

    for (const stage of SAME_COURT_TRIAL_STAGES) {
        const trialNodes = nodes.filter((n) => n.stage === stage && !n.isCassationFilterNode);
        const pastTrials = trialNodes.filter((n) => n.status === 'past');
        if (!pastTrials.length) continue;

        const currentTrial = trialNodes.find((n) => n.status === 'current');
        const investigationCurrent = nodes.find((n) => n.stage === 'investigation' && n.status === 'current');
        if (currentTrial && !investigationCurrent) continue;

        const original = pickOriginalSameCourtTrialNode(pastTrials);
        if (!original) continue;

        const remandDate =
            nodes.find((n) => n.stage === 'cassation' && n.status === 'past')?.endedAt ??
            new Date().toISOString().slice(0, 10);

        return nodes.map((n) => {
            if (n.id === original.id) {
                return {
                    ...n,
                    status: 'current' as const,
                    endedAt: undefined,
                    phaseOverlay: undefined,
                    isCassationFilterNode: undefined,
                    cassationType: undefined,
                };
            }
            if (n.stage === 'investigation' && n.status === 'current') {
                const trialStart =
                    original.startedAt ??
                    pastTrials.find((t) => String(t.startedAt ?? '').trim())?.startedAt ??
                    remandDate;
                return { ...n, status: 'past' as const, endedAt: n.endedAt ?? trialStart };
            }
            if (currentTrial && n.id === currentTrial.id && n.id !== original.id) {
                return { ...n, status: 'past' as const, endedAt: remandDate };
            }
            return n;
        });
    }
    return nodes;
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

/** عقدة مسار زائدة أُنشئت خطأً عند «إعادة الأوراق» (جولة ثانية / cassation_descend). */
function isErroneousSameCourtRemandAppendNode(node: JourneyNode): boolean {
    if (node.isCassationFilterNode) return false;
    if (node.transitionKind === 'cassation_descend') return true;
    const transition = String(node.transitionText ?? node.arrowLabel ?? '');
    return /جولة\s*ثانية|نقض\s*و\s*إعادة\s*—\s*جولة/i.test(transition);
}

function isNumberedCourtRemandLabelDuplicate(node: JourneyNode, trialNodes: JourneyNode[]): boolean {
    const idx = trialNodes.findIndex((n) => n.id === node.id);
    if (idx <= 0) return false;
    const label = String(node.label ?? '').trim();
    const earlier = trialNodes.slice(0, idx);
    const hasGenericEarlier = earlier.some((n) => {
        const l = String(n.label ?? '').trim();
        if (node.stage === 'misdemeanor') {
            return (
                l === 'محكمة الجنح' ||
                isGenericJuvenileTrialJourneyLabel(l) ||
                (l.startsWith('محكمة جن') && !l.includes(':'))
            );
        }
        if (node.stage === 'felony') {
            return (
                l === 'محكمة الجنايات' ||
                isGenericJuvenileTrialJourneyLabel(l) ||
                (l.startsWith('محكمة جنا') && !l.includes(':'))
            );
        }
        return false;
    });
    if (!hasGenericEarlier) return false;
    return /محكمة\s+جنح\s*:/.test(label) || /محكمة\s+جنايات\s*:/.test(label);
}

/** يحذف عقد المحاكمة المكررة ويُبقي العقدة الأصلية للمرحلة. */
export function stripErroneousSameCourtRemandAppendNodes(nodes: JourneyNode[]): JourneyNode[] {
    let next = nodes;
    let changed = false;
    for (const stage of SAME_COURT_TRIAL_STAGES) {
        const trialNodes = next.filter((n) => n.stage === stage && !n.isCassationFilterNode);
        if (trialNodes.length <= 1) continue;
        const duplicates = trialNodes.filter(
            (node) =>
                isErroneousSameCourtRemandAppendNode(node) ||
                isNumberedCourtRemandLabelDuplicate(node, trialNodes),
        );
        if (duplicates.length === 0) continue;
        const removeIds = new Set(duplicates.map((n) => n.id));
        next = next.filter((n) => !removeIds.has(n.id));
        changed = true;
    }
    return changed ? next : nodes;
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

/** إصلاح إضبارات محفوظة بمسار مكرر أو عقدة تحقيق خاطئة بعد «إعادة الأوراق». */
export function repairSameCourtRemandJourneyNodes(nodes: JourneyNode[]): JourneyNode[] {
    let next = stripErroneousSameCourtRemandAppendNodes(nodes);

    const cassationActive = next.some(
        (n) => n.status === 'current' && (n.stage === 'cassation' || n.isCassationFilterNode === true),
    );
    if (cassationActive) return next;

    next = reconcilePostCassationTrialRemandCurrentNode(next);

    for (const stage of SAME_COURT_TRIAL_STAGES) {
        const trialNodes = next.filter((n) => n.stage === stage && !n.isCassationFilterNode);
        if (trialNodes.length === 0) continue;
        if (trialNodes.some((n) => n.status === 'current')) continue;
        const original = pickOriginalSameCourtTrialNode(trialNodes.filter((n) => n.status === 'past'));
        if (!original) continue;
        next = next.map((n) =>
            n.id === original.id
                ? {
                      ...n,
                      status: 'current' as const,
                      endedAt: undefined,
                      phaseOverlay: undefined,
                      isCassationFilterNode: undefined,
                      cassationType: undefined,
                  }
                : n,
        );
    }
    return enforceSingleCurrentJourneyNode(next);
}

/**
 * إعادة الأوراق لنفس المحكمة — إعادة تفعيل العقدة الأصلية دون إنشاء مسار جديد.
 * تُغلق عقدة التمييز/الحالية وتُحذف أي عقدة «جولة ثانية» زائدة.
 */
export function reactivateSameCourtRemandJourney(
    nodes: JourneyNode[],
    targetStage: CaseStage,
    date: string,
): JourneyNode[] {
    const startedAt = String(date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const closed = nodes.map((n) =>
        n.status === 'current' ? { ...n, status: 'past' as const, endedAt: startedAt } : n,
    );
    const stripped = stripErroneousSameCourtRemandAppendNodes(closed);
    const reactivateNode = stripped.find(
        (n) => n.stage === targetStage && n.status === 'past' && !n.isCassationFilterNode,
    );
    if (!reactivateNode) return enforceSingleCurrentJourneyNode(stripped);
    return enforceSingleCurrentJourneyNode(
        stripped.map((n) =>
            n.id === reactivateNode.id
                ? {
                      ...n,
                      status: 'current' as const,
                      endedAt: undefined,
                      phaseOverlay: undefined,
                      isCassationFilterNode: undefined,
                      cassationType: undefined,
                  }
                : n,
        ),
    );
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
        },
    ];
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

export function parseEventDateKey(date: string): number {
    const parsed = Date.parse(String(date ?? '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
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

export function getStageTransitionOptions(currentStage: CaseStage): ProceduralTransitionOption[] {
    if (currentStage === 'investigation') {
        return [
            {
                actionId: 'refer_misdemeanor',
                menuLabel: '⚖️ إحالة إلى محكمة الجنح',
                targetStage: 'misdemeanor',
                arrowType: 'forward_referral',
                arrowLabel: INVESTIGATION_REFERRAL_MISDEMEANOR_SHORT,
                nodeLabel: 'محكمة الجنح',
            },
            {
                actionId: 'refer_felony',
                menuLabel: '⚖️ إحالة إلى محكمة الجنايات',
                targetStage: 'felony',
                arrowType: 'forward_referral',
                arrowLabel: INVESTIGATION_REFERRAL_FELONY_SHORT,
                nodeLabel: 'محكمة الجنايات',
            },
        ];
    }
    if (currentStage === 'misdemeanor') {
        return [
            {
                actionId: 'return_investigation_deficiency',
                menuLabel: '🔄 إعادة للتحقيق لوجود نقص',
                targetStage: 'investigation',
                arrowType: 'backward_reversal',
                arrowLabel: 'إعادة لوجود نقص',
                nodeLabel: 'مرحلة التحقيق',
            },
            {
                actionId: 'misdemeanor_to_felony_jurisdiction',
                menuLabel: '🔄 إحالة للجنايات لعدم الاختصاص النوعي',
                targetStage: 'felony',
                arrowType: 'forward_referral',
                arrowLabel: 'إحالة للجنايات',
                nodeLabel: 'محكمة الجنايات',
            },
            {
                actionId: 'trial_cassation_appeal',
                menuLabel: '🏛️ طعن تمييزي',
                targetStage: 'cassation',
                arrowType: 'forward_referral',
                arrowLabel: 'طعن تمييزي',
                nodeLabel: 'محكمة التمييز',
            },
        ];
    }
    if (currentStage === 'felony') {
        return [
            {
                actionId: 'return_investigation_deficiency',
                menuLabel: '🔄 إعادة للتحقيق لوجود نقص',
                targetStage: 'investigation',
                arrowType: 'backward_reversal',
                arrowLabel: 'إعادة لوجود نقص',
                nodeLabel: 'مرحلة التحقيق',
            },
            {
                actionId: 'felony_to_misdemeanor_jurisdiction',
                menuLabel: '🔄 إحالة للجنح لعدم الاختصاص',
                targetStage: 'misdemeanor',
                arrowType: 'backward_reversal',
                arrowLabel: 'إحالة للجنح',
                nodeLabel: 'محكمة الجنح',
            },
            {
                actionId: 'trial_cassation_appeal',
                menuLabel: '🏛️ طعن تمييزي',
                targetStage: 'cassation',
                arrowType: 'forward_referral',
                arrowLabel: 'طعن تمييزي',
                nodeLabel: 'محكمة التمييز',
            },
        ];
    }
    if (currentStage === 'cassation') {
        return [
            {
                actionId: 'cassation_quash_investigation',
                menuLabel: '🔨 نقض وإعادة للتحقيق',
                targetStage: 'investigation',
                arrowType: 'cassation_override',
                arrowLabel: 'نقض وإعادة للتحقيق',
                nodeLabel: 'مرحلة التحقيق',
            },
            {
                actionId: 'cassation_quash_trial_misdemeanor',
                menuLabel: '🔨 نقض وإعادة لمحكمة الموضوع (جنح)',
                targetStage: 'misdemeanor',
                arrowType: 'cassation_override',
                arrowLabel: 'نقض وإعادة لمحكمة الموضوع',
                nodeLabel: 'محكمة الجنح',
            },
            {
                actionId: 'cassation_quash_trial_felony',
                menuLabel: '🔨 نقض وإعادة لمحكمة الموضوع (جنايات)',
                targetStage: 'felony',
                arrowType: 'cassation_override',
                arrowLabel: 'نقض وإعادة لمحكمة الموضوع',
                nodeLabel: 'محكمة الجنايات',
            },
            {
                actionId: 'cassation_confirm',
                menuLabel: '✅ تصديق الحكم الختامي',
                targetStage: 'cassation',
                arrowType: 'forward_referral',
                arrowLabel: 'تصديق الحكم',
                nodeLabel: 'تمييز — تصديق',
            },
        ];
    }
    return [];
}

export function findTransitionOption(
    currentStage: CaseStage,
    actionId: ProceduralTransitionActionId,
): ProceduralTransitionOption | null {
    return getStageTransitionOptions(currentStage).find((o) => o.actionId === actionId) ?? null;
}
