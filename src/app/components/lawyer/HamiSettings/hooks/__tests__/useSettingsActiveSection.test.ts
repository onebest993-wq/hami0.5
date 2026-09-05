import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/app/components/ui/smartDialogBus', () => ({
    dismissSettingsSmartDialogs: vi.fn(),
}));

import { useSettingsActiveSection } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsActiveSection';
import {
    SETTINGS_SECTION_STORAGE_KEY,
    persistSettingsSection,
} from '@/app/services/settings/settingsSectionPersistence';
import { dismissSettingsSmartDialogs } from '@/app/components/ui/smartDialogBus';

describe('useSettingsActiveSection', () => {
    beforeEach(() => {
        sessionStorage.clear();
        vi.mocked(dismissSettingsSmartDialogs).mockClear();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('يبدأ من الأمان عند غياب جلسة', () => {
        const { result } = renderHook(() => useSettingsActiveSection(true));
        expect(result.current.activeSection).toBe('security');
        expect(sessionStorage.getItem(SETTINGS_SECTION_STORAGE_KEY)).toBe('security');
    });

    it('يتبع تبويب القشرة الفورية ويتجاهل قيماً غير صالحة', () => {
        const { result } = renderHook(() => useSettingsActiveSection(true));
        act(() => {
            window.dispatchEvent(new CustomEvent('hami:settings-instant-section', { detail: 'evil-tab' }));
        });
        expect(result.current.activeSection).toBe('security');
        act(() => {
            window.dispatchEvent(new CustomEvent('hami:settings-instant-section', { detail: 'appearance' }));
        });
        expect(result.current.activeSection).toBe('appearance');
        expect(sessionStorage.getItem(SETTINGS_SECTION_STORAGE_KEY)).toBe('appearance');
        expect(dismissSettingsSmartDialogs).toHaveBeenCalledTimes(1);
    });

    it('يستعيد التبويب المحفوظ ولا يعيد التعيين عند الفتح', () => {
        persistSettingsSection('data');
        const { result } = renderHook(() => useSettingsActiveSection(true));
        expect(result.current.activeSection).toBe('data');
    });

    it('يحفظ التبديل في الجلسة', () => {
        const { result } = renderHook(() => useSettingsActiveSection(true));
        act(() => {
            result.current.handleSectionChange('account');
        });
        expect(result.current.activeSection).toBe('account');
        expect(sessionStorage.getItem(SETTINGS_SECTION_STORAGE_KEY)).toBe('account');
        expect(dismissSettingsSmartDialogs).toHaveBeenCalledTimes(1);
    });

    it('لا يعيد التعيين إن كان التبويب نفسه', () => {
        const { result } = renderHook(() => useSettingsActiveSection(true));
        act(() => {
            result.current.handleSectionChange('security');
        });
        expect(result.current.activeSection).toBe('security');
        expect(dismissSettingsSmartDialogs).not.toHaveBeenCalled();
    });
});
