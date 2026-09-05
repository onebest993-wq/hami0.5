import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSettingsSectionWarm } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsSectionWarm';

const prefetchSettingsSection = vi.fn();
const prefetchSettingsOpenTabChunks = vi.fn();

vi.mock('@/app/components/lawyer/HamiSettings/settingsSectionLoad', () => ({
    prefetchSettingsSection: (...args: unknown[]) => prefetchSettingsSection(...args),
    prefetchSettingsOpenTabChunks: (...args: unknown[]) => prefetchSettingsOpenTabChunks(...args),
}));

describe('useSettingsSectionWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('لا يسخّن أقساماً عندما الطبقة غير مركّبة', () => {
        renderHook(() => useSettingsSectionWarm(false, 'appearance'));
        expect(prefetchSettingsSection).not.toHaveBeenCalled();
    });

    it('keepAlive يسخّن التبويب الحالي فقط — بلا تبويبات ثانوية', () => {
        renderHook(() => useSettingsSectionWarm(true, 'security'));
        expect(prefetchSettingsSection).toHaveBeenCalledTimes(1);
        expect(prefetchSettingsSection).toHaveBeenCalledWith('security');
        expect(prefetchSettingsOpenTabChunks).not.toHaveBeenCalled();
    });

    it('استعادة تبويب المنظر تسحبه فوراً لأنه التبويب النشط', () => {
        renderHook(() => useSettingsSectionWarm(true, 'appearance'));
        expect(prefetchSettingsSection).toHaveBeenCalledWith('appearance');
        expect(prefetchSettingsSection).toHaveBeenCalledTimes(1);
        expect(prefetchSettingsOpenTabChunks).not.toHaveBeenCalled();
    });

    it('المركز المفتوح يسخّن التبويبات الثانوية حتى لا تفرّغ عند التبديل', () => {
        renderHook(() => useSettingsSectionWarm(true, 'security', true));
        expect(prefetchSettingsSection).toHaveBeenCalledWith('security');
        expect(prefetchSettingsOpenTabChunks).toHaveBeenCalledTimes(1);
    });
});
