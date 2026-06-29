/** مدة الجلسة — من 15 دقيقة إلى 3 ساعات */
export const CASE_SHARE_SESSION_MINUTES = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180] as const;

export type CaseShareSessionMinutes = (typeof CASE_SHARE_SESSION_MINUTES)[number];

export const DEFAULT_CASE_SHARE_SESSION_MINUTES: CaseShareSessionMinutes = 60;

export function formatCaseShareSession(minutes: number): string {
    if (minutes === 15) return 'ربع ساعة';
    if (minutes === 30) return 'نصف ساعة';
    if (minutes === 45) return '45 دقيقة';
    if (minutes === 60) return 'ساعة';
    if (minutes === 90) return 'ساعة ونصف';
    if (minutes === 120) return 'ساعتان';
    if (minutes === 180) return '3 ساعات';
    if (minutes % 60 === 0) return `${minutes / 60} ساعات`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} دقيقة`;
    return `${h} س ${m} د`;
}

export function clampCaseShareSessionMinutes(value: number): CaseShareSessionMinutes {
    const hit = CASE_SHARE_SESSION_MINUTES.find((m) => m === value);
    if (hit) return hit;
    const inRange = CASE_SHARE_SESSION_MINUTES.filter((m) => m <= value);
    return inRange.length ? inRange[inRange.length - 1]! : DEFAULT_CASE_SHARE_SESSION_MINUTES;
}

export const CASE_SHARE_CHANGED_EVENT = 'hami:case-share-changed';

export function dispatchCaseShareChanged(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(CASE_SHARE_CHANGED_EVENT));
}

export function isCaseShareSessionExpired(share: {
    status: string;
    sessionStartedAt?: string;
    sessionDurationMinutes?: number;
}): boolean {
    if (share.status !== 'accepted') return false;
    const started = share.sessionStartedAt;
    if (!started) return false;
    const minutes = share.sessionDurationMinutes ?? DEFAULT_CASE_SHARE_SESSION_MINUTES;
    const expiresAt = Date.parse(started) + minutes * 60_000;
    return Number.isFinite(expiresAt) && Date.now() >= expiresAt;
}

export function isCaseShareSessionActive(share: {
    status: string;
    sessionStartedAt?: string;
    sessionDurationMinutes?: number;
}): boolean {
    return share.status === 'accepted' && !isCaseShareSessionExpired(share);
}

export function caseShareStatusLabel(status: string): string {
    switch (status) {
        case 'pending':
            return 'بانتظار الموافقة';
        case 'accepted':
            return 'جلسة نشطة';
        case 'ended':
            return 'انتهت الجلسة';
        case 'declined':
            return 'مرفوضة';
        default:
            return status;
    }
}
