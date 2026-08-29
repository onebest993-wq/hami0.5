import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => undefined),
        deleteItem: vi.fn(async () => undefined),
        getItemSync: vi.fn(() => null),
        setItemSync: vi.fn(),
        deleteItemSync: vi.fn(),
        hasItemSync: vi.fn(() => false),
        isUnreadSync: vi.fn(() => false),
        listKeys: vi.fn(async () => []),
        listKeysSync: vi.fn(() => []),
        ensurePersistedReady: vi.fn(async () => undefined),
    },
}));

describe('LocalStorageRepository execution flush', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetModules();
    });

    it('flushPending writes execution index keys through setItemSync', async () => {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        const { persistenceRepository } = await import(
            '@/app/infrastructure/persistence/LocalStorageRepository'
        );
        persistenceRepository.save('executionFiles:lawyer-1', [{ id: 'ex-1' }]);
        persistenceRepository.flushPending('executionFiles:lawyer-1');
        expect(SecureStoreService.setItemSync).toHaveBeenCalledWith(
            'executionFiles:lawyer-1',
            JSON.stringify([{ id: 'ex-1' }]),
        );
    });
});
