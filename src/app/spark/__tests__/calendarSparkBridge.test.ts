import { describe, expect, it, vi } from 'vitest';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import {
    resolveCalendarBridgeWorkspaceRoute,
    resolveCalendarEventFollowAction,
    resolveCalendarHubFollowRoute,
    runCalendarSparkFollowAction,
} from '@/app/spark/calendar/calendarSparkBridge';
import type { SparkNudge } from '@/app/spark/types';
import { SPARK_HOME_HUB_CALENDAR_ROUTE } from '@/app/spark/ui/SparkCalendarHubInsight';

function bridgedEvent(partial: Partial<UnifiedEvent> & Pick<UnifiedEvent, 'id'>): UnifiedEvent {
    return {
        title: 'جلسة',
        date: '2026-08-06',
        type: 'hearing',
        source: 'hearing',
        isBridged: true,
        bridge: {
            sourceModule: 'lawsuit',
            sourceEntityId: 'law-9',
            sourceEventId: 'evt-9',
            calendarRecordId: 'cal-9',
        },
        ...partial,
    };
}

describe('calendarSparkBridge', () => {
    it('يحوّل جسر التقويم إلى مسار workspace', () => {
        expect(
            resolveCalendarBridgeWorkspaceRoute({
                sourceModule: 'execution',
                sourceEntityId: 'ex-1',
                sourceEventId: 'e1',
                calendarRecordId: 'c1',
            }),
        ).toBe('workspace:execution:ex-1');
    });

    it('يختار open_source للمواعيد المربوطة', () => {
        const action = resolveCalendarEventFollowAction(
            [bridgedEvent({ id: 'cal_ev-1' })],
            'cal_ev-1',
            { label: 'عرض الجلسة', actionId: 'focus_event' },
        );
        expect(action).toEqual({ label: 'فتح الإضبارة', actionId: 'open_source' });
    });

    it('ينفّذ open_source عبر المعالج', () => {
        const onOpenSource = vi.fn();
        const nudge: SparkNudge = {
            id: 'n1',
            kind: 'calendar.hearing_today',
            surface: 'calendar',
            priority: 8,
            message: 'test',
            source: 'test',
            targetFileId: 'cal_ev-1',
            action: { label: 'فتح الإضبارة', actionId: 'open_source' },
        };

        const ok = runCalendarSparkFollowAction(nudge, {
            allEvents: [bridgedEvent({ id: 'cal_ev-1' })],
            onOpenSource,
        });

        expect(ok).toBe(true);
        expect(onOpenSource).toHaveBeenCalledWith('lawsuit', 'law-9');
    });

    it('يوجّه الرئيسية إلى الإضبارة عند open_source', () => {
        const nudge: SparkNudge = {
            id: 'n2',
            kind: 'calendar.deadline_near',
            surface: 'calendar',
            priority: 8,
            message: 'test',
            source: 'test',
            targetFileId: 'cal_ev-1',
            action: { label: 'فتح الإضبارة', actionId: 'open_source' },
        };

        expect(
            resolveCalendarHubFollowRoute(
                [bridgedEvent({ id: 'cal_ev-1' })],
                nudge,
                SPARK_HOME_HUB_CALENDAR_ROUTE,
            ),
        ).toBe('workspace:lawsuit:law-9');
    });
});
