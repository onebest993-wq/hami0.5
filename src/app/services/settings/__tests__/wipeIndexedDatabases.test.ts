import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    APPLICATION_WIPE_IDB_NAMES,
    deleteIndexedDatabase,
    wipeApplicationIndexedDatabases,
} from '@/app/services/settings/wipeIndexedDatabases';

describe('wipeIndexedDatabases', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('lists all sensitive IDB names required for cryptographic wipe completeness', () => {
        expect(APPLICATION_WIPE_IDB_NAMES).toEqual(
            expect.arrayContaining([
                'hami-crypto-keystore',
                'hami-dossier-backups',
                'HamiTokenBlacklist',
                'hami-voice-notes',
                'hami-forum-blobs',
            ]),
        );
    });

    it('deleteIndexedDatabase resolves when indexedDB missing', async () => {
        vi.stubGlobal('indexedDB', undefined);
        await expect(deleteIndexedDatabase('hami-crypto-keystore')).resolves.toBeUndefined();
    });

    it('wipeApplicationIndexedDatabases deletes every listed name', async () => {
        const deleted: string[] = [];
        vi.stubGlobal('indexedDB', {
            deleteDatabase: (name: string) => {
                deleted.push(name);
                const req: {
                    onsuccess: (() => void) | null;
                    onerror: (() => void) | null;
                    onblocked: (() => void) | null;
                } = { onsuccess: null, onerror: null, onblocked: null };
                queueMicrotask(() => req.onsuccess?.());
                return req;
            },
        });
        await wipeApplicationIndexedDatabases(['db-a', 'db-b']);
        expect(deleted).toEqual(['db-a', 'db-b']);
    });
});
