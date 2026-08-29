import { WebPlugin } from '@capacitor/core';

import type { HamiPrivacyGuardOptions, HamiPrivacyPlugin } from '@/plugins/hami-privacy-guard/definitions';

/** ويب — الغطاء الأصلي غير موجود؛ مسار CSS في privacyBlurRuntime يكفي. */
export class HamiPrivacyWeb extends WebPlugin implements HamiPrivacyPlugin {
    async setGuard(_options: HamiPrivacyGuardOptions): Promise<void> {
        /* noop */
    }

    async beginSensitivePrompt(): Promise<void> {
        /* noop */
    }

    async endSensitivePrompt(): Promise<void> {
        /* noop */
    }
}
