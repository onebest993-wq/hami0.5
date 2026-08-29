import { useEffect, useState } from 'react';
import {
    BOOT_REVEAL_DONE_EVENT,
    getBootRevealMaxMs,
    isBootRevealDone,
} from '@/app/bootstrap/bootReveal';

/** يتتبع كشف غطاء الإقلاع — لا يعلّق جسم البطاقة على الشعار. */
export function useHomeHubBootReveal(): boolean {
    const [bootRevealDone, setBootRevealDone] = useState(() => isBootRevealDone());

    useEffect(() => {
        if (bootRevealDone) return undefined;

        const markDone = () => {
            setBootRevealDone(true);
        };

        if (isBootRevealDone()) {
            markDone();
            return undefined;
        }

        window.addEventListener(BOOT_REVEAL_DONE_EVENT, markDone, { once: true });
        const hang = window.setTimeout(markDone, getBootRevealMaxMs() + 400);
        return () => {
            window.removeEventListener(BOOT_REVEAL_DONE_EVENT, markDone);
            window.clearTimeout(hang);
        };
    }, [bootRevealDone]);

    return bootRevealDone;
}
