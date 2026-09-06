/** حدث حالة التطبيق — يُنشر من lifecycle ويُستمع في قفل الجلسة بلا استيراد Capacitor. */
import { HAMI_NATIVE_APP_STATE_EVENT } from '@/app/runtime/eventConstants';

export const HAMI_APP_STATE_EVENT = HAMI_NATIVE_APP_STATE_EVENT;

export type HamiAppStateDetail = { isActive: boolean };

export function publishHamiAppState(isActive: boolean): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent<HamiAppStateDetail>(HAMI_APP_STATE_EVENT, { detail: { isActive } }),
    );
}
