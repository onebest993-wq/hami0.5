import type { EmployeeSummonsAssignmentState, PublicationNoticeDebtorState } from '@/app/types/execution';

export type SummonsHubKind = 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | 'status';

export type SummonsHubActiveSnapshot = {
    tabligh: { noticeDateYmd: string; purpose: string } | null;
    taklif: EmployeeSummonsAssignmentState | null;
    nashr: PublicationNoticeDebtorState | null;
    guarantor: { noticeDateYmd: string; reason: string } | null;
};

function isTaklifPhaseActive(phase: string | null | undefined): boolean {
    return (
        phase === 'active' ||
        phase === 'absent_declared' ||
        phase === 'investigation_pending' ||
        phase === 'warrant_ui'
    );
}

export function buildSummonsHubActiveSnapshot(input: {
    tablighTask:
        | { noticeDateYmd: string; purpose: string; periodEndedAt?: string | null }
        | null
        | undefined;
    employeeAssignment: EmployeeSummonsAssignmentState | null | undefined;
    publicationNotice: PublicationNoticeDebtorState | null | undefined;
    guarantor: { noticeDateYmd: string; reason: string; endedAt?: string | null; attendedAt?: string | null } | null | undefined;
}): SummonsHubActiveSnapshot {
    const guar = input.guarantor;
    const guarantorActive =
        guar &&
        String(guar.noticeDateYmd || '').trim() &&
        !String(guar.endedAt || '').trim() &&
        !String(guar.attendedAt || '').trim()
            ? { noticeDateYmd: String(guar.noticeDateYmd).trim(), reason: String(guar.reason || '').trim() }
            : null;

    const taklif =
        input.employeeAssignment && isTaklifPhaseActive(input.employeeAssignment.phase)
            ? input.employeeAssignment
            : null;

    const nashr = input.publicationNotice && !String(input.publicationNotice.periodEndedAt ?? '').trim()
        ? input.publicationNotice
        : null;

    // التبليغ العادي المنتهي (periodEndedAt أو سجل ممسوح) لا يُعدّ مساراً سارياً.
    const tablighRaw = input.tablighTask;
    const tabligh =
        tablighRaw?.noticeDateYmd && !String(tablighRaw.periodEndedAt ?? '').trim()
            ? {
                  noticeDateYmd: String(tablighRaw.noticeDateYmd).trim(),
                  purpose: String(tablighRaw.purpose || 'تبليغ').trim(),
              }
            : null;

    return { tabligh, taklif, nashr, guarantor: guarantorActive };
}

export function countActiveSummonsPaths(snapshot: SummonsHubActiveSnapshot): number {
    return (
        (snapshot.tabligh ? 1 : 0) +
        (snapshot.taklif ? 1 : 0) +
        (snapshot.nashr ? 1 : 0) +
        (snapshot.guarantor ? 1 : 0)
    );
}

/**
 * مسار واحد سارٍ في وقت واحد بين التبليغ / التكليف / النشر.
 * (تبليغ الكفيل مستقل سياقاً ولا يُقفل به المسارات العامة.)
 */
export function getSummonsKindLockReason(
    kind: Exclude<SummonsHubKind, 'status' | 'guarantor'>,
    snapshot: SummonsHubActiveSnapshot,
): string | null {
    const blockers: string[] = [];
    if (kind !== 'tabligh' && snapshot.tabligh) blockers.push('تبليغ عادي سارٍ');
    if (kind !== 'taklif' && snapshot.taklif) blockers.push('تكليف بالحضور سارٍ');
    if (kind !== 'nashr' && snapshot.nashr) blockers.push('تبليغ بالنشر سارٍ');
    if (blockers.length === 0) return null;
    return `لا يمكن فتح هذا المسار بينما يوجد: ${blockers.join(' · ')}. أنهِ المسار الساري أولاً من تبويب «الوضع الحالي».`;
}

export function resolvePrimaryActiveKind(
    snapshot: SummonsHubActiveSnapshot,
): Exclude<SummonsHubKind, 'status'> | null {
    if (snapshot.taklif) return 'taklif';
    if (snapshot.nashr) return 'nashr';
    if (snapshot.tabligh) return 'tabligh';
    if (snapshot.guarantor) return 'guarantor';
    return null;
}
