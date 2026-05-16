-- لقطات السجل الزمني لمعاينة «آلة الزمن» — مرتبطة بملف التنفيذ والمستخدم
CREATE TABLE IF NOT EXISTS public.timeline_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    execution_file_id text NOT NULL,
    event_id text NOT NULL,
    title text NOT NULL DEFAULT '',
    description text,
    event_type text,
    event_date text,
    event_timestamp text,
    source text,
    metadata jsonb,
    snapshot_data jsonb,
    payload jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT timeline_events_execution_event_unique UNIQUE (execution_file_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_timeline_events_execution
    ON public.timeline_events (execution_file_id);

CREATE INDEX IF NOT EXISTS idx_timeline_events_user_created
    ON public.timeline_events (user_id, created_at DESC);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_events_select_own"
    ON public.timeline_events FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "timeline_events_insert_own"
    ON public.timeline_events FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "timeline_events_update_own"
    ON public.timeline_events FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "timeline_events_delete_own"
    ON public.timeline_events FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

COMMENT ON COLUMN public.timeline_events.snapshot_data IS 'لقطة JSON لحالة الإضبارة وقت الحدث (آلة الزمن)';
