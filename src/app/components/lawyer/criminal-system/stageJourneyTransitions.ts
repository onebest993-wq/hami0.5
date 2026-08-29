import type {
    CaseStage,
    JourneyTransitionKind,
    ProceduralArrowType,
    ProceduralTransitionActionId,
} from '@/app/types/criminal';
import type { ProceduralTransitionOption } from './stageJourneyTypes';

const INVESTIGATION_REFERRAL_MISDEMEANOR_SHORT = 'إحالة جنح';
const INVESTIGATION_REFERRAL_FELONY_SHORT = 'إحالة جنايات';

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
