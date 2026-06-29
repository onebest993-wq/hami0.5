import SecureStoreService from '@/app/services/SecureStoreService';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import type { StorageDomainKey } from '@/app/infrastructure/persistence/storageDomains';

export { StorageDomainKeys, isCriminalCaseShardKey, isHeavyPersistKey } from '@/app/infrastructure/persistence/storageDomains';
export type { StorageDomainKey } from '@/app/infrastructure/persistence/storageDomains';

/**
 * HamiStorage — واجهة موحّدة للتخزين المحلي.
 *
 * - `json`: JSON مُ debounced عبر LocalStorageRepository (حماية مسح الإضبارة، نسخ احتياطي)
 * - `secure`: SecureStoreService (تشفير، IDB، heavy debounce)
 *
 * الهدف: نقطة دخول واحدة تُستبدل تدريجياً الاستيراد المباشر المتفرّق.
 */
export const HamiStorage = {
    json: {
        save<T>(key: StorageDomainKey | string, data: T): void {
            persistenceRepository.save(key, data);
        },
        load<T>(key: StorageDomainKey | string): T | null {
            return persistenceRepository.load<T>(key);
        },
        loadAsync<T>(key: StorageDomainKey | string): Promise<T | null> {
            return persistenceRepository.loadAsync<T>(key);
        },
        remove(key: StorageDomainKey | string): void {
            persistenceRepository.remove(key);
        },
        clear(): void {
            persistenceRepository.clear();
        },
    },

    secure: {
        getItem(key: string): Promise<string | null> {
            return SecureStoreService.getItem(key);
        },
        setItem(key: string, value: string): Promise<void> {
            return SecureStoreService.setItem(key, value);
        },
        deleteItem(key: string): Promise<void> {
            return SecureStoreService.deleteItem(key);
        },
        getItemSync(key: string): string | null {
            return SecureStoreService.getItemSync(key);
        },
        setItemSync(key: string, value: string): void {
            SecureStoreService.setItemSync(key, value);
        },
        deleteItemSync(key: string): void {
            SecureStoreService.deleteItemSync(key);
        },
        listKeys(): Promise<string[]> {
            return SecureStoreService.listKeys();
        },
        listKeysSync(): string[] {
            return SecureStoreService.listKeysSync();
        },
        flushHeavyPersistPending(): void {
            SecureStoreService.flushHeavyPersistPending();
        },
    },

    boot: {
        ensurePersistedReady(): Promise<void> {
            return SecureStoreService.ensurePersistedReady();
        },
        ensureBootShellReady(): Promise<void> {
            return SecureStoreService.ensureBootShellReady();
        },
    },
} as const;

export default HamiStorage;
