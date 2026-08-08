import { useCallback, useMemo } from 'react';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import { buildCalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import { pickActiveCalendarSparkNudge } from '@/app/spark/engine/sparkCalendarEngine';
import type { CalendarSparkSupplementalInput } from '@/app/spark/calendar/calendarSparkSupplementalScan';
import { useSparkNudgeHostShellBridge } from '@/app/spark/shell/useSparkNudgeHostShellBridge';
import { buildCalendarShellReviewPayload } from '@/app/spark/shell/shellReviewPayloadBuilders';
import { SparkSmartBadge } from '@/app/spark/ui/SparkSmartBadge';
import { useSparkActiveNudge } from '@/app/spark/ui/useSparkActiveNudge';
import { runCalendarSparkFollowAction } from '@/app/spark/calendar/calendarSparkBridge';

export type SparkCalendarNudgeHostProps = {
    allEvents: UnifiedEvent[];
    supplemental?: CalendarSparkSupplementalInput;
    disabled?: boolean;
    onFocusEvent?: (eventId: string, date: string) => void;
    onFocusDay?: (dateYmd: string) => void;
    onOpenSource?: (sourceModule: string, sourceEntityId: string) => void;
    onOpenRepositoryNote?: (noteId: string) => void;
    /** عند true يُخفى تنبيه التضارب ليوم selectedDateYmd — يعرضه ScheduleConflictAlert */
    suppressConflictNudge?: boolean;
    selectedDateYmd?: string;
};

export function SparkCalendarNudgeHost({
    allEvents,
    supplemental,
    disabled = false,
    onFocusEvent,
    onFocusDay,
    onOpenSource,
    onOpenRepositoryNote,
    suppressConflictNudge = false,
    selectedDateYmd,
}: SparkCalendarNudgeHostProps) {
    const ctx = useMemo(() => buildCalendarSparkContext(allEvents), [allEvents]);

    const active = useMemo(
        () =>
            disabled
                ? null
                : pickActiveCalendarSparkNudge(ctx, {
                      suppressConflictNudgesForDate:
                          suppressConflictNudge && selectedDateYmd ? selectedDateYmd : undefined,
                      supplemental,
                  }),
        [ctx, disabled, selectedDateYmd, suppressConflictNudge, supplemental],
    );

    const reviewPayload = useMemo(
        () => (disabled ? null : buildCalendarShellReviewPayload(ctx)),
        [ctx, disabled],
    );

    const { nudge, handleLater, handleDismiss, hideAfterFollow } = useSparkActiveNudge({
        disabled,
        dossierKey: ctx.dossierKey,
        active,
    });

    const followHandlers = useMemo(
        () => ({
            allEvents,
            onFocusEvent,
            onFocusDay,
            onOpenSource,
            onOpenRepositoryNote,
        }),
        [allEvents, onFocusDay, onFocusEvent, onOpenRepositoryNote, onOpenSource],
    );

    const handleFollow = useCallback(() => {
        if (!nudge) return;
        if (runCalendarSparkFollowAction(nudge, followHandlers)) {
            hideAfterFollow();
        }
    }, [followHandlers, hideAfterFollow, nudge]);

    useSparkNudgeHostShellBridge({
        surface: 'calendar',
        dossierKey: ctx.dossierKey,
        dossierLabel: 'التقويم',
        nudge: active,
        reviewPayload,
        onFollow: (actionId) => {
            if (!nudge) return;
            runCalendarSparkFollowAction(
                { ...nudge, action: { label: nudge.action?.label ?? '', actionId } },
                followHandlers,
            );
        },
        disabled,
    });

    if (!nudge) return null;

    return (
        <div className="px-3 pb-2 sm:px-4" dir="rtl">
            <SparkSmartBadge
                nudge={nudge}
                onFollow={nudge.action ? handleFollow : undefined}
                onLater={handleLater}
                onDismiss={handleDismiss}
            />
        </div>
    );
}
