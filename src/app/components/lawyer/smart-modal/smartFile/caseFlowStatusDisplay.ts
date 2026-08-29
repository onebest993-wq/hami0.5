import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { ymdPlusDays } from './proceduralTypes';

export const ABANDONMENT_REVIEW_DAYS = 10;

const BANNER_SHELL =
    'w-full rounded-xl border backdrop-blur-sm px-3.5 py-3 mb-4 flex flex-wrap justify-between items-center gap-3';
export const CASE_FLOW_BANNER_SHELL = BANNER_SHELL;

/** مهلة التجديد: 10 أيام من اليوم التالي لتاريخ الترك */
export function resolveAbandonmentReviewDeadline(fromEventYmd?: string): string {
    const base = String(fromEventYmd ?? getLocalTodayYmd()).trim().slice(0, 10);
    const dayAfter = ymdPlusDays(base, 1);
    return ymdPlusDays(dayAfter, ABANDONMENT_REVIEW_DAYS);
}

export function formatInterruptionBannerText(
    interruptionData?: Record<string, unknown> | null,
): { headline: string; detail?: string } {
    const reason = String(interruptionData?.reason ?? '').trim();
    const party = String(interruptionData?.affectedParty ?? '').trim();
    if (reason && party) {
        return {
            headline: 'انقطاع السير في الدعوى — تبطل العريضة بعد 6 أشهر',
            detail: `السبب: ${reason} · الطرف المعني: ${party}`,
        };
    }
    if (reason) {
        return {
            headline: 'انقطاع السير في الدعوى — تبطل العريضة بعد 6 أشهر',
            detail: `السبب: ${reason}`,
        };
    }
    return { headline: 'انقطاع السير في الدعوى — تبطل العريضة بعد 6 أشهر' };
}
