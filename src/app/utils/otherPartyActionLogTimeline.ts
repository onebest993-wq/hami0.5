import type { OtherPartyActionLogEntry, TimelineEvent } from '@/app/types/execution';

/** تحويل سجل تحركات الطرف الآخر القديم إلى أحداث السجل الزمني */
export function otherPartyActionLogEntryToTimelineEvent(
    row: OtherPartyActionLogEntry
): Omit<TimelineEvent, 'id'> {
    const date = String(row.date || '').trim();
    const content = String(row.content || '').trim();
    const outcome = row.outcome;
    const title =
        outcome === 'approved'
            ? `موافقة — ${content}`
            : outcome === 'rejected'
              ? `رفض — ${content}`
              : content || 'تحرك الطرف الآخر';
    return {
        date,
        timestamp: String(row.savedAt || new Date().toISOString()),
        title,
        description: content,
        type: 'other_party',
        source: 'تحركات الطرف الآخر',
        metadata: {
            migratedFromOtherPartyActionLog: true,
            otherPartyActionLogId: row.id,
        },
    };
}

export function buildTimelineEventsFromOtherPartyActionLog(
    entries: OtherPartyActionLogEntry[],
    existingEvents: TimelineEvent[],
    nextId: () => string
): { events: TimelineEvent[]; migratedIds: string[] } {
    const existingMigrated = new Set(
        existingEvents
            .map((e) => String(e.metadata?.otherPartyActionLogId || '').trim())
            .filter(Boolean)
    );
    const added: TimelineEvent[] = [];
    const migratedIds: string[] = [];
    for (const row of entries) {
        const logId = String(row.id || '').trim();
        if (!logId || existingMigrated.has(logId)) continue;
        migratedIds.push(logId);
        added.push({
            id: nextId(),
            ...otherPartyActionLogEntryToTimelineEvent(row),
        });
    }
    return { events: added, migratedIds };
}
