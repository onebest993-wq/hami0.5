import { registerPlugin } from '@capacitor/core';

import type { HamiNotificationSheetPlugin } from '@/plugins/hami-notification-sheet/definitions';

export const HamiNotificationSheet = registerPlugin<HamiNotificationSheetPlugin>(
    'HamiNotificationSheet',
    {
        web: () => import('@/plugins/hami-notification-sheet/web').then((m) => m.HamiNotificationSheetWeb),
    },
);

export type {
    HamiNotificationSheetPlugin,
    NativeNotificationSheetItem,
    NativeNotificationSheetRoute,
    NativeNotificationSheetSettingsPatch,
    NativeNotificationSheetTab,
    PresentNativeNotificationSheetOptions,
} from '@/plugins/hami-notification-sheet/definitions';
