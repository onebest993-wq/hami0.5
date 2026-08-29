import { afterEach, describe, expect, it, vi } from 'vitest';

import SecureStoreService, { StorageEncryptionError } from '@/app/services/SecureStoreService';
import { CryptoService } from '@/app/services/CryptoService';

describe('SecureStoreService — deferred sensitive writes', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not throw when persisting criminal meta before crypto is ready', async () => {
        vi.spyOn(CryptoService, 'initialize').mockResolvedValue(undefined);
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(false);

        await expect(
            SecureStoreService.setItem('hami:criminal:meta', JSON.stringify({ sharded: true, caseIds: [] })),
        ).resolves.toBeUndefined();
    });

    it('still refuses lawsuit encrypt-always keys without encryption', async () => {
        vi.spyOn(CryptoService, 'initialize').mockResolvedValue(undefined);
        vi.spyOn(CryptoService, 'hasMasterKey').mockReturnValue(false);

        await expect(
            SecureStoreService.setItem('lawyer_files', JSON.stringify([{ id: 'a' }])),
        ).rejects.toBeInstanceOf(StorageEncryptionError);
    });
});
