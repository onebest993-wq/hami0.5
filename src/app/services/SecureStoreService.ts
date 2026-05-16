type SecureStoreValue = string | null;
type ExpoSecureStoreModule = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

const KEY_INDEX = '__hami_secure_store_keys__';
const ENCRYPTED_PREFIX = 'hami_enc_v2:';

const __DEV__ = import.meta.env.DEV;
const _log = (...a: unknown[]) => { if (__DEV__) console.log('[SecureStore]', ...a); };
const _warn = (...a: unknown[]) => { if (__DEV__) console.warn('[SecureStore]', ...a); };
const _err = (...a: unknown[]) => { if (__DEV__) console.error('[SecureStore]', ...a); };

let webMigrationDone = false;
let webSyncMigrationDone = false;
let secureStoreModulePromise: Promise<ExpoSecureStoreModule | null> | null = null;
let webReadyPromise: Promise<void> | null = null;
let webReady = false;

const webFallbackStore = new Map<string, string>();
const decryptedCache = new Map<string, string>();
const WEB_DB_NAME = 'hami-secure-store';
const WEB_DB_VERSION = 1;
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

/** تحديد ما إذا كان المفتاح حساساً ويحتاج تشفير */
function isSensitiveKey(key: string): boolean {
  const sensitivePrefixes = ['auth_', 'token_', 'session_'];
  return sensitivePrefixes.some((p) => key.startsWith(p));
}

/** تشفير القيمة إذا كان المفتاح حساساً */
async function encryptIfSensitive(key: string, value: string): Promise<string> {
  if (!isSensitiveKey(key)) return value;
  if (value.startsWith(ENCRYPTED_PREFIX)) return value;
  try {
    const { CryptoService } = await import('./CryptoService');
    await CryptoService.initialize();
    const encrypted = await CryptoService.encryptData(value);
    return `${ENCRYPTED_PREFIX}${encrypted}`;
  } catch (error) {
    _warn(`Encryption failed for key "${key}", storing raw:`, error);
    return value;
  }
}

/** فك تشفير القيمة إذا كانت مشفرة */
async function decryptIfSensitive(key: string, value: string): Promise<string> {
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;
  const encryptedPart = value.slice(ENCRYPTED_PREFIX.length);
  try {
    const { CryptoService } = await import('./CryptoService');
    await CryptoService.initialize();
    return await CryptoService.decryptData(encryptedPart);
  } catch (error) {
    _warn(`Decryption failed for key "${key}", returning raw:`, error);
    return value;
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

  private static openWebDatabase(): Promise<IDBDatabase | null> {
    if (!isWebEnvironment() || typeof indexedDB === 'undefined') {
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      const req = indexedDB.open(WEB_DB_NAME, WEB_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(WEB_STORE)) {
          db.createObjectStore(WEB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  private static async webDbLoadAllIntoCache(): Promise<void> {
    const db = await this.openWebDatabase();
    if (!db) return;
    await new Promise<void>((resolve) => {
      const tx = db.transaction(WEB_STORE, 'readonly');
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
      const tx = db.transaction(WEB_STORE, 'readwrite');
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
      const tx = db.transaction(WEB_STORE, 'readonly');
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
      const tx = db.transaction(WEB_STORE, 'readwrite');
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

  private static async ensureWebReady(): Promise<void> {
    if (!isWebEnvironment() || webReady) return;
    if (webReadyPromise) return webReadyPromise;
    webReadyPromise = (async () => {
      await this.webDbLoadAllIntoCache();
      await this.ensureWebMigration();
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
      return new Set(webFallbackStore.keys());
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

  static async setItem(key: string, value: string): Promise<void> {
    decryptedCache.set(key, value);
    const encrypted = await encryptIfSensitive(key, value);
    if (isWebEnvironment()) {
      await this.ensureWebReady();
      webFallbackStore.set(key, encrypted);
      await this.webDbSetItem(key, encrypted);
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
    decryptedCache.set(key, decrypted);
    if (raw.startsWith(ENCRYPTED_PREFIX) && !isSensitiveKey(key)) {
      void this.setItem(key, decrypted);
    }
    return decrypted;
  }

  static async deleteItem(key: string): Promise<void> {
    decryptedCache.delete(key);
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
      webFallbackStore.set(key, value);
    }
    void this.setItem(key, value);
  }

  static deleteItemSync(key: string): void {
    if (isWebEnvironment()) {
      this.ensureWebMigrationSync();
      this.ensureWebReadySyncKickoff();
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

export default SecureStoreService;
