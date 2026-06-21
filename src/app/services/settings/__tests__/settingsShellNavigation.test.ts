import { describe, expect, it, vi } from 'vitest';
import {
    SETTINGS_SHELL_FEATURE,
    openSettingsFromShell,
} from '@/app/services/settings/settingsShellNavigation';

describe('settingsShellNavigation', () => {
    it('opens settings when signed in', () => {
        const onOpen = vi.fn();
        expect(openSettingsFromShell({ signedIn: true, onOpen })).toBe(true);
        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('blocks settings when signed out', () => {
        const onOpen = vi.fn();
        const onSignedOut = vi.fn();
        expect(openSettingsFromShell({ signedIn: false, onOpen, onSignedOut })).toBe(false);
        expect(onOpen).not.toHaveBeenCalled();
        expect(onSignedOut).toHaveBeenCalledTimes(1);
    });

    it('uses Arabic feature label', () => {
        expect(SETTINGS_SHELL_FEATURE).toBe('الإعدادات');
    });
});
