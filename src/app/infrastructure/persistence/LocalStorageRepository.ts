import { IPersistenceRepository } from "../../domain/interfaces/IPersistenceRepository";
import SecureStoreService from "@/app/services/SecureStoreService";

/**
 * 💾 LocalStorageRepository
 * 
 * Implementation of the Persistence Repository using LocalStorage.
 * Handles saving and retrieving data with JSON serialization.
 * Follows the "Clean Architecture" pattern.
 */
export class LocalStorageRepository implements IPersistenceRepository {
    private static instance: LocalStorageRepository;
    private memoryCache: Map<string, string> = new Map();
    private static readonly ENCRYPTED_PREFIX = 'hami_enc_v2:';

    private constructor() {}

    public static getInstance(): LocalStorageRepository {
        if (!LocalStorageRepository.instance) {
            LocalStorageRepository.instance = new LocalStorageRepository();
        }
        return LocalStorageRepository.instance;
    }

    public save<T>(key: string, data: T): void {
        try {
            const serializedData = JSON.stringify(data);
            this.memoryCache.set(key, serializedData);
            void SecureStoreService.setItem(key, serializedData);
        } catch (error) {
            console.error("❌ [LocalStorageRepository] Failed to save data:", error);
        }
    }

    public load<T>(key: string): T | null {
        try {
            const fromCache = this.memoryCache.get(key) ?? null;
            if (!fromCache) {
                const syncValue = SecureStoreService.getItemSync(key);
                if (syncValue !== null) {
                    if (syncValue.startsWith(LocalStorageRepository.ENCRYPTED_PREFIX)) {
                        void (async () => {
                            const decrypted = await SecureStoreService.getItem(key);
                            if (decrypted !== null) this.memoryCache.set(key, decrypted);
                        })();
                        return null;
                    }
                    this.memoryCache.set(key, syncValue);
                    return JSON.parse(syncValue) as T;
                }
                void (async () => {
                    const fromSecure = await SecureStoreService.getItem(key);
                    if (fromSecure !== null) this.memoryCache.set(key, fromSecure);
                })();
                return null;
            }
            if (fromCache.startsWith(LocalStorageRepository.ENCRYPTED_PREFIX)) {
                this.memoryCache.delete(key);
                void (async () => {
                    const decrypted = await SecureStoreService.getItem(key);
                    if (decrypted !== null) this.memoryCache.set(key, decrypted);
                })();
                return null;
            }
            return JSON.parse(fromCache) as T;
        } catch (error) {
            console.error("❌ [LocalStorageRepository] Failed to load data:", error);
            return null;
        }
    }

    public remove(key: string): void {
        try {
            this.memoryCache.delete(key);
            void SecureStoreService.deleteItem(key);
        } catch (error) {
            console.error("❌ [LocalStorageRepository] Failed to remove data:", error);
        }
    }

    public clear(): void {
        try {
            const appKeyPrefixes = ['hami_', 'hami:', 'lawyer_', 'execution_', 'lawsuit_', 'client_', 'notes_', 'cache_'];
            const keys = Array.from(this.memoryCache.keys());
            keys.forEach((k) => {
                if (appKeyPrefixes.some((p) => k.startsWith(p))) {
                    this.memoryCache.delete(k);
                }
            });
            void (async () => {
                const secureKeys = await SecureStoreService.listKeys();
                await Promise.all(
                    secureKeys
                        .filter((k) => appKeyPrefixes.some((p) => k.startsWith(p)))
                        .map((k) => SecureStoreService.deleteItem(k))
                );
            })();
        } catch (error) {
            console.error("❌ [LocalStorageRepository] Failed to clear storage:", error);
        }
    }
}

export const persistenceRepository = LocalStorageRepository.getInstance();
