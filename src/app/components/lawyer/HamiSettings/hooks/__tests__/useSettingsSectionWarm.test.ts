import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSettingsSectionWarm } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsSectionWarm';

const prefetchSettingsSection = vi.fn();
const prefetchSecondarySettingsSections = vi.fn();

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionLoad', () => ({
    prefetchSettingsSection: (...args: unknown[]) => prefetchSettingsSection(...args),
    prefetchSecondarySettingsSections: (...args: unknown[]) => prefetchSecondarySettingsSections(...args),
}));

describe('useSettingsSectionWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('requestIdleCallback', (cb: IdleRequestCallback) => {
            cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
            return 1;
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('لا يسخّن أقساماً عندما الطبقة غير مركّبة', () => {
        renderHook(() => useSettingsSectionWarm(false, 'appearance'));
        expect(prefetchSettingsSection).not.toHaveBeenCalled();
        expect(prefetchSecondarySettingsSections).not.toHaveBeenCalled();
    });

    it('keepAlive أو الفتح يسخّن التبويب الحالي فوراً والبقية بعد الخمول', () => {
        renderHook(() => useSettingsSectionWarm(true, 'appearance'));
        expect(prefetchSettingsSection).toHaveBeenCalledWith('appearance');
        expect(prefetchSecondarySettingsSections).toHaveBeenCalledTimes(1);
    });
});
