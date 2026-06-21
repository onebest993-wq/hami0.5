import { describe, expect, it, vi } from 'vitest';
import {
    HUB_SHELL_FEATURES,
    hubArchiveIdFromWidget,
    hubShellFeature,
    openHubArchiveFromShell,
} from '@/app/services/hub/hubShellNavigation';

describe('hubShellNavigation', () => {
    it('maps widget ids to archive ids', () => {
        expect(hubArchiveIdFromWidget('hubExecution')).toBe('execution');
        expect(hubArchiveIdFromWidget('hubLawsuit')).toBe('lawsuit');
        expect(hubArchiveIdFromWidget('hubTransaction')).toBe('transaction');
        expect(hubArchiveIdFromWidget('forum')).toBeNull();
    });

    it('uses Arabic feature labels', () => {
        expect(hubShellFeature('execution')).toBe('تنفيذ');
        expect(HUB_SHELL_FEATURES.lawsuit).toBe('دعاوى');
    });

    it('opens hub archive when signed in', () => {
        const onOpen = vi.fn();
        expect(
            openHubArchiveFromShell({ signedIn: true, archiveId: 'lawsuit', onOpen }),
        ).toBe(true);
        expect(onOpen).toHaveBeenCalledWith('lawsuit');
    });

    it('blocks hub archive when signed out', () => {
        const onOpen = vi.fn();
        const onSignedOut = vi.fn();
        expect(
            openHubArchiveFromShell({
                signedIn: false,
                archiveId: 'execution',
                onOpen,
                onSignedOut,
            }),
        ).toBe(false);
        expect(onOpen).not.toHaveBeenCalled();
        expect(onSignedOut).toHaveBeenCalledTimes(1);
    });
});
