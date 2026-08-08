import { flushSync } from 'react-dom';

import type { Dispatch, SetStateAction } from 'react';



import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { executeOverlaySnapClose } from '@/app/runtime/overlaySnapClose';

import {

    clearCalendarPerfMarks,

    markCalendarPerfPhase,

} from '@/app/services/calendar/calendarPerfMetrics';

import { snapScheduleShellClose, snapScheduleShellOpen, scheduleShellReactSync } from '@/app/services/schedule/scheduleShellSnap';

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

    queueMicrotask(() => {
        void import('@/app/hooks/lawyerDashboard/scheduleIntentWarm').then((m) =>
            m.warmScheduleOnOpen(),
        );
    });
}



/** فتح التقويم: snap DOM أولاً ثم مزامنة React (مثل الملف المهني). */

export function commitScheduleTabOpen({

    opts,

    armScheduleHost,

    setCalendarSearchFocus,

    setActiveTab,

}: CommitScheduleTabOpenParams): void {

    clearCalendarPerfMarks();

    markCalendarPerfPhase('open-request');

    const syncReact = () => {
        armScheduleHost();
        applyScheduleSearchFocus(opts, setCalendarSearchFocus);
        setActiveTab('schedule');
        runScheduleOpenSideEffects();
    };

    /* snap DOM قبل إغلاق المستودع — يمنع ومضة غطاء الرئيسية #0a0f1c */
    let snapped = snapScheduleShellOpen();
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



/** رجوع للرئيسية: إخفاء فوري ثم setActiveTab في الإطار التالي */

export function commitScheduleTabClose({
    setCalendarSearchFocus,
    setActiveTab,
}: CommitScheduleTabCloseParams): void {
    executeOverlaySnapClose({
        conceal: () => {
            snapScheduleShellClose();
        },
        commit: () => {
            setCalendarSearchFocus(null);
            setActiveTab('home');
        },
    });
}


