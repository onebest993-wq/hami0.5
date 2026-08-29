import type { JudicialDecision } from '@/app/types/criminal';
import { DETENTION_DECISION_TEMPLATE, isDetentionDecisionTemplate } from './proceduralRequestTypes';

export { DETENTION_DECISION_TEMPLATE };

function parseIsoDateOnly(raw: string | undefined): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw ?? '').trim());
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function todayIsoDate(): string {
    return new Date().toISOString().slice(0, 10);
}

/** true إذا كان تاريخ الانتهاء اليوم أو سابقاً (انتهت المدة). */
export function isDetentionEndReached(endDate: string | undefined, refDate = todayIsoDate()): boolean {
    const end = parseIsoDateOnly(endDate);
    const ref = parseIsoDateOnly(refDate);
    if (!end || !ref) return false;
    return end.getTime() <= ref.getTime();
}

export function isDetentionPeriodActive(endDate: string | undefined, refDate = todayIsoDate()): boolean {
    return Boolean(String(endDate ?? '').trim()) && !isDetentionEndReached(endDate, refDate);
}

/** تمديد دورة — تاريخ انتهاء جديد فقط (يجب أن يتجاوز الانتهاء السابق). */
export function validateDetentionExtensionEnd(
    previousEndDate: string,
    newEndDate: string,
): string | null {
    const prev = String(previousEndDate ?? '').trim();
    const next = String(newEndDate ?? '').trim();
    if (!next) return 'تاريخ انتهاء التوقيف الجديد مطلوب.';
    if (!parseIsoDateOnly(next)) return 'صيغة التاريخ YYYY-MM-DD فقط.';
    const prevD = parseIsoDateOnly(prev);
    const nextD = parseIsoDateOnly(next);
    if (prevD && nextD && nextD.getTime() <= prevD.getTime()) {
        return 'تاريخ الانتهاء الجديد يجب أن يتجاوز تاريخ الانتهاء السابق.';
    }
    return null;
}

export function validateDetentionDateRange(startDate: string, endDate: string): string | null {
    const start = String(startDate ?? '').trim();
    const end = String(endDate ?? '').trim();
    if (!start || !end) return 'تاريخ بدء وانتهاء التوقيف مطلوبان.';
    if (!parseIsoDateOnly(start) || !parseIsoDateOnly(end)) return 'صيغة التاريخ YYYY-MM-DD فقط.';
    if (parseIsoDateOnly(start)!.getTime() > parseIsoDateOnly(end)!.getTime()) {
        return 'تاريخ الانتهاء لا يمكن أن يسبق تاريخ البدء.';
    }
    return null;
}

/** بطاقة توقيف حية — للعرض والمحرك التفاعلي (لا يشترط isLocked). */
export function isActiveDetentionCard(decision: JudicialDecision): boolean {
    if (decision.requestOutcomeStatus === 'rejected') return false;
    if (!isDetentionDecisionTemplate(decision.proceduralTemplate ?? decision.title)) return false;
    return Boolean(String(decision.detentionEndDate ?? '').trim());
}

export function sortDecisionsNewestFirst(decisions: JudicialDecision[]): JudicialDecision[] {
    return [...decisions].sort((a, b) => {
        const ad = parseIsoDateOnly(a.issuedAt)?.getTime() ?? 0;
        const bd = parseIsoDateOnly(b.issuedAt)?.getTime() ?? 0;
        return bd - ad;
    });
}

/** أحدث قرار توقيف نافذ لنفس الأطراف — للتحكم بأزرار المحرك الذكي. */
function findLatestBindingDetentionDecision(
    decisions: JudicialDecision[],
    partyIds: string[],
): JudicialDecision | null {
    const idSet = new Set(partyIds.map((x) => String(x).trim()).filter(Boolean));
    if (!idSet.size) return null;
    const hits = sortDecisionsNewestFirst(decisions).filter((d) => {
        if (!isActiveDetentionCard(d)) return false;
        const ids = (d.defendantIds ?? d.beneficiaryPartyIds ?? []).map((x) => String(x).trim());
        return ids.some((id) => idSet.has(id));
    });
    return hits[0] ?? null;
}

export function isLatestBindingDetentionForParties(
    decision: JudicialDecision,
    allDecisions: JudicialDecision[],
): boolean {
    const ids = (decision.defendantIds ?? decision.beneficiaryPartyIds ?? [])
        .map((x) => String(x).trim())
        .filter(Boolean);
    if (!ids.length) {
        const active = allDecisions.filter(isActiveDetentionCard);
        return active.length === 1 && active[0]!.id === decision.id;
    }
    const latest = findLatestBindingDetentionDecision(allDecisions, ids);
    if (!latest) return false;
    if (latest.id === decision.id) return true;
    const src = String(decision.sourceRequestId ?? '').trim();
    const latestSrc = String(latest.sourceRequestId ?? '').trim();
    return Boolean(src && latestSrc && src === latestSrc);
}
