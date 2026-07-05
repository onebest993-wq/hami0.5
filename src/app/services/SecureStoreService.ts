type SecureStoreValue = string | null;
type ExpoSecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

import { CryptoService } from './CryptoService';
import { debug } from '@/app/utils/debug';

const KEY_INDEX = '__hami_secure_store_keys__';
const ENCRYPTED_PREFIX = 'hami_enc_v2:';

const __DEV__ = import.meta.env.DEV;
const _log = (...a: unknown[]) => { if (__DEV__) console.log('[SecureStore]', ...a); };
const _warn = (...a: unknown[]) => { if (__DEV__) console.warn('[SecureStore]', ...a); };
const _err = (...a: unknown[]) => { if (__DEV__) console.error('[SecureStore]', ...a); };
const _guard = (...a: unknown[]) => { debug.warn('[SecureStore]', ...a); };

let webMigrationDone = false;
let webSyncMigrationDone = false;
let webDbInitPromise: Promise<boolean> | null = null;
let secureStoreModulePromise: Promise<ExpoSecureStoreModule | null> | null = null;
let webReadyPromise: Promise<void> | null = null;
let webReady = false;
let bootShellReady = false;
let bootShellSyncDone = false;
let bootShellPromise: Promise<void> | null = null;

const webFallbackStore = new Map<string, string>();
const decryptedCache = new Map<string, string>();
const decryptedCacheOrder: string[] = [];
const MAX_DECRYPTED_CACHE_ENTRIES = 64;
const HEAVY_PERSIST_DEBOUNCE_MS = 1_200;
const heavyPersistTimers = new Map<string, ReturnType<typeof setTimeout>>();
const heavyPersistPending = new Map<string, string>();
let heavyPersistVisibilityHook = false;

const HEAVY_PERSIST_EXACT_KEYS = new Set([
  'executionFiles',
  /** lawyer_files — كتابة فورية؛ التأجيل 1.2s كان يفقد الملفات عند إعادة التحميل السريعة */
  'lawyer_notes',
  'hami:criminal:meta',
]);
const HEAVY_PERSIST_PREFIXES = ['hami:criminal:case:'];

function isHeavyPersistKey(key: string): boolean {
  return HEAVY_PERSIST_EXACT_KEYS.has(key) || HEAVY_PERSIST_PREFIXES.some((p) => key.startsWith(p));
}

function installHeavyPersistFlushHook(): void {
  if (heavyPersistVisibilityHook || typeof document === 'undefined') return;
  heavyPersistVisibilityHook = true;
  const flush = () => {
    if (document.visibilityState !== 'hidden') return;
    for (const timer of heavyPersistTimers.values()) clearTimeout(timer);
    heavyPersistTimers.clear();
    for (const [key, value] of heavyPersistPending.entries()) {
      heavyPersistPending.delete(key);
      void SecureStoreService.setItem(key, value);
    }
  };
  document.addEventListener('visibilitychange', flush);
  window.addEventListener('pagehide', flush);
}
const WEB_DB_NAME = 'hami-secure-store';
const WEB_DB_VERSION = 2;
const WEB_STORE = 'secure_kv';
const WEB_MIGRATION_PREFIXES = [
  'hami:',
  'hami_',
  'lawyer_',
  'execution_',
  'lawsuit_',
  'client_',
  'notes_',
  'cache_',
  'garnishment_',
  'ai_guardian_',
  'wife_',
];

const isWebEnvironment = (): boolean =>
  typeof window !== 'undefined' && typeof document !== 'undefined';

import { isSensitiveStorageKey, shouldEncryptValue } from './secureStorageKeys';
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierWipeGuard';
import {
  isExecutionDossierMainBlobKey,
  shouldRejectExecutionDossierBlobWipe,
} from '@/app/utils/executionDossierBlobPersistence';
import {
  BOOT_SHELL_WARM_KEYS,
  PROTECTED_WARM_KEYS,
} from '@/app/services/dossierPersistence/protectedStorageKeys';
import { scheduleProtectedBackupFromRaw } from '@/app/services/dossierPersistence/protectedBackupService';
import { recoverPlaintextAfterDecryptFailure } from '@/app/services/secureStoreRecovery';

const decryptFailureWarned = new Set<string>();

export class StorageEncryptionError extends Error {
  constructor(key: string, cause?: unknown) {
    super(`Refused to persist sensitive key "${key}" without encryption`);
    this.name = 'StorageEncryptionError';
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

/** تحديد ما إذا كان المفتاح حساساً ويحتاج تشفير */
function isSensitiveKey(key: string): boolean {
  return isSensitiveStorageKey(key);
}

function touchDecryptedCache(key: string, value: string): void {
  decryptedCache.set(key, value);
  const existingIdx = decryptedCacheOrder.indexOf(key);
  if (existingIdx >= 0) decryptedCacheOrder.splice(existingIdx, 1);
  decryptedCacheOrder.push(key);
  while (decryptedCacheOrder.length > MAX_DECRYPTED_CACHE_ENTRIES) {
    const evictKey = decryptedCacheOrder.shift();
    if (evictKey) decryptedCache.delete(evictKey);
  }
}

function deleteDecryptedCacheKey(key: string): void {
  decryptedCache.delete(key);
  const idx = decryptedCacheOrder.indexOf(key);
  if (idx >= 0) decryptedCacheOrder.splice(idx, 1);
}

/** تشفير القيمة — لا plaintext fallback للمفاتيح الحساسة */
async function encryptIfSensitive(key: string, value: string): Promise<string> {
  if (!shouldEncryptValue(key, value)) return value;
  if (value.startsWith(ENCRYPTED_PREFIX)) return value;
  try {
    await CryptoService.initialize();
    const encrypted = await CryptoService.encryptData(value);
    return `${ENCRYPTED_PREFIX}${encrypted}`;
  } catch (error) {
    _err(`Encryption failed for sensitive key "${key}" — write rejected:`, error);
    throw new StorageEncryptionError(key, error);
  }
}

/** فك تشفير — مع استعادة من نسخة احتياطية/localStorage عند فشل المفتاح */
async function decryptIfSensitive(key: string, value: string): Promise<string | null> {
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;
  const encryptedPart = value.slice(ENCRYPTED_PREFIX.length);
  try {
    await CryptoService.initialize();
    return await CryptoService.decryptData(encryptedPart);
  } catch (error) {
    const recovered = await recoverPlaintextAfterDecryptFailure(key);
    if (recovered !== null) {
      if (!decryptFailureWarned.has(key)) {
        decryptFailureWarned.add(key);
        _warn(`Decryption failed for "${key}" — data restored from backup/legacy store.`);
      }
      return recovered;
    }
    if (!decryptFailureWarned.has(key)) {
      decryptFailureWarned.add(key);
      _warn(`Decryption failed for key "${key}":`, error);
    }
    return null;
  }
}

/**
 * Unified secure storage service.
 * - Mobile (Expo/RN): uses expo-secure-store.
 * - Web fallback: in-memory store to avoid local/session storage exposure.
 */
class SecureStoreService {
  private static shouldMigrateWebKey(key: string): boolean {
    if (key === KEY_INDEX) return true;
    return WEB_MIGRATION_PREFIXES.some((prefix) => key.startsWith(prefix));
  }

  private static deleteWebDatabase(): Promise<void> {
    if (typeof indexedDB === 'undefined') return Promise.resolve();
    return new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(WEB_DB_NAME);
      const finish = () => resolve();
      req.onsuccess = finish;
      req.onerror = finish;
      req.onblocked = finish;
    });
  }

  /** تهيئة واحدة متسلسلة — يمنع سباق فتح IDB قبل اكتمال onupgradeneeded */
  private static ensureWebDatabaseInitialized(retry = true): Promise<boolean> {
    if (!isWebEnvironment() || typeof indexedDB === 'undefined') {
      return Promise.resolve(false);
    }
    if (!webDbInitPromise) {
      webDbInitPromise = (async () => {
        try {
          await new Promise<void>((resolve, reject) => {
            const req = indexedDB.open(WEB_DB_NAME, WEB_DB_VERSION);
            req.onupgradeneeded = () => {
              const db = req.result;
              if (!db.objectStoreNames.contains(WEB_STORE)) {
                db.createObjectStore(WEB_STORE);
              }
            };
            req.onsuccess = () => {
              const db = req.result;
              if (!db.objectStoreNames.contains(WEB_STORE)) {
                db.close();
                reject(new Error('IndexedDB object store missing after open'));
                return;
              }
              db.close();
              resolve();
            };
            req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
            req.onblocked = () => {
              _warn('IndexedDB upgrade blocked — close other tabs using this app');
            };
          });
          return true;
        } catch (error) {
          webDbInitPromise = null;
          if (retry) {
            _log('IndexedDB init retry — rebuilding store');
            await this.deleteWebDatabase();
            return this.ensureWebDatabaseInitialized(false);
          }
          _err('IndexedDB init failed permanently:', error);
          return false;
        }
      })();
    }
    return webDbInitPromise;
  }

  private static openWebDatabase(): Promise<IDBDatabase | null> {
    if (!isWebEnvironment() || typeof indexedDB === 'undefined') {
      return Promise.resolve(null);
    }
    return this.ensureWebDatabaseInitialized().then((ready) => {
      if (!ready) return null;
      return new Promise((resolve) => {
        const req = indexedDB.open(WEB_DB_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
    });
  }

  private static beginWebDbTransaction(
    db: IDBDatabase,
    mode: IDBTransactionMode,
  ): IDBTransaction | null {
    try {
      return db.transaction(WEB_STORE, mode);
    } catch (error) {
      if (__DEV__) _log('IndexedDB transaction skipped:', error);
      return null;
    }
  }

  private static async webDbGetAllKeys(): Promise<string[]> {
    const db = await this.openWebDatabase();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = this.beginWebDbTransaction(db, 'readonly');
      if (!tx) {
        db.close();
        resolve([]);
        return;
      }
      const req = tx.objectStore(WEB_STORE).getAllKeys();
      req.onsuccess = () => {
        const keys = (req.result as unknown[]).filter((k): k is string => typeof k === 'string');
        resolve(keys);
      };
      req.onerror = () => resolve([]);
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
      tx.onerror = () => db.close();
    });
  }

  /** @deprecated — تحميل كامل؛ يُستخدم فقط عند الحاجة لترحيل قديم */
  private static async webDbLoadAllIntoCache(): Promise<void> {
    const db = await this.openWebDatabase();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = this.beginWebDbTransaction(db, 'readonly');
      if (!tx) {
        db.close();
        resolve();
        return;
      }
      const store = tx.objectStore(WEB_STORE);
      const req = store.getAll();
      const keyReq = store.getAllKeys();
      let values: unknown[] = [];
      let keys: unknown[] = [];
      let pending = 2;

      const tryResolve = () => {
        if (--pending > 0) return;
        for (let i = 0; i < Math.min(keys.length, values.length); i++) {
          const k = keys[i];
          const v = values[i];
          if (typeof k === 'string' && typeof v === 'string') {
            webFallbackStore.set(k, v);
          }
        }
      };

      req.onsuccess = () => {
        values = req.result as unknown[];
        tryResolve();
      };
      keyReq.onsuccess = () => {
        keys = keyReq.result as unknown[];
        tryResolve();
      };

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  }

  private static async webDbSetItem(key: string, value: string): Promise<void> {
    const db = await this.openWebDatabase();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = this.beginWebDbTransaction(db, 'readwrite');
      if (!tx) {
        db.close();
        resolve();
        return;
      }
      tx.objectStore(WEB_STORE).put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  }

  private static async webDbGetItem(key: string): Promise<string | null> {
    const db = await this.openWebDatabase();
    if (!db) return null;
    const result = await new Promise<string | null>((resolve) => {
      const tx = this.beginWebDbTransaction(db, 'readonly');
      if (!tx) {
        resolve(null);
        return;
      }
      const req = tx.objectStore(WEB_STORE).get(key);
      req.onsuccess = () => {
        const value = req.result;
        resolve(typeof value === 'string' ? value : null);
      };
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onabort = () => db.close();
      tx.onerror = () => db.close();
    });
    return result;
  }

  private static async webDbDeleteItem(key: string): Promise<void> {
    const db = await this.openWebDatabase();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = this.beginWebDbTransaction(db, 'readwrite');
      if (!tx) {
        db.close();
        resolve();
        return;
      }
      tx.objectStore(WEB_STORE).delete(key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  }

  private static ensureWebReadySyncKickoff(): void {
    if (!isWebEnvironment() || webReadyPromise || webReady) return;
    webReadyPromise = this.ensureWebReady();
  }

  /** تهيئة متزامنة فورية — localStorage + مفاتيح الواجهة (لا تُحجب React) */
  static kickoffBootShellSync(): void {
    if (!isWebEnvironment() || bootShellSyncDone) return;
    bootShellSyncDone = true;
    this.ensureWebMigrationSync();
    this.warmBootShellKeysSync();
  }

  private static warmBootShellKeysSync(): void {
    for (const key of BOOT_SHELL_WARM_KEYS) {
      if (decryptedCache.has(key)) continue;
      const raw = webFallbackStore.get(key) ?? null;
      if (raw === null || raw.startsWith(ENCRYPTED_PREFIX)) continue;
      touchDecryptedCache(key, raw);
    }
  }

  /** إعدادات الواجهة من IndexedDB — خلفية بعد أول إطار */
  static async ensureBootShellReady(): Promise<void> {
    if (!isWebEnvironment() || bootShellReady) return;
    if (import.meta.env.VITEST) {
      bootShellReady = true;
      bootShellSyncDone = true;
      webReady = true;
      return;
    }
    if (bootShellPromise) return bootShellPromise;
    bootShellPromise = (async () => {
      this.kickoffBootShellSync();
      await this.warmPersistedKeys(BOOT_SHELL_WARM_KEYS);
      bootShellReady = true;
    })();
    await bootShellPromise;
  }

  /** انتظار تحميل IndexedDB + كل الإضابير — يُستدعى في الخلفية بعد أول إطار */
  static async ensurePersistedReady(): Promise<void> {
    if (!isWebEnvironment()) return;
    await this.ensureWebReady();
  }

  private static async ensureWebReady(): Promise<void> {
    if (!isWebEnvironment() || webReady) return;
    if (import.meta.env.VITEST) {
      webReady = true;
      bootShellReady = true;
      return;
    }
    if (webReadyPromise) return webReadyPromise;
    webReadyPromise = (async () => {
      await this.ensureBootShellReady();
      await this.ensureWebMigration();
      await this.warmPersistedKeys(PROTECTED_WARM_KEYS);
      webReady = true;
    })();
    await webReadyPromise;
  }

  private static async getSecureStoreModule(): Promise<ExpoSecureStoreModule | null> {
    if (isWebEnvironment()) return null;
    if (!secureStoreModulePromise) {
      secureStoreModulePromise = (async () => {
        try {
          const mod = await import('expo-secure-store');
          return mod as ExpoSecureStoreModule;
        } catch {
          return null;
        }
      })();
    }
    return secureStoreModulePromise;
  }

  private static async readIndex(): Promise<Set<string>> {
    if (isWebEnvironment()) {
      await this.ensureWebReady();
      const idbKeys = await this.webDbGetAllKeys();
      return new Set([...webFallbackStore.keys(), ...idbKeys]);
    }
    const secureStore = await this.getSecureStoreModule();
    if (!secureStore) {
      return new Set(webFallbackStore.keys());
    }
    const raw = await secureStore.getItemAsync(KEY_INDEX);
    if (!raw) return new Set<string>();
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return new Set<string>();
      return new Set(parsed.filter((v): v is string => typeof v === 'string'));
    } catch {
      return new Set<string>();
    }
  }

  private static async writeIndex(keys: Set<string>): Promise<void> {
    if (isWebEnvironment()) return;
    const secureStore = await this.getSecureStoreModule();
    if (!secureStore) return;
    await secureStore.setItemAsync(KEY_INDEX, JSON.stringify(Array.from(keys)));
  }

  private static async ensureWebMigration(): Promise<void> {
    if (!isWebEnvironment() || webMigrationDone) return;
    webMigrationDone = true;
    try {
      const ls = globalThis.localStorage;
      if (!ls) return;
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (!k) continue;
        if (!this.shouldMigrateWebKey(k)) continue;
        const v = ls.getItem(k);
        if (v !== null && !webFallbackStore.has(k)) {
          webFallbackStore.set(k, v);
          await this.webDbSetItem(k, v);
        }
      }
    } catch {
      /* ignore migration issues */
    }
  }

  private static ensureWebMigrationSync(): void {
    if (!isWebEnvironment() || webSyncMigrationDone) return;
    webSyncMigrationDone = true;
    try {
      const ls = globalThis.localStorage;
      if (!ls) return;
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (!k) continue;
        if (!this.shouldMigrateWebKey(k)) continue;
        const v = ls.getItem(k);
        if (v !== null && !webFallbackStore.has(k)) {
          webFallbackStore.set(k, v);
        }
      }
    } catch {
      /* ignore migration issues */
    }
  }

  private static countCasesInRaw(raw: string): number {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return 0;
      const root = parsed as Record<string, unknown>;
      const cases = (root.state as { casesById?: unknown } | undefined)?.casesById ?? root.casesById;
      return cases && typeof cases === 'object' ? Object.keys(cases as object).length : 0;
    } catch {
      return 0;
    }
  }

  private static shouldRejectEmptyOverwrite(key: string, incoming: string, existing: string): boolean {
    if (key === 'hami:criminal:store') {
      return this.countCasesInRaw(incoming) === 0 && this.countCasesInRaw(existing) > 0;
    }
    if (key.startsWith('hami_notes_sync_map_')) {
      const trimmed = incoming.trim();
      if (trimmed === '' || trimmed === '{}' || trimmed === 'null') return true;
    }
    if (shouldRejectDossierWipe(key, incoming, existing)) return true;
    if (isExecutionDossierMainBlobKey(key) && shouldRejectExecutionDossierBlobWipe(key, incoming, existing)) {
      return true;
    }
    const trimmed = incoming.trim();
    if (trimmed === '' || trimmed === '{}' || trimmed === 'null') return true;
    return false;
  }

  /** تحميل مفاتيح محددة من IndexedDB وفك التشفير — بدون getItem (يتجنّب deadlock مع ensureWebReady) */
  private static async warmPersistedKeys(keys: readonly string[]): Promise<void> {
    if (!isWebEnvironment()) return;
    for (const key of keys) {
      if (decryptedCache.has(key)) continue;
      try {
        let raw: string | null = webFallbackStore.get(key) ?? null;
        if (raw === null) {
          raw = await this.webDbGetItem(key);
          if (raw !== null) webFallbackStore.set(key, raw);
        }
        if (raw === null) continue;
        const decrypted = await decryptIfSensitive(key, raw);
        if (decrypted !== null) touchDecryptedCache(key, decrypted);
      } catch {
        /* ignore per-key warm failures */
      }
    }
  }

  static async setItem(key: string, value: string): Promise<void> {
    if (isWebEnvironment()) {
      await this.ensureWebReady();
      try {
        const existing = webFallbackStore.get(key) ?? (await this.webDbGetItem(key));
        if (existing && this.shouldRejectEmptyOverwrite(key, value, existing)) {
          if (!key.startsWith('hami_notes_sync_map_')) {
            _guard(`Refused empty overwrite for "${key}" — existing data preserved.`);
          }
          return;
        }
      } catch {
        /* ignore guard */
      }
    }

    touchDecryptedCache(key, value);
    const encrypted = await encryptIfSensitive(key, value);
    if (isWebEnvironment()) {
      await this.ensureWebReady();
      webFallbackStore.set(key, encrypted);
      await this.webDbSetItem(key, encrypted);
      scheduleProtectedBackupFromRaw(key, value);
      return;
    }

    const secureStore = await this.getSecureStoreModule();
    if (!secureStore) {
      webFallbackStore.set(key, encrypted);
      return;
    }

    const index = await this.readIndex();
    index.add(key);
    await this.writeIndex(index);
    await secureStore.setItemAsync(key, encrypted);
  }

  static async getItem(key: string): Promise<SecureStoreValue> {
    let raw: string | null = null;
    if (isWebEnvironment()) {
      await this.ensureWebReady();
      if (webFallbackStore.has(key)) raw = webFallbackStore.get(key) ?? null;
      if (raw === null) {
        const persisted = await this.webDbGetItem(key);
        if (persisted !== null) {
          webFallbackStore.set(key, persisted);
          raw = persisted;
        }
      }
    } else {
      const secureStore = await this.getSecureStoreModule();
      if (!secureStore) {
        raw = webFallbackStore.get(key) ?? null;
      } else {
        raw = await secureStore.getItemAsync(key);
      }
    }
    if (raw === null) return null;
    const decrypted = await decryptIfSensitive(key, raw);
    if (decrypted === null) return null;
    touchDecryptedCache(key, decrypted);
    if (raw.startsWith(ENCRYPTED_PREFIX) && !isSensitiveKey(key)) {
      void this.setItem(key, decrypted);
    }
    return decrypted;
  }

  static async deleteItem(key: string): Promise<void> {
    deleteDecryptedCacheKey(key);
    if (isWebEnvironment()) {
      await this.ensureWebReady();
      webFallbackStore.delete(key);
      await this.webDbDeleteItem(key);
      return;
    }

    const secureStore = await this.getSecureStoreModule();
    if (!secureStore) {
      webFallbackStore.delete(key);
      return;
    }

    const index = await this.readIndex();
    index.delete(key);
    await this.writeIndex(index);
    await secureStore.deleteItemAsync(key);
  }

  static async listKeys(): Promise<string[]> {
    const index = await this.readIndex();
    return Array.from(index);
  }

  /** flush فوري لكتابات IDB المؤجّلة (عند إخفاء التبويب) */
  static flushHeavyPersistPending(): void {
    for (const timer of heavyPersistTimers.values()) {
      clearTimeout(timer);
    }
    heavyPersistTimers.clear();
    for (const [key, value] of heavyPersistPending.entries()) {
      heavyPersistPending.delete(key);
      void this.setItem(key, value);
    }
  }

  private static scheduleHeavyPersist(key: string, value: string): void {
    installHeavyPersistFlushHook();
    heavyPersistPending.set(key, value);
    const existing = heavyPersistTimers.get(key);
    if (existing) clearTimeout(existing);
    heavyPersistTimers.set(
      key,
      setTimeout(() => {
        heavyPersistTimers.delete(key);
        const pending = heavyPersistPending.get(key);
        if (pending !== undefined) {
          heavyPersistPending.delete(key);
          void this.setItem(key, pending);
        }
      }, HEAVY_PERSIST_DEBOUNCE_MS),
    );
  }

  static getItemSync(key: string): SecureStoreValue {
    if (!isWebEnvironment()) return null;
    this.ensureWebMigrationSync();
    this.ensureWebReadySyncKickoff();
    if (decryptedCache.has(key)) return decryptedCache.get(key) ?? null;
    const raw = webFallbackStore.get(key) ?? null;
    if (raw === null) return null;
    if (raw.startsWith(ENCRYPTED_PREFIX)) return null;
    return raw;
  }

  static setItemSync(key: string, value: string): void {
    if (isWebEnvironment()) {
      this.ensureWebMigrationSync();
      this.ensureWebReadySyncKickoff();
      const existing = this.getItemSync(key) ?? webFallbackStore.get(key) ?? null;
      if (existing && this.shouldRejectEmptyOverwrite(key, value, existing)) {
        return;
      }
      touchDecryptedCache(key, value);
      webFallbackStore.set(key, value);
      if (isHeavyPersistKey(key)) {
        this.scheduleHeavyPersist(key, value);
        return;
      }
    }
    void this.setItem(key, value);
  }

  static deleteItemSync(key: string): void {
    if (isWebEnvironment()) {
      this.ensureWebMigrationSync();
      this.ensureWebReadySyncKickoff();
      deleteDecryptedCacheKey(key);
      webFallbackStore.delete(key);
    }
    void this.deleteItem(key);
  }

  static listKeysSync(): string[] {
    if (!isWebEnvironment()) return [];
    this.ensureWebMigrationSync();
    this.ensureWebReadySyncKickoff();
    return Array.from(webFallbackStore.keys());
  }
}

if (typeof window !== 'undefined' && !import.meta.env.VITEST) {
  SecureStoreService.kickoffBootShellSync();
}

export default SecureStoreService;
