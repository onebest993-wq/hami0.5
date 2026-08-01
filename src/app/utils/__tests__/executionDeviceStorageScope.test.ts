import { beforeEach, describe, expect, it } from 'vitest';

import {
    isStorageKeyVisibleToCurrentUser,
    scopeExecutionDeviceStorageKey,
} from '@/app/utils/executionDeviceStorageScope';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';

describe('isStorageKeyVisibleToCurrentUser', () => {
    beforeEach(() => {
        setLiveAuthUserId(null);
    });

    it('allows legacy unscoped keys for any signed-in user', () => {
        setLiveAuthUserId('user-a');
        expect(isStorageKeyVisibleToCurrentUser('execution_legacy_1')).toBe(true);
    });

    it('hides another user scoped dossier blob', () => {
        setLiveAuthUserId('user-b');
        const foreign = scopeExecutionDeviceStorageKey('execution_foreign_1');
        expect(foreign).toContain(':u:user-b');
        setLiveAuthUserId('user-a');
        expect(isStorageKeyVisibleToCurrentUser(foreign)).toBe(false);
    });

    it('shows own scoped dossier blob', () => {
        setLiveAuthUserId('user-a');
        const own = scopeExecutionDeviceStorageKey('execution_own_1');
        expect(isStorageKeyVisibleToCurrentUser(own)).toBe(true);
    });

    it('hides scoped keys when no live user', () => {
        const scoped = 'execution_x:u:user-a';
        setLiveAuthUserId(null);
        expect(isStorageKeyVisibleToCurrentUser(scoped)).toBe(false);
    });
});
