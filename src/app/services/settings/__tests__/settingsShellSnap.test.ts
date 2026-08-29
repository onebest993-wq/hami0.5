import { afterEach, describe, expect, it } from 'vitest';
import {
    isSettingsShellSnappedOpen,
    resetSettingsShellSnapForTests,
    snapSettingsShellClose,
    snapSettingsShellOpen,
} from '../settingsShellSnap';

describe('settingsShellSnap', () => {
    afterEach(() => {
        resetSettingsShellSnapForTests();
    });

    it('يضع ويزيل علم html فوراً', () => {
        expect(snapSettingsShellOpen()).toBe(false);
        expect(isSettingsShellSnappedOpen()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-settings-open')).toBe('1');

        snapSettingsShellClose();
        expect(isSettingsShellSnappedOpen()).toBe(false);
        expect(document.documentElement.getAttribute('data-hami-settings-open')).toBeNull();
    });
});
