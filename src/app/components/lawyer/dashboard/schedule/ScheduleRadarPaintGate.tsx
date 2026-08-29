import React, { Suspense, type ReactNode } from 'react';
import { RadarOpenInstantChrome } from '@/app/components/lawyer/dashboard/schedule/RadarOpenInstantChrome';
import { useScheduleRadarLivePaint } from '@/app/components/lawyer/dashboard/schedule/useScheduleRadarLivePaint';

type ScheduleRadarPaintGateProps = {
    open: boolean;
    onBack: () => void;
    children: ReactNode;
};

/**
 * Host يُركَّب تحت الغطاء. الغطاء يُرفع بعد رسم شريط الأسبوع الحي —
 * لا استبدال Suspense الذي يترك إطاراً فارغاً ثم قفزة كروم.
 */
export function ScheduleRadarPaintGate({
    open,
    onBack,
    children,
}: ScheduleRadarPaintGateProps): React.ReactElement {
    const live = useScheduleRadarLivePaint(open);

    return (
        <div className="relative h-full min-h-[100dvh]">
            <div
                aria-hidden={!live}
                className={live ? undefined : 'pointer-events-none invisible'}
            >
                <Suspense fallback={null}>{children}</Suspense>
            </div>
            {open && !live ? (
                <div className="absolute inset-0 z-[2]" data-testid="schedule-radar-paint-cover">
                    <RadarOpenInstantChrome onBack={onBack} />
                </div>
            ) : null}
        </div>
    );
}
