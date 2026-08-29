import { useLayoutEffect } from 'react';

import { finalizeBootGateSurface } from '@/app/bootstrap/bootGateSurface';

/**
 * بوابات لا تحمّل MainView (تسجيل الدخول).
 * تُعلِن الجاهزية وتزيل #hami-static-boot فوراً بعد paint.
 */
export function useBootGateSurfaceReady(): void {
    useLayoutEffect(() => {
        const root = document.documentElement;
        root.setAttribute('data-hami-auth-gate-active', '1');
        finalizeBootGateSurface();
        return () => {
            root.removeAttribute('data-hami-auth-gate-active');
        };
    }, []);
}
