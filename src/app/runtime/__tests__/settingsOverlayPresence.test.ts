import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    clearSettingsForceVisible,
    isSettingsForceVisible,
    isSettingsLayerOpen,
    isSettingsOverlayCssExiting,
    markSettingsOverlayRevealed,
} from '@/app/runtime/settingsOverlayPresence';
import { isSettingsShellSnappedOpen } from '@/app/services/settings/settingsShellSnap';

describe('settingsOverlayPresence', () => {
    beforeEach(() => {
        clearSettingsForceVisible();
        document.documentElement.removeAttribute('data-hami-settings-open');
        document.documentElement.removeAttribute('data-hami-settings-closing');
    });

    afterEach(() => {
        clearSettingsForceVisible();
        document.documentElement.removeAttribute('data-hami-settings-open');
        document.documentElement.removeAttribute('data-hami-settings-closing');
    });

    it('الكشف يقرن العلم بإسقاط html ولا يُقرأ الـ html كحقيقة', () => {
        expect(isSettingsLayerOpen(false)).toBe(false);
        markSettingsOverlayRevealed();
        expect(isSettingsForceVisible()).toBe(true);
        expect(isSettingsShellSnappedOpen()).toBe(true);
        expect(isSettingsLayerOpen(false)).toBe(true);
        expect(isSettingsLayerOpen(true)).toBe(true);
    });

    it('سمة html اليتيمة لا تفتح الطبقة منطقياً', () => {
        document.documentElement.setAttribute('data-hami-settings-open', '1');
        expect(isSettingsShellSnappedOpen()).toBe(true);
        expect(isSettingsForceVisible()).toBe(false);
        expect(isSettingsLayerOpen(false)).toBe(false);
        expect(isSettingsLayerOpen(true)).toBe(true);
    });

    it('المسح يشفي العلم والإسقاط معاً', () => {
        markSettingsOverlayRevealed();
        clearSettingsForceVisible();
        expect(isSettingsForceVisible()).toBe(false);
        expect(isSettingsShellSnappedOpen()).toBe(false);
        expect(isSettingsLayerOpen(false)).toBe(false);
    });

    it('سمة الإغلاق لا تُقرأ كفتح ولا تُتجاهل عند منع إعادة الفتح', () => {
        expect(isSettingsOverlayCssExiting()).toBe(false);
        document.documentElement.setAttribute('data-hami-settings-closing', '1');
        expect(isSettingsOverlayCssExiting()).toBe(true);
        expect(isSettingsLayerOpen(false)).toBe(false);
        document.documentElement.removeAttribute('data-hami-settings-closing');
        expect(isSettingsOverlayCssExiting()).toBe(false);
    });
});
