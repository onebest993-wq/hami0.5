import React, { useCallback, useLayoutEffect, useState } from 'react';
import type { LawyerDashboardScheduleTab } from '@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab';
import { ScheduleInstantShell } from '@/app/components/lawyer/dashboard/schedule/ScheduleInstantShell';
import {
    getCachedLawyerDashboardScheduleTab,
    loadScheduleHubModule,
} from '@/app/runtime/scheduleHubLoader';
import {
    SCHEDULE_SHELL_HYDRATED_EVENT,
    hydrateScheduleShellForInstantOpenWithData,
} from '@/app/runtime/scheduleBootHydrator';
import { warmCalendarEventsCache } from '@/app/hooks/lawyerDashboard/scheduleIntentWarm';

type ScheduleTabProps = React.ComponentProps<typeof LawyerDashboardScheduleTab> & {
    keepAlive?: boolean;
};
type ScheduleTabComponent = React.ComponentType<ScheduleTabProps>;

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

function ScheduleTabLoadError({ onRetry }: { onRetry: () => void }) {
    return (
        <div
            data-testid="schedule-tab-load-error"
            className="flex h-[100dvh] flex-col items-center justify-center gap-3 bg-[#1f1712] px-6 text-center"
            role="alert"
        >
            <p className="text-sm font-semibold text-[#F5EDE0]/85">تعذّر تحميل التقويم</p>
            <button
                type="button"
                data-testid="schedule-tab-retry"
                onClick={onRetry}
                className="rounded-lg border border-[#C4956A]/35 bg-[#2d2219]/80 px-4 py-2 text-sm font-bold text-[#E6C673]"
            >
                إعادة المحاولة
            </button>
        </div>
    );
}

/** محمّل واحد للتقويم — keepAlive يسخّن مخفياً؛ الفتح = تبويب جاهز أو InstantShell طارئ */
export function ScheduleTabHost(props: ScheduleTabProps): React.ReactElement | null {
    const { visible, keepAlive = false, onBackToHome, userId, authUserId } = props;
    const [Component, setComponent] = useState<ScheduleTabComponent | null>(() =>
        getCachedLawyerDashboardScheduleTab(),
    );
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);

    const retryLoad = useCallback(() => {
        setLoadFailed(false);
        setLoadGeneration((g) => g + 1);
    }, []);

    /* kick أثناء الرسم إن فُتح/دُفئ بلا كاش */
    if ((visible || keepAlive) && !Component && typeof window !== 'undefined') {
        void loadScheduleHubModule().catch(() => undefined);
    }

    useLayoutEffect(() => {
        if (!visible && !keepAlive) return;
        const uid = userId ?? authUserId;
        void hydrateScheduleShellForInstantOpenWithData(uid, true);
        void warmCalendarEventsCache(uid).catch(() => undefined);
    }, [authUserId, keepAlive, userId, visible]);

    useLayoutEffect(() => {
        if (!visible && !keepAlive) return;

        const cached = getCachedLawyerDashboardScheduleTab();
        if (cached) {
            setComponent(() => cached);
            setLoadFailed(false);
        }

        let cancelled = false;
        let attempts = 0;

        const adoptModule = () => {
            const hit = getCachedLawyerDashboardScheduleTab();
            if (hit) {
                setComponent(() => hit);
                setLoadFailed(false);
                return;
            }

            void loadScheduleHubModule()
                .then(([tabMod]) => {
                    if (cancelled) return;
                    if (tabMod?.LawyerDashboardScheduleTab) {
                        setComponent(() => tabMod.LawyerDashboardScheduleTab);
                        setLoadFailed(false);
                        return;
                    }
                    throw new Error('LawyerDashboardScheduleTab missing');
                })
                .catch(() => {
                    if (cancelled) return;
                    attempts += 1;
                    if (attempts < MAX_LOAD_ATTEMPTS) {
                        window.setTimeout(adoptModule, LOAD_RETRY_MS);
                        return;
                    }
                    setLoadFailed(true);
                });
        };

        adoptModule();

        const onHydrated = () => adoptModule();
        window.addEventListener(SCHEDULE_SHELL_HYDRATED_EVENT, onHydrated);

        return () => {
            cancelled = true;
            window.removeEventListener(SCHEDULE_SHELL_HYDRATED_EVENT, onHydrated);
        };
    }, [keepAlive, loadGeneration, visible]);

    if (!visible && !keepAlive) {
        return null;
    }

    if (Component) {
        /* keepAlive: أبقِ التبويب في DOM مخفياً — الفتح = إظهار بلا InstantShell/remount */
        return <Component {...props} />;
    }

    /* تسخين صامت — بلا InstantShell فوق اللوحة */
    if (!visible) {
        return null;
    }

    if (loadFailed) {
        return <ScheduleTabLoadError onRetry={retryLoad} />;
    }

    return (
        <ScheduleInstantShell
            onBack={onBackToHome}
            userId={userId ?? authUserId}
        />
    );
}
