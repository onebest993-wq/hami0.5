import { WebPlugin } from '@capacitor/core';

import type {
    HamiNotificationSheetPlugin,
    PresentNativeNotificationSheetOptions,
} from '@/plugins/hami-notification-sheet/definitions';

/** ويب — لا ورقة أصلية؛ يُستخدم مسار React NotificationPanel. */
export class HamiNotificationSheetWeb
    extends WebPlugin
    implements HamiNotificationSheetPlugin
{
    async present(_options: PresentNativeNotificationSheetOptions): Promise<void> {
        throw this.unavailable('HamiNotificationSheet is Android native only');
    }

    async dismiss(): Promise<void> {
        /* noop */
    }
}
