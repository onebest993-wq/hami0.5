import type {
    CaseStage,
    JourneyNode,
    ProceduralArrowType,
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

export const JUVENILE_TRIAL_JOURNEY_LABEL = 'محكمة الأحداث';

export type JourneyNodeLabelOptions = {
    /** عرض مسار الأحداث — يستبدل تسميات الجنح/الجنايات بمحكمة الأحداث دون تغيير stage. */
    juvenileTrialDisplay?: boolean;
};

export type JourneyNodeLabelStage = CaseStage | 'juvenile';

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

export type JourneyBranchTrack = {
    branchId: string;
    label: string;
    defendantIds: string[];
    currentNode: JourneyNode;
};
