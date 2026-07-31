import type {
    CaseStage,
    JourneyNode,
    JourneyTransitionKind,
    ProceduralArrowType,
    ProceduralTransitionActionId,
} from '@/app/types/criminal';

export type { JourneyTransitionKind, ProceduralTransitionActionId } from '@/app/types/criminal';

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
    juvenileTrialDisplay?: boolean;
};

export type JourneyNodeLabelStage = CaseStage | 'juvenile';

export function isGenericJuvenileTrialJourneyLabel(label: string): boolean {
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
    const juvenileTrial = options?.juvenileTrialDisplay === true || stage === 'juvenile';
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

export function coerceJuvenileTrialJourneyNodeLabel(
    node: Pick<JourneyNode, 'stage' | 'label'>,
    courtCaseNumber?: string,
    juvenileTrialDisplay?: boolean,
): string {
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

export function resolveJourneyTransitionMeta(
    actionId: ProceduralTransitionActionId,
    option: ProceduralTransitionOption,
): { transitionKind: JourneyTransitionKind; transitionText: string } {
    return {
        transitionKind: proceduralArrowToJourneyKind(option.arrowType, actionId),
        transitionText: JOURNEY_LEGAL_TRANSITION_TEXT[actionId] ?? option.arrowLabel,
    };
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
