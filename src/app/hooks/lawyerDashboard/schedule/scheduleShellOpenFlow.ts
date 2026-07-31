import { flushSync } from 'react-dom';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import {
    clearCalendarPerfMarks,
    markCalendarPerfPhase,
} from '@/app/services/calendar/calendarPerfMetrics';

export type CalendarSearchFocus = { date?: string; eventId?: string } | null;

export type CommitScheduleTabOpenParams = {
    opts?: { date?: string; eventId?: string };
    armScheduleHost: () => void;
    setCalendarSearchFocus: (focus: CalendarSearchFocus) => void;
    setActiveTab: (tab: 'schedule') => void;
};

/** فتح تبويب التقويم: perf marks + flushSync + dismiss overlays. */
export function commitScheduleTabOpen({
    opts,
    armScheduleHost,
    setCalendarSearchFocus,
    setActiveTab,
}: CommitScheduleTabOpenParams): void {
    clearCalendarPerfMarks();
    markCalendarPerfPhase('open-request');

    flushSync(() => {
        armScheduleHost();
        if (opts?.date !== undefined || opts?.eventId !== undefined) {
            setCalendarSearchFocus({
                date: opts.date,
                eventId: opts.eventId,
            });
        } else {
            setCalendarSearchFocus(null);
        }
        setActiveTab('schedule');
    });

    queueMicrotask(() => dismissTransientOverlays());
}
