import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { isLiveCloudSyncBucketEnabled } from '@/app/services/settings/cloudSyncBucket';
import { debug } from '@/app/utils/debug';
import type { TimelineEvent } from '@/app/types/execution';
import type { TimelineEventDbRow } from '@/app/types/supabase-timeline';

function canReachExecutionTimelineCloud(): boolean {
    return isLiveCloudSyncBucketEnabled('execution');
}

/**
 * إدراج حدث زمني عبر WIFE BFF.
 * محلي بالكامل حتى تُفعَّل مزامنة التنفيذ — الفشل عند التزامن يُتجاهل بهدوء.
 */
export async function insertTimelineEventToSupabase(params: {
    executionFileId: string;
    event: TimelineEvent;
    snapshotData?: unknown;
}): Promise<void> {
    const { executionFileId, event, snapshotData } = params;
    if (!executionFileId || executionFileId === 'undefined') return;
    if (!canReachExecutionTimelineCloud()) return;

    try {
        await SecureAPIClient.fetchSecure('/api/timeline-events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ executionFileId, event, snapshotData }),
        });
    } catch (e) {
        debug.error('[timelineEventsSupabase] فشل upsert:', e);
    }
}

/**
 * جلب أحداث السجل من BFF مع snapshot_data للدمج مع الواجهة.
 */
export async function fetchTimelineEventsFromSupabase(
    executionFileId: string
): Promise<TimelineEventDbRow[]> {
    if (!executionFileId || executionFileId === 'undefined') return [];
    if (!canReachExecutionTimelineCloud()) return [];

    try {
        const res = await SecureAPIClient.fetchSecure<{ ok: boolean; rows?: TimelineEventDbRow[] }>(
            `/api/timeline-events?executionFileId=${encodeURIComponent(executionFileId)}`,
            { method: 'GET' },
        );
        return Array.isArray(res?.rows) ? res.rows : [];
    } catch (e) {
        debug.error('[timelineEventsSupabase] جلب — استثناء:', e);
        return [];
    }
}

/**
 * يدمج snapshot_data القادم من Supabase في أحداث الواجهة المحلية (حسب event_id).
 */
export function mergeRemoteSnapshotsIntoTimelineEvents(
    local: TimelineEvent[],
    remoteRows: TimelineEventDbRow[]
): TimelineEvent[] {
    if (!remoteRows.length) return local;
    const byId = new Map(remoteRows.map((r) => [r.event_id, r.snapshot_data]));
    return local.map((e) => {
        const snap = byId.get(String(e.id));
        if (snap == null || e.snapshot != null) return e;
        return { ...e, snapshot: snap };
    });
}
