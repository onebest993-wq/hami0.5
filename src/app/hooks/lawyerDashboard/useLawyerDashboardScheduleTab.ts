import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    SCHEDULE_SHELL_FEATURE,
    openScheduleFromShell,
} from '@/app/services/schedule/scheduleShellNavigation';
import {
    registerScheduleWarmUserId,
    warmScheduleOnHover,
    warmScheduleOnOpen,
} from '@/app/hooks/lawyerDashboard/scheduleIntentWarm';
import { loadScheduleHubModule } from '@/app/runtime/scheduleHubLoader';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import {
    clearCalendarPerfMarks,
    markCalendarPerfPhase,
} from '@/app/services/calendar/calendarPerfMetrics';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

export type CalendarSearchFocus = { date?: string; eventId?: string } | null;

export type OpenScheduleTabOptions = {
    date?: string;
    eventId?: string;
};

export type UseLawyerDashboardScheduleTabParams = {
    userId: string | null;
    activeTab: LawyerDashboardTab;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
};

export function useLawyerDashboardScheduleTab({
    userId,
    activeTab,
    setActiveTab,
}: UseLawyerDashboardScheduleTabParams) {
    const [calendarSearchFocus, setCalendarSearchFocus] = useState<CalendarSearchFocus>(null);
    const [scheduleTabSessionKey, setScheduleTabSessionKey] = useState(0);
    const hasMarkedScheduleOpenRef = useRef(false);

    const primeScheduleTabMount = useCallback(() => {
        warmScheduleOnHover(userId ?? undefined);
    }, [userId]);

    useEffect(() => registerScheduleWarmUserId(userId), [userId]);

    useEffect(() => {
        if (!isRealSignedIn(userId)) return;
        return scheduleIdleWork(
            () => {
                warmScheduleOnHover(userId ?? undefined);
            },
            { minDelayMs: 6_000, timeoutMs: 15_000 },
        );
    }, [userId]);

    useLayoutEffect(() => {
        if (activeTab !== 'schedule') return;
        warmScheduleOnOpen(userId ?? undefined);
        if (!hasMarkedScheduleOpenRef.current) {
            hasMarkedScheduleOpenRef.current = true;
            setScheduleTabSessionKey((k) => (k === 0 ? 1 : k));
        }
    }, [activeTab, userId]);

    const clearCalendarSearchFocus = useCallback(() => {
        setCalendarSearchFocus(null);
    }, []);

    const backToHomeFromSchedule = useCallback(() => {
        setCalendarSearchFocus(null);
        setActiveTab('home');
    }, [setActiveTab]);

    const openScheduleTab = useCallback(
        (opts?: OpenScheduleTabOptions) => {
            openScheduleFromShell({
                signedIn: isRealSignedIn(userId),
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${SCHEDULE_SHELL_FEATURE}`),
                onOpenCalendar: () => {
                    dismissTransientOverlays();
                    clearCalendarPerfMarks();
                    markCalendarPerfPhase('open-request');
                    warmScheduleOnOpen(userId ?? undefined);
                    primeScheduleTabMount();
                    if (opts?.date !== undefined || opts?.eventId !== undefined) {
                        setCalendarSearchFocus({
                            date: opts.date,
                            eventId: opts.eventId,
                        });
                    } else {
                        setCalendarSearchFocus(null);
                    }
                    setActiveTab('schedule');
                    void loadScheduleHubModule().catch(() => undefined);
                },
            });
        },
        [primeScheduleTabMount, setActiveTab, userId],
    );

    const resetScheduleTabShell = useCallback(() => {
        setScheduleTabSessionKey((k) => k + 1);
        hasMarkedScheduleOpenRef.current = false;
    }, []);

    return {
        calendarSearchFocus,
        setCalendarSearchFocus,
        clearCalendarSearchFocus,
        primeScheduleTabMount,
        scheduleTabSessionKey,
        resetScheduleTabShell,
        openScheduleTab,
        backToHomeFromSchedule,
    };
}
