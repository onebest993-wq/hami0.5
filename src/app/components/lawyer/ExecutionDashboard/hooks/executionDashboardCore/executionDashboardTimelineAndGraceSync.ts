/** إزالة تكرار السجل الزمني — منطق نقي (موجة 12) */
import type { TimelineEvent } from '@/app/types/execution';
import { dedupeTimelineEventsForDisplay } from '@/app/utils/timelineDedup';
import {
    filterTimelineEventsForInabaDossier,
    filterTimelineEventsForParentDossier,
    isInabaSubFileId,
} from '@/app/stores';

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

export function scopeTimelineEventsForActiveDossier(
    timelineEvents: TimelineEvent[],
    executionId: string,
    activeSubFileId: string | null | undefined,
    parentDossierId: string,
): TimelineEvent[] {
    const execId = String(executionId || '');
    if (isInabaSubFileId(execId) && activeSubFileId) {
        return filterTimelineEventsForInabaDossier(timelineEvents, activeSubFileId);
    }
    if (parentDossierId) {
        return filterTimelineEventsForParentDossier(timelineEvents, parentDossierId);
    }
    return timelineEvents;
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

    const scoped = scopeTimelineEventsForActiveDossier(
        input.timelineEvents,
        input.executionId,
        input.activeSubFileId,
        input.parentDossierId,
    );
    const cleaned = dedupeTimelineEventsForDisplay(scoped);
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
