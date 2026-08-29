import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VAULT_LOCAL_KEY } from '@/app/services/vault/vaultLocalIndex';

const secureValues = new Map<string, string>();

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        listKeys: vi.fn(async () => [...secureValues.keys()]),
        getItem: vi.fn(async (key: string) => secureValues.get(key) ?? null),
        getItemSync: vi.fn((key: string) => secureValues.get(key) ?? null),
        setItem: vi.fn(async (key: string, value: string) => {
            secureValues.set(key, value);
        }),
        deleteItem: vi.fn(async (key: string) => {
            secureValues.delete(key);
        }),
    },
}));

import {
    buildBusinessBackupPayload,
    importBusinessBackupEntries,
    parseBusinessBackupFile,
} from '@/app/services/settings/businessBackup';
import {
    buildVaultIdbPath,
    getVaultBlob,
    putVaultBlob,
    resetVaultBlobStoreForTests,
} from '@/app/services/vaultBlobStore';

describe('business backup vault binary round-trip', () => {
    beforeEach(() => {
        secureValues.clear();
        resetVaultBlobStoreForTests();
    });

    it('exports and durably restores a local-only vault file with checksum verification', async () => {
        const authorId = 'user-1';
        const docId = 'doc-1';
        secureValues.set(
            VAULT_LOCAL_KEY,
            JSON.stringify([
                {
                    id: docId,
                    authorId,
                    title: 'contract',
                    createdAt: '2026-08-01T00:00:00.000Z',
                    storagePath: buildVaultIdbPath(authorId, docId),
                    mimeType: 'application/pdf',
                },
            ]),
        );
        await putVaultBlob(
            authorId,
            docId,
            new Blob(['vault-pdf'], { type: 'application/pdf' }),
            'application/pdf',
        );

        const built = await buildBusinessBackupPayload({
            includeLawsuits: false,
            includeExecution: false,
            includeNotes: false,
            includeVault: true,
            includeUrgent: false,
            includeUndated: true,
            from: '',
            to: '',
        });
        const parsed = parseBusinessBackupFile(built.text);
        expect(parsed.vaultBlobs).toHaveLength(1);
        expect(built.counts.vault.localFiles).toBe(1);

        secureValues.clear();
        resetVaultBlobStoreForTests();
        await importBusinessBackupEntries(parsed.entries, parsed.vaultBlobs);

        const restored = await getVaultBlob(authorId, docId);
        expect(await restored?.text()).toBe('vault-pdf');
        expect(secureValues.has(VAULT_LOCAL_KEY)).toBe(true);
    });

    it('rejects a tampered vault blob before replacing any data', async () => {
        secureValues.set(VAULT_LOCAL_KEY, '[]');
        await expect(
            importBusinessBackupEntries(
                [[
                    VAULT_LOCAL_KEY,
                    JSON.stringify([
                        {
                            id: 'doc-1',
                            authorId: 'user-1',
                            storagePath: buildVaultIdbPath('user-1', 'doc-1'),
                        },
                    ]),
                ]],
                [{
                    authorId: 'user-1',
                    docId: 'doc-1',
                    mimeType: 'application/pdf',
                    size: 1,
                    sha256: '0'.repeat(64),
                    data: 'eA==',
                }],
            ),
        ).rejects.toThrow('checksum');
        expect(secureValues.get(VAULT_LOCAL_KEY)).toBe('[]');
    });
});
