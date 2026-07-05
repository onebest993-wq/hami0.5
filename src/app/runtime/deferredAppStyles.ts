import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

let scheduled = false;

/** يحمّل Tailwind الكامل بعد أول إطار — critical-shell.css يغطي لوحة الرئيسية */
export function scheduleDeferredAppStyles(): void {
    if (scheduled) return;
    scheduled = true;

    const load = () => {
        void import('@/styles/deferred-app.css');
    };

    /** WebView: تأجيل إضافي idle لتقليل layout thrashing أثناء الإقلاع */
    if (isCapacitorNativePlatform()) {
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(load, { timeout: 2_500 });
        } else {
            window.setTimeout(load, 400);
        }
        return;
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(load);
    });
}
