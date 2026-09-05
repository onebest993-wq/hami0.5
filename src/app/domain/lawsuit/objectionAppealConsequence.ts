/**
 * أثر قرار الاعتراض على الحكم الغيابي في الاستئناف المستأخر.
 * المسار خطي: لا رولين حيّين — فك سبب الاستئخار، عريضة أصلية عند الإبطال، توحيد الطعن اللاحق.
 */
export type AbsentObjectionOutcome = 'uphold' | 'form_reject' | 'void_full' | 'partial';
export type AbsentObjectionClientRole = 'objector' | 'objected' | null;

export const ART172_STAY_CAUSE_LIFTED =
    'زال سبب الاستئخار — قدّم طلب استئناف السير في الدعوى المستأخرة';

export const OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE =
    'لا تكتفِ بفك الاستئخار — سجّل عريضة استئناف أصلية للطعن في قرار الإبطال خلال 15 يوماً ثم وحّدها مع الاستئناف القائم';

export const ART172_VOID_EXTENDS_TO_PRESENT_NOTICE =
    'امتد أثر إبطال الحكم الغيابي لصالح الحاضر المستأنف عملاً بالمادة (172) مرافعات — اطلب فسخ الحكم بحق موكلك ورد دعوى المدعي';

export const OBJECTOR_UPHOLD_ORIGINAL_APPEAL_NOTICE =
    'لا استئناف متقابل ضد الشريك الحاضر (م/190) — السبيل عريضة استئناف أصلية خلال 15 يوماً ثم توحيدها مع استئناف الحاضر';

export const UNIFIED_APPEALS_TIMELINE_TITLE = 'توحيد الاستئنافين';

export function classifyAbsentObjectionOutcome(
    judgmentTypeOrDecision?: string | null,
): AbsentObjectionOutcome | null {
    const t = String(judgmentTypeOrDecision ?? '').trim();
    if (!t) return null;
    if (
        t.includes('رد الاعتراض شكلاً')
        || t.includes('إبطال الاعتراض')
        || t.includes('إبطاله للغياب')
        || (t.includes('م/179') && t.includes('اعتراض'))
    ) {
        return 'form_reject';
    }
    if (t.includes('رد الدعوى جزئياً') || t.includes('تعديل جزئي')) {
        return 'partial';
    }
    if (
        t.includes('رد الدعوى كلياً')
        || t.includes('تعديل الحكم الغيابي')
        || (t.includes('تعديل') && t.includes('الحكم') && !t.includes('جزئ'))
    ) {
        return 'void_full';
    }
    if (
        t.includes('إجابة الدعوى بالكامل')
        || t.includes('تأييد الحكم الغيابي')
        || (t.includes('تأييد') && t.includes('غيابي'))
    ) {
        return 'uphold';
    }
    return null;
}

export function objectionOutcomeLiftsStayCause(outcome: AbsentObjectionOutcome | null): boolean {
    return outcome === 'uphold'
        || outcome === 'form_reject'
        || outcome === 'void_full'
        || outcome === 'partial';
}

export function objectorMayFileOriginalAppeal(outcome: AbsentObjectionOutcome | null): boolean {
    return outcome === 'uphold' || outcome === 'partial';
}

export function plaintiffMustFileNewOriginalAppeal(outcome: AbsentObjectionOutcome | null): boolean {
    return outcome === 'void_full';
}

export function presentAppellantGainsArt172VoidCoverage(params: {
    outcome: AbsentObjectionOutcome | null;
    indivisible: boolean;
}): boolean {
    return params.outcome === 'void_full' && params.indivisible;
}

export function resolveObjectionAppealNotices(params: {
    outcome: AbsentObjectionOutcome | null;
    clientRole: AbsentObjectionClientRole;
    stayActive: boolean;
    objectionResolved: boolean;
    indivisible: boolean;
    clientIsPresentAppellant: boolean;
}): string[] {
    const notices: string[] = [];
    if (!params.objectionResolved || !params.outcome) return notices;

    if (params.stayActive && objectionOutcomeLiftsStayCause(params.outcome)) {
        notices.push(ART172_STAY_CAUSE_LIFTED);
    }

    if (params.clientRole === 'objected' && plaintiffMustFileNewOriginalAppeal(params.outcome)) {
        notices.push(OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE);
    }

    if (
        params.clientIsPresentAppellant
        && presentAppellantGainsArt172VoidCoverage({
            outcome: params.outcome,
            indivisible: params.indivisible,
        })
    ) {
        notices.push(ART172_VOID_EXTENDS_TO_PRESENT_NOTICE);
    }

    if (params.clientRole === 'objector' && objectorMayFileOriginalAppeal(params.outcome)) {
        notices.push(OBJECTOR_UPHOLD_ORIGINAL_APPEAL_NOTICE);
    }

    return notices;
}

export function resolveObjectionResumeWarning(params: {
    outcome: AbsentObjectionOutcome | null;
    clientRole: AbsentObjectionClientRole;
}): string | null {
    if (params.clientRole === 'objected' && plaintiffMustFileNewOriginalAppeal(params.outcome)) {
        return OBJECTION_VOID_PLAINTIFF_NEW_APPEAL_NOTICE;
    }
    return null;
}
