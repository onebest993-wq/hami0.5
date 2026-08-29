import { registerPlugin } from '@capacitor/core';

import type { HamiPrivacyPlugin } from '@/plugins/hami-privacy-guard/definitions';

export const HamiPrivacy = registerPlugin<HamiPrivacyPlugin>('HamiPrivacy', {
    web: () => import('@/plugins/hami-privacy-guard/web').then((m) => m.HamiPrivacyWeb),
});

export type { HamiPrivacyGuardOptions, HamiPrivacyPlugin } from '@/plugins/hami-privacy-guard/definitions';
