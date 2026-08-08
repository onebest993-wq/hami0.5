import { useEffect, useRef } from 'react';

import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

const OPEN_INPUT =
    '[data-search-open="true"] [data-testid="global-search-input"]';

/** خلفية: blur لوحة المفاتيح؛ عودة للمقدمة: استعادة التركيز إن كان البحث مفتوحاً (ويب فقط). */
export function useGlobalSearchMobileSuspend(isOpen: boolean): void {
    const wasSuspendedRef = useRef(false);

    useEffect(() => {
        if (!isOpen || typeof document === 'undefined' || isCapacitorNativePlatform()) {
            wasSuspendedRef.current = false;
            return;
        }

        const onVisibility = () => {
            if (document.hidden) {
                const active = document.activeElement;
                if (active instanceof HTMLElement) {
                    active.blur();
                    wasSuspendedRef.current = true;
                }
                return;
            }
            if (!wasSuspendedRef.current) return;
            wasSuspendedRef.current = false;
            const input = document.querySelector(OPEN_INPUT);
            if (input instanceof HTMLInputElement) {
                input.focus({ preventScroll: true });
            }
        };

        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [isOpen]);
}
