export type FastTrackStatusKey = 'pending' | 'accepted' | 'rejected' | 'approved' | 'grievance';

export const FAST_TRACK_GRIEVANCE_STORED = '⚖️ قيد نظر التظلم';

export const FAST_TRACK_STATUS_STORED: Record<FastTrackStatusKey, string> = {
    pending: '⏳ قيد الانتظار',
    accepted: '✅ صدر قرار بالقبول',
    rejected: '❌ صدر قرار بالرفض',
    approved: '✅ موافقة المحكمة',
    grievance: FAST_TRACK_GRIEVANCE_STORED,
};

type FastTrackStatusOption = {
    key: FastTrackStatusKey;
    label: string;
    hint: string;
    storedValue: string;
    chipActive: string;
    chipIdle: string;
};

/** خيارات الحالة الأساسية في نموذج الطلب (انتظار / قبول / رفض / تظلم). */
export const FAST_TRACK_STATUS_UI_OPTIONS: FastTrackStatusOption[] = [
    {
        key: 'pending',
        label: 'قيد الانتظار',
        hint: 'بانتظار القرار',
        storedValue: FAST_TRACK_STATUS_STORED.pending,
        chipActive: 'border-blue-400/45 bg-blue-500/15 text-blue-100',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-blue-400/25 hover:bg-blue-500/[0.06]',
    },
    {
        key: 'accepted',
        label: 'قبول',
        hint: 'قرار بالقبول',
        storedValue: FAST_TRACK_STATUS_STORED.accepted,
        chipActive: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-100',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-emerald-400/25 hover:bg-emerald-500/[0.06]',
    },
    {
        key: 'rejected',
        label: 'رفض',
        hint: 'قرار بالرفض',
        storedValue: FAST_TRACK_STATUS_STORED.rejected,
        chipActive: 'border-rose-400/45 bg-rose-500/15 text-rose-100',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-rose-400/25 hover:bg-rose-500/[0.06]',
    },
    {
        key: 'grievance',
        label: 'تظلم',
        hint: 'قيد نظر التظلم',
        storedValue: FAST_TRACK_STATUS_STORED.grievance,
        chipActive: 'border-amber-400/45 bg-amber-500/15 text-amber-100',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-amber-400/25 hover:bg-amber-500/[0.06]',
    },
];

export function resolveFastTrackStatusKey(stored?: string | null): FastTrackStatusKey {
    const s = String(stored ?? '').trim();
    if (!s) return 'pending';
    if (s.includes('التظلم')) return 'grievance';
    if (s.includes('بالرفض')) return 'rejected';
    if (s.includes('موافقة')) return 'approved';
    if (s.includes('بالقبول')) return 'accepted';
    if (s.includes('قيد الانتظار')) return 'pending';
    return 'pending';
}

export function storedFastTrackStatus(key: FastTrackStatusKey): string {
    return FAST_TRACK_STATUS_STORED[key];
}

export function isFastTrackDecidedStatus(stored?: string | null): boolean {
    const key = resolveFastTrackStatusKey(stored);
    return key === 'accepted' || key === 'rejected' || key === 'approved';
}

export function isFastTrackGrievanceStatus(stored?: string | null): boolean {
    return resolveFastTrackStatusKey(stored) === 'grievance';
}
