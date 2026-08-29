type SecureStoreValue = string | null;

import { CryptoService } from './CryptoService';
import { debug } from '@/app/utils/debug';

const KEY_INDEX = '__hami_secure_store_keys__';
const ENCRYPTED_PREFIX = 'hami_enc_v2:';

const __DEV__ = import.meta.env.DEV;

const _log = (...a: unknown[]) => { debug.log('[SecureStore]', ...a); };
const _warn = (...a: unknown[]) => { debug.warn('[SecureStore]', ...a); };
const _err = (...a: unknown[]) => { debug.error('[SecureStore]', ...a); };
const _guard = (...a: unknown[]) => { debug.warn('[SecureStore]', ...a); };

let webMigrationDone = false;
let webSyncMigrationDone = false;
let webDbInitPromise: Promise<boolean> | null = null;
let webReadyPromise: Promise<void> | null = null;
/** IndexedDB + ترحيل جاهزان — بلا انتظار فكّ كل المفاتيح المحمية */
let webInfraReady = false;
let webInfraPromise: Promise<void> | null = null;
let webReady = false;
let fullProtectedWarmScheduled = false;
let bootShellReady = false;
let bootShellSyncDone = false;
let bootShellPromise: Promise<void> | null = null;
/** singleflight لمسار مقاطع الدعاوى — يمنع تسخيناً مزدوجاً من warm + eager hydrate */
let lawsuitKeysReadyPromise: Promise<void> | null = null;
let executionIndexReadyPromise: Promise<void> | null = null;

const webFallbackStore = new Map<string, string>();
/** Vitest: قرص وهمي منفصل عن المرآة — يثبت create→reload دون IndexedDB حقيقي */
const vitestDiskStore = new Map<string, string>();
const decryptedCache = new Map<string, string>();
const decryptedCacheOrder: string[] = [];
const MAX_DECRYPTED_CACHE_ENTRIES = 64;
const HEAVY_PERSIST_DEBOUNCE_MS = 1_200;
const heavyPersistTimers = new Map<string, ReturnType<typeof setTimeout>>();
const heavyPersistPending = new Map<string, string>();
let heavyPersistVisibilityHook = false;
let heavyPersistHiddenFlushTimer: ReturnType<typeof setTimeout> | null = null;

const HEAVY_PERSIST_EXACT_KEYS = new Set(
  __HAMI_CLIENT_PRODUCT__ === 'hq'
    ? []
    : [
        'executionFiles',
        /** lawyer_files — كتابة فورية؛ التأجيل 1.2s كان يفقد الملفات عند إعادة التحميل السريعة */
        'lawyer_notes',
        'hami:criminal:meta',
      ],
);
const HEAVY_PERSIST_PREFIXES = __HAMI_CLIENT_PRODUCT__ === 'hq' ? [] : ['hami:criminal:case:'];

function isHeavyPersistKey(key: string): boolean {
  return HEAVY_PERSIST_EXACT_KEYS.has(key) || HEAVY_PERSIST_PREFIXES.some((p) => key.startsWith(p));
}

const durableSetItemPending = new Map<string, Promise<void>>();
const cryptoDeferredWrites = new Map<string, string>();
let cryptoDeferredFlushTimer: ReturnType<typeof setTimeout> | null = null;
let cryptoDeferredAttempts = 0;
const CRYPTO_DEFERRED_MAX_ATTEMPTS = 24;

function scheduleCryptoDeferredFlush(delayMs: number): void {
  if (import.meta.env.VITEST) return;
  if (cryptoDeferredFlushTimer != null) return;
  cryptoDeferredFlushTimer = setTimeout(() => {
    cryptoDeferredFlushTimer = null;
    void flushCryptoDeferredWrites();
  }, delayMs);
}

function queueCryptoDeferredWrite(key: string, value: string): void {
  cryptoDeferredWrites.set(key, value);
  scheduleCryptoDeferredFlush(400);
}

async function flushCryptoDeferredWrites(): Promise<void> {
  if (cryptoDeferredWrites.size === 0) return;
  try {
    await CryptoService.initialize();
  } catch {
    /* wrap قد يصل مع الجلسة */
  }
  if (!CryptoService.hasMasterKey()) {
    if (cryptoDeferredAttempts < CRYPTO_DEFERRED_MAX_ATTEMPTS) {
      cryptoDeferredAttempts += 1;
      scheduleCryptoDeferredFlush(1_200);
    }
    return;
  }
  cryptoDeferredAttempts = 0;
  const batch = [...cryptoDeferredWrites.entries()];
  cryptoDeferredWrites.clear();
  for (const [key, value] of batch) {
    try {
      await SecureStoreService.setItem(key, value);
    } catch (error) {
      if (error instanceof StorageEncryptionError) {
        cryptoDeferredWrites.set(key, value);
        continue;
      }
      _err(`Deferred persist failed for "${key}":`, error);
    }
  }
  if (cryptoDeferredWrites.size > 0 && cryptoDeferredAttempts < CRYPTO_DEFERRED_MAX_ATTEMPTS) {
    cryptoDeferredAttempts += 1;
    scheduleCryptoDeferredFlush(1_200);
  }
}

function queueDurableSetItem(
  key: string,
  value: string,
  options: { allowVerifiedEmptyOverwrite?: boolean; allowShrink?: boolean } = {},
): Promise<void> {
  const previous = durableSetItemPending.get(key) ?? Promise.resolve();
  const run = previous
    .catch(() => undefined)
    .then(() => SecureStoreService.setItem(key, value, options))
    .then(
      () => undefined,
      (error: unknown) => {
        signalPersistenceFailure(
          key,
          'encrypt-or-write-failed',
          error instanceof Error ? error.message : String(error),
        );
        /*
         * مفاتيح الدعاوى: لا تبتلع الفشل — وإلا flush ينجح كذباً وتختفي الإضبارة
         * عند إعادة التحميل بينما الذاكرة ما زالت تُظهر «محفوظ».
         */
        if (isEncryptOrFailStorageKey(key)) {
          throw error instanceof Error ? error : new Error(String(error));
        }
      },
    );
  durableSetItemPending.set(key, run);
  void run.finally(() => {
    if (durableSetItemPending.get(key) === run) durableSetItemPending.delete(key);
  });
  return run;
}

function installHeavyPersistFlushHook(): void {
  if (heavyPersistVisibilityHook || typeof document === 'undefined') return;
  heavyPersistVisibilityHook = true;
  const flushPending = () => {
    for (const timer of heavyPersistTimers.values()) clearTimeout(timer);
    heavyPersistTimers.clear();
    for (const [key, value] of heavyPersistPending.entries()) {
      heavyPersistPending.delete(key);
      void queueDurableSetItem(key, value);
    }
    void SecureStoreService.waitForAllPendingPersist();
  };
  const scheduleVisibilityFlush = () => {
    if (document.visibilityState !== 'hidden') {
      if (heavyPersistHiddenFlushTimer) {
        clearTimeout(heavyPersistHiddenFlushTimer);
        heavyPersistHiddenFlushTimer = null;
      }
      return;
    }
    if (heavyPersistHiddenFlushTimer) clearTimeout(heavyPersistHiddenFlushTimer);
    heavyPersistHiddenFlushTimer = setTimeout(() => {
      heavyPersistHiddenFlushTimer = null;
      if (document.visibilityState === 'hidden') flushPending();
    }, 900);
  };
  const flushOnPageHide = () => {
    if (heavyPersistHiddenFlushTimer) {
      clearTimeout(heavyPersistHiddenFlushTimer);
      heavyPersistHiddenFlushTimer = null;
    }
    flushPending();
  };
  document.addEventListener('visibilitychange', scheduleVisibilityFlush);
  window.addEventListener('pagehide', flushOnPageHide);
}
const WEB_DB_NAME = 'hami-secure-store';
const WEB_DB_VERSION = 2;
const WEB_STORE = 'secure_kv';
const WEB_MIGRATION_PREFIXES =
  __HAMI_CLIENT_PRODUCT__ === 'hq'
    ? ['hami:', 'hami_', 'wife_']
    : [
        'hami:',
        'hami_',
        'lawyer_',
        'execution_',
        /** فهرس التنفيذ المعياري + مفاتيح المالك executionFiles:<uid> — ليست تحت execution_ */
        'executionFiles',
        'lawsuit_',
        'client_',
        'notes_',
        'cache_',
        'garnishment_',
        'ai_guardian_',
        'wife_',
      ];

/**
 * مسار التخزين الوحيد في هذا المشروع: IndexedDB + ذاكرة (ويب وCapacitor).
 * Capacitor WebView يملك window/document دائماً، و`expo-secure-store` وحدة
 * Expo/RN لا تُحمَّل داخلها — كانت اعتمادية ميتة تُوهم بأمان أصلي غير موجود.
 */
const isWebEnvironment = (): boolean =>
  typeof window !== 'undefined' && typeof document !== 'undefined';

import {
  encryptionSizeLimitFor,
  fallsBackToPlaintextBySize,
  isEncryptOrFailStorageKey,
  isLawsuitEncryptAlwaysKey,
  isSensitiveStorageKey,
  shouldEncryptValue,
} from './secureStorageKeys';
import { signalPlaintextFallback } from './plaintextFallbackSignal';
import { signalPersistenceFailure } from './persistenceFailureSignal';
import {
  isEmptyingPayload,
  isUnreadableProtectedValue,
  shouldRejectDossierWipe,
} from '@/app/services/dossierPersistence/dossierWipeGuard';
import { notifyDecryptedCacheWrite } from '@/app/services/storage/decryptedCacheNotify';
import { bindDeletedIdsPersist, bindDeletedIdsUnreadProbe } from '@/app/services/storage/deletedIdsPersistBridge';
import { signalUnreadableStoredValue } from '@/app/services/dossierPersistence/corruptStorageSignal';
import { runStorageSchemaBootOnce } from '@/app/services/storageSchema/runStorageSchemaBoot';
import {
  isExecutionDossierMainBlobKey,
  shouldRejectExecutionDossierBlobWipe,
} from '@/app/utils/executionDossierBlobKeyLite';
import {
  BOOT_SHELL_WARM_KEYS,
  isDeletedIdsTombstoneStorageKey,
  isDossierTombstonesStorageKey,
  isProtectedStorageKey,
  PROTECTED_WARM_KEYS,
} from '@/app/services/dossierPersistence/protectedStorageKeys';
import { recoverPlaintextAfterDecryptFailure } from '@/app/services/secureStoreRecovery';

const decryptFailureWarned = new Set<string>();

/**
 * جدولة النسخة الاحتياطية خلف حدّ كسول.
 *
 * `protectedBackupService` يستورد هذه الخدمة ليقرأ عدّاد المراجعات ويكتبه، فكان
 * استيراده هنا ساكناً يغلق دائرة: الطبقة الدنيا (مخزن) تعرف الطبقة العليا (سياسة
 * نسخ). الحدّ الكسول يفكّ الدائرة فعلاً لا شكلاً، ويُخرج آلة النسخ وdossierBackupStore
 * من الإغلاق الساكن لهذه الخدمة — وهي على مسار الإقلاع الحرج عبر zustand persist.
 *
 * الكتابة الأصلية تكتمل قبل النداء، فتعثّر النسخة تدهور لا فقدان؛ ومع ذلك يُسجَّل
 * الفشل ويُعاد ضبط المذكِّرة حتى تُعاد المحاولة عند الكتابة التالية.
 */
type BackupScheduler = (storageKey: string, raw: string) => void;
let backupSchedulerLoad: Promise<BackupScheduler | null> | null = null;

function scheduleProtectedBackupFromRaw(key: string, value: string): void {
  if (__HAMI_CLIENT_PRODUCT__ === 'hq') return;
  backupSchedulerLoad ??= import('@/app/services/dossierPersistence/protectedBackupService')
    .then((mod) => mod.scheduleProtectedBackupFromRaw)
    .catch((error: unknown) => {
      backupSchedulerLoad = null;
      _guard(`Protected backup module failed to load: ${String(error)}`);
      return null;
    });
  void backupSchedulerLoad.then((schedule) => schedule?.(key, value));
}

export class StorageEncryptionError extends Error {
  constructor(key: string, cause?: unknown) {
    super(`Refused to persist sensitive key "${key}" without encryption`);
    this.name = 'StorageEncryptionError';
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

/** فشلت الكتابة إلى IndexedDB — الذاكرة ليست دليلاً على الحفظ */
export class StoragePersistenceError extends Error {
  constructor(key: string, cause?: unknown) {
    super(`Failed to persist key "${key}" to IndexedDB`);
    this.name = 'StoragePersistenceError';
    if (cause !== undefined) (this as { cause?: unknown }).cause = cause;
  }
}

/** تحديد ما إذا كان المفتاح حساساً ويحتاج تشفير */
function isSensitiveKey(key: string): boolean {
  return isSensitiveStorageKey(key);
}

function touchDecryptedCache(key: string, value: string): void {
  decryptedCache.set(key, value);
  notifyDecryptedCacheWrite(key, value);
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

/*
 * تشفير القيمة. فوق حدّ الحجم: معظم المفاتيح الحساسة تسقط إلى plaintext
 * (`fallsBackToPlaintextBySize` + `signalPlaintextFallback`). استثناء: مفاتيح
 * الدعاوى المُسخَّنة والتسخين الحسّاس وشظايا الجزائي
 * تُشفَّر أو تفشل — لا نصّ صريح. التنفيذ: plaintext محلي (السحابة منفصلة).
 */
async function encryptIfSensitive(key: string, value: string): Promise<string> {
  if (!shouldEncryptValue(key, value)) {
    if (fallsBackToPlaintextBySize(key, value)) {
      signalPlaintextFallback(key, value.length, encryptionSizeLimitFor(key));
    }
    return value;
  }
  if (value.startsWith(ENCRYPTED_PREFIX)) return value;
  try {
    await Promise.race([
      CryptoService.initialize(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('crypto-init-timeout')), 6_000);
      }),
    ]);
    if (!CryptoService.hasMasterKey()) {
      throw new Error('crypto-not-ready');
    }
    const encrypted = await CryptoService.encryptData(value);
    return `${ENCRYPTED_PREFIX}${encrypted}`;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg !== 'crypto-not-ready' && msg !== 'crypto-init-timeout') {
      _err(`Encryption failed for sensitive key "${key}" — write rejected:`, error);
    }
    throw new StorageEncryptionError(key, error);
  }
}

/** فك تشفير — مع استعادة من نسخة احتياطية/localStorage عند فشل المفتاح */
async function decryptIfSensitive(key: string, value: string): Promise<string | null> {
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;
  const encryptedPart = value.slice(ENCRYPTED_PREFIX.length);
  try {
    await Promise.race([
      CryptoService.initialize(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('crypto-init-timeout')), 4_000);
      }),
    ]);
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
    const wrapMismatch =
      (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'OperationError') ||
      (error instanceof Error && error.name === 'OperationError');
    if (wrapMismatch) return null;
    if (!decryptFailureWarned.has(key)) {
      decryptFailureWarned.add(key);
      _warn(`Decryption failed for key "${key}":`, error);
    }
    return null;
  }
}

/**
 * Unified secure storage: IndexedDB (+ in-memory warm cache) with optional
 * CryptoService encryption for sensitive keys. Same path on web and Capacitor.
 */
class SecureStoreService {
  private static shouldMigrateWebKey(key: string): boolean {
    if (key === KEY_INDEX) return true;
    /*
     * المونولث الجزائي قد يكون عدة ميغابايت. ترحيله هنا يوقف فتح IndexedDB
     * — وبالتالي أول قراءة دعاوى/تقويم — على نسخ/تشفير لا يخصّهما.
     * البقايا تُرحَّل إلى شظايا في مسار الجزائي نفسه (idle / أول قراءة جزائي).
     */
    if (key === 'hami:criminal:store') return false;
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
    if (import.meta.env.VITEST) {
      return [...vitestDiskStore.keys()];
    }
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

  /**
   * @returns هل بلغت الكتابة القرص فعلاً.
   *
   * كانت `Promise<void>` تُبتلع كل فشل: قاعدة محجوبة، حصّة ممتلئة، معاملة مُجهَضة.
   * والذاكرة تحتفظ بالقيمة فتبدو الجلسة سليمة — والخسارة تظهر عند الإقلاع التالي
   * بلا أثر يدلّ عليها.
   */
  private static async webDbSetItem(key: string, value: string): Promise<boolean> {
    if (import.meta.env.VITEST) {
      vitestDiskStore.set(key, value);
      return true;
    }
    const db = await this.openWebDatabase();
    if (!db) {
      signalPersistenceFailure(key, 'db-unavailable');
      return false;
    }
    return await new Promise<boolean>((resolve) => {
      const tx = this.beginWebDbTransaction(db, 'readwrite');
      if (!tx) {
        db.close();
        signalPersistenceFailure(key, 'transaction-failed', 'transaction could not begin');
        resolve(false);
        return;
      }
      const fail = (detail: string) => {
        db.close();
        signalPersistenceFailure(key, 'transaction-failed', detail);
        resolve(false);
      };
      try {
        tx.objectStore(WEB_STORE).put(value, key);
      } catch (error) {
        /* `put` نفسها ترمي حين يتعذّر تسلسل القيمة أو تُرفض فوراً */
        fail(error instanceof Error ? error.name : 'put threw');
        return;
      }
      /* الإتمام وحده نجاح — والإجهاض غالب سببه `QuotaExceededError` */
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onabort = () => fail(tx.error?.name ?? 'aborted');
      tx.onerror = () => fail(tx.error?.name ?? 'error');
    });
  }

  private static async webDbGetItem(key: string): Promise<string | null> {
    if (import.meta.env.VITEST) {
      return vitestDiskStore.get(key) ?? null;
    }
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
    if (import.meta.env.VITEST) {
      vitestDiskStore.delete(key);
      return;
    }
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
    if (!isWebEnvironment() || webInfraReady || webInfraPromise) {
      if (isWebEnvironment() && webInfraReady) this.scheduleFullProtectedWarmInBackground();
      return;
    }
    webInfraPromise = this.ensureWebInfrastructureReady();
  }

  /**
   * فتح IDB + ترحيل + boot shell — بلا فكّ PROTECTED_WARM_KEYS كلها.
   * مسار الدعاوى/الكتابة يعتمد عليه حتى لا يُحجب أول فتح على تسخين المجتمع/الخزنة/…
   */
  private static async ensureWebInfrastructureReady(): Promise<void> {
    if (!isWebEnvironment() || webInfraReady) return;
    if (import.meta.env.VITEST) {
      webInfraReady = true;
      bootShellReady = true;
      bootShellSyncDone = true;
      webReady = true;
      return;
    }
    if (webInfraPromise) {
      await webInfraPromise;
      return;
    }
    webInfraPromise = (async () => {
      await this.ensureBootShellReady();
      await this.ensureWebMigration();
      webInfraReady = true;
      this.scheduleFullProtectedWarmInBackground();
    })();
    await webInfraPromise;
  }

  /** تسخين باقي المفاتيح المحمية في الخلفية — لا يُنتظر على مسار الدعاوى */
  private static scheduleFullProtectedWarmInBackground(): void {
    if (!isWebEnvironment() || webReady || fullProtectedWarmScheduled) return;
    if (import.meta.env.VITEST) {
      webReady = true;
      return;
    }
    fullProtectedWarmScheduled = true;
    const run = () => {
      void this.ensureWebReady();
    };
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(run, { timeout: 2_500 });
    } else {
      setTimeout(run, 0);
    }
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

  /**
   * تسخين مفاتيح محددة من IndexedDB وفكّ التشفير إلى الذاكرة —
   * بلا انتظار `PROTECTED_WARM_KEYS` كلها. لإقلاع الاسم قبل أول طلاء.
   */
  static async warmKeys(keys: readonly string[]): Promise<void> {
    if (!isWebEnvironment() || keys.length === 0) return;
    this.kickoffBootShellSync();
    await this.warmPersistedKeys(keys);
  }

  /** بعد وصول wrap الجلسة: أعد فكّ مفاتيح الإقلاع دون إنذار OperationError. */
  static async rewarmSensitiveAfterWrapChange(): Promise<void> {
    if (!isWebEnvironment()) return;
    decryptFailureWarned.clear();
    cryptoDeferredAttempts = 0;
    try {
      await CryptoService.initialize();
    } catch {
      /* الكتابة المؤجّلة تُعاد بعد وصول المفتاح */
    }
    await this.warmPersistedKeys(BOOT_SHELL_WARM_KEYS);
    await flushCryptoDeferredWrites();
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
    /*
     * ختم نسخة البيانات هنا لا في مهامّ ما بعد الإقلاع: كل قارئ نطاقي في
     * التطبيق ينتظر هذه الدالة قبل أن يلمس بياناته، فهي البوّابة الوحيدة التي
     * تضمن أن الترحيل يسبق أول قراءة. المنفذ ضيّق عمداً حتى لا يستدعي ترحيلٌ
     * هذه الدالة نفسها فيقف على وعدٍ ينتظر نفسه.
     */
    await runStorageSchemaBootOnce(
      {
        get: (key) => this.getItem(key),
        set: (key, value) => this.setItem(key, value),
        remove: (key) => this.deleteItem(key),
        listKeys: () => this.listKeys(),
      },
      __HAMI_APP_RELEASE__,
    );
  }

  /**
   * مسار مخزن الدعاوى — بنية تحتية + مقاطع الدعوى فقط.
   * لا ينتظر فكّ مجتمع/خزنة/تنفيذ/جزائي.
   */
  static async ensureLawsuitKeysReady(): Promise<void> {
    if (__HAMI_CLIENT_PRODUCT__ === 'hq') return;
    if (!isWebEnvironment()) return;
    if (lawsuitKeysReadyPromise) return lawsuitKeysReadyPromise;
    const run = (async () => {
      const [{ markLawsuitArchivePerf }, { LAWSUIT_SEGMENT_WARM_KEYS }] = await Promise.all([
        import('@/app/services/alerts/lawsuitArchivePerfMetrics'),
        import('@/app/services/dossierPersistence/dossierStorageKeys'),
      ]);
      markLawsuitArchivePerf('keys-warm-start');
      try {
        await CryptoService.initialize();
      } catch {
        /* فكّ لاحق يحاول مجدداً */
      }
      await this.ensureWebInfrastructureReady();
      await this.warmPersistedKeys([...LAWSUIT_SEGMENT_WARM_KEYS]);
      markLawsuitArchivePerf('keys-ready');
    })();
    lawsuitKeysReadyPromise = run;
    void run.finally(() => {
      if (lawsuitKeysReadyPromise === run) lawsuitKeysReadyPromise = null;
    });
    await run;
  }

  /**
   * فهرس التنفيذ فقط — بلا انتظار فكّ جزائي/منتدى/خزنة.
   * فتح المخزن معزول عن الشبكة؛ التشفير محلي على هذه المفاتيح.
   */
  static async ensureExecutionIndexReady(): Promise<void> {
    if (__HAMI_CLIENT_PRODUCT__ === 'hq') return;
    if (!isWebEnvironment()) return;
    if (executionIndexReadyPromise) return executionIndexReadyPromise;
    const run = (async () => {
      try {
        await CryptoService.initialize();
      } catch {
        /* فكّ لاحق يحاول مجدداً */
      }
      await this.ensureWebInfrastructureReady();
      const { EXECUTION_INDEX_WARM_KEYS } = await import(
        '@/app/services/dossierPersistence/dossierStorageKeys'
      );
      await this.warmPersistedKeys(EXECUTION_INDEX_WARM_KEYS);
    })();
    executionIndexReadyPromise = run;
    void run.finally(() => {
      if (executionIndexReadyPromise === run) executionIndexReadyPromise = null;
    });
    await run;
  }

  /**
   * تسخين مفاتيح محددة بعد فتح IndexedDB — بلا PROTECTED_WARM_KEYS.
   * لأقسام العمل المعزولة (ملاحظات، تقويم إضافي، …).
   */
  static async ensureKeysReady(keys: readonly string[]): Promise<void> {
    if (__HAMI_CLIENT_PRODUCT__ === 'hq') return;
    if (!isWebEnvironment() || keys.length === 0) return;
    try {
      await CryptoService.initialize();
    } catch {
      /* فكّ لاحق */
    }
    await this.ensureWebInfrastructureReady();
    await this.warmPersistedKeys(keys);
  }

  /** جاهزية كاملة (كل المفاتيح المحمية) — للسحابة/الترحيل الشامل */
  private static async ensureWebReady(): Promise<void> {
    if (!isWebEnvironment() || webReady) return;
    if (import.meta.env.VITEST) {
      webReady = true;
      bootShellReady = true;
      webInfraReady = true;
      return;
    }
    await this.ensureWebInfrastructureReady();
    if (webReady) return;
    if (webReadyPromise) {
      await webReadyPromise;
      return;
    }
    webReadyPromise = (async () => {
      await this.warmPersistedKeys(PROTECTED_WARM_KEYS);
      webReady = true;
    })();
    await webReadyPromise;
  }

  private static async readIndex(): Promise<Set<string>> {
    if (isWebEnvironment()) {
      await this.ensureWebInfrastructureReady();
      const idbKeys = await this.webDbGetAllKeys();
      return new Set([...webFallbackStore.keys(), ...idbKeys]);
    }
    return new Set(webFallbackStore.keys());
  }

  private static async writeIndex(_keys: Set<string>): Promise<void> {
    // فهرس KEY_INDEX كان لمسار Expo فقط — التخزين الحالي يعتمد مفاتيح IndexedDB مباشرة
  }

  private static async ensureWebMigration(): Promise<void> {
    if (!isWebEnvironment() || webMigrationDone) return;
    webMigrationDone = true;
    try {
      const ls = globalThis.localStorage;
      if (!ls) return;
      const keysToMigrate: string[] = [];
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (!k || !this.shouldMigrateWebKey(k)) continue;
        keysToMigrate.push(k);
      }
      for (const k of keysToMigrate) {
        const v = ls.getItem(k);
        if (v === null) continue;
        /*
         * الشرط على القرص لا على الذاكرة. كان `webFallbackStore.has(k)` — والترحيل
         * المتزامن يسبق هذا دائماً في الإقلاع (`kickoffBootShellSync`) فيملأ الخريطة
         * من `localStorage`. فيصير الشرط كاذباً أبداً: لا كتابة إلى IndexedDB، ثم
         * `ls.removeItem` أسفل. النتيجة قيمةٌ تعيش في ذاكرة جلسة واحدة ثم تختفي من
         * الموضعين — ترحيلٌ يمحو ما جاء ليحفظه.
         */
        const alreadyPersisted = (await this.webDbGetItem(k)) !== null;
        if (!alreadyPersisted) {
          try {
            const encrypted = await encryptIfSensitive(k, v);
            touchDecryptedCache(k, v);
            webFallbackStore.set(k, encrypted);
            await this.webDbSetItem(k, encrypted);
          } catch (error) {
            if (error instanceof StorageEncryptionError) {
              queueCryptoDeferredWrite(k, v);
              continue;
            }
            throw error;
          }
        }
        // المحو بعد ثبوت النسخة على القرص لا قبله
        ls.removeItem(k);
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
    if (isUnreadableProtectedValue(key, existing)) {
      _guard(`Stored value for "${key}" is unreadable — preserved, not overwritten.`);
      signalUnreadableStoredValue(key, existing, 'write');
    }
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
    await Promise.all(
      keys.map(async (key) => {
        if (decryptedCache.has(key)) return;
        try {
          let raw: string | null = webFallbackStore.get(key) ?? null;
          if (raw === null) {
            raw = await this.webDbGetItem(key);
            if (raw !== null) webFallbackStore.set(key, raw);
          }
          if (raw === null) return;
          const decrypted = await decryptIfSensitive(key, raw);
          if (decrypted !== null) {
            touchDecryptedCache(key, decrypted);
            if (raw.startsWith(ENCRYPTED_PREFIX) && !isSensitiveKey(key)) {
              /*
               * التنفيذ وغيره خرج من سياسة التشفير. هذا المسار لازم لأن
               * `warmPersistedKeys` يتجاوز `getItem` تفادياً لقفل الإقلاع، فبلا
               * هذا الفرع يبقى ciphertext الإقلاع بلا ترحيل.
               */
              void this.setItem(key, decrypted);
            } else if (
              !raw.startsWith(ENCRYPTED_PREFIX) &&
              isSensitiveKey(key) &&
              shouldEncryptValue(key, decrypted)
            ) {
              void this.setItem(key, decrypted);
            }
          }
        } catch {
          /* ignore per-key warm failures */
        }
      }),
    );
  }

  /**
   * للتحقق من المسح: لا تثق بمرآة الذاكرة وحدها إذا كانت فارغة بينما القرص يحمل بيانات.
   * مسار setItemSync كان يسمّم المرآة بـ `[]` قبل التسخين → الحارس يرى فراغاً ويكتب فوق ciphertext.
   */
  private static async resolveExistingRawForWipeGuard(key: string): Promise<string | null> {
    const mem = webFallbackStore.get(key) ?? null;
    const disk = await this.webDbGetItem(key);
    if (disk == null) return mem;
    if (mem == null) return disk;
    if (!isProtectedStorageKey(key)) return mem;
    const memLooksEmpty =
      !mem.startsWith(ENCRYPTED_PREFIX) && isEmptyingPayload(key, mem);
    const diskHasSubstance =
      disk.startsWith(ENCRYPTED_PREFIX) || !isEmptyingPayload(key, disk);
    if (memLooksEmpty && diskHasSubstance) return disk;
    /*
     * دعاوى: مرآة صريحة أفقر لا تُخفي ciphertext أغنى على القرص.
     * بدون هذا يقارن الحارس القائمة الجزئية في الذاكرة ويأذن بالكتابة فوق الأصل.
     */
    if (
      key.includes('lawyer_files') &&
      disk.startsWith(ENCRYPTED_PREFIX) &&
      !mem.startsWith(ENCRYPTED_PREFIX)
    ) {
      return disk;
    }
    return mem;
  }

  static async setItem(
    key: string,
    value: string,
    options: { allowVerifiedEmptyOverwrite?: boolean; allowShrink?: boolean } = {},
  ): Promise<void> {
    /*
     * المونولث الجزائي لم يعد مسار كتابة إنتاج — الشظايا فقط.
     * الاختبارات قد تزرع عبر setItemSync تحت VITEST.
     */
    if (key === 'hami:criminal:store' && !import.meta.env.VITEST) {
      _guard('Refused write to criminal monolith — shards only.');
      return;
    }
    if (isWebEnvironment()) {
      await this.ensureWebInfrastructureReady();
      try {
        const existingRaw = await this.resolveExistingRawForWipeGuard(key);
        if (existingRaw) {
          /*
           * الحارس يعدّ عناصر JSON، والمخزَّن للمفاتيح الحساسة نصّ مشفَّر. كان
           * يُمرَّر كما هو فيفشل التحليل ويُقرأ «صفر عنصر»، فلا تنطبق قاعدة
           * «لا تستبدل الموجود بفراغ» على أثمن المفاتيح: الدعاوى والإضابير
           * والملاحظات وشظايا القضايا الجنائية. وفشل الفكّ يبقى نصّاً غير
           * مقروء عمداً ليقع في فرع الرفض بدل أن يُقرأ فراغاً.
           */
          const existingPlain = (await decryptIfSensitive(key, existingRaw)) ?? existingRaw;
          if (
            !options.allowVerifiedEmptyOverwrite &&
            !options.allowShrink &&
            this.shouldRejectEmptyOverwrite(key, value, existingPlain)
          ) {
            if (!key.startsWith('hami_notes_sync_map_')) {
              _guard(`Refused empty overwrite for "${key}" — existing data preserved.`);
            }
            /*
             * إن سُمّمت المرآة بـ [] خطأً، أعد ciphertext القرص حتى لا تكذب القراءات التالية.
             */
            /*
             * أعد ciphertext القرص بعد الرفض — حتى قائمة أقصر في المرآة
             * لا تُجبر getItem على مقارنة القرص في كل قراءة.
             */
            if (existingRaw.startsWith(ENCRYPTED_PREFIX) && key.includes('lawyer_files')) {
              webFallbackStore.set(key, existingRaw);
              deleteDecryptedCacheKey(key);
            } else if (
              existingRaw.startsWith(ENCRYPTED_PREFIX) &&
              isEmptyingPayload(key, webFallbackStore.get(key) ?? '')
            ) {
              webFallbackStore.set(key, existingRaw);
              deleteDecryptedCacheKey(key);
            }
            return;
          }
        }
      } catch {
        /*
         * الحارس نفسه تعثّر — قراءة IndexedDB سقطت أو فكّ التشفير رمى. تجاوُزه
         * والمضيّ في الكتابة يعيد الثغرة ذاتها من باب آخر: أول حفظة تلقائية
         * تكتب `[]` فوق إضبارة لم نستطع النظر إليها. الكتابة المُفرِّغة على مفتاح
         * محمي تُرفض هنا، وما عداها يمرّ لأن الحارس كان ليأذن به على أي حال.
         */
        if (
          !options.allowVerifiedEmptyOverwrite &&
          isProtectedStorageKey(key) &&
          isEmptyingPayload(key, value)
        ) {
          _guard(`Guard could not run for "${key}" — emptying write refused.`);
          return;
        }
      }
    }

    const previousRaw = isWebEnvironment() ? (webFallbackStore.get(key) ?? null) : null;
    const hadPlainCache = decryptedCache.has(key);
    const previousPlain = hadPlainCache ? (decryptedCache.get(key) as string) : null;
    touchDecryptedCache(key, value);
    let encrypted: string;
    try {
      encrypted = await encryptIfSensitive(key, value);
    } catch (error) {
      if (error instanceof StorageEncryptionError && !isEncryptOrFailStorageKey(key)) {
        queueCryptoDeferredWrite(key, value);
        return;
      }
      if (error instanceof StorageEncryptionError) {
        signalPersistenceFailure(
          key,
          'encrypt-or-write-failed',
          error instanceof Error ? error.message : String(error),
        );
      }
      if (!hadPlainCache) deleteDecryptedCacheKey(key);
      else touchDecryptedCache(key, previousPlain as string);
      throw error;
    }
    if (isWebEnvironment()) {
      await this.ensureWebInfrastructureReady();
      webFallbackStore.set(key, encrypted);
      const wrote = await this.webDbSetItem(key, encrypted);
      if (!wrote) {
        if (previousRaw === null) webFallbackStore.delete(key);
        else webFallbackStore.set(key, previousRaw);
        if (!hadPlainCache) deleteDecryptedCacheKey(key);
        else touchDecryptedCache(key, previousPlain as string);
        throw new StoragePersistenceError(key, 'webDbSetItem returned false');
      }
      scheduleProtectedBackupFromRaw(key, value);
      return;
    }
    webFallbackStore.set(key, encrypted);
  }

  /**
   * قراءة خام من IndexedDB فقط — بلا webFallbackStore.
   * للتحقق من التثبيت الحقيقي (الذاكرة قد تكذب بعد فشل كتابة صامت سابقاً).
   */
  static async peekRawFromDisk(key: string): Promise<string | null> {
    if (!isWebEnvironment()) return webFallbackStore.get(key) ?? null;
    await this.ensureWebInfrastructureReady();
    return this.webDbGetItem(key);
  }

  /** فكّ من القرص فقط — يتجاوز مرآة الذاكرة */
  static async getItemFromDisk(key: string): Promise<string | null> {
    const raw = await this.peekRawFromDisk(key);
    if (raw === null) return null;
    const decrypted = await decryptIfSensitive(key, raw);
    if (decrypted === null) return null;
    touchDecryptedCache(key, decrypted);
    if (raw.startsWith(ENCRYPTED_PREFIX)) {
      webFallbackStore.set(key, raw);
    }
    return decrypted;
  }

  /** هل يوجد نص مشفّر على القرص لهذه المفاتيح؟ (يمنع سكّ مفتاح تشفير جديد يُعمي البيانات) */
  static async hasEncryptedCiphertextOnDisk(keys: readonly string[]): Promise<boolean> {
    for (const key of keys) {
      const raw = await this.peekRawFromDisk(key);
      if (raw?.startsWith(ENCRYPTED_PREFIX)) return true;
    }
    return false;
  }

  /**
   * اختبارات فقط: امسح مرآة الذاكرة دون مسح IndexedDB — محاكاة إعادة تحميل الصفحة.
   */
  static dropMemoryMirrorsForTests(keys?: readonly string[]): void {
    if (!import.meta.env.VITEST) return;
    const list = keys && keys.length > 0 ? keys : [...webFallbackStore.keys()];
    for (const key of list) {
      deleteDecryptedCacheKey(key);
      webFallbackStore.delete(key);
    }
  }

  /** اختبارات فقط: حقن قيمة في المرآة دون المرور بالحارس (محاكاة التسميم القديم) */
  static poisonMemoryMirrorForTests(key: string, value: string): void {
    if (!import.meta.env.VITEST) return;
    webFallbackStore.set(key, value);
    touchDecryptedCache(key, value);
  }

  /**
   * تفريغ مقصود لمقطع بعد نقل السجلات (أرشفة/مهملات) — يتجاوز حارس المسح
   * بعد أن تأكد المُستدعي أن البيانات موجودة في مقطع آخر.
   */
  static applyVerifiedEmptyOverwrite(key: string, value: string): void {
    if (!isEmptyingPayload(key, value)) {
      void this.setItem(key, value);
      return;
    }
    touchDecryptedCache(key, value);
    webFallbackStore.set(key, value);
    void this.setItem(key, value, { allowVerifiedEmptyOverwrite: true });
  }

  static async getItem(key: string): Promise<SecureStoreValue> {
    if (decryptedCache.has(key)) {
      const cached = decryptedCache.get(key);
      if (
        cached != null &&
        !(key.includes('lawyer_files') && isEmptyingPayload(key, cached))
      ) {
        return cached;
      }
    }
    let raw: string | null = null;
    if (isWebEnvironment()) {
      await this.ensureWebInfrastructureReady();
      if (webFallbackStore.has(key)) raw = webFallbackStore.get(key) ?? null;
      if (raw === null) {
        const persisted = await this.webDbGetItem(key);
        if (persisted !== null) {
          webFallbackStore.set(key, persisted);
          raw = persisted;
        }
      } else if (
        key.includes('lawyer_files') &&
        !raw.startsWith(ENCRYPTED_PREFIX) &&
        isEmptyingPayload(key, raw)
      ) {
        /*
         * مرآة فارغة فوق ciphertext فقط — لا مقارنة قرص في كل قراءة عادية.
         * الكتابة المرفوضة تعيد ciphertext عبر setItem فلا نحتاج هذا في المسار الساخن.
         */
        const persisted = await this.webDbGetItem(key);
        if (persisted?.startsWith(ENCRYPTED_PREFIX)) {
          webFallbackStore.set(key, persisted);
          deleteDecryptedCacheKey(key);
          raw = persisted;
        }
      }
    } else {
      raw = webFallbackStore.get(key) ?? null;
    }
    if (raw === null) return null;
    const decrypted = await decryptIfSensitive(key, raw);
    if (decrypted === null) return null;
    touchDecryptedCache(key, decrypted);
    if (raw.startsWith(ENCRYPTED_PREFIX) && !isSensitiveKey(key)) {
      void this.setItem(key, decrypted);
    } else if (
      !raw.startsWith(ENCRYPTED_PREFIX) &&
      isSensitiveKey(key) &&
      shouldEncryptValue(key, decrypted)
    ) {
      void this.setItem(key, decrypted);
    }
    return decrypted;
  }

  static async deleteItem(key: string): Promise<void> {
    deleteDecryptedCacheKey(key);
    if (isWebEnvironment()) {
      await this.ensureWebInfrastructureReady();
      webFallbackStore.delete(key);
      await this.webDbDeleteItem(key);
      return;
    }
    webFallbackStore.delete(key);
  }

  static async listKeys(): Promise<string[]> {
    const index = await this.readIndex();
    return Array.from(index);
  }

  /** يلغي كتابات IDB المؤجّلة دون كتابتها — لمسح شامل فقط */
  static discardHeavyPersistPending(): void {
    for (const timer of heavyPersistTimers.values()) {
      clearTimeout(timer);
    }
    heavyPersistTimers.clear();
    heavyPersistPending.clear();
  }

  static clearDecryptedMemoryCache(): void {
    decryptedCache.clear();
    decryptedCacheOrder.length = 0;
  }

  /** flush فوري لكتابات IDB المؤجّلة (عند إخفاء التبويب) */
  static flushHeavyPersistPending(): void {
    for (const timer of heavyPersistTimers.values()) {
      clearTimeout(timer);
    }
    heavyPersistTimers.clear();
    for (const [key, value] of heavyPersistPending.entries()) {
      heavyPersistPending.delete(key);
      void queueDurableSetItem(key, value);
    }
  }

  /** انتظار كتابة setItemSync التي ما زالت في IndexedDB */
  static async waitForPendingSetItem(key?: string): Promise<void> {
    if (key) {
      await durableSetItemPending.get(key);
      return;
    }
    await Promise.all([...durableSetItemPending.values()]);
  }

  static async waitForAllPendingPersist(): Promise<void> {
    this.flushHeavyPersistPending();
    const deadline = Date.now() + 8_000;
    while (durableSetItemPending.size > 0 && Date.now() < deadline) {
      await Promise.race([
        this.waitForPendingSetItem(),
        new Promise<void>((resolve) => {
          setTimeout(resolve, 400);
        }),
      ]);
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
          void queueDurableSetItem(key, pending);
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

  /**
   * هل للمفتاح قيمة على القرص — بصرف النظر عن قابلية قراءتها متزامناً؟
   *
   * `getItemSync` تُرجع `null` في حالتين مختلفتين تماماً: «لا قيمة» و«القيمة
   * مشفّرة وذاكرة الفكّ باردة» (وهي LRU بحدّ ٦٤ مدخلاً، فالبرود أمرٌ عاديّ لا
   * استثناء). فمن استعمل `getItemSync(key) !== null` اختباراً للوجود يخلط
   * الحالتين — ويستنتج غياب بيانات سليمة قائمة على القرص.
   *
   * وقد كان `storageCache.get` يفعل ذلك، ثم يحذف مدخله من الذاكرة بناءً على
   * الاستنتاج ويُرجع فراغاً. لا مفتاح حسّاس يعبر ذاك الكاش اليوم — قِيس فلم
   * يوجد — لكن التصنيف يتغيّر: `hami:smartvault:docs:v1` صار مشفّراً في هذه
   * الجلسة نفسها. فالفخّ يُغلق بفصل السؤالين لا بالاعتماد على أن أحداً لن يقع فيه.
   */
  static hasItemSync(key: string): boolean {
    if (!isWebEnvironment()) return false;
    this.ensureWebMigrationSync();
    this.ensureWebReadySyncKickoff();
    if (decryptedCache.has(key)) return true;
    return (webFallbackStore.get(key) ?? null) !== null;
  }

  /**
   * المفتاح موجود على القرص لكن getItemSync لا تقرأه: مشفَّر وذاكرة الفكّ باردة.
   * معاملته كمصفوفة فارغة ثم حفظها هو مسار مسح الإضبارة.
   */
  static isUnreadSync(key: string): boolean {
    return this.hasItemSync(key) && this.getItemSync(key) === null;
  }

  /**
   * هل اكتمل فتح IndexedDB وملء المرآة من القرص؟
   * قبل ذلك: hasItemSync=false لا يعني «مستخدم جديد» — الكتابة من lawyer_files
   * القديم تمسح إضبارة أُنشئت ولم تُفلَش بعد.
   */
  static isDiskHydrationSettledSync(): boolean {
    if (import.meta.env.VITEST) return true;
    if (!isWebEnvironment()) return true;
    return webInfraReady;
  }

  static setItemSync(
    key: string,
    value: string,
    options: { allowVerifiedEmptyOverwrite?: boolean; allowShrink?: boolean } = {},
  ): boolean {
    if (key === 'hami:criminal:store' && !import.meta.env.VITEST) {
      _guard('Refused write to criminal monolith — shards only.');
      return false;
    }
    if (isWebEnvironment()) {
      this.ensureWebMigrationSync();
      this.ensureWebReadySyncKickoff();
      const cachedPlain = this.getItemSync(key);
      const storedRaw = webFallbackStore.get(key) ?? null;
      /*
       * لا فكّ تشفير في مسار متزامن. تفريغ فوق أصل مشفَّر بارد → مسار
       * غير متزامن + حارس. غير ذلك: حدّث الذاكرة فوراً للواجهة، والقرص
       * يُكتب async مع الحارس الكامل.
       */
      if (
        key.includes('lawyer_files') &&
        storedRaw?.startsWith(ENCRYPTED_PREFIX) &&
        cachedPlain != null &&
        isEmptyingPayload(key, cachedPlain) &&
        !options.allowShrink &&
        !options.allowVerifiedEmptyOverwrite
      ) {
        _guard(
          `Refused overwrite of encrypted "${key}" while memory is empty — existing data preserved.`,
        );
        deleteDecryptedCacheKey(key);
        return false;
      }
      if (cachedPlain === null && storedRaw?.startsWith(ENCRYPTED_PREFIX)) {
        /*
         * دعاوى: ارفض أي كتابة باردة (فارغة أو جزئية) — كانت تمسح الخزنة
         * بقائمة إنشاء أفقر قبل فكّ التشفير.
         */
        if (key.includes('lawyer_files')) {
          _guard(`Refused cold overwrite for "${key}" — existing encrypted data preserved.`);
          return false;
        }
        /*
         * شواهد القبر: mark بـ ["id"] فوق ciphertext بارد يمسح قائمة المحذوفات
         * السابقة فيُعيد السحابة إضابير محذوفة.
         */
        if (isDossierTombstonesStorageKey(key) || isDeletedIdsTombstoneStorageKey(key)) {
          _guard(`Refused cold overwrite for "${key}" — existing encrypted tombstones preserved.`);
          return false;
        }
        if (isEmptyingPayload(key, value) && isProtectedStorageKey(key)) {
          _guard(`Refused cold empty overwrite for "${key}" — existing encrypted data preserved.`);
          return false;
        }
        if (isEmptyingPayload(key, value)) {
          void queueDurableSetItem(key, value, options);
          return true;
        }
        touchDecryptedCache(key, value);
        webFallbackStore.set(key, value);
        void queueDurableSetItem(key, value, options);
        return true;
      }
      const existing = cachedPlain ?? storedRaw;
      /*
       * لا تسمّم المرآة بـ [] قبل أن تعرف إن كان IndexedDB يحمل ciphertext —
       * وإلا setItem يقرأ المرآة أولاً ويظن القرص فارغاً.
       */
      if (
        !existing &&
        isProtectedStorageKey(key) &&
        isEmptyingPayload(key, value)
      ) {
        _guard(`Deferred protected empty write for "${key}" — disk must decide via async guard.`);
        void queueDurableSetItem(key, value, options);
        return false;
      }
      if (
        existing &&
        !options.allowShrink &&
        !options.allowVerifiedEmptyOverwrite &&
        this.shouldRejectEmptyOverwrite(key, value, existing)
      ) {
        return false;
      }
      touchDecryptedCache(key, value);
      webFallbackStore.set(key, value);
      if (isHeavyPersistKey(key)) {
        this.scheduleHeavyPersist(key, value);
        return true;
      }
    }
    void queueDurableSetItem(key, value, options);
    return true;
  }

  static deleteItemSync(key: string): void {
    if (isWebEnvironment()) {
      this.ensureWebMigrationSync();
      this.ensureWebReadySyncKickoff();
      deleteDecryptedCacheKey(key);
      webFallbackStore.delete(key);
    }
    if (import.meta.env.VITEST) vitestDiskStore.delete(key);
    void this.deleteItem(key);
  }

  static listKeysSync(): string[] {
    if (!isWebEnvironment()) return [];
    this.ensureWebMigrationSync();
    this.ensureWebReadySyncKickoff();
    if (import.meta.env.VITEST) {
      return [...new Set([...webFallbackStore.keys(), ...vitestDiskStore.keys()])];
    }
    return Array.from(webFallbackStore.keys());
  }
}

bindDeletedIdsPersist((storageKey, ids) => {
  try {
    SecureStoreService.setItemSync(storageKey, JSON.stringify(ids));
  } catch {
    /* الحارس أو التشفير قد يرفض — الذاكرة تبقى مصدر حارس المسح */
  }
});

bindDeletedIdsUnreadProbe((storageKey) => SecureStoreService.isUnreadSync(storageKey));

if (typeof window !== 'undefined' && !import.meta.env.VITEST) {
  SecureStoreService.kickoffBootShellSync();
}

/** جسر E2E للقراءة بعد التشفير — preview لا يستطيع import `/src/...` */
if (
  typeof window !== 'undefined' &&
  import.meta.env.VITE_SHELL_AUTH_OPEN === 'true' &&
  !import.meta.env.VITEST
) {
  const w = window as Window & {
    __hamiE2eSecureStore?: {
      flushHeavyPersistPending: () => void;
      waitForAllPendingPersist: () => Promise<void>;
      ensurePersistedReady: () => Promise<void>;
      getItemSync: (key: string) => string | null;
      getItem: (key: string) => Promise<string | null>;
      setItemSync: (key: string, value: string) => boolean;
      setItem: (key: string, value: string) => Promise<void>;
      deleteItem: (key: string) => Promise<void>;
    };
  };
  w.__hamiE2eSecureStore = {
    flushHeavyPersistPending: () => SecureStoreService.flushHeavyPersistPending(),
    waitForAllPendingPersist: () => SecureStoreService.waitForAllPendingPersist(),
    ensurePersistedReady: () => SecureStoreService.ensurePersistedReady(),
    getItemSync: (key) => SecureStoreService.getItemSync(key),
    getItem: (key) => SecureStoreService.getItem(key),
    setItemSync: (key, value) => SecureStoreService.setItemSync(key, value),
    setItem: (key, value) => SecureStoreService.setItem(key, value),
    deleteItem: (key) => SecureStoreService.deleteItem(key),
  };
}

export default SecureStoreService;
