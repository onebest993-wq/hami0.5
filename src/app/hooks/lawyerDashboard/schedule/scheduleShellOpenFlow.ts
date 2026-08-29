import { flushSync } from 'react-dom';
import type { Dispatch, SetStateAction } from 'react';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { executeScheduleOverlayClose } from '@/app/runtime/overlaySnapClose';
import { armHubLayerEnter, beginHubLayerExit } from '@/app/runtime/overlayHubLayerMotion';
import { SCHEDULE_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';
import {
    clearCalendarPerfMarks,
    markCalendarPerfPhase,
} from '@/app/services/calendar/calendarPerfMetrics';
import {
    isScheduleShellSnappedOpen,
    snapScheduleShellClose,
    snapScheduleShellOpen,
    scheduleShellReactSync,
} from '@/app/services/schedule/scheduleShellSnap';
import { clearPersistedLawyerScheduleTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

export type CalendarSearchFocus = { date?: string; eventId?: string } | null;

export type CommitScheduleTabOpenParams = {
    opts?: { date?: string; eventId?: string };
    armScheduleHost: () => void;
    setCalendarSearchFocus: (focus: CalendarSearchFocus) => void;
    setActiveTab: (tab: 'schedule') => void;
};

export type CommitScheduleTabCloseParams = {
    setCalendarSearchFocus: (focus: CalendarSearchFocus) => void;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
};

function applyScheduleSearchFocus(
    opts: CommitScheduleTabOpenParams['opts'],
    setCalendarSearchFocus: (focus: CalendarSearchFocus) => void,
): void {
    if (opts?.date !== undefined || opts?.eventId !== undefined) {
        setCalendarSearchFocus({
            date: opts.date,
            eventId: opts.eventId,
        });
        return;
    }
    setCalendarSearchFocus(null);
}

function runScheduleOpenSideEffects(): void {
    markCalendarPerfPhase('first-paint');
    markCalendarPerfPhase('interactive');

    queueMicrotask(() => {
        void import('@/app/hooks/lawyerDashboard/scheduleIntentWarm').then((m) =>
            m.warmScheduleOnOpen(),
        );
    });
}

function stampCalendarOpenPerfMarks(): void {
    markCalendarPerfPhase('open-request');
    markCalendarPerfPhase('first-paint');
    markCalendarPerfPhase('interactive');
}

function runScheduleOpenCommit({
    opts,
    armScheduleHost,
    setCalendarSearchFocus,
    setActiveTab,
}: CommitScheduleTabOpenParams): void {
    const syncReact = () => {
        armScheduleHost();
        applyScheduleSearchFocus(opts, setCalendarSearchFocus);
        setActiveTab('schedule');
        runScheduleOpenSideEffects();
    };

    /* snap DOM قبل إغلاق المستودع — يمنع ومضة غطاء الرئيسية #0a0f1c */
    let snapped = snapScheduleShellOpen();
    armHubLayerEnter(SCHEDULE_HUB_LAYER);
    if (!snapped) {
        flushSync(() => {
            armScheduleHost();
        });
        snapped = snapScheduleShellOpen();
    }

    dismissTransientOverlays();

    if (!snapped) {
        scheduleShellReactSync(syncReact);
        return;
    }

    flushSync(syncReact);
}

/**
 * فتح التقويم: snap + تسليح فوري — لا انتظار لمقطع Host.
 * المقطع يُسخَّن في الخلفية؛ قشرة InstantChrome تغطي Suspense حتى يصل.
 * ScheduleTabHost يبقى كسولاً (~١٧٦٥ ك.ب) خارج جذع الإقلاع.
 */
export function commitScheduleTabOpen(params: CommitScheduleTabOpenParams): void {
    void import('@/app/runtime/scheduleHubLoader')
        .then((m) => m.loadScheduleTabHostModule())
        .catch(() => undefined);

    if (isScheduleShellSnappedOpen()) {
        flushSync(() => {
            params.armScheduleHost();
            applyScheduleSearchFocus(params.opts, params.setCalendarSearchFocus);
            params.setActiveTab('schedule');
        });
        stampCalendarOpenPerfMarks();
        return;
    }

    clearCalendarPerfMarks();
    stampCalendarOpenPerfMarks();
    runScheduleOpenCommit(params);
}

/** رجوع للرئيسية: إخفاء فوري ثم commit متزامن — على الأصلي بلا unfreeze للوحة */
export function commitScheduleTabClose({
    setCalendarSearchFocus,
    setActiveTab,
}: CommitScheduleTabCloseParams): void {
    beginHubLayerExit(SCHEDULE_HUB_LAYER, () => {
        executeScheduleOverlayClose({
            conceal: () => {
                snapScheduleShellClose();
            },
            commit: () => {
                flushSync(() => {
                    clearPersistedLawyerScheduleTab();
                    setCalendarSearchFocus(null);
                    setActiveTab('home');
                });
            },
        });
    });
}
