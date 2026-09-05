import { useLayoutEffect } from 'react';
import {
    isSettingsForceVisible,
    isSettingsOverlayCssExiting,
    isSettingsReopenSuppressed,
    paintSettingsInstantChrome,
} from '@/app/runtime/settingsInstantPaint';

/**
 * غطاء Suspense — يُحدّث الكروم فقط إن كانت الطبقة مكشوفة أصلاً.
 * تسخين keepAlive يعلّق المقطع أحياناً؛ الطلاء هنا كان يفتح المركز بلا لمسة.
 */
export function SettingsInstantPaintCover(): null {
    useLayoutEffect(() => {
        if (!isSettingsForceVisible()) return;
        if (isSettingsReopenSuppressed() || isSettingsOverlayCssExiting()) return;
        paintSettingsInstantChrome();
    }, []);
    return null;
}
