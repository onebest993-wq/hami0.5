import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HamiStorage, StorageDomainKeys, isHeavyPersistKey } from '@/app/infrastructure/persistence/HamiStorage';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => undefined),
        deleteItem: vi.fn(async () => undefined),
        getItemSync: vi.fn(() => null),
        setItemSync: vi.fn(),
        deleteItemSync: vi.fn(),
        listKeys: vi.fn(async () => []),
        listKeysSync: vi.fn(() => []),
        flushHeavyPersistPending: vi.fn(),
        ensurePersistedReady: vi.fn(async () => undefined),
        ensureBootShellReady: vi.fn(async () => undefined),
    },
}));

vi.mock('@/app/infrastructure/persistence/LocalStorageRepository', () => ({
    persistenceRepository: {
        save: vi.fn(),
        load: vi.fn(() => null),
        loadAsync: vi.fn(async () => null),
        remove: vi.fn(),
        clear: vi.fn(),
    },
}));

describe('HamiStorage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يُ delegating json.save إلى persistenceRepository', () => {
        HamiStorage.json.save(StorageDomainKeys.settings, { theme: 'gold' });
        expect(persistenceRepository.save).toHaveBeenCalledWith(
            StorageDomainKeys.settings,
            { theme: 'gold' },
        );
    });

    it('isHeavyPersistKey يتعرّف executionFiles و criminal shards', () => {
        expect(isHeavyPersistKey(StorageDomainKeys.executionFiles)).toBe(true);
        expect(isHeavyPersistKey('hami:criminal:case:abc')).toBe(true);
        expect(isHeavyPersistKey(StorageDomainKeys.settings)).toBe(false);
    });
});
