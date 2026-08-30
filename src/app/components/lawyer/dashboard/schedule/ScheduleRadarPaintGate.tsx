import React, { Suspense, type ReactNode } from 'react';
import { RadarOpenInstantChrome } from '@/app/components/lawyer/dashboard/schedule/RadarOpenInstantChrome';
import { CalendarLiveHandoffContext } from '@/app/services/calendar/calendarLiveHandoffContext';
import { useScheduleRadarLivePaint } from '@/app/components/lawyer/dashboard/schedule/useScheduleRadarLivePaint';
import { useAuthUser } from '@/app/context/authHooks';

type ScheduleRadarPaintGateProps = {
    open: boolean;
    onBack: () => void;
    userId?: string | null;
    children: ReactNode;
};

/**
 * صدفة الكروم هي الصفحة. الرادار الحي يبقى في نفس الشجرة (keep-alive) داخلها.
 */
export function ScheduleRadarPaintGate({
    open,
    onBack,
    userId,
    children,
}: ScheduleRadarPaintGateProps): React.ReactElement {
    const authUser = useAuthUser();
    const resolvedUserId = (userId ?? authUser?.id ?? '').trim() || null;
    const live = useScheduleRadarLivePaint(open);
    /** InstantChrome هو الصفحة؛ عظام هنا تستبدل قائمة اليوم أثناء تعليق الجسم الحي. */
    const body = <Suspense fallback={null}>{children}</Suspense>;

    return (
        <div
            className={open ? 'relative h-full min-h-[100dvh]' : 'hidden'}
            aria-hidden={!open}
        >
            <CalendarLiveHandoffContext.Provider value={live}>
                <div
                    className="hami-schedule-radar-paint-cover h-full"
                    data-testid="schedule-radar-paint-cover"
                    data-handoff={live && open ? '1' : '0'}
                >
                    <RadarOpenInstantChrome
                        onBack={onBack}
                        userId={resolvedUserId}
                        liveReady={live}
                        liveBody={body}
                        interactive={open}
                    />
                </div>
            </CalendarLiveHandoffContext.Provider>
        </div>
    );
}
