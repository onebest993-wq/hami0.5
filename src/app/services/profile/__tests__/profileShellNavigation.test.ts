import { describe, expect, it, vi } from 'vitest';
import {
    PROFILE_SHELL_FEATURE,
    openProfileFromShell,
} from '@/app/services/profile/profileShellPolicy';

describe('profileShellPolicy — فتح من الهيدر', () => {
    it('opens profile when signed in', () => {
        const onOpen = vi.fn();
        expect(openProfileFromShell({ signedIn: true, onOpen })).toBe(true);
        expect(onOpen).toHaveBeenCalledTimes(1);
    });

    it('blocks profile when signed out', () => {
        const onOpen = vi.fn();
        const onSignedOut = vi.fn();
        expect(openProfileFromShell({ signedIn: false, onOpen, onSignedOut })).toBe(false);
        expect(onOpen).not.toHaveBeenCalled();
        expect(onSignedOut).toHaveBeenCalledTimes(1);
    });

    it('uses Arabic feature label', () => {
        expect(PROFILE_SHELL_FEATURE).toBe('الملف المهني');
    });
});
