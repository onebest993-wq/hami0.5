import { useLayoutEffect, useState } from 'react';
import {
    isScheduleRadarLivePaintReady,
    SCHEDULE_RADAR_LIVE_PAINT_SETTLE_FRAMES,
} from '@/app/components/lawyer/dashboard/schedule/scheduleRadarLivePaint';

const LIVE_PAINT_RAF_CAP = 360;

/** يبقى غطاء الطلاء حتى استقرار كروم الرادار الحي */
export function useScheduleRadarLivePaint(open: boolean): boolean {
    const [live, setLive] = useState(false);

    useLayoutEffect(() => {
        if (!open) {
            setLive(false);
            return;
        }
        if (isScheduleRadarLivePaintReady()) {
            setLive(true);
            return;
        }
        setLive(false);
        if (typeof window === 'undefined') return;

        let cancelled = false;
        let raf = 0;
        let ticks = 0;
        let readyStreak = 0;
        const tick = () => {
            if (cancelled) return;
            if (isScheduleRadarLivePaintReady()) {
                readyStreak += 1;
                if (readyStreak >= SCHEDULE_RADAR_LIVE_PAINT_SETTLE_FRAMES) {
                    setLive(true);
                    return;
                }
            } else {
                readyStreak = 0;
            }
            if (++ticks > LIVE_PAINT_RAF_CAP) return;
            raf = window.requestAnimationFrame(tick);
        };
        raf = window.requestAnimationFrame(tick);
        return () => {
            cancelled = true;
            window.cancelAnimationFrame(raf);
        };
    }, [open]);

    return live;
}
