import { describe, expect, it, beforeEach } from 'vitest';
import {
    getBootShellItemSync,
    kickoffBootShellSyncLite,
    resetBootShellKickoffForTests,
} from '@/boot/bootShellKickoff';

describe('bootShellKickoff', () => {
    beforeEach(() => {
        resetBootShellKickoffForTests();
        localStorage.clear();
    });

    it('يقرأ lawyer_settings من localStorage بلا SecureStore', () => {
        localStorage.setItem('lawyer_settings', '{"v":2}');
        expect(getBootShellItemSync('lawyer_settings')).toContain('"v":2');
    });

    it('kickoffBootShellSyncLite idempotent', () => {
        localStorage.setItem('lawyer_theme', '{"theme":"gold"}');
        kickoffBootShellSyncLite();
        kickoffBootShellSyncLite();
        expect(getBootShellItemSync('lawyer_theme')).toContain('gold');
    });
});
