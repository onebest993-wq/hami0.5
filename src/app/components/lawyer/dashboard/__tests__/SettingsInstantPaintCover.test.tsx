import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SettingsInstantPaintCover } from '@/app/components/lawyer/dashboard/SettingsInstantPaintCover';
import {
    clearSettingsForceVisible,
    clearSettingsReopenSuppress,
    concealSettingsWarmShell,
    isSettingsForceVisible,
    paintSettingsInstantChrome,
    suppressSettingsReopen,
} from '@/app/runtime/settingsInstantPaint';
import { markSettingsOverlayRevealed } from '@/app/runtime/settingsOverlayPresence';

describe('SettingsInstantPaintCover', () => {
    beforeEach(() => {
        clearSettingsForceVisible();
        clearSettingsReopenSuppress();
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-hami-settings-open');
        document.documentElement.removeAttribute('data-hami-settings-closing');
    });

    afterEach(() => {
        concealSettingsWarmShell();
        clearSettingsForceVisible();
        clearSettingsReopenSuppress();
        document.documentElement.removeAttribute('data-hami-settings-open');
        document.documentElement.removeAttribute('data-hami-settings-closing');
    });

    it('تسخين keepAlive لا يكشف الطبقة', () => {
        render(<SettingsInstantPaintCover />);
        expect(isSettingsForceVisible()).toBe(false);
        expect(document.documentElement.getAttribute('data-hami-settings-open')).toBeNull();
        expect(document.getElementById('hami-settings-instant-bridge')).toBeNull();
    });

    it('إن كانت الطبقة مكشوفة يُحدَّث الكروم', () => {
        markSettingsOverlayRevealed();
        render(<SettingsInstantPaintCover />);
        expect(isSettingsForceVisible()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-settings-open')).toBe('1');
    });

    it('أثناء الخروج لا يُعاد كشف الطبقة', () => {
        paintSettingsInstantChrome();
        document.documentElement.setAttribute('data-hami-settings-closing', '1');
        document.documentElement.removeAttribute('data-hami-settings-open');
        render(<SettingsInstantPaintCover />);
        expect(document.documentElement.getAttribute('data-hami-settings-open')).toBeNull();
    });

    it('مع كبح إعادة الفتح لا يطلي', () => {
        suppressSettingsReopen(200);
        markSettingsOverlayRevealed();
        render(<SettingsInstantPaintCover />);
        expect(document.getElementById('hami-settings-instant-bridge')).toBeNull();
    });
});
