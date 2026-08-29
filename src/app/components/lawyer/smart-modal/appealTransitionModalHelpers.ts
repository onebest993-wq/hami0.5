import type { CaseStage } from '../LawyerShared';
import type { AppealRouteContext } from './smartFile/appealRouteEligibility';
import { isAppellateAppealAllowed } from './smartFile/appealRouteEligibility';
import { isPersonalStatusAppealContext } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';

export function resolveAppealOutcomeHint(
    judgmentType?: string | null,
    finalDecision?: string | null,
): string | null {
    const fromJudgment = String(judgmentType ?? '').trim();
    if (fromJudgment) return fromJudgment;
    const fromStage = String(finalDecision ?? '').trim();
    return fromStage || null;
}

export function normalizeAppealMethodValue(method: string): string {
    if (method === 'اعتراض غيابي') return 'اعتراض على الحكم الغيابي';
    return method;
}

export function appealMethodLabel(method: string): string {
    if (method === 'اعتراض غيابي') return 'اعتراض على الحكم الغيابي';
    return method;
}

export function defaultAppealType(
    judgmentForm?: string,
    appealRoute?: AppealRouteContext,
    allowedMethods?: string[],
    stageName?: string | null,
    canOfferAbsentObjection = true,
    stages?: CaseStage[],
): string {
    if (allowedMethods && allowedMethods.length > 0) {
        return normalizeAppealMethodValue(allowedMethods[0]);
    }
    if (canOfferAbsentObjection && String(judgmentForm ?? '').includes('غيابي')) {
        return 'اعتراض على الحكم الغيابي';
    }
    if (appealRoute && !isAppellateAppealAllowed(appealRoute)) {
        return 'تمييز';
    }
    if (stageName && isPersonalStatusAppealContext(stageName, stages)) {
        return 'تمييز';
    }
    return 'استئناف';
}

export const APPEAL_TRANSITION_GLASS_CARD =
    'rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-4 space-y-3';
