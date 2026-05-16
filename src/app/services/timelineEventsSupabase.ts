import { supabase } from '@/app/lib/supabase-client';
import { debug } from '@/app/utils/debug';
import type { TimelineEvent } from '@/app/types/execution';
import type { TimelineEventDbRow } from '@/app/types/supabase-timeline';

const TABLE = 'timeline_events';

function payloadWithoutSnapshot(event: TimelineEvent): Record<string, unknown> {
    const { snapshot: _snap, ...rest } = event;
    return rest as Record<string, unknown>;
}

/**
 * إدراج حدث زمني (ومنها snapshot_data) في Supabase.
 * يتجاهل الفشل بهدوء إن لم يكن الجدول متاحاً أو المستخدم غير مسجّل.
 */
export async function insertTimelineEventToSupabase(params: {
    executionFileId: string;
    event: TimelineEvent;
    snapshotData?: unknown;
}): Promise<void> {
    const { executionFileId, event, snapshotData } = params;
    if (!executionFileId || executionFileId === 'undefined') return;

    try {
        const {
            data: { user },
            error: authErr,
        } = await supabase.auth.getUser();
        if (authErr || !user?.id) {
            debug.log('[timelineEventsSupabase] تخطي الإدراج — لا مستخدم Supabase');
            return;
        }

        const snap = snapshotData !== undefined ? snapshotData : event.snapshot;
        const row = {
            user_id: user.id,
            execution_file_id: executionFileId,
            event_id: String(event.id),
            title: String(event.title ?? ''),
            description: event.description ?? null,
            event_type: event.type != null ? String(event.type) : null,
            event_date: event.date ?? null,
            event_timestamp: event.timestamp ?? null,
            source: event.source ?? null,
            metadata: (event.metadata as Record<string, unknown>) ?? null,
            snapshot_data: snap ?? null,
            payload: payloadWithoutSnapshot(event),
        };

        const { error } = await supabase.from(TABLE).upsert(row, {
            onConflict: 'execution_file_id,event_id',
        });
        if (error) {
            debug.error('[timelineEventsSupabase] فشل upsert:', error.message);
        }
    } catch (e) {
        debug.error('[timelineEventsSupabase] استثناء:', e);
    }
}

/**
 * جلب أحداث السجل من Supabase مع snapshot_data للدمج مع الواجهة.
 */
export async function fetchTimelineEventsFromSupabase(
    executionFileId: string
): Promise<TimelineEventDbRow[]> {
    if (!executionFileId || executionFileId === 'undefined') return [];

    try {
        const {
            data: { user },
            error: authErr,
        } = await supabase.auth.getUser();
        if (authErr || !user?.id) return [];

        const { data, error } = await supabase
            .from(TABLE)
            .select(
                'id,user_id,execution_file_id,event_id,title,description,event_type,event_date,event_timestamp,source,metadata,snapshot_data,payload,created_at'
            )
            .eq('execution_file_id', executionFileId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            debug.error('[timelineEventsSupabase] فشل الجلب:', error.message);
            return [];
        }
        return (data ?? []) as TimelineEventDbRow[];
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
