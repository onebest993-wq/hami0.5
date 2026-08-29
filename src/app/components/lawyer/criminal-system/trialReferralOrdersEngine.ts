import type { CaseStage, ProceduralTransitionActionId } from '@/app/types/criminal';
import type { CriminalCase, LawyerRequest, StageConclusion } from './criminalCaseModel';
import { CUSTOM_JUDICIAL_DECISION_TYPE } from './proceduralRequestTypes';
import {
    findTransitionOption,
    getStageTransitionOptions,
    resolveCurrentJourneyNodeId,
    type ProceduralTransitionOption,
} from './stageJourney';

/** أوامر زر الإحالة في محكمة الموضوع — خياران فقط حسب المرحلة. */
const TRIAL_REFERRAL_ORDER_ACTION_IDS = [
    'return_investigation_deficiency',
    'misdemeanor_to_felony_jurisdiction',
    'felony_to_misdemeanor_jurisdiction',
] as const;

export type TrialReferralOrderActionId = (typeof TRIAL_REFERRAL_ORDER_ACTION_IDS)[number];

/** كل تحوّلات المسار عبر قرار ختامي (ما عدا إحالة التحقيق الأولى refer_*). */
const PROCEDURAL_STAGE_ROUTE_ACTION_IDS = [
    'return_investigation_deficiency',
    'misdemeanor_to_felony_jurisdiction',
    'felony_to_misdemeanor_jurisdiction',
    'trial_cassation_appeal',
    'cassation_quash_investigation',
    'cassation_quash_trial_misdemeanor',
    'cassation_quash_trial_felony',
    'cassation_confirm',
] as const;

export type ProceduralStageRouteActionId = (typeof PROCEDURAL_STAGE_ROUTE_ACTION_IDS)[number];

export function isTrialReferralOrderActionId(v: string): v is TrialReferralOrderActionId {
    return (TRIAL_REFERRAL_ORDER_ACTION_IDS as readonly string[]).includes(v);
}

export function isProceduralStageRouteActionId(v: string): v is ProceduralStageRouteActionId {
    return (PROCEDURAL_STAGE_ROUTE_ACTION_IDS as readonly string[]).includes(v);
}

function proceduralRouteRequiresCourtFields(actionId: ProceduralTransitionActionId): boolean {
    return (
        actionId === 'misdemeanor_to_felony_jurisdiction' ||
        actionId === 'felony_to_misdemeanor_jurisdiction' ||
        actionId === 'cassation_quash_trial_misdemeanor' ||
        actionId === 'cassation_quash_trial_felony'
    );
}

export function proceduralRouteTimelineCategory(actionId: ProceduralTransitionActionId): string {
    if (isTrialReferralOrderActionId(actionId)) return 'قرار إحالة — محكمة الموضوع';
    if (actionId === 'trial_cassation_appeal') return 'قرار ختامي — طعن تمييزي';
    if (
        actionId === 'cassation_quash_investigation' ||
        actionId === 'cassation_quash_trial_misdemeanor' ||
        actionId === 'cassation_quash_trial_felony'
    ) {
        return 'قرار تمييزي — نقض وإعادة';
    }
    if (actionId === 'cassation_confirm') return 'قرار تمييزي — تصديق';
    if (actionId === 'return_investigation_deficiency') return 'قرار إحالة — إعادة للتحقيق';
    return 'قرار ختامي — انتقال مرحلي';
}

export function formatProceduralRouteDescription(
    actionId: ProceduralTransitionActionId,
    input: {
        details: string;
        courtName?: string;
        courtCaseNumber?: string;
        courtLabel: string;
        fallbackTitle: string;
    },
): string {
    const details = String(input.details ?? '').trim() || input.fallbackTitle;
    if (!proceduralRouteRequiresCourtFields(actionId)) {
        return details;
    }
    return [
        details,
        `المحكمة: ${String(input.courtName ?? '').trim() || input.courtLabel} • رقم دعوى المحكمة: ${String(input.courtCaseNumber ?? '').trim() || '—'}`,
    ].join('\n');
}

/** تسمية مختصرة لقائمة أوامر الإحالة في محكمة الموضوع (بدون رموز أو تفاصيل إضافية). */
export function referralOrderMenuLabel(actionId: TrialReferralOrderActionId): string {
    if (actionId === 'return_investigation_deficiency') return 'إعادة للتحقيق';
    if (actionId === 'misdemeanor_to_felony_jurisdiction') return 'إحالة للجنايات';
    if (actionId === 'felony_to_misdemeanor_jurisdiction') return 'إحالة للجنح';
    return actionId;
}

/** خياران فقط: جنح → تحقيق أو جنايات؛ جنايات → تحقيق أو جنح. */
export function getTrialCourtReferralOrderOptions(caseStage: CaseStage): ProceduralTransitionOption[] {
    const allowed: ProceduralTransitionActionId[] =
        caseStage === 'misdemeanor'
            ? ['return_investigation_deficiency', 'misdemeanor_to_felony_jurisdiction']
            : caseStage === 'felony'
              ? ['return_investigation_deficiency', 'felony_to_misdemeanor_jurisdiction']
              : [];

    const seen = new Set<ProceduralTransitionActionId>();
    return getStageTransitionOptions(caseStage).filter((opt) => {
        if (!allowed.includes(opt.actionId) || seen.has(opt.actionId)) return false;
        seen.add(opt.actionId);
        return true;
    });
}

function proceduralRouteOrderTitle(actionId: ProceduralTransitionActionId, caseStage: CaseStage): string {
    const opt = findTransitionOption(caseStage, actionId);
    return opt?.menuLabel ?? actionId;
}

/** يُسجَّل في الطلبات والقرارات لأوامر الإحالة من محكمة الموضوع (حالة حال + تمييز). */
export function shouldRecordAppealableRouteLawyerRequest(actionId: string): boolean {
    return isTrialReferralOrderActionId(actionId);
}

export function buildProceduralRouteLawyerRequest(
    caseRecord: CriminalCase,
    conclusion: StageConclusion,
    actionId: ProceduralTransitionActionId,
    sourceProceduralNodeId: string,
    originStage: CaseStage,
): LawyerRequest | null {
    if (!shouldRecordAppealableRouteLawyerRequest(actionId)) return null;

    const title = proceduralRouteOrderTitle(actionId, originStage);
    const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const note = String(conclusion.details ?? '').trim() || title;
    const nodeId = String(sourceProceduralNodeId ?? '').trim();

    return {
        id: `route_${conclusion.id}`,
        requestDate: date,
        type: title,
        lawyerNote: note,
        status: 'executed',
        defendantIds: conclusion.defendantIds?.length ? conclusion.defendantIds : undefined,
        proceduralTemplate: CUSTOM_JUDICIAL_DECISION_TYPE,
        isAppealable: true,
        isLocked: true,
        decisionArchived: true,
        judgeMargin: note,
        decisionDate: date,
        proceduralNodeId: nodeId || undefined,
    };
}

