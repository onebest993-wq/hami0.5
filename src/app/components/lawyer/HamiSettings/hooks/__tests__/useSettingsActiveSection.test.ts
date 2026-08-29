import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettingsActiveSection } from '@/app/components/lawyer/HamiSettings/hooks/useSettingsActiveSection';
import {
    SETTINGS_SECTION_STORAGE_KEY,
    persistSettingsSection,
} from '@/app/services/settings/settingsSectionPersistence';

describe('useSettingsActiveSection', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    afterEach(() => {
        sessionStorage.clear();
    });

    it('يبدأ من الأمان عند غياب جلسة', () => {
        const { result } = renderHook(() => useSettingsActiveSection(true));
        expect(result.current.activeSection).toBe('security');
        expect(sessionStorage.getItem(SETTINGS_SECTION_STORAGE_KEY)).toBe('security');
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
    });

    it('لا يعيد التعيين إن كان التبويب نفسه', () => {
        const { result } = renderHook(() => useSettingsActiveSection(true));
        act(() => {
            result.current.handleSectionChange('security');
        });
        expect(result.current.activeSection).toBe('security');
    });
});
