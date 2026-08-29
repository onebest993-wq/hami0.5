import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import {
    SCHEDULE_SHELL_FEATURE,
    openScheduleFromShell,
} from '@/app/services/schedule/scheduleShellNavigation';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { useKeepAliveIdleRelease, getLatchedTabIdleReleaseMs } from '@/app/hooks/lawyerDashboard/useKeepAliveIdleRelease';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import {
    BOOT_REVEAL_DONE_EVENT,
    isBootRevealDone,
    onBootContentReady,
} from '@/app/bootstrap/bootReveal';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import {
    loadScheduleBootHydrator,
    loadScheduleHubLoader,
    loadScheduleIntentWarm,
    SCHEDULE_PRIME_HOST_EVENT,
} from '@/app/hooks/lawyerDashboard/schedule/scheduleLazyImports';
import { commitScheduleTabClose, commitScheduleTabOpen } from '@/app/hooks/lawyerDashboard/schedule/scheduleShellOpenFlow';
import {
    isScheduleShellSnappedOpen,
    snapScheduleShellClose,
    snapScheduleShellOpen,
} from '@/app/services/schedule/scheduleShellSnap';
import { deferShellConcealAfterHandoff, isShellHandoffPending } from '@/app/runtime/sectionShellHandoff';
import type { CalendarSearchFocus } from '@/app/hooks/lawyerDashboard/schedule/scheduleShellOpenFlow';

export type { CalendarSearchFocus };

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
    const scheduleInitiallyOpen = activeTab === 'schedule';
    const [calendarSearchFocus, setCalendarSearchFocus] = useState<CalendarSearchFocus>(null);
    const [scheduleTabSessionKey, setScheduleTabSessionKey] = useState(() =>
        scheduleInitiallyOpen ? 1 : 0,
    );
    const [scheduleHostMounted, setScheduleHostMounted] = useState(() => scheduleInitiallyOpen);
    const hasMarkedScheduleOpenRef = useRef(scheduleInitiallyOpen);

    const warmSchedulePrimeChain = useCallback(() => {
        void loadScheduleHubLoader().then((m) => {
            m.prefetchScheduleHubModule();
        });
        queueMicrotask(() => {
            void ensureDeferredFeatureStylesLoaded();
        });
    }, []);

    const armScheduleHost = useCallback(() => {
        setScheduleHostMounted(true);
        warmSchedulePrimeChain();
    }, [warmSchedulePrimeChain]);

    /** لمسة البلاطة: تسخين بلا تركيب Host حتى فتح التبويب */
    const primeScheduleTabMount = useCallback(() => {
        void loadScheduleIntentWarm().then((m) => m.warmScheduleOnHover(userId ?? undefined));
        warmSchedulePrimeChain();
    }, [userId, warmSchedulePrimeChain]);

    useEffect(() => {
        let disposed = false;
        let unsub: (() => void) | undefined;
        void loadScheduleIntentWarm().then((m) => {
            if (disposed) return;
            unsub = m.registerScheduleWarmUserId(userId);
        });
        return () => {
            disposed = true;
            unsub?.();
        };
    }, [userId]);

    useEffect(() => {
        let disposed = false;
        let unbind: (() => void) | undefined;
        const unbindInteractive = onDashboardInteractive(() => {
            void loadScheduleBootHydrator().then((m) => {
                if (disposed) return;
                unbind = m.bindScheduleBootHydrator(userId);
            });
        });
        return () => {
            disposed = true;
            unbindInteractive();
            unbind?.();
        };
    }, [userId]);

    /**
     * بعد استقرار المحتوى: تسخين المقطع فقط — بلا تركيب Host حتى اللمسة أو فتح التبويب.
     * التركيب المبكر كان يسحب ~١٧٦٥ ك.ب إلى مسار الإقلاع.
     */
    useEffect(() => {
        if (!hasLocalAppSession(userId)) return;
        return onBootContentReady(() => {
            void loadScheduleIntentWarm().then((m) => m.warmScheduleOnHover(userId));
            void loadScheduleHubLoader()
                .then((m) => m.prefetchScheduleHubModule())
                .catch(() => undefined);
        });
    }, [userId]);

    useKeepAliveIdleRelease(
        activeTab === 'schedule',
        () => setScheduleHostMounted(false),
        getLatchedTabIdleReleaseMs(),
    );

    /** جلسة تقويم مفتوحة بلا هوية — ارجع للرئيسية وامسح الـ host (C2) */
    useEffect(() => {
        if (hasLocalAppSession(userId)) return;
        setCalendarSearchFocus(null);
        setScheduleHostMounted(false);
        if (activeTab === 'schedule') {
            setActiveTab('home');
        }
    }, [activeTab, setActiveTab, userId]);

    useLayoutEffect(() => {
        if (activeTab !== 'schedule') return;
        armScheduleHost();
        void loadScheduleIntentWarm().then((m) => m.warmScheduleOnOpen(userId ?? undefined));
        if (!hasMarkedScheduleOpenRef.current) {
            hasMarkedScheduleOpenRef.current = true;
            setScheduleTabSessionKey((k) => (k === 0 ? 1 : k));
        }
    }, [activeTab, armScheduleHost, userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const scheduleWarm = () => {
            void loadScheduleIntentWarm().then((m) => m.warmScheduleOnHover(userId));
            void loadScheduleBootHydrator()
                .then((m) => m.prefetchScheduleAfterBootReveal(userId))
                .catch(() => undefined);
        };

        if (isBootRevealDone()) {
            scheduleWarm();
            return;
        }

        window.addEventListener(BOOT_REVEAL_DONE_EVENT, scheduleWarm);
        return () => window.removeEventListener(BOOT_REVEAL_DONE_EVENT, scheduleWarm);
    }, [userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPrime = () => {
            queueMicrotask(() => primeScheduleTabMount());
        };
        window.addEventListener(SCHEDULE_PRIME_HOST_EVENT, onPrime);
        return () => window.removeEventListener(SCHEDULE_PRIME_HOST_EVENT, onPrime);
    }, [primeScheduleTabMount]);

    const clearCalendarSearchFocus = useCallback(() => {
        setCalendarSearchFocus(null);
    }, []);

    const backToHomeFromSchedule = useCallback(() => {
        commitScheduleTabClose({ setCalendarSearchFocus, setActiveTab });
    }, [setActiveTab]);

    useLayoutEffect(() => {
        if (activeTab === 'schedule') {
            snapScheduleShellOpen();
            return;
        }
        /* لا تُغلق فوراً — تسليم stub→live يمر بـ activeTab=home والستارة مفتوحة */
        return deferShellConcealAfterHandoff(() => {
            if (isShellHandoffPending('schedule')) return;
            if (isScheduleShellSnappedOpen()) snapScheduleShellClose();
        });
    }, [activeTab]);

    const openScheduleTab = useCallback(
        (opts?: OpenScheduleTabOptions) => {
            openScheduleFromShell({
                signedIn: hasLocalAppSession(userId),
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${SCHEDULE_SHELL_FEATURE}`),
                onOpenCalendar: () => {
                    commitScheduleTabOpen({
                        opts,
                        armScheduleHost,
                        setCalendarSearchFocus,
                        setActiveTab,
                    });
                },
            });
        },
        [armScheduleHost, setActiveTab, userId],
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
        scheduleHostMounted,
        resetScheduleTabShell,
        openScheduleTab,
        backToHomeFromSchedule,
    };
}
