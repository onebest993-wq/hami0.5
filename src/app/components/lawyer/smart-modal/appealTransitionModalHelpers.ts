import type { CaseStage } from '../LawyerShared';
import type { AppealRouteContext } from './smartFile/appealRouteEligibility';
import { isAppellateAppealAllowed } from './smartFile/appealRouteEligibility';
import { isPersonalStatusAppealContext } from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';

export function pleadingCaseNumberExample(appealType: string): string {
    const t = String(appealType ?? '');
    if (t.includes('تمييز')) return '33/ت/2024';
    if (t.includes('اعتراض')) return '33/غ/2024';
    if (t.includes('استئناف')) return '33/س/2024';
    return '33/ب/2024';
}

export function appealCourtPlaceholder(appealType: string): string {
    const t = String(appealType ?? '');
    if (t.includes('تمييز')) return 'اختياري — محكمة التمييز الاتحادية';
    if (t.includes('اعتراض')) return 'اختياري — اسم المحكمة';
    return 'اختياري — اسم محكمة الاستئناف';
}

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
    if (canOfferAbsentObjection) {
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

export function defaultSelectedChallengeAppellantIds<T extends { id: number | string; isClient?: boolean }>(
    eligible: T[],
    preferredId?: string | number | null,
): Array<number | string> {
    if (preferredId != null && String(preferredId).trim() !== '') {
        const hit = eligible.find((party) => String(party.id) === String(preferredId));
        if (hit) return [hit.id];
    }
    if (eligible.length <= 1) return eligible.map((party) => party.id);
    return [];
}

export const APPEAL_TRANSITION_GLASS_CARD =
    'rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm p-4 space-y-3';
