import type { CaseStage, JourneyNode } from '@/app/types/criminal';
import { isGenericJuvenileTrialJourneyLabel } from './stageJourneyLabels';
import { enforceSingleCurrentJourneyNode } from './stageJourneyQuery';

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
