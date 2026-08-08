import { useEffect, useState } from 'react';

import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { PROFILE_SHELL_HYDRATED_EVENT } from '@/app/runtime/profileBootHydrator';
import {
    isProfileShellReadySync,
    PROFILE_SHELL_READY_TIMEOUT_MS,
} from '@/app/services/profile/profileShellReadiness';

export type UseProfileShellReadinessParams = {
    userId: string | null;
    hostMounted: boolean;
};

export type ProfileShellReadiness = {
    /** جاهز للفتح الفوري من الهيدر */
    ready: boolean;
    /** التسخين قيد التنفيذ — الزر معطّل مؤقتاً */
    warming: boolean;
};

export function useProfileShellReadiness({
    userId,
    hostMounted,
}: UseProfileShellReadinessParams): ProfileShellReadiness {
    const signedIn = isRealSignedIn(userId);
    const [hydrated, setHydrated] = useState(() =>
        signedIn ? isProfileShellReadySync(userId, hostMounted) : true,
    );
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        if (!signedIn) {
            setHydrated(true);
            return;
        }
        setHydrated(isProfileShellReadySync(userId, hostMounted));
    }, [hostMounted, signedIn, userId]);

    useEffect(() => {
        if (typeof window === 'undefined' || !signedIn) return;

        const sync = () => {
            if (isProfileShellReadySync(userId, hostMounted)) {
                setHydrated(true);
            }
        };

        sync();
        window.addEventListener(PROFILE_SHELL_HYDRATED_EVENT, sync);
        return () => window.removeEventListener(PROFILE_SHELL_HYDRATED_EVENT, sync);
    }, [hostMounted, signedIn, userId]);

    useEffect(() => {
        if (!signedIn) return;
        const timer = window.setTimeout(() => setTimedOut(true), PROFILE_SHELL_READY_TIMEOUT_MS);
        return () => window.clearTimeout(timer);
    }, [signedIn, userId]);

    useEffect(() => {
        if (!signedIn || !hostMounted || hydrated) return;
        let frame = 0;
        let raf = 0;
        const tick = () => {
            if (isProfileShellReadySync(userId, hostMounted)) {
                setHydrated(true);
                return;
            }
            frame += 1;
            if (frame < 180) {
                raf = window.requestAnimationFrame(tick);
            }
        };
        raf = window.requestAnimationFrame(tick);
        return () => window.cancelAnimationFrame(raf);
    }, [hostMounted, hydrated, signedIn, userId]);

    const warming = signedIn && hostMounted && !hydrated && !timedOut;

    /** الفتح فوري من الهيدر — لا يُعطَّل أبداً؛ warming للمؤشر البصري فقط */
    return { ready: true, warming };
}
