import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    bidirectionalMerge,
    contentFingerprint,
    globalToVault,
    vaultToGlobal,
    loadSyncMap,
    saveSyncMap,
} from './notesSyncBridge';
import type { Note } from '@/app/data/NotesVault';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';

const memoryStore = new Map<string, string>();

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: (key: string) => memoryStore.get(key) ?? null,
        setItemSync: (key: string, value: string) => {
            memoryStore.set(key, value);
        },
    },
}));

const uid = 'user-abc';

describe('notesSyncBridge', () => {
    beforeEach(() => {
        memoryStore.clear();
        saveSyncMap(uid, {});
    });

    it('contentFingerprint normalizes whitespace', () => {
        expect(contentFingerprint('  hello   world  ', 100)).toBe(contentFingerprint('hello world', 100));
    });

    it('merges global note into vault when missing', () => {
        const global: GlobalNote[] = [
            { id: 1, title: 't', body: 'نص قانوني', isPinned: false, date: '2026-01-01T00:00:00.000Z' },
        ];
        const { mergedGlobal, mergedVault, syncMap } = bidirectionalMerge(uid, global, []);
        expect(mergedVault.length).toBe(1);
        expect(mergedGlobal.length).toBe(1);
        expect(syncMap['1']).toBeTruthy();
    });

    it('merges vault note into global when missing', () => {
        const vault: Note[] = [
            { id: 'v1', content: 'ملاحظة مخزن', type: 'text', createdAt: Date.now() },
        ];
        const { mergedGlobal, mergedVault } = bidirectionalMerge(uid, [], vault);
        expect(mergedVault.length).toBe(1);
        expect(mergedGlobal.length).toBe(1);
        expect(mergedGlobal[0].body).toBe('ملاحظة مخزن');
    });

    it('prunes global when linked vault entry removed', () => {
        const vault: Note[] = [{ id: 'v1', content: 'x', type: 'text', createdAt: 1 }];
        const first = bidirectionalMerge(uid, [], vault);
        saveSyncMap(uid, first.syncMap);
        const second = bidirectionalMerge(uid, first.mergedGlobal, []);
        expect(second.mergedGlobal.length).toBe(0);
    });

    it('round-trips vaultToGlobal and globalToVault', () => {
        const g: GlobalNote = { id: 9, title: 't', body: 'body', isPinned: true };
        const v = globalToVault(g);
        const back = vaultToGlobal(v);
        expect(back.body).toBe('body');
    });

    it('loadSyncMap returns empty for new user', () => {
        expect(loadSyncMap('fresh-user')).toEqual({});
    });
});
