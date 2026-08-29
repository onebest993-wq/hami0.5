import type { JourneyNode } from '@/app/types/criminal';
import {
    JUVENILE_TRIAL_JOURNEY_LABEL,
    type JourneyNodeLabelOptions,
    type JourneyNodeLabelStage,
} from './stageJourneyTypes';

export function isGenericJuvenileTrialJourneyLabel(label: string): boolean {
    const l = String(label ?? '').trim();
    return l === JUVENILE_TRIAL_JOURNEY_LABEL || (l.startsWith('محكمة الأحداث') && !l.includes(':'));
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
