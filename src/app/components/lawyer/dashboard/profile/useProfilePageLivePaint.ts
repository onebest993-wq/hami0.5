import { useLayoutEffect, useState } from 'react';
import {
    hasProfileLiveTree,
    isProfileRoyalLivePaintReady,
    PROFILE_ROYAL_LIVE_PAINT_SETTLE_FRAMES,
} from '@/app/components/lawyer/dashboard/profile/profilePageLivePaint';

const LIVE_PAINT_RAF_CAP = 360;

/** يبقى غطاء الصفحة الكاملة حتى اعتماد الشجرة الحية */
export function useProfilePageLivePaint(open: boolean): boolean {
    const [live, setLive] = useState(false);

    useLayoutEffect(() => {
        if (!open) {
            setLive(false);
            return;
        }
        if (isProfileRoyalLivePaintReady()) {
            setLive(true);
            return;
        }
        setLive(false);
        if (typeof window === 'undefined') return;

        let cancelled = false;
        let raf = 0;
        let ticks = 0;
        let readyStreak = 0;
        let observer: MutationObserver | null = null;

        const finish = () => {
            if (cancelled) return;
            cancelled = true;
            setLive(true);
            window.cancelAnimationFrame(raf);
            observer?.disconnect();
            observer = null;
        };

        const tick = () => {
            if (cancelled) return;
            if (isProfileRoyalLivePaintReady()) {
                readyStreak += 1;
                if (readyStreak >= PROFILE_ROYAL_LIVE_PAINT_SETTLE_FRAMES) {
                    finish();
                    return;
                }
            } else {
                readyStreak = 0;
            }
            if (++ticks > LIVE_PAINT_RAF_CAP) {
                if (hasProfileLiveTree() || isProfileRoyalLivePaintReady()) finish();
                return;
            }
            raf = window.requestAnimationFrame(tick);
        };

        if (typeof MutationObserver !== 'undefined') {
            observer = new MutationObserver(() => {
                if (cancelled) return;
                if (isProfileRoyalLivePaintReady()) finish();
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        }

        raf = window.requestAnimationFrame(tick);
        return () => {
            cancelled = true;
            window.cancelAnimationFrame(raf);
            observer?.disconnect();
        };
    }, [open]);

    return live;
}
