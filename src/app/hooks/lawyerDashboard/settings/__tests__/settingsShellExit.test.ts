import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    beginSettingsShellExit,
    clearSettingsShellClosing,
    SETTINGS_SHELL_EXIT_MS,
} from '@/app/hooks/lawyerDashboard/settings/settingsShellExit';

describe('settingsShellExit', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-hami-settings-open');
        document.documentElement.removeAttribute('data-hami-settings-closing');
        delete document.documentElement.dataset.hamiReduceMotion;
        vi.useFakeTimers();
    });

    afterEach(() => {
        clearSettingsShellClosing();
        vi.useRealTimers();
    });

    it('مع تقليل الحركة يغلق فوراً', () => {
        document.documentElement.dataset.hamiReduceMotion = '1';
        const onDone = vi.fn();
        beginSettingsShellExit(onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('بدون Host يغلق فوراً', () => {
        const onDone = vi.fn();
        beginSettingsShellExit(onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('ينتظر خروج الطبقة ثم ينهي', () => {
        document.documentElement.setAttribute('data-hami-settings-open', '1');
        const host = document.createElement('div');
        host.setAttribute('data-testid', 'hami-settings-overlay-host');
        document.body.appendChild(host);

        const onDone = vi.fn();
        beginSettingsShellExit(onDone);
        expect(onDone).not.toHaveBeenCalled();
        expect(document.documentElement.getAttribute('data-hami-settings-closing')).toBe('1');

        vi.advanceTimersByTime(SETTINGS_SHELL_EXIT_MS + 40);
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(document.documentElement.hasAttribute('data-hami-settings-closing')).toBe(false);
    });
});
