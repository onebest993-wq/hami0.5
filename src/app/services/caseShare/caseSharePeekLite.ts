/**
 * قراءة مشاركات القضايا محلياً sync — بلا CaseShareApiService / SecureAPI.
 */
import SecureStoreService from '@/app/services/SecureStoreService';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';

const CASE_SHARE_LOCAL_KEY = 'hami:case-shares:v1';

function peekCaseShareRecords(): CaseShareRecord[] {
    try {
        if (typeof window === 'undefined') return [];
        const raw = SecureStoreService.getItemSync(CASE_SHARE_LOCAL_KEY);
        if (!raw) {
            const legacy = window.localStorage.getItem(CASE_SHARE_LOCAL_KEY);
            if (!legacy) return [];
            const parsed: unknown = JSON.parse(legacy);
            return Array.isArray(parsed) ? (parsed as CaseShareRecord[]) : [];
        }
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
