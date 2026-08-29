import { IPersistenceRepository } from "../../domain/interfaces/IPersistenceRepository";
import SecureStoreService from "@/app/services/SecureStoreService";
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierWipeGuard';
import { signalIfUnreadableProtected } from '@/app/services/dossierPersistence/corruptStorageSignal';
import { scheduleProtectedBackupFromData } from '@/app/services/dossierPersistence/protectedBackupService';
import { backupDomainForStorageKey } from '@/app/services/dossierPersistence/protectedStorageKeys';
import { debug } from '@/app/utils/debug';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

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
        // فهرس التنفيذ/الملفات يُقرأ بـ getItemSync فوراً بعد المزامنة — الكتابة غير المتزامنة وحدها تُظهر بيانات قديمة
        if (key.includes('execution') || key.includes('files')) {
            try {
                SecureStoreService.setItemSync(key, serializedData);
            } catch {
                /* المسار غير المتزامن أدناه احتياط */
            }
        }
        void SecureStoreService.setItem(key, serializedData);
        clearLegacyPlaintextMirror(key);
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
            const fromSync = readSecureOrDrainLegacySync(key);
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
        /*
         * ما جرت محاولة تحليله. بلا الاحتفاظ به لا يعرف `catch` أي نصّ سقط،
         * فيبقى تلف بيانات المحامي سطراً في وحدة تحكّم لا يراها أحد.
         */
        let attempted: string | null = null;
        try {
            const fromCache = this.memoryCache.get(key) ?? null;
            if (!fromCache) {
                const syncValue = readSecureOrDrainLegacySync(key);
                if (syncValue !== null) {
                    if (syncValue.startsWith(LocalStorageRepository.ENCRYPTED_PREFIX)) {
                        void (async () => {
                            const decrypted = await SecureStoreService.getItem(key);
                            if (decrypted !== null) this.memoryCache.set(key, decrypted);
                        })();
                        return null;
                    }
                    this.memoryCache.set(key, syncValue);
                    attempted = syncValue;
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
            attempted = fromCache;
            return JSON.parse(fromCache) as T;
        } catch (error) {
            console.error("❌ [LocalStorageRepository] Failed to load data:", error);
            signalIfUnreadableProtected(key, attempted, 'read');
            return null;
        }
    }

    public async loadAsync<T>(key: string): Promise<T | null> {
        const cached = this.load<T>(key);
        if (cached !== null) return cached;
        let attempted: string | null = null;
        try {
            const raw = await SecureStoreService.getItem(key);
            if (raw === null) return null;
            this.memoryCache.set(key, raw);
            attempted = raw;
            return JSON.parse(raw) as T;
        } catch (error) {
            console.error('❌ [LocalStorageRepository] Failed to loadAsync:', error);
            signalIfUnreadableProtected(key, attempted, 'read');
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
            clearLegacyPlaintextMirror(key);
        } catch (error) {
            console.error("❌ [LocalStorageRepository] Failed to remove data:", error);
        }
    }

    /**
     * Reconciles data written outside this repository (for example a verified
     * Settings import) so the in-memory cache cannot return stale content.
     */
    public synchronizeExternalWrite(key: string, value: string | null): void {
        const pending = this.pendingFlushTimers.get(key);
        if (pending !== undefined) {
            window.clearTimeout(pending);
            this.pendingFlushTimers.delete(key);
        }
        this.pendingBackupData.delete(key);
        if (value === null) this.memoryCache.delete(key);
        else this.memoryCache.set(key, value);
    }

    public async clear(): Promise<void> {
        try {
            const trackedKeys = new Set([
                ...this.pendingFlushTimers.keys(),
                ...this.pendingBackupData.keys(),
                ...this.memoryCache.keys(),
            ]);
            for (const [key, timer] of this.pendingFlushTimers.entries()) {
                window.clearTimeout(timer);
            }
            this.pendingFlushTimers.clear();
            this.pendingBackupData.clear();
            this.memoryCache.clear();
            await Promise.all([...trackedKeys].map((key) => SecureStoreService.deleteItem(key)));
        } catch (error) {
            console.error("❌ [LocalStorageRepository] Failed to clear storage:", error);
            throw error;
        }
    }
}

export const persistenceRepository = LocalStorageRepository.getInstance();
