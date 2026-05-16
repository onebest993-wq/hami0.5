/**
 * تبليغ بالنشر — مدة ١٥ يوماً تقويمياً تبدأ من اليوم التالي لتاريخ النشر في الجريدتين.
 */

import type { ExecutionFile, PublicationNoticeDebtorState } from '@/app/types/execution';
import {
    addCalendarDaysYmd,
} from '@/app/utils/employeeSummonsAssignment';

export const PUBLICATION_NOTICE_DURATION_DAYS = 15;

/** آخر يوم ضمن المدة: تاريخ النشر + ١٥ يوماً تقويمياً (اليوم الأول للاحتساب = اليوم التالي للنشر). */
export function publicationNoticeDeadlineYmd(publicationDateYmd: string): string {
    return addCalendarDaysYmd(publicationDateYmd, PUBLICATION_NOTICE_DURATION_DAYS);
}

export function buildPublicationNoticePatchForDebtorKey(
    file: ExecutionFile,
    debtorKey: string,
    next: PublicationNoticeDebtorState | null
): { publication_notice_by_debtor: Record<string, PublicationNoticeDebtorState> } {
    const map: Record<string, PublicationNoticeDebtorState> = {
        ...(file.publication_notice_by_debtor ?? {}),
    };
    const dk = String(debtorKey);
    if (next == null) {
        delete map[dk];
    } else {
        map[dk] = { ...next };
    }
    return { publication_notice_by_debtor: map };
}

export function getPublicationNoticeForDebtorKey(
    file: ExecutionFile | null | undefined,
    debtorKey: string
): PublicationNoticeDebtorState | null {
    if (!file?.publication_notice_by_debtor) return null;
    const v = file.publication_notice_by_debtor[String(debtorKey)];
    if (!v || typeof v !== 'object') return null;
    const p = String(v.publicationDateYmd ?? '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p)) return null;
    const n1 = String(v.newspaper1 ?? '').trim();
    const n2 = String(v.newspaper2 ?? '').trim();
    if (!n1 || !n2) return null;
    const recordedAt = String((v as { recordedAt?: string }).recordedAt ?? '').trim();
    const badgeHiddenAt = String((v as { badgeHiddenAt?: string }).badgeHiddenAt ?? '').trim();
    const periodEndedAt = String((v as { periodEndedAt?: string }).periodEndedAt ?? '').trim();
    return {
        publicationDateYmd: p,
        newspaper1: n1,
        newspaper2: n2,
        ...(recordedAt ? { recordedAt } : {}),
        ...(badgeHiddenAt ? { badgeHiddenAt } : {}),
        ...(periodEndedAt ? { periodEndedAt } : {}),
    };
}
