/**
 * قراءة مشاركات القضايا محلياً sync — بلا CaseShareApiService / SecureAPI.
 * أول طلاء: قراءة فقط. leftover لا يُشفَّر هنا؛ الترحيل في loadCaseShareRecords.
 * أصل unread لا تُسمَّم عليه مرآة localStorage.
 */
import { peekSecureOrLegacySync } from '@/app/services/storage/readSecureOrDrainLegacySync';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';

const CASE_SHARE_LOCAL_KEY = 'hami:case-shares:v1';

function peekCaseShareRecords(): CaseShareRecord[] {
    try {
        if (typeof window === 'undefined') return [];
        const raw = peekSecureOrLegacySync(CASE_SHARE_LOCAL_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as CaseShareRecord[]) : [];
    } catch {
        return [];
    }
}

/** عدّاد pending للمستلم — لشارة الجرس عند أول paint */
export function peekCaseSharePendingCount(userId: string | null | undefined): number {
    const uid = userId?.trim();
    if (!uid) return 0;
    try {
        return peekCaseShareRecords().filter(
            (s) => s.recipientId === uid && s.status === 'pending',
        ).length;
    } catch {
        return 0;
    }
}
