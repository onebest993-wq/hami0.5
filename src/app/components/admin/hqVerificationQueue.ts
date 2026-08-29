import type { HqVerificationFilter } from '@/app/components/admin/hqJump';
import { sanitizeHqDossierImage } from '@/app/components/admin/hqDossierMedia';
import { foldHqUserSearchText, HQ_USER_QUERY_MAX } from '@/app/components/admin/hqUserFilters';
import { hqLiveNameDivergesFromKyc } from '@/app/domain/admin/hqLiveVsKycName';

export type HqVerificationStatus = 'pending' | 'active' | 'rejected';

export type HqVerificationQueueRow = {
    userId: string;
    status: HqVerificationStatus;
    rejectionReason: string;
    fullName: string;
    familyName: string;
    email: string;
    phone: string;
    governorate: string;
    lawyerBarRoom: string;
    submittedAt: string;
    hasIdFront: boolean;
    hasIdBack: boolean;
    hasFaceSelfie: boolean;
    liveFullName: string;
};

function clipText(value: unknown, max: number): string {
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()
        .slice(0, max);
}

function asStatus(value: unknown): HqVerificationStatus {
    return value === 'active' || value === 'rejected' ? value : 'pending';
}

export function sanitizeHqVerificationQueueRow(raw: Record<string, unknown>): HqVerificationQueueRow | null {
    const userId = clipText(raw.userId, 64);
    if (!userId) return null;
    return {
        userId,
        status: asStatus(raw.status),
        rejectionReason: clipText(raw.rejectionReason, 240),
        fullName: clipText(raw.fullName, 80),
        familyName: clipText(raw.familyName, 80),
        email: clipText(raw.email, 120),
        phone: clipText(raw.phone, 24),
        governorate: clipText(raw.governorate, 80),
        lawyerBarRoom: clipText(raw.lawyerBarRoom, 80),
        submittedAt: clipText(raw.submittedAt, 40),
        hasIdFront: raw.hasIdFront === true,
        hasIdBack: raw.hasIdBack === true,
        hasFaceSelfie: raw.hasFaceSelfie === true,
        liveFullName: clipText(raw.liveFullName, 80),
    };
}

export function hqVerificationStatusLabel(status: HqVerificationStatus): string {
    if (status === 'active') return 'معتمد';
    if (status === 'rejected') return 'مرفوض';
    return 'قيد التدقيق';
}

export function hqVerificationHasDocuments(row: Pick<HqVerificationQueueRow, 'hasIdFront' | 'hasIdBack' | 'hasFaceSelfie'>): boolean {
    return row.hasIdFront || row.hasIdBack || row.hasFaceSelfie;
}

/** الاعتماد يتطلب وجه وظهر الهوية — الصورة الإضافية اختيارية. */
export function hqVerificationCanApprove(row: Pick<HqVerificationQueueRow, 'hasIdFront' | 'hasIdBack'>): boolean {
    return row.hasIdFront && row.hasIdBack;
}

export function hqVerificationNameMismatches(row: Pick<HqVerificationQueueRow, 'fullName' | 'liveFullName'>): boolean {
    return hqLiveNameDivergesFromKyc(row.liveFullName, row.fullName);
}

export function countHqVerificationByStatus(
    rows: readonly Pick<HqVerificationQueueRow, 'status'>[],
    status: HqVerificationStatus,
): number {
    return rows.filter((row) => row.status === status).length;
}

export function filterHqVerificationRows(
    rows: readonly HqVerificationQueueRow[],
    filter: HqVerificationFilter,
): HqVerificationQueueRow[] {
    if (filter === 'all') return [...rows];
    return rows.filter((row) => row.status === filter);
}

export function matchesHqVerificationQuery(row: HqVerificationQueueRow, query: string): boolean {
    const q = foldHqUserSearchText(query).trim().slice(0, HQ_USER_QUERY_MAX);
    if (!q) return true;
    const hay = foldHqUserSearchText(
        [
            row.fullName,
            row.liveFullName,
            hqLiveNameDivergesFromKyc(row.liveFullName, row.fullName) ? 'اختلاف الاسم طلب التوثيق' : '',
            row.familyName,
            row.email,
            row.phone,
            row.governorate,
            row.lawyerBarRoom,
            row.userId,
            hqVerificationStatusLabel(row.status),
            row.rejectionReason,
        ].join(' '),
    );
    return q.split(/\s+/).filter(Boolean).every((token) => hay.includes(token));
}

export function asHqIdentityImage(value: unknown): string | null {
    return sanitizeHqDossierImage(value);
}
