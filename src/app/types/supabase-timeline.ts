/**
 * صف جدول timeline_events في Supabase — لقطات السجل الزمني.
 * يُولَّد عبر الهجرة 019_timeline_events_snapshots.sql
 */
export interface TimelineEventDbRow {
    id: string;
    user_id: string;
    execution_file_id: string;
    event_id: string;
    title: string;
    description: string | null;
    event_type: string | null;
    event_date: string | null;
    event_timestamp: string | null;
    source: string | null;
    metadata: Record<string, unknown> | null;
    /** لقطة حالة الإضبارة (jsonb) */
    snapshot_data: unknown | null;
    payload: Record<string, unknown> | null;
    created_at: string;
}

export type TimelineEventInsertPayload = Omit<
    TimelineEventDbRow,
    'id' | 'user_id' | 'created_at'
> & {
    user_id?: string;
};
