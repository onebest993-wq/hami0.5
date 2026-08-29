/** إزالة تكرار السجل الزمني — منطق نقي (موجة 12) */
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { dedupeTimelineEventsForDisplay } from '@/app/utils/timelineDedup';

export function buildTimelineEventRowSignature(events: TimelineEvent[]): string {
    return events
        .map(
            (e) =>
                `${String(e.id)}:${String(e.type || '')}:${String(e.title || '')}:${String(
                    e.timestamp || e.date || '',
                )}:${String(e.trashedAt || '')}:${e.isPinned ? '1' : '0'}`,
        )
        .join('|');
}

/** دمج آمن بين الحالة المحلية والوارد من التخزين — لا يمسح الأحداث الأحدث محلياً */
export function reconcileTimelineEventsState(
    local: TimelineEvent[],
    incoming: TimelineEvent[],
    options?: { forceReplace?: boolean },
): TimelineEvent[] {
    if (options?.forceReplace) return Array.isArray(incoming) ? [...incoming] : [];
    const localList = Array.isArray(local) ? local : [];
    const incomingList = Array.isArray(incoming) ? incoming : [];
    const localActive = localList.filter((e) => !e.trashedAt);
    const incomingActive = incomingList.filter((e) => !e.trashedAt);

    if (incomingActive.length === 0 && localActive.length > 0) return localList;

    const localSig = buildTimelineEventRowSignature(localActive);
    const incomingSig = buildTimelineEventRowSignature(incomingActive);
    if (localSig === incomingSig) return localList;

    if (incomingActive.length >= localActive.length) {
        const localOnly = localList.filter(
            (e) => e?.id && !incomingList.some((x) => String(x.id) === String(e.id)),
        );
        return [...incomingList, ...localOnly];
    }

    const incomingOnly = incomingList.filter(
        (e) => e?.id && !localList.some((x) => String(x.id) === String(e.id)),
    );
    return [...localList, ...incomingOnly];
}

type CaseNotesLogRow = NonNullable<ExecutionFile['caseNotesLog']>[number];
type CaseTasksPendingRow = NonNullable<ExecutionFile['caseTasksPending']>[number];

function buildCaseNotesLogRowSignature(notes: CaseNotesLogRow[]): string {
    return notes
        .map(
            (n) =>
                `${String(n.id)}:${String(n.title || '')}:${String(n.body || '')}:${String(
                    n.createdAt || '',
                )}:${String(n.trashedAt || '')}:${n.pinned ? '1' : '0'}`,
        )
        .join('|');
}

function buildCaseTasksPendingRowSignature(tasks: CaseTasksPendingRow[]): string {
    return tasks
        .map(
            (t) =>
                `${String(t.id)}:${String(t.title || '')}:${String(t.body || '')}:${String(
                    t.dueDate || '',
                )}:${String(t.createdAt || '')}:${String(t.trashedAt || '')}:${t.pinned ? '1' : '0'}`,
        )
        .join('|');
}

function reconcileKeyedLogState<T extends { id?: string; trashedAt?: string | null }>(
    local: T[],
    incoming: T[],
    buildSignature: (rows: T[]) => string,
    options?: { forceReplace?: boolean },
): T[] {
    if (options?.forceReplace) return Array.isArray(incoming) ? [...incoming] : [];
    const localList = Array.isArray(local) ? local : [];
    const incomingList = Array.isArray(incoming) ? incoming : [];
    const localActive = localList.filter((row) => !row.trashedAt);
    const incomingActive = incomingList.filter((row) => !row.trashedAt);

    if (incomingActive.length === 0 && localActive.length > 0) return localList;

    const localSig = buildSignature(localActive);
    const incomingSig = buildSignature(incomingActive);
    if (localSig === incomingSig) return localList;

    if (incomingActive.length >= localActive.length) {
        const localOnly = localList.filter(
            (row) => row?.id && !incomingList.some((x) => String(x.id) === String(row.id)),
        );
        return [...incomingList, ...localOnly];
    }

    const incomingOnly = incomingList.filter(
        (row) => row?.id && !localList.some((x) => String(x.id) === String(row.id)),
    );
    return [...localList, ...incomingOnly];
}

/** دمج آمن لسجل الملاحظات — لا يمسح الملاحظات المحلية الأحدث عند تأخر executionData */
export function reconcileCaseNotesLogState(
    local: CaseNotesLogRow[],
    incoming: CaseNotesLogRow[],
    options?: { forceReplace?: boolean },
): CaseNotesLogRow[] {
    return reconcileKeyedLogState(local, incoming, buildCaseNotesLogRowSignature, options);
}

/** دمج آمن لمهام الإضبارة المعلّقة */
export function reconcileCaseTasksPendingState(
    local: CaseTasksPendingRow[],
    incoming: CaseTasksPendingRow[],
    options?: { forceReplace?: boolean },
): CaseTasksPendingRow[] {
    return reconcileKeyedLogState(local, incoming, buildCaseTasksPendingRowSignature, options);
}

export type TimelineDedupePersistPlan = {
    cleaned: TimelineEvent[];
    signature: string;
    skipPersistBecauseAlreadyRaw: boolean;
};

export function planTimelineDedupePersist(input: {
    timelineEvents: TimelineEvent[];
    executionId: string;
    activeSubFileId: string | null | undefined;
    parentDossierId: string;
    previousSignature: string;
}): TimelineDedupePersistPlan | null {
    if (!input.executionId) return null;

    const cleaned = dedupeTimelineEventsForDisplay(input.timelineEvents || []);
    const signature = buildTimelineEventRowSignature(cleaned);
    if (signature === input.previousSignature) return null;

    const rawSignature = buildTimelineEventRowSignature(input.timelineEvents || []);
    return {
        cleaned,
        signature,
        skipPersistBecauseAlreadyRaw: signature === rawSignature,
    };
}

export function shouldEndGracePeriodFromExecutionStatus(
    executionStatus: string | undefined,
    gracePeriodEnded: boolean,
): boolean {
    return executionStatus === 'READY_FOR_COERCIVE' && !gracePeriodEnded;
}

export function parseAppointmentEventYmd(ev: TimelineEvent): string {
    const raw = String(ev?.date || '').trim();
    const m = /^\d{4}-\d{2}-\d{2}/.exec(raw);
    return m ? m[0] : '';
}

export function parseAppointmentEventTitle(ev: TimelineEvent): string {
    const t = String(ev?.title || '').trim();
    return t.replace(/^📅\s*/, '').trim() || 'موعد';
}

export function shouldShowEvictionGraceReminderToast(input: {
    remainingDays: number | null | undefined;
}): boolean {
    const rem = Number(input.remainingDays ?? 0);
    return Number.isFinite(rem) && rem > 0 && rem <= 2;
}

export function buildEvictionGraceReminderToastMessage(
    remainingDays: number,
    endYmd: string,
): string {
    return `⏳ تنبيه: تبقى ${remainingDays} ${remainingDays === 1 ? 'يوم' : 'أيام'} على انتهاء المهلة (${endYmd})`;
}

export function buildEvictionGraceReminderStoreKey(persistKey: string, endYmd: string): string {
    return `eviction-grace-reminder:${persistKey}:${endYmd}`;
}

export function buildAppointmentReminderStoreKey(
    executionKey: string,
    appointmentKey: string,
    todayYmd: string,
): string {
    return `hami:apptReminder:${executionKey}:${appointmentKey}:${todayYmd}`;
}
