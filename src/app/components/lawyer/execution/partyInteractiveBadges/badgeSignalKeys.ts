import type { FixedPopoverLayout } from '../anchoredPopoverPosition';
import type { ExecutionFile } from '@/app/types/execution';
import { PERSONAL_COERCIVE_PERSIST_SIGNATURE_KEYS } from '../coerciveStackUtils';
import type {
    AbsenceBadgeInfo,
    EvictionGraceBadgeInfo,
    MemoBadgeInfo,
    PoliceAssistanceBadgeInfo,
    PublicationNoticeBadgeInfo,
    RegularTablighBadgeInfo,
    TaklifAssignmentBadgeInfo,
} from './types';

export function popoverLayoutsEqual(a: FixedPopoverLayout | null, b: FixedPopoverLayout | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    return (
        a.top === b.top &&
        a.left === b.left &&
        a.width === b.width &&
        a.maxHeight === b.maxHeight
    );
}

export function buildExecutionBadgeContextKey(
    ed: ExecutionFile | null | undefined,
    reloadEpoch?: number,
): string {
    const parts: string[] = [String(reloadEpoch ?? 0)];
    if (!ed) return parts.join('|');
    parts.push(String(ed.updatedAt ?? ''));
    parts.push(String(ed.debtorAttendedVoluntarily ?? ''));
    parts.push(String(ed.voluntaryAttendanceCount ?? ''));
    for (const key of PERSONAL_COERCIVE_PERSIST_SIGNATURE_KEYS) {
        parts.push(String((ed as Record<string, unknown>)[key] ?? ''));
    }
    return parts.join('|');
}

export function memoBadgeSignalKey(b: MemoBadgeInfo | null | undefined): string {
    if (!b) return '';
    return `${b.anchor}|${b.graceExpired}|${b.remaining}`;
}

export function publicationNoticeBadgeKey(b: PublicationNoticeBadgeInfo | null | undefined): string {
    if (!b) return '';
    return [
        b.publicationDateYmd,
        b.deadlineYmd,
        b.periodEndedAt,
        b.badgeHiddenAt,
        b.recordedAt,
        b.graceExpired,
        b.newspaper1,
        b.newspaper2,
    ]
        .map((x) => String(x ?? ''))
        .join('|');
}

export function regularTablighBadgeKey(b: RegularTablighBadgeInfo | null | undefined): string {
    if (!b) return '';
    return `${b.noticeDateYmd}|${b.purpose}`;
}

export function taklifAssignmentBadgeKey(b: TaklifAssignmentBadgeInfo | null | undefined): string {
    if (!b) return '';
    return `${b.notifyDateYmd}|${b.deadlineYmd}|${b.phase}|${b.cycleGeneration ?? 0}`;
}

export function absenceBadgeKey(b: AbsenceBadgeInfo | null | undefined): string {
    if (!b) return '';
    return `${b.label}|${b.className}`;
}

export function evictionGraceBadgeKey(b: EvictionGraceBadgeInfo | null | undefined): string {
    if (!b) return '';
    return `${b.startYmd}|${b.endYmd}|${b.daysTotal}|${b.remainingDays}`;
}

export function policeAssistanceBadgeKey(b: PoliceAssistanceBadgeInfo | null | undefined): string {
    if (!b) return '';
    return `${b.agencyName}|${b.dueYmd ?? ''}|${b.remainingDays ?? ''}`;
}

export function guarantorFollowupKey(g: ExecutionFile['guarantor_followup'] | null | undefined): string {
    if (!g) return '';
    return [
        g.guarantor_name,
        g.guarantor_workplace,
        g.guarantor_salary_iqd,
        g.guarantor_deduction_iqd,
    ]
        .map((x) => String(x ?? ''))
        .join('|');
}
