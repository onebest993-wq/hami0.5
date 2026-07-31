import { IPersistenceRepository } from "../../domain/interfaces/IPersistenceRepository";
import SecureStoreService from "@/app/services/SecureStoreService";
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierWipeGuard';
import { scheduleProtectedBackupFromData } from '@/app/services/dossierPersistence/protectedBackupService';
import { backupDomainForStorageKey } from '@/app/services/dossierPersistence/protectedStorageKeys';
import { debug } from '@/app/utils/debug';

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
    private pendingFlushTimers = new Map<string, number>();
    private pendingBackupData = new Map<string, unknown>();
    private static readonly ENCRYPTED_PREFIX = 'hami_enc_v2:';
    private static beforeUnloadHookInstalled = false;

    private constructor() {
        if (typeof window !== 'undefined' && !LocalStorageRepository.beforeUnloadHookInstalled) {
            LocalStorageRepository.beforeUnloadHookInstalled = true;
            window.addEventListener('beforeunload', () => {
                LocalStorageRepository.getInstance().flushAllPending();
            });
        }
    }

    private persistDelayMs(key: string): number {
        if (key.includes('files') || key.includes('execution') || key.includes('tasks')) return 450;
        return 150;
    }

    private flushKey(key: string, serializedData: string, data: unknown): void {
        this.pendingFlushTimers.delete(key);
        void SecureStoreService.setItem(key, serializedData);
        const backupDomain = backupDomainForStorageKey(key);
        if (backupDomain && backupDomain !== 'lawsuit' && backupDomain !== 'execution') {
            scheduleProtectedBackupFromData(key, data);
        }
        this.pendingBackupData.delete(key);
    }

    private flushAllPending(): void {
        for (const [key, timer] of this.pendingFlushTimers.entries()) {
            window.clearTimeout(timer);
            const serialized = this.memoryCache.get(key);
            if (!serialized) continue;
            this.flushKey(key, serialized, this.pendingBackupData.get(key));
        }
        this.pendingFlushTimers.clear();
        this.pendingBackupData.clear();
    }

    /** يحدّث الذاكرة دون جدولة كتابة — بعد حفظ فوري مباشر */
    public primeEntry<T>(key: string, serializedData: string, data: T): void {
        const pending = this.pendingFlushTimers.get(key);
        if (pending !== undefined) {
            window.clearTimeout(pending);
            this.pendingFlushTimers.delete(key);
        }
        this.memoryCache.set(key, serializedData);
        this.pendingBackupData.set(key, data);
    }

    /** يكتب فوراً إلى التخزين — للمهام وغيرها عند الإغلاق أو الحفظ الصريح */
    public flushPending(key?: string): void {
        if (!key) {
            this.flushAllPending();
            return;
        }
        const timer = this.pendingFlushTimers.get(key);
        if (timer === undefined) return;
        window.clearTimeout(timer);
        this.pendingFlushTimers.delete(key);
        const serialized = this.memoryCache.get(key);
        if (!serialized) return;
        this.flushKey(key, serialized, this.pendingBackupData.get(key));
    }

    public static getInstance(): LocalStorageRepository {
        if (!LocalStorageRepository.instance) {
            LocalStorageRepository.instance = new LocalStorageRepository();
        }
        return LocalStorageRepository.instance;
    }

    public save<T>(key: string, data: T): void {
        try {
            const serializedData = JSON.stringify(data);
            if (this.memoryCache.get(key) === serializedData) return;
            const fromCache = this.memoryCache.get(key);
            const fromSync = SecureStoreService.getItemSync(key);
            // لا تثق بكاش ذاكرة فارغ إن كان التخزين المتزامن ما زال يحمل بيانات
            let existing = fromCache ?? fromSync ?? null;
            if (
                fromCache &&
                fromSync &&
                fromCache !== fromSync &&
                shouldRejectDossierWipe(key, fromCache, fromSync)
            ) {
                existing = fromSync;
                this.memoryCache.set(key, fromSync);
            }
            if (existing && shouldRejectDossierWipe(key, serializedData, existing)) {
                debug.warn(`[LocalStorageRepository] رفض مسح "${key}" — البيانات الحالية محفوظة.`);
                return;
            }
            this.memoryCache.set(key, serializedData);
            this.pendingBackupData.set(key, data);
            const prevTimer = this.pendingFlushTimers.get(key);
            if (prevTimer !== undefined) window.clearTimeout(prevTimer);
            const timer = window.setTimeout(() => {
                this.flushKey(key, serializedData, this.pendingBackupData.get(key));
            }, this.persistDelayMs(key));
            this.pendingFlushTimers.set(key, timer);
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

    public async loadAsync<T>(key: string): Promise<T | null> {
        await SecureStoreService.ensurePersistedReady();
        const cached = this.load<T>(key);
        if (cached !== null) return cached;
        try {
            const raw = await SecureStoreService.getItem(key);
            if (raw === null) return null;
            this.memoryCache.set(key, raw);
            return JSON.parse(raw) as T;
        } catch (error) {
            console.error('❌ [LocalStorageRepository] Failed to loadAsync:', error);
            return null;
        }
    }

    public remove(key: string): void {
        try {
            const pending = this.pendingFlushTimers.get(key);
            if (pending !== undefined) {
                window.clearTimeout(pending);
                this.pendingFlushTimers.delete(key);
            }
            this.pendingBackupData.delete(key);
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
