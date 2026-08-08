import { useLayoutEffect } from 'react';

import { finalizeBootGateSurface } from '@/app/bootstrap/bootGateSurface';

/**
 * بوابات لا تحمّل MainView (تسجيل الدخول / تجميد الإقلاع).
 * تُعلِن جاهزية السطح وتزيل #hami-static-boot فوراً — لا تنتظر paint شبكة الرئيسية.
 */
export function useBootGateSurfaceReady(): void {
    useLayoutEffect(() => {
        finalizeBootGateSurface();
    }, []);
}
