import { afterEach, describe, expect, it } from 'vitest';
import {
    getLawyerSettingsStoreSnapshot,
    publishLawyerSettingsLive,
    subscribeLawyerSettingsLive,
} from '@/app/services/settings/settingsSnapshot';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';

describe('settingsSnapshot live store', () => {
    afterEach(() => {
        publishLawyerSettingsLive(LAWYER_SETTINGS_V2_DEFAULTS);
    });

    it('subscribeLawyerSettingsLive يُخطر عند publish', () => {
        let hits = 0;
        const stop = subscribeLawyerSettingsLive(() => {
            hits += 1;
        });
        publishLawyerSettingsLive({
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            appearance: {
                ...LAWYER_SETTINGS_V2_DEFAULTS.appearance,
                glassOpacity: 0.42,
            },
        });
        expect(hits).toBe(1);
        expect(getLawyerSettingsStoreSnapshot().appearance.glassOpacity).toBe(0.42);
        stop();
        publishLawyerSettingsLive(LAWYER_SETTINGS_V2_DEFAULTS);
        expect(hits).toBe(1);
    });

    it('getLawyerSettingsStoreSnapshot يعيد نفس المرجع إن لم يُنشر تحديث', () => {
        publishLawyerSettingsLive(LAWYER_SETTINGS_V2_DEFAULTS);
        const a = getLawyerSettingsStoreSnapshot();
        const b = getLawyerSettingsStoreSnapshot();
        expect(a).toBe(b);
    });
});
