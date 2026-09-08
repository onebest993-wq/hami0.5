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
import { primeCalendarEventsCacheFromPeek } from '@/app/services/calendar/calendarEventsWarm';
import { tearDownCalendarFloatingState } from '@/app/components/lawyer/SmartLegalRadar/tearDownCalendarFloatingState';

export type CalendarSearchFocus = { date?: string; eventId?: string } | null;

export type CommitScheduleTabOpenParams = {
    opts?: { date?: string; eventId?: string };
    armScheduleHost: () => void;
    setCalendarSearchFocus: (focus: CalendarSearchFocus) => void;
    setActiveTab: (tab: 'schedule') => void;
    userId?: string | null;
};

export type CommitScheduleTabCloseParams = {
    setCalendarSearchFocus: (focus: CalendarSearchFocus) => void;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
};

let scheduleOpenFlowSessionCounter = 0;
let lastActiveScheduleShellId = 0;

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

function runScheduleOpenSideEffects(activeShellId: number): void {
    if (lastActiveScheduleShellId !== activeShellId) return;
    markCalendarPerfPhase('first-paint');
    markCalendarPerfPhase('interactive');

    queueMicrotask(() => {
        if (lastActiveScheduleShellId !== activeShellId) return;
        void import('@/app/hooks/lawyerDashboard/scheduleIntentWarm')
            .then((m) => {
                if (lastActiveScheduleShellId !== activeShellId) return;
                m.warmScheduleOnOpen();
            })
            .catch(() => {
                if (lastActiveScheduleShellId !== activeShellId) return;
                return undefined;
            });
    });
}

function stampCalendarOpenPerfMarks(activeShellId: number): void {
    if (lastActiveScheduleShellId !== activeShellId) return;
    markCalendarPerfPhase('open-request');
    markCalendarPerfPhase('first-paint');
    markCalendarPerfPhase('interactive');
}

type RunScheduleOpenCommitInput = CommitScheduleTabOpenParams & { activeShellId: number };

function runScheduleOpenCommit(input: RunScheduleOpenCommitInput): void {
    const { opts, armScheduleHost, setCalendarSearchFocus, setActiveTab, activeShellId } = input;
    const syncReact = () => {
        if (lastActiveScheduleShellId !== activeShellId) return;
        armScheduleHost();
        applyScheduleSearchFocus(opts, setCalendarSearchFocus);
        setActiveTab('schedule');
        runScheduleOpenSideEffects(activeShellId);
    };

    /* snap DOM قبل إغلاق المستودع — يمنع ومضة غطاء الرئيسية #0a0f1c */
    let snapped = snapScheduleShellOpen();
    armHubLayerEnter(SCHEDULE_HUB_LAYER);
    if (!snapped) {
        flushSync(() => {
            if (lastActiveScheduleShellId !== activeShellId) return;
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
 * المقطع يُسخَّن في الخلفية؛ قشرة InstantChrome تغطي Suspense حتى يصل.
 * ScheduleTabHost يبقى كسولاً (~١٧٦٥ ك.ب) خارج جذع الإقلاع.
 */
export function commitScheduleTabOpen(params: CommitScheduleTabOpenParams): void {
    scheduleOpenFlowSessionCounter += 1;
    const activeShellId = scheduleOpenFlowSessionCounter;
    lastActiveScheduleShellId = activeShellId;

    if (lastActiveScheduleShellId !== activeShellId) return;
    primeCalendarEventsCacheFromPeek(params.userId);
    if (lastActiveScheduleShellId !== activeShellId) return;
    void import('@/app/runtime/scheduleHubLoader')
        .then((m) => {
            if (lastActiveScheduleShellId !== activeShellId) return;
            m.loadScheduleTabHostModule();
        })
        .catch(() => undefined);

    if (isScheduleShellSnappedOpen()) {
        flushSync(() => {
            if (lastActiveScheduleShellId !== activeShellId) return;
            params.armScheduleHost();
            applyScheduleSearchFocus(params.opts, params.setCalendarSearchFocus);
            params.setActiveTab('schedule');
        });
        stampCalendarOpenPerfMarks(activeShellId);
        return;
    }

    clearCalendarPerfMarks();
    stampCalendarOpenPerfMarks(activeShellId);
    runScheduleOpenCommit({ ...params, activeShellId });
}

/** رجوع للرئيسية: إخفاء فوري ثم commit متزامن — على الأصلي بلا unfreeze للوحة */
export function commitScheduleTabClose({
    setCalendarSearchFocus,
    setActiveTab,
}: CommitScheduleTabCloseParams): void {
    scheduleOpenFlowSessionCounter += 1;
    const activeShellId = scheduleOpenFlowSessionCounter;
    lastActiveScheduleShellId = activeShellId;

    beginHubLayerExit(SCHEDULE_HUB_LAYER, () => {
        if (lastActiveScheduleShellId !== activeShellId) return;
        executeScheduleOverlayClose({
            conceal: () => {
                if (lastActiveScheduleShellId !== activeShellId) return;
                tearDownCalendarFloatingState(activeShellId);
                snapScheduleShellClose();
            },
            commit: () => {
                flushSync(() => {
                    if (lastActiveScheduleShellId !== activeShellId) return;
                    clearPersistedLawyerScheduleTab();
                    setCalendarSearchFocus(null);
                    setActiveTab('home');
                });
            },
        });
    });
}
