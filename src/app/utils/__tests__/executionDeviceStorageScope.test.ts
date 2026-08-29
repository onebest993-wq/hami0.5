import { beforeEach, describe, expect, it } from 'vitest';

import {
    isStorageKeyVisibleToCurrentUser,
    readScopedDeviceStorageItem,
    scopeExecutionDeviceStorageKey,
} from '@/app/utils/executionDeviceStorageScope';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';

describe('isStorageKeyVisibleToCurrentUser', () => {
    beforeEach(() => {
        setLiveAuthUserId(null);
    });

    it('hides unscoped execution blob keys when a user is signed in', () => {
        setLiveAuthUserId('user-a');
        expect(isStorageKeyVisibleToCurrentUser('execution_legacy_1')).toBe(false);
        expect(isStorageKeyVisibleToCurrentUser('garnishment_x')).toBe(false);
    });

    it('allows unscoped execution blob keys when no live user', () => {
        expect(isStorageKeyVisibleToCurrentUser('execution_legacy_1')).toBe(true);
    });

    it('shows only the owner executionFiles index', () => {
        setLiveAuthUserId('user-a');
        expect(isStorageKeyVisibleToCurrentUser('executionFiles:user-a')).toBe(true);
        expect(isStorageKeyVisibleToCurrentUser('executionFiles:user-b')).toBe(false);
        expect(isStorageKeyVisibleToCurrentUser('executionFiles')).toBe(false);
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

describe('readScopedDeviceStorageItem', () => {
    beforeEach(() => {
        setLiveAuthUserId(null);
    });

    it('migrates unscoped legacy to scoped and removes twin when signed in', () => {
        setLiveAuthUserId('user-a');
        const store: Record<string, string> = {
            execution_legacy_1: '{"id":"legacy_1"}',
        };
        const raw = readScopedDeviceStorageItem(
            (k) => store[k] ?? null,
            'execution_legacy_1',
            {
                setItem: (k, v) => {
                    store[k] = v;
                },
                removeItem: (k) => {
                    delete store[k];
                },
            },
        );
        expect(raw).toBe('{"id":"legacy_1"}');
        expect(store['execution_legacy_1:u:user-a']).toBe('{"id":"legacy_1"}');
        expect(store.execution_legacy_1).toBeUndefined();
    });
});
