import { describe, expect, it } from 'vitest';
import {
    cloneLawyerSettingsV2Defaults,
    LAWYER_SETTINGS_V2_DEFAULTS,
} from '@/app/services/settings/defaults';

describe('cloneLawyerSettingsV2Defaults', () => {
    it('لا يشارك الكائنات المتداخلة مع الثابت الافتراضي', () => {
        const copy = cloneLawyerSettingsV2Defaults();
        copy.security.localOnlyMode = true;
        copy.homeLayout.dockVisible = true;
        copy.data.cloudSync = true;
        expect(LAWYER_SETTINGS_V2_DEFAULTS.security.localOnlyMode).toBe(false);
        expect(LAWYER_SETTINGS_V2_DEFAULTS.homeLayout.dockVisible).toBe(false);
        expect(LAWYER_SETTINGS_V2_DEFAULTS.data.cloudSync).toBe(false);
    });
});
