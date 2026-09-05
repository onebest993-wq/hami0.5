/** يوقف التقاط الكاميرا/المايك عند إخفاء التطبيق — LED والخصوصية على الموبايل */

import { isAppForeground, subscribeAppForeground } from '@/app/runtime/appForegroundGate';

export function subscribeCaptureBackgroundRelease(onRelease: () => void): () => void {
    if (typeof document === 'undefined') return () => undefined;
    if (!isAppForeground()) {
        onRelease();
        return () => undefined;
    }
    return subscribeAppForeground({
        onSuspend: onRelease,
        onResume: () => undefined,
    });
}
